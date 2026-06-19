import { GripVertical } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

export default function WidgetPickerModal({ open, onClose, widgets, visibleIds, onToggle, onReset, onSelectAll, onClearAll}) {
  const visibleCount = visibleIds.length

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Customize Dashboard Widgets"
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between space-x-2">
          <p className="text-xs text-slate-500">{visibleCount} of {widgets.length} widgets visible</p>
          <div className="flex flex-wrap space-x-2">
            <Button variant="outline" size="sm" onClick={onSelectAll}>Select all</Button>
            <Button variant="outline" size="sm" onClick={onClearAll}>Clear all</Button>
            <Button variant="outline" size="sm" onClick={onReset}>Reset default</Button>
            <Button size="sm" onClick={onClose}>Done</Button>
          </div>
        </div>
      }
    >
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        Choose which analytics charts appear on your dashboard. Preferences are saved locally.
      </p>
      <div className="grid grid-cols-1 space-y-2 sm:grid-cols-2 sm:space-y-0 sm:[&>*]:mb-2">
        {widgets.map((w) => {
          const checked = visibleIds.includes(w.id)
          return (
            <label
              key={w.id}
              className={`flex cursor-pointer items-center space-x-3 rounded-xl border p-3 transition-colors ${
                checked
                  ? 'border-primary/40 bg-primary/5 dark:bg-primary/10'
                  : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(w.id)}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <GripVertical className="h-4 w-4 text-slate-300" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{w.title}</p>
                <p className="text-xs text-slate-500">{w.type} chart</p>
              </div>
            </label>
          )
        })}
      </div>
    </Modal>
  )
}
