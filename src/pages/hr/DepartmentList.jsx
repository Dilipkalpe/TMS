import { useState } from 'react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import ERPDataTable from '../../components/ui/ERPDataTable'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { useApiResource } from '../../hooks/useApiResource'
import { hrApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { Building2, Loader2, Save } from 'lucide-react'

export default function DepartmentList() {
  const { toast } = useToast()
  const [form, setForm] = useState({ code: '', name: '', description: '' })
  const [saving, setSaving] = useState(false)
  const { data: departments, loading, error, refresh } = useApiResource(() => hrApi.departments(), [])

  const columns = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Department' },
    { key: 'description', label: 'Description' },
    { key: 'employeeCount', label: 'Employees' },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
  ]

  const handleSave = async () => {
    setSaving(true)
    try {
      await hrApi.saveDepartment(form)
      toast({ title: 'Saved', type: 'success' })
      setForm({ code: '', name: '', description: '' })
      refresh()
    } catch (err) {
      toast({ title: 'Save failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ERPContentPage module="HR" title="Departments">
      <Card className="mb-4">
        <CardHeader title="Add Department" />
        <div className="grid gap-4 p-4 sm:grid-cols-3">
          <Input label="Code" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
          <Input label="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <Input label="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
        </div>
        <div className="px-4 pb-4">
          <Button icon={saving ? Loader2 : Save} disabled={saving} onClick={handleSave}>Add Department</Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="All Departments" />
        {error && (
          <div className="mx-4 mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}
        {loading ? <p className="p-4 text-slate-500">Loading…</p> : (
          <ERPDataTable columns={columns} data={departments ?? []} emptyMessage="No departments." />
        )}
      </Card>
    </ERPContentPage>
  )
}
