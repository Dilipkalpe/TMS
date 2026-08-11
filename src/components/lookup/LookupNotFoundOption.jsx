/**
 * "Record Not Found" row shown inside lookup dropdown lists.
 */
export default function LookupNotFoundOption({ entityLabel, query, active, onActivate }) {
  return (
    <li role="presentation">
      <button
        type="button"
        role="option"
        aria-selected={active}
        data-lookup-active={active ? 'true' : undefined}
        className={`lookup-dropdown-option lookup-dropdown-option--not-found${
          active ? ' is-active' : ''
        }`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onActivate}
      >
        <span className="lookup-dropdown-option-primary">Record Not Found</span>
        <span className="lookup-dropdown-option-secondary">
          Press Enter to Add {entityLabel}
        </span>
        {query?.trim() ? (
          <span className="lookup-dropdown-option-secondary truncate">
            &ldquo;{query.trim()}&rdquo;
          </span>
        ) : null}
      </button>
    </li>
  )
}
