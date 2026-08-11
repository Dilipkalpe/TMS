import { HelpCircle } from 'lucide-react'
import { useKeyboardShortcutsOptional } from '../../context/KeyboardShortcutContext'

function KeyBadge({ children }) {
  return (
    <kbd className="rounded border border-primary/25 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary sm:text-[11px]">
      {children}
    </kbd>
  )
}

function ShortcutItem({ keys, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] text-slate-700 dark:text-slate-300">
      {keys.map((k) => (
        <KeyBadge key={k}>{k}</KeyBadge>
      ))}
      <span className="font-medium">{label}</span>
    </span>
  )
}

function TallySwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`}
      />
    </button>
  )
}

/**
 * Bottom shortcut bar — mockup style with key badges, Tally toggle, and Help.
 * @param {{ keys: string[], label: string }[]} shortcuts
 */
export default function KeyboardShortcutBar({ shortcuts = [] }) {
  const kbd = useKeyboardShortcutsOptional()
  const isTally = kbd?.tallyMode ?? false

  return (
    <div className="keyboard-shortcut-bar shrink-0 border-t border-slate-200 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 overflow-x-auto">
          {shortcuts.map((s) => (
            <ShortcutItem key={`${s.keys.join('-')}-${s.label}`} keys={s.keys} label={s.label} />
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-3 border-l border-slate-200 pl-3 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Tally Mode</span>
            <TallySwitch
              checked={isTally}
              onChange={(v) => kbd?.setKeyboardMode(v ? 'tally' : 'standard')}
            />
          </div>
          <button
            type="button"
            onClick={() => kbd?.openHelp?.()}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-primary hover:bg-primary/10"
            title="Keyboard help (F1)"
            aria-label="Keyboard help"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export const DELIVERY_COMPLETE_SHORTCUTS = [
  { keys: ['F2'], label: 'New Delivery' },
  { keys: ['F3'], label: 'Search' },
  { keys: ['F4'], label: 'Master Lookup' },
  { keys: ['F5'], label: 'Refresh' },
  { keys: ['F6'], label: 'POD Entry' },
  { keys: ['F7'], label: 'Print' },
  { keys: ['F8'], label: 'Preview' },
  { keys: ['Ctrl+P'], label: 'Print' },
  { keys: ['Esc'], label: 'Close' },
]

export const TRANSIT_PASS_SHORTCUTS = [
  { keys: ['F2'], label: 'New Transit Pass' },
  { keys: ['F3'], label: 'Search' },
  { keys: ['F4'], label: 'Master Lookup' },
  { keys: ['F6'], label: 'Delete Row' },
  { keys: ['F7'], label: 'Add Row' },
  { keys: ['F8'], label: 'Refresh' },
  { keys: ['Ctrl+S'], label: 'Save' },
  { keys: ['Ctrl+P'], label: 'Print' },
  { keys: ['Esc'], label: 'Close' },
]

export const DISPATCH_SHORTCUTS = [
  { keys: ['F2'], label: 'New Dispatch' },
  { keys: ['F3'], label: 'Search' },
  { keys: ['F5'], label: 'Refresh' },
  { keys: ['Ctrl+S'], label: 'Confirm Dispatch' },
  { keys: ['Ctrl+P'], label: 'Print' },
  { keys: ['Esc'], label: 'Close' },
]

export const IN_TRANSIT_SHORTCUTS = [
  { keys: ['F3'], label: 'Search' },
  { keys: ['F5'], label: 'Refresh' },
  { keys: ['F7'], label: 'Add Checkpoint' },
  { keys: ['Ctrl+S'], label: 'Save Status' },
  { keys: ['Esc'], label: 'Close' },
]

export const LOADING_SLIP_SHORTCUTS = [
  { keys: ['F2'], label: 'New Loading Slip' },
  { keys: ['F3'], label: 'Search' },
  { keys: ['F4'], label: 'Master Lookup' },
  { keys: ['F6'], label: 'Delete Row' },
  { keys: ['F7'], label: 'Add Row' },
  { keys: ['F8'], label: 'Refresh' },
  { keys: ['Ctrl+S'], label: 'Save' },
  { keys: ['Ctrl+P'], label: 'Print' },
  { keys: ['Esc'], label: 'Close' },
]

export const LR_LIST_SHORTCUTS = [
  { keys: ['F2'], label: 'New LR' },
  { keys: ['F3'], label: 'Search' },
  { keys: ['F4'], label: 'Master Lookup' },
  { keys: ['F6'], label: 'Delete Row' },
  { keys: ['F7'], label: 'Add Row' },
  { keys: ['F8'], label: 'Refresh' },
  { keys: ['Ctrl+S'], label: 'Save' },
  { keys: ['Ctrl+P'], label: 'Print' },
  { keys: ['Esc'], label: 'Close' },
]

export const POD_SHORTCUTS = [
  { keys: ['F2'], label: 'New POD' },
  { keys: ['F3'], label: 'Search' },
  { keys: ['F4'], label: 'Master Lookup' },
  { keys: ['F6'], label: 'Delete Row' },
  { keys: ['F7'], label: 'Add Row' },
  { keys: ['F8'], label: 'Preview' },
  { keys: ['Ctrl+S'], label: 'Save' },
  { keys: ['Ctrl+P'], label: 'Print' },
  { keys: ['Esc'], label: 'Close' },
]

export const BILLING_SHORTCUTS = [
  { keys: ['F2'], label: 'New Bill' },
  { keys: ['F3'], label: 'Search' },
  { keys: ['F4'], label: 'Master Lookup' },
  { keys: ['F6'], label: 'Delete Row' },
  { keys: ['F7'], label: 'Add Row' },
  { keys: ['F8'], label: 'Preview' },
  { keys: ['Ctrl+S'], label: 'Save' },
  { keys: ['Ctrl+P'], label: 'Print' },
  { keys: ['Esc'], label: 'Close' },
]
