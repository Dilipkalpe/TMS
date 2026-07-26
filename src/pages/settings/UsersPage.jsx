import { useEffect, useState } from 'react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Select } from '../../components/ui/Input'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { branchesApi, usersApi, unwrapList } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { Pencil, Trash2, UserPlus } from 'lucide-react'

const ROLES = ['Admin', 'Branch Manager', 'Accountant', 'Operator']

const emptyForm = {
  username: '',
  fullName: '',
  email: '',
  mobile: '',
  password: '',
  confirmPassword: '',
  role: 'Operator',
  branchIds: [],
  isActive: true,
}

export default function UsersPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [usersRes, branchRes] = await Promise.all([
      usersApi.list({ page: 1, pageSize: 200 }),
      branchesApi.list(false),
    ])
    setRows(unwrapList(usersRes))
    setBranches(unwrapList(branchRes))
  }

  useEffect(() => {
    load()
      .catch((e) => toast({ title: 'Load failed', message: e.message, type: 'error' }))
      .finally(() => setLoading(false))
  }, [toast])

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const toggleBranch = (id) => {
    setForm((f) => {
      const set = new Set(f.branchIds.map(String))
      const key = String(id)
      if (set.has(key)) set.delete(key)
      else set.add(key)
      return { ...f, branchIds: [...set] }
    })
  }

  const save = async () => {
    if (!form.username.trim() || !form.fullName.trim()) {
      toast({ title: 'Validation', message: 'Username and display name are required', type: 'error' })
      return
    }
    if (!editingId && (!form.password || form.password.length < 6)) {
      toast({ title: 'Validation', message: 'Password must be at least 6 characters', type: 'error' })
      return
    }
    if (form.password && form.password !== form.confirmPassword) {
      toast({ title: 'Validation', message: 'Password and Confirm Password do not match', type: 'error' })
      return
    }
    if (form.role !== 'Admin' && form.branchIds.length === 0) {
      toast({ title: 'Validation', message: 'Select at least one branch', type: 'error' })
      return
    }

    setSaving(true)
    try {
      const payload = {
        username: form.username.trim(),
        fullName: form.fullName.trim(),
        email: form.email.trim() || null,
        mobile: form.mobile.trim() || null,
        role: form.role,
        branchIds: form.branchIds,
        branchId: form.branchIds[0] || null,
        isActive: form.isActive,
        password: form.password || null,
        confirmPassword: form.confirmPassword || null,
      }
      if (editingId) await usersApi.update(editingId, payload)
      else await usersApi.create(payload)
      toast({ title: 'Saved', message: editingId ? 'User updated' : 'User created', type: 'success' })
      resetForm()
      await load()
    } catch (e) {
      toast({ title: 'Save failed', message: e.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const edit = (u) => {
    setEditingId(u.id)
    setForm({
      username: u.username || '',
      fullName: u.fullName || '',
      email: u.email || '',
      mobile: u.mobile || '',
      password: '',
      confirmPassword: '',
      role: u.role || 'Operator',
      branchIds: (u.branchIds || []).map(String),
      isActive: u.isActive !== false,
    })
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this user?')) return
    try {
      await usersApi.remove(id)
      toast({ title: 'Deleted', type: 'success' })
      await load()
    } catch (e) {
      toast({ title: 'Delete failed', message: e.message, type: 'error' })
    }
  }

  return (
    <ERPContentPage module="Settings" title="User Management">
      <p className="mb-4 text-sm text-slate-500">
        Create staff users with company, role and branch access. Passwords are stored with BCrypt hashing — never as plain text.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3 p-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <UserPlus className="h-4 w-4 text-primary" />
            {editingId ? 'Edit user' : 'Add user'}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="User Name" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
            <Input label="Display Name" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <Input label="Mobile" value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} />
            <Input label={editingId ? 'New Password (optional)' : 'Password'} type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            <Input label="Confirm Password" type="password" value={form.confirmPassword} onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))} />
            <Select
              label="Role"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              options={ROLES.map((r) => ({ value: r, label: r }))}
            />
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
              Active
            </label>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Branches</p>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-slate-700">
              {branches.length === 0 && <p className="text-xs text-slate-500">No branches available</p>}
              {branches.map((b) => (
                <label key={String(b.id)} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={form.branchIds.map(String).includes(String(b.id))}
                    onChange={() => toggleBranch(b.id)}
                  />
                  <span>{b.code ? `${b.code} — ${b.name}` : b.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : editingId ? 'Update' : 'Create user'}</Button>
            {editingId && <Button variant="secondary" onClick={resetForm}>Cancel</Button>}
          </div>
        </Card>

        <Card className="overflow-x-auto p-0">
          {loading ? (
            <p className="p-4 text-sm text-slate-500">Loading…</p>
          ) : (
            <table className="w-max min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2 text-left">User</th>
                  <th className="whitespace-nowrap px-3 py-2 text-left">Display Name</th>
                  <th className="whitespace-nowrap px-3 py-2 text-left">Role</th>
                  <th className="whitespace-nowrap px-3 py-2 text-left">Branches</th>
                  <th className="whitespace-nowrap px-3 py-2 text-left">Status</th>
                  <th className="whitespace-nowrap px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="whitespace-nowrap px-3 py-2">{u.username}</td>
                    <td className="max-w-[10rem] truncate px-3 py-2" title={u.fullName}>{u.fullName}</td>
                    <td className="whitespace-nowrap px-3 py-2">{u.role}</td>
                    <td className="max-w-[12rem] truncate px-3 py-2" title={(u.branchNames || []).join(', ')}>
                      {(u.branchNames || []).join(', ') || '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <Badge variant={statusVariant(u.isActive ? 'Active' : 'Cancelled')}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <button type="button" className="mr-2 text-primary" onClick={() => edit(u)} title="Edit"><Pencil className="inline h-4 w-4" /></button>
                      <button type="button" className="text-red-500" onClick={() => remove(u.id)} title="Delete"><Trash2 className="inline h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No users yet</td></tr>
                )}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </ERPContentPage>
  )
}
