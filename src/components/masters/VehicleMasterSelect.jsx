import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import OutlinedField, { OUTLINED_CONTROL_CLASS } from '../ui/OutlinedField'
import { useToast } from '../../context/ToastContext'
import { useSearchableDropdownKeyboard } from '../../hooks/useSearchableDropdownKeyboard'
import { focusNextEditable } from '../../keyboard/keyUtils'
import { buildLookupCountText } from '../../utils/lookupDropdownUtils'
import LookupMasterAddModal from '../lookup/LookupMasterAddModal'
import LookupNotFoundOption from '../lookup/LookupNotFoundOption'
import SearchableDropdownPanel from '../ui/SearchableDropdownPanel'
import { getLookupMasterConfig } from '../../config/lookupMasterConfig'
import { vehiclesApi } from '../../services/api'

const PAGE_SIZE = 25

function displayLines(row) {
  const primary = row?.number ?? ''
  const bits = [row?.type, row?.model, row?.capacity].filter(Boolean)
  return { primary, secondary: bits.join(' · ') }
}

function formatLabel(row) {
  const { primary, secondary } = displayLines(row)
  return secondary ? `${primary} — ${secondary}` : primary
}

export default function VehicleMasterSelect({
  label,
  displayValue = '',
  onSelect,
  placeholder = 'Search vehicle number…',
  className = '',
  disabled = false,
  variant = 'outlined',
  allowCreate = true,
}) {
  const masterConfig = useMemo(() => getLookupMasterConfig('vehicles'), [])
  const entityLabel = masterConfig?.entityLabel ?? 'Vehicle'

  const [query, setQuery] = useState(displayValue || '')
  const [options, setOptions] = useState([])
  const [totalCount, setTotalCount] = useState(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [masterAddOpen, setMasterAddOpen] = useState(false)
  const [masterSearchText, setMasterSearchText] = useState('')
  const inputRef = useRef(null)
  const popupId = useRef(`vehicle-master-${Math.random().toString(36).slice(2)}`).current
  const { toast } = useToast()

  const showNotFound = Boolean(
    allowCreate && masterConfig && !loading && open && query.trim() && options.length === 0,
  )
  const navigableCount = showNotFound ? 1 : options.length
  const countText = buildLookupCountText({
    loading,
    query,
    optionCount: options.length,
    totalCount,
    showNotFound,
  })

  useEffect(() => {
    setQuery(displayValue || '')
  }, [displayValue])

  const loadOptions = useCallback(async (searchText) => {
    setLoading(true)
    try {
      const res = await vehiclesApi.list({
        search: searchText,
        status: 'Active',
        page: 1,
        pageSize: PAGE_SIZE,
      })
      const items = res?.items ?? (Array.isArray(res) ? res : [])
      setOptions(items)
      setTotalCount(res?.total ?? items.length)
      return items
    } catch (err) {
      toast({ title: 'Search failed', message: err.message, type: 'error' })
      setOptions([])
      setTotalCount(0)
      return []
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => loadOptions(query), 200)
    return () => clearTimeout(t)
  }, [open, query, loadOptions])

  const onPick = useCallback((row, { advanceFocus = false } = {}) => {
    setQuery(formatLabel(row))
    setOpen(false)
    onSelect?.(row)
    if (advanceFocus && inputRef.current) {
      requestAnimationFrame(() => focusNextEditable(inputRef.current))
    }
  }, [onSelect])

  const openMasterAdd = useCallback((text) => {
    const trimmed = text.trim()
    if (!trimmed || !allowCreate || !masterConfig) {
      setOpen(false)
      return
    }
    setMasterSearchText(trimmed)
    setMasterAddOpen(true)
    setOpen(false)
  }, [allowCreate, masterConfig])

  const handleEnterNoSelection = useCallback(() => {
    if (loading) return
    if (showNotFound) openMasterAdd(query)
    else setOpen(false)
  }, [loading, showNotFound, openMasterAdd, query])

  const { handleKeyDown, pick } = useSearchableDropdownKeyboard({
    popupId,
    open: open && !masterAddOpen,
    setOpen,
    disabled,
    loading,
    options,
    navigableCount,
    activeIndex,
    setActiveIndex,
    inputRef,
    resetIndexOn: [query],
    blockOpen: masterAddOpen,
    onOpen: () => loadOptions(query),
    onPick: (row) => onPick(row, { advanceFocus: true }),
    onEnterNoSelection: handleEnterNoSelection,
  })

  const handleMasterSaved = (result) => {
    const row = result.record ?? { id: result.id, number: result.label }
    onSelect?.(row)
    setQuery(formatLabel(row))
    setOpen(false)
    setMasterAddOpen(false)
    setMasterSearchText('')
    loadOptions(formatLabel(row))
  }

  const isDense = variant === 'dense'
  const fieldClass = isDense ? 'outlined-field--dense' : ''
  const controlClass = isDense ? 'outlined-control outlined-control--dense' : OUTLINED_CONTROL_CLASS

  return (
    <>
      <div className={`relative ${className}`}>
        <OutlinedField label={isDense ? false : label} fieldClassName={fieldClass}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            disabled={disabled}
            readOnly={disabled}
            placeholder={placeholder}
            role="combobox"
            aria-expanded={open}
            aria-label={label || 'Vehicle number'}
            className={controlClass}
            onFocus={() => {
              if (disabled) return
              setOpen(true)
              loadOptions(query)
            }}
            onChange={(e) => {
              if (disabled) return
              setQuery(e.target.value)
              setOpen(true)
            }}
            onKeyDown={disabled ? undefined : handleKeyDown}
          />
        </OutlinedField>

        <SearchableDropdownPanel
          open={!disabled && open}
          anchorRef={inputRef}
          onClose={() => setOpen(false)}
          countText={countText}
          activeIndex={activeIndex}
        >
          {loading && <li className="lookup-dropdown-empty">Searching…</li>}
          {!loading && showNotFound && (
            <LookupNotFoundOption
              entityLabel={entityLabel}
              query={query}
              active={activeIndex === 0}
              onActivate={() => openMasterAdd(query)}
            />
          )}
          {!loading && !showNotFound && options.length === 0 && (
            <li className="lookup-dropdown-empty">No records found</li>
          )}
          {!loading && options.map((row, idx) => {
            const { primary, secondary } = displayLines(row)
            return (
              <li key={row.id ?? `${primary}-${idx}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={idx === activeIndex}
                  data-lookup-active={idx === activeIndex ? 'true' : undefined}
                  className={`lookup-dropdown-option${idx === activeIndex ? ' is-active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(row)}
                >
                  <span className="lookup-dropdown-option-primary">{primary}</span>
                  {secondary ? (
                    <span className="lookup-dropdown-option-secondary">{secondary}</span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </SearchableDropdownPanel>
      </div>

      {masterConfig ? (
        <LookupMasterAddModal
          open={masterAddOpen}
          onClose={() => {
            setMasterAddOpen(false)
            setMasterSearchText('')
            inputRef.current?.focus()
          }}
          lookupKey="vehicles"
          searchText={masterSearchText}
          returnFocusRef={inputRef}
          onSaved={handleMasterSaved}
        />
      ) : null}
    </>
  )
}
