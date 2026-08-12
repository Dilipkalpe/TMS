import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { lookupsApi } from '../../services/api'
import { getLookupMasterConfig, resolveLookupMasterKey } from '../../config/lookupMasterConfig'
import { lookupEntityLabel } from '../../config/lookupLabels'
import { invalidateSearchIndex } from '../../utils/searchIndex'
import { LOOKUP_CREATED_EVENT, lookupEventMatches, notifyLookupCreated } from '../../utils/lookupEvents'
import { buildLookupCountText } from '../../utils/lookupDropdownUtils'
import LookupMasterAddModal from '../lookup/LookupMasterAddModal'
import LookupNotFoundOption from '../lookup/LookupNotFoundOption'
import OutlinedField, { OUTLINED_CONTROL_CLASS } from './OutlinedField'
import SearchableDropdownPanel from './SearchableDropdownPanel'
import { useSearchableDropdownKeyboard } from '../../hooks/useSearchableDropdownKeyboard'
import { useLookupNotFoundEnter } from '../../hooks/useLookupNotFoundEnter'
import { useKeyboardShortcutsOptional } from '../../context/KeyboardShortcutContext'

const FETCHERS = {
  vehicles: lookupsApi.vehicles,
  drivers: lookupsApi.drivers,
  customers: lookupsApi.customers,
  vendors: lookupsApi.vendors,
}

const LOOKUP_LIMIT = 25

async function fetchDriverOptions(search, limit) {
  const [employees, drivers] = await Promise.all([
    lookupsApi.employees('Driver', search, limit).catch(() => []),
    lookupsApi.drivers(search, limit).catch(() => []),
  ])
  const merged = [...new Set([...(employees ?? []), ...(drivers ?? [])])]
  return merged.sort((a, b) => a.localeCompare(b)).slice(0, limit)
}

function withCurrentValue(list, current, limit) {
  const v = current?.trim()
  if (!v) return list
  if (list.some((o) => o.toLowerCase() === v.toLowerCase())) return list
  return [v, ...list].slice(0, limit)
}

function matchesOption(options, text) {
  const q = text.trim().toLowerCase()
  return options.find((o) => o.toLowerCase() === q) ?? null
}

/**
 * Searchable lookup dropdown with Record Not Found → Add Master flow.
 */
