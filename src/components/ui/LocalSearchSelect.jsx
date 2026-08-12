import { useCallback, useEffect, useRef, useState } from 'react'
import OutlinedField, { OUTLINED_CONTROL_CLASS } from './OutlinedField'
import SearchableDropdownPanel from './SearchableDropdownPanel'
import { useSearchableDropdownKeyboard } from '../../hooks/useSearchableDropdownKeyboard'
import { useLookupAdvanceOnEnter } from '../../hooks/useLookupNotFoundEnter'
import { buildLookupCountText } from '../../utils/lookupDropdownUtils'
import { focusNextEditable } from '../../keyboard/keyUtils'

const DENSE_CONTROL_CLASS = 'outlined-control outlined-control--dense'

/**
 * Searchable dropdown for a static in-memory option list.
 * Matches PartyMasterSelect / Consignor (From) panel design and keyboard pattern.
 */
export default function LocalSearchSelect({
  label,
  options = [],
  value = '',
  onChange,
  placeholder = 'Type to search…',
  className = '',
  /** Cap filtered results; omit to show all matching options (preferred for static Select lists). */
  limit,
  getOptionValue = (opt) => opt.value ?? opt,
  getOptionLabel = (opt) => opt.label ?? opt,
  error,
  disabled = false,
  id,
  required = false,
  name,
  variant = 'outlined',
}) {
  const isDense = variant === 'dense'
  const fieldClass = isDense ? 'outlined-field--dense' : ''
  const controlClass = isDense ? DENSE_CONTROL_CLASS : OUTLINED_CONTROL_CLASS
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const popupId = useRef(`local-search-${Math.random().toString(36).slice(2)}`).current

  const selectedLabel = (() => {
    const match = options.find((o) => String(getOptionValue(o)) === String(value ?? ''))
    return match ? String(getOptionLabel(match) ?? '') : ''
  })()

  useEffect(() => {
    if (!open) setQuery(selectedLabel ?? '')
  }, [value, selectedLabel, open])

  const q = query.trim().toLowerCase()
  const filteredAll = options.filter((opt) => {
    if (!q) return true
    return String(getOptionLabel(opt)).toLowerCase().includes(q)
  })
  const filtered = limit != null ? filteredAll.slice(0, limit) : filteredAll

  const countText = buildLookupCountText({
    loading: false,
    query,
    optionCount: filtered.length,
    totalCount: options.length,
    showNotFound: false,
  })

  const onPick = useCallback((opt, { advanceFocus = false } = {}) => {
    const val = getOptionValue(opt)
    onChange?.(val)
    setQuery(String(getOptionLabel(opt) ?? ''))
    setOpen(false)
    if (advanceFocus && inputRef.current) {
      requestAnimationFrame(() => focusNextEditable(inputRef.current))
    }
  }, [getOptionLabel, getOptionValue, onChange])

  const handleEnterNoSelection = useLookupAdvanceOnEnter({ setOpen, inputRef })

  const { handleKeyDown, pick } = useSearchableDropdownKeyboard({
    popupId,
    open: open && !disabled,
    setOpen,
    disabled,
    options: filtered,
    activeIndex,
    setActiveIndex,
    inputRef,
    resetIndexOn: [query],
    onOpen: () => {
      setOpen(true)
      setQuery('')
    },
    onPick: (opt) => onPick(opt, { advanceFocus: true }),
    onEnterNoSelection: handleEnterNoSelection,
  })

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <OutlinedField label={label} required={required} error={error} fieldClassName={fieldClass} htmlFor={id}>
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          value={open ? query : (selectedLabel || query)}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={disabled}
          required={required}
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? `${popupId}-listbox` : undefined}
          aria-label={typeof label === 'string' ? label : undefined}
          onChange={(e) => {
            if (disabled) return
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            if (disabled) return
            setOpen(true)
            setQuery('')
          }}
          onKeyDown={disabled ? undefined : handleKeyDown}
          className={`${controlClass}${disabled ? ' cursor-not-allowed opacity-60' : ''}`}
        />
      </OutlinedField>

      <SearchableDropdownPanel
        open={!disabled && open}
        anchorRef={inputRef}
        onClose={() => {
          setOpen(false)
          setQuery(selectedLabel ?? '')
        }}
        countText={countText}
        activeIndex={activeIndex}
      >
        {filtered.length === 0 && (
          <li className="lookup-dropdown-empty">{q ? 'No records found' : 'Type to search…'}</li>
        )}
        {filtered.map((opt, idx) => (
          <li key={`${String(getOptionValue(opt))}-${idx}`}>
            <button
              type="button"
              role="option"
              aria-selected={idx === activeIndex}
              data-lookup-active={idx === activeIndex ? 'true' : undefined}
              className={`lookup-dropdown-option${idx === activeIndex ? ' is-active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(opt)}
            >
              <span className="lookup-dropdown-option-primary">{getOptionLabel(opt)}</span>
            </button>
          </li>
        ))}
      </SearchableDropdownPanel>
    </div>
  )
}
