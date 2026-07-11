import { useEffect, useState } from 'react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { branchesApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { useBranch } from '../../context/BranchContext'
import { Plus, Pencil, Trash2 } from 'lucide-react'

const emptyForm = { code: '', name: '', city: '', state: '', phone: '', address: '', isHeadOffice: false, isActive: true }

export default function BranchesPage() {
  const { toast } = useToast()
  const { reloadBranches } = useBranch()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = () => branchesApi.list(false)
    .then(setRows)
    .catch((e) => toast({ title: 'Load failed', message: e.message, type: 'error' }))

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [toast])

  const resetForm = () => { setForm(emptyForm); setEditingId(null) }

  const save = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast({ title: 'Validation', message: 'Code and name are required', type: 'error' })
      return
    }
    setSaving(true)
    try {
      if (editingId) await branchesApi.update(editingId, form)
      else await branchesApi.create(form)
      toast({ title: 'Saved', message: editingId ? 'Branch updated' : 'Branch created', type: 'success' })
      resetForm()
      await load()
      await reloadBranches()
    } catch (e) {
      toast({ title: 'Save failed', message: e.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const edit = (b) => {
    setEditingId(b.id)
    setForm({
      code: b.code,
      name: b.name,
      city: b.city ?? '',
      state: b.state ?? '',
      phone: b.phone ?? '',
      address: b.address ?? '',
      isHeadOffice: b.isHeadOffice,
      isActive: b.isActive,
    })
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this branch?')) return
    try {
      await branchesApi.remove(id)
      toast({ title: 'Deleted', type: 'success' })
      await load()
      await reloadBranches()
    } catch (e) {
      toast({ title: 'Delete failed', message: e.message, type: 'error' })
    }
  }

  return (
    <ERPContentPage module="Settings" title="Branches">
      <p className="mb-4 text-sm text-slate-500">
        Manage depot / office locations. Admins can switch branches from the header; branch managers see only their assigned branch.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3 p-4">
          <h3 className="font-semibold">{editingId ? 'Edit branch' : 'Add branch'}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="PUN" />
            <Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Input label="City" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            <Input label="State" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            <Input label="Address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="sm:col-span-2" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isHeadOffice} onChange={(e) => setForm((f) => ({ ...f, isHeadOffice: e.target.checked }))} />
            Head office
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
            Active
          </label>
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : editingId ? 'Update' : 'Add branch'}</Button>
            {editingId && <Button variant="secondary" onClick={resetForm}>Cancel</Button>}
          </div>
        </Card>

        <Card className="overflow-x-auto p-0">
          {loading ? (
            <p className="p-4 text-sm text-slate-500">Loading…</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-2 text-left">Code</th>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">City</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b.id} className="border-t">
                    <td className="px-4 py-2 font-medium">{b.code}{b.isHeadOffice ? ' ★' : ''}</td>
                    <td className="px-4 py-2">{b.name}</td>
                    <td className="px-4 py-2">{b.city ?? '—'}</td>
                    <td className="px-4 py-2">{b.isActive ? 'Active' : 'Inactive'}</td>
                    <td className="px-4 py-2 text-right">
                      <button type="button" className="mr-2 text-primary hover:underline" onClick={() => edit(b)} title="Edit"><Pencil className="inline h-4 w-4" /></button>
                      {!b.isHeadOffice && (
                        <button type="button" className="text-red-600 hover:underline" onClick={() => remove(b.id)} title="Delete"><Trash2 className="inline h-4 w-4" /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Card className="mt-4 p-4 text-sm text-slate-600 dark:text-slate-400">
        <p className="font-medium text-slate-800 dark:text-slate-100">Demo branch user</p>
        <p className="mt-1"><code>pune_mgr</code> / <code>branch123</code> — Branch Manager (Pune only)</p>
      </Card>
    </ERPContentPage>
  )
}