export default function LookupSelect({
  label,
  type,
  employeeType,
  value = '',
  onChange,
  onRecordCreated,
  placeholder = 'Type to search…',
  className = '',
  limit = LOOKUP_LIMIT,
  allowCreate = true,
  disabled = false,
}) {
  const fetcher = type === 'employees'
    ? (search, cap) => (
      employeeType === 'Driver'
        ? fetchDriverOptions(search, cap)
        : lookupsApi.employees(employeeType, search, cap)
    )
    : FETCHERS[type]

  const masterMeta = useMemo(
    () => resolveLookupMasterKey(type, employeeType),
    [type, employeeType],
  )
  const masterConfig = useMemo(
    () => getLookupMasterConfig(masterMeta.key, { employeeType: masterMeta.employeeType }),
    [masterMeta],
  )
  const entityLabel = lookupEntityLabel(type, employeeType)

  const [query, setQuery] = useState(value ?? '')
  const [options, setOptions] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [masterAddOpen, setMasterAddOpen] = useState(false)
  const [masterSearchText, setMasterSearchText] = useState('')
  const [refreshToken, setRefreshToken] = useState(0)
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const skipBlurRef = useRef(false)
  const popupId = useRef(`lookup-${type}-${employeeType ?? 'default'}-${Math.random().toString(36).slice(2)}`).current
  const kbd = useKeyboardShortcutsOptional()

  const loadOptions = useCallback(async (searchText) => {
    if (!fetcher) return []
    setLoading(true)
    try {
      const items = await fetcher(searchText, limit)
      const list = withCurrentValue(
        Array.isArray(items) ? items.slice(0, limit) : [],
        value,
        limit,
      )
      setOptions(list)
      return list
    } catch {
      const fallback = withCurrentValue([], value, limit)
      setOptions(fallback)
      return fallback
    } finally {
      setLoading(false)
    }
  }, [fetcher, limit, value])

  useEffect(() => {
    setQuery(value ?? '')
    if (value?.trim()) {
      setOptions((prev) => withCurrentValue(prev, value, limit))
    }
  }, [value, limit])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => loadOptions(query), 250)
    return () => clearTimeout(t)
  }, [open, query, loadOptions, refreshToken])

  useEffect(() => {
    const onCreated = (e) => {
      if (!lookupEventMatches(e.detail, type, employeeType)) return
      setRefreshToken((n) => n + 1)
      if (e.detail?.label) {
        setOptions((prev) => {
          const lbl = e.detail.label
          if (prev.some((o) => o.toLowerCase() === lbl.toLowerCase())) return prev
          return [...prev, lbl].sort((a, b) => a.localeCompare(b))
        })
      }
    }
    window.addEventListener(LOOKUP_CREATED_EVENT, onCreated)
    return () => window.removeEventListener(LOOKUP_CREATED_EVENT, onCreated)
  }, [type, employeeType])

  const openMasterAdd = useCallback((text) => {
    const trimmed = text.trim()
    if (!trimmed || !allowCreate || !masterConfig) {
      if (trimmed) {
        onChange?.(trimmed)
        setQuery(trimmed)
      }
      setOpen(false)
      return
    }
    setMasterSearchText(trimmed)
    setMasterAddOpen(true)
    setOpen(false)
  }, [allowCreate, masterConfig, onChange])

  const {
    showNotFound,
    navigableCount,
    handleEnterNoSelection,
    emptyListMessage,
    advanceFocus,
  } = useLookupNotFoundEnter({
    allowCreate,
    masterConfig,
    loading,
    open,
    query,
    optionsLength: options.length,
    setActiveIndex,
    setOpen,
    inputRef,
    openMasterAdd,
  })

  const countText = buildLookupCountText({
    loading,
    query,
    optionCount: options.length,
    showNotFound,
  })

  const pick = useCallback((item, { advanceFocus: goNext = false } = {}) => {
    onChange?.(item)
    setQuery(item)
    setOpen(false)
    setMasterAddOpen(false)
    setMasterSearchText('')
    if (goNext) advanceFocus()
  }, [onChange, advanceFocus])

  const { handleKeyDown, pick: pickWithFocus, openList } = useSearchableDropdownKeyboard({
    popupId,
    open: open && !disabled && !masterAddOpen,
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
    onPick: (item) => pick(item, { advanceFocus: true }),
    onEnterNoSelection: handleEnterNoSelection,
  })

  useEffect(() => {
    if (!kbd) return undefined
    const trigger = () => {
      if (document.activeElement === inputRef.current) {
        openList()
      }
    }
    return kbd.registerLookupTrigger(trigger)
  }, [kbd, openList])

  const commitValue = async (text, { fromTab = false } = {}) => {
    const trimmed = text.trim()
    if (!trimmed) {
      onChange?.('')
      setOpen(false)
      return true
    }

    const fresh = await loadOptions(trimmed)
    const exact = matchesOption(fresh, trimmed) ?? matchesOption(options, trimmed)
    if (exact) {
      pick(exact)
      return true
    }

    if (value && value.toLowerCase() === trimmed.toLowerCase()) {
      setOpen(false)
      return true
    }

    if (!allowCreate || !masterConfig) {
      onChange?.(trimmed)
      setQuery(trimmed)
      setOpen(false)
      return true
    }

    if (fromTab) skipBlurRef.current = true
    openMasterAdd(trimmed)
    return false
  }

  const handleBlur = () => {
    if (skipBlurRef.current) {
      skipBlurRef.current = false
      return
    }
    if (masterAddOpen) return
    const trimmed = query.trim()
    if (!trimmed) {
      setOpen(false)
      return
    }
    const exact = matchesOption(options, trimmed)
    if (exact) pick(exact)
    else setOpen(false)
  }

  const handleMasterSaved = async (result) => {
    invalidateSearchIndex()
    notifyLookupCreated({
      type,
      employeeType,
      label: result.label,
      id: result.id,
      created: result.created,
    })
    await loadOptions(result.label)
    onChange?.(result.label)
    setQuery(result.label)
    setOpen(false)
    setMasterAddOpen(false)
    setMasterSearchText('')
    onRecordCreated?.(result)
  }

  return (
    <>
      <div ref={wrapRef} className={`relative ${className}`}>
        <OutlinedField label={label}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={disabled}
            data-lookup-type={type}
            role="combobox"
            aria-expanded={open}
            aria-controls={open ? `${popupId}-listbox` : undefined}
            onChange={(e) => {
              if (disabled) return
              setQuery(e.target.value)
              setOpen(true)
              if (!e.target.value) onChange?.('')
            }}
            onFocus={() => {
              if (disabled) return
              setOpen(true)
              loadOptions(query)
            }}
            onKeyDown={disabled ? undefined : async (e) => {
              if (e.key === 'Tab' && !e.shiftKey) {
                const ok = await commitValue(query, { fromTab: true })
                if (!ok) e.preventDefault()
                return
              }
              handleKeyDown(e)
            }}
            onBlur={disabled ? undefined : handleBlur}
            className={`${OUTLINED_CONTROL_CLASS} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
          />
        </OutlinedField>

        <SearchableDropdownPanel
          open={!disabled && open}
          anchorRef={inputRef}
          onClose={() => setOpen(false)}
          countText={countText}
          activeIndex={activeIndex}
        >
          {loading && (
            <li className="lookup-dropdown-empty">Searching…</li>
          )}
          {!loading && showNotFound && (
            <LookupNotFoundOption
              entityLabel={entityLabel}
              query={query}
              active={activeIndex === 0}
              onActivate={() => openMasterAdd(query)}
            />
          )}
          {!loading && !showNotFound && options.length === 0 && (
            <li className="lookup-dropdown-empty">{emptyListMessage}</li>
          )}
          {!loading && options.map((opt, idx) => (
            <li key={opt}>
              <button
                type="button"
                role="option"
                aria-selected={idx === activeIndex}
                data-lookup-active={idx === activeIndex ? 'true' : undefined}
                className={`lookup-dropdown-option${idx === activeIndex ? ' is-active' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickWithFocus(opt, { advanceFocus: true })}
              >
                <span className="lookup-dropdown-option-primary">{opt}</span>
              </button>
            </li>
          ))}
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
          lookupKey={masterMeta.key}
          employeeType={masterMeta.employeeType}
          searchText={masterSearchText}
          returnFocusRef={inputRef}
          onSaved={handleMasterSaved}
        />
      ) : null}
    </>
  )
}
