import { useState } from 'react'
import Modal from '../../ui/Modal'
import Button from '../../ui/Button'
import Input from '../../ui/Input'

export default function BulkLrTemplatesModal({
  open,
  onClose,
  templates = [],
  onSaveCurrent,
  onApply,
  onDelete,
}) {
  const [name, setName] = useState('')

  return (
    <Modal open={open} onClose={onClose} title="Bulk LR Templates" size="md">
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Input
            label="Save current common details as"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Delhi–Mumbai PTL"
            className="flex-1"
          />
          <Button
            type="button"
            onClick={() => {
              const trimmed = name.trim()
              if (!trimmed) return
              onSaveCurrent(trimmed)
              setName('')
            }}
          >
            Save Template
          </Button>
        </div>

        {templates.length === 0 ? (
          <p className="text-sm text-slate-500">No saved templates yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
            {templates.map((t) => (
              <li key={t.name} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{t.name}</p>
                  <p className="truncate text-[11px] text-slate-500">
                    {t.common?.from || '—'} → {t.common?.to || '—'} · {t.common?.consignor || 'No consignor'}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button size="sm" variant="outline" type="button" onClick={() => onApply(t)}>
                    Apply
                  </Button>
                  <Button size="sm" variant="outline" type="button" className="text-red-600" onClick={() => onDelete(t.name)}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}
