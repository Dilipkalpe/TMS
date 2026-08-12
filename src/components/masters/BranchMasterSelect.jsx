import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import OutlinedField, { OUTLINED_CONTROL_CLASS } from '../ui/OutlinedField'
import SearchableDropdownPanel from '../ui/SearchableDropdownPanel'
import { useSearchableDropdownKeyboard } from '../../hooks/useSearchableDropdownKeyboard'
import { useLookupAdvanceOnEnter } from '../../hooks/useLookupNotFoundEnter'
import { focusNextEditable } from '../../keyboard/keyUtils'
import { useBranch } from '../../context/BranchContext'

function displayLines(row) {
  const primary = row?.name ?? ''
  const secondary = row?.code && row.code !== row.name ? row.code : row?.city
  return { primary, secondary: secondary || '' }
}

function formatLabel(row) {
  const { primary, secondary } = displayLines(row)
  return secondary ? `${primary} — ${secondary}` : primary
}

function filterBranches(branches, query) {
  const q = query.trim().toLowerCase()
  if (!q) return branches
  return branches.filter((b) =>
    [b.name, b.code, b.city, b.state].some((v) => v && String(v).toLowerCase().includes(q)),
  )
}

/** Searchable branch picker bound to branch master (client-filtered list). */
export default function BranchMasterSelect({
  label = 'Branch / Warehouse',
  displayValue = '',
  onSelect,
  placeholder = 'Search branch…',
  className = '',
  disabled = false,
  error,
}) {
  const { branches, loading } = useBranch()
  const [query, setQuery] = useState(displayValue || '')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef(null)
  const popupId = useRef(`branch-master-${Math.random().toString(36).slice(2)}`).current

  const options = useMemo(
    () => filterBranches(branches.filter((b) => b.isActive !== false), query).slice(0, 25),
    [branches, query],
  )

  useEffect(() => {
    setQuery(displayValue || '')
  }, [displayValue])

  const onPick = useCallback((row, { advanceFocus = false } = {}) => {
    setQuery(formatLabel(row))
    setOpen(false)
    onSelect?.(row)
    if (advanceFocus && inputRef.current) {
      requestAnimationFrame(() => focusNextEditable(inputRef.current))
    }
  }, [onSelect])

  const handleEnterNoSelection = useLookupAdvanceOnEnter({ setOpen, inputRef })

  const { handleKeyDown, pick } = useSearchableDropdownKeyboard({
    popupId,
    open,
    setOpen,
    disabled: disabled || loading,
    loading,
    options,
    navigableCount: options.length,
    activeIndex,
    setActiveIndex,
    inputRef,
    resetIndexOn: [query],
    onOpen: () => setOpen(true),
    onPick: (row) => onPick(row, { advanceFocus: true }),
    onEnterNoSelection: handleEnterNoSelection,
  })

  const countText = loading
    ? 'Loading branches…'
    : options.length
      ? `${options.length} branch${options.length === 1 ? '' : 'es'}`
      : (query.trim() ? 'No branches found' : 'Type to search…')

  return (
    <div className={`relative ${className}`}>
      <OutlinedField label={label} error={error}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled || loading}
          readOnly={disabled}
          placeholder={loading ? 'Loading branches…' : placeholder}
          role="combobox"
          aria-expanded={open}
          aria-label={label}
          className={OUTLINED_CONTROL_CLASS}
          onFocus={() => { if (!disabled) setOpen(true) }}
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
        {loading && <li className="lookup-dropdown-empty">Loading…</li>}
        {!loading && options.length === 0 && (
          <li className="lookup-dropdown-empty">{query.trim() ? 'No branches found' : 'Type to search…'}</li>
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
  )
}
