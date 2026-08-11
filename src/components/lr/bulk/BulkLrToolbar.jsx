import { FileSpreadsheet, Layers, RotateCcw, Save } from 'lucide-react'

const SHORTCUTS = [
  { key: 'F2', label: 'Save All' },
  { key: 'F3', label: 'Party Search' },
  { key: 'F5 / F7', label: 'Add Row' },
  { key: 'F6', label: 'Clear' },
  { key: 'Ctrl+D', label: 'Duplicate Row' },
  { key: 'Ctrl+E', label: 'CSV Import' },
]

export default function BulkLrToolbar({
  saving = false,
  todayCount = 0,
  pendingCount = 0,
  onSaveAll,
  onClear,
  onImportClick,
  onTemplatesClick,
}) {
  return (
    <div className="bulk-lr-toolbar">
      <div className="bulk-lr-toolbar-top">
        <div className="min-w-0">
          <h1 className="bulk-lr-title">Ultra Fast LR Entry</h1>
          <p className="bulk-lr-subtitle">Create multiple LRs in seconds.</p>
        </div>
        <div className="bulk-lr-toolbar-actions">
          <button type="button" className="bulk-lr-btn bulk-lr-btn-primary" onClick={onSaveAll} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save All'}
            <span className="bulk-lr-kbd">F2</span>
          </button>
          <button type="button" className="bulk-lr-btn" onClick={onClear} disabled={saving}>
            <RotateCcw className="h-4 w-4" />
            Clear
            <span className="bulk-lr-kbd">F6</span>
          </button>
          <button type="button" className="bulk-lr-btn" onClick={onImportClick} disabled={saving}>
            <FileSpreadsheet className="h-4 w-4" />
            Excel Import
          </button>
          <button type="button" className="bulk-lr-btn" onClick={onTemplatesClick} disabled={saving}>
            <Layers className="h-4 w-4" />
            Templates
          </button>
        </div>
      </div>

      <div className="bulk-lr-shortcut-bar">
        <div className="bulk-lr-shortcuts">
          {SHORTCUTS.map((s) => (
            <span key={s.key} className="bulk-lr-shortcut-chip">
              <kbd>{s.key}</kbd>
              {s.label}
            </span>
          ))}
        </div>
        <div className="bulk-lr-badges">
          <span className="bulk-lr-badge bulk-lr-badge-info">Today LRs: {todayCount}</span>
          <span className={`bulk-lr-badge ${pendingCount > 0 ? 'bulk-lr-badge-warn' : 'bulk-lr-badge-ok'}`}>
            Pending: {pendingCount}
          </span>
        </div>
      </div>
    </div>
  )
}
