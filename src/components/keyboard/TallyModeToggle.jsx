import { Keyboard } from 'lucide-react'
import { useKeyboardShortcutsOptional } from '../../context/KeyboardShortcutContext'

export default function TallyModeToggle({ compact = false }) {
  const kbd = useKeyboardShortcutsOptional()
  if (!kbd) return null

  const { mode, setKeyboardMode, openHelp } = kbd
  const isTally = mode === 'tally'

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => setKeyboardMode(isTally ? 'standard' : 'tally')}
        className={`rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
          isTally
            ? 'bg-emerald-600 text-white'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
        }`}
        title={isTally ? 'Tally Mode ON — click for Standard' : 'Standard Mode — click for Tally'}
      >
        {isTally ? 'Tally' : 'Std'}
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <div className="mb-3 flex items-center gap-2">
        <Keyboard className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-slate-800 dark:text-white">Keyboard Mode</h3>
      </div>
      <p className="mb-4 text-sm text-slate-500">
        Tally Mode optimizes Enter-as-Tab, auto-focus, and Excel-like grid editing for high-volume data entry.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setKeyboardMode('standard')}
          className={`rounded-xl border-2 p-4 text-left transition-all ${
            mode === 'standard' ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-700'
          }`}
        >
          <p className="font-semibold">Standard Mode</p>
          <p className="text-sm text-slate-500">Mouse + keyboard — familiar browser behavior</p>
        </button>
        <button
          type="button"
          onClick={() => setKeyboardMode('tally')}
          className={`rounded-xl border-2 p-4 text-left transition-all ${
            mode === 'tally' ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-700'
          }`}
        >
          <p className="font-semibold">Tally Mode</p>
          <p className="text-sm text-slate-500">Keyboard-first — Enter, F-keys, Excel grids</p>
        </button>
      </div>
      <button type="button" onClick={openHelp} className="mt-4 text-sm text-primary hover:underline">
        View all shortcuts (F1)
      </button>
    </div>
  )
}
