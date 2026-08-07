import Modal from '../ui/Modal'
import { shortcutsForHelp, formatShortcutKeys } from '../../keyboard/shortcutRegistry'

const GROUPS = [
  { title: 'Global', filter: (s) => s.scope === 'global' || s.id === 'help' || s.id === 'search' },
  { title: 'Save & Actions', filter: (s) => s.scope === 'page' },
  { title: 'Navigation', filter: (s) => s.scope === 'navigation' },
  { title: 'Search & Lookup', filter: (s) => ['search', 'master-lookup'].includes(s.id) },
  { title: 'Grid Editing', filter: (s) => s.scope === 'grid' },
  { title: 'Tabs', filter: (s) => s.id.startsWith('tab-') },
  { title: 'Focus (Tally Mode)', filter: (s) => s.action?.startsWith('focus:') },
]

export default function KeyboardHelpModal({ open, onClose, tallyMode }) {
  const shortcuts = shortcutsForHelp({ tallyMode })

  return (
    <Modal open={open} onClose={onClose} title="Keyboard Shortcuts (F1)" size="xl">
      <div className="space-y-6">
        <p className="text-sm text-slate-500">
          {tallyMode
            ? 'Tally Mode is ON — Enter moves to next field, shortcuts optimized for data entry.'
            : 'Standard Mode — use mouse + keyboard. Enable Tally Mode in Settings for faster entry.'}
        </p>
        {GROUPS.map((group) => {
          const items = shortcuts.filter(group.filter)
          if (!items.length) return null
          return (
            <div key={group.title}>
              <h3 className="mb-2 text-sm font-semibold text-slate-800 dark:text-white">{group.title}</h3>
              <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full text-sm">
                  <tbody>
                    {items.map((s) => (
                      <tr key={s.id} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-primary">
                          {formatShortcutKeys(s.keys)}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{s.label}</td>
                        <td className="hidden px-3 py-2 text-slate-500 sm:table-cell">{s.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
        <p className="text-xs text-slate-400">Press Esc to close · Priority: Popup → Grid → Form → Global</p>
      </div>
    </Modal>
  )
}
