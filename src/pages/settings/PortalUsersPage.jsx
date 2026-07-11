import { useState } from 'react'
import { Link } from 'react-router-dom'
import { KeyRound, Shield, UserCircle } from 'lucide-react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import TablePagination from '../../components/ui/TablePagination'
import { customersApi } from '../../services/api'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { useToast } from '../../context/ToastContext'

function randomPin() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export default function PortalUsersPage() {
  const { toast } = useToast()
  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => customersApi.portalAccessList(buildListParams({ page, pageSize, search })),
    [],
  )
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ enabled: true, pin: '', phone: '' })
  const [saving, setSaving] = useState(false)

  const openEdit = (row) => {
    setEditing(row.id)
    setForm({
      enabled: row.portalEnabled,
      pin: '',
      phone: row.portalPhone?.replace(/\D/g, '').slice(-10) ?? '',
    })
  }

  const save = async () => {
    if (!editing) return
    if (form.enabled && !form.pin && !paged.items.find((r) => r.id === editing)?.hasPin) {
      toast({ title: 'PIN required', message: 'Set a 6-digit PIN for new portal access', type: 'error' })
      return
    }
    setSaving(true)
    try {
      await customersApi.setPortalAccess(editing, {
        enabled: form.enabled,
        pin: form.pin || undefined,
        phone: form.phone || undefined,
      })
      toast({ title: 'Saved', message: 'Portal access updated', type: 'success' })
      setEditing(null)
      await paged.refresh()
    } catch (e) {
      toast({ title: 'Save failed', message: e.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const enabledOnPage = paged.items.filter((r) => r.portalEnabled).length
  const totalPages = Math.max(1, Math.ceil(Math.max(paged.total, 1) / paged.pageSize))
  const displayPages = paged.hasMore ? Math.max(totalPages, paged.page + 1) : totalPages

  return (
    <ERPContentPage module="Settings" title="Portal User Access">
      <p className="mb-4 text-sm text-slate-500">
        Provision customer portal logins (phone + PIN). Customers sign in at{' '}
        <Link to="/portal/login" className="text-primary hover:underline">/portal/login</Link>.
        {' '}
        <Link to="/operations/customer-portal" className="text-primary hover:underline">View all shipments (admin)</Link>
      </p>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-3 p-4">
          <UserCircle className="h-8 w-8 text-primary" />
          <div><p className="text-xs text-slate-500">Customers</p><p className="text-xl font-bold">{paged.total.toLocaleString('en-IN')}</p></div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <Shield className="h-8 w-8 text-green-600" />
          <div><p className="text-xs text-slate-500">Enabled on page</p><p className="text-xl font-bold">{enabledOnPage}</p></div>
        </Card>
        <Card className="p-4 text-sm">
          <p className="font-medium text-slate-800 dark:text-slate-100">Demo PINs (temp)</p>
          <p className="mt-1 text-xs text-slate-500">Mumbai 123456 · Pune 234567 · Delhi 345678</p>
        </Card>
      </div>

      <div className="mb-3">
        <Input
          label="Search customers"
          value={paged.search}
          onChange={(e) => paged.setSearch(e.target.value)}
          placeholder="Name or phone..."
        />
      </div>

      {editing && (
        <Card className="mb-4 space-y-3 border-primary/30 p-4">
          <h3 className="font-semibold">Edit portal access — {paged.items.find((r) => r.id === editing)?.name}</h3>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} />
            Portal enabled
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Portal phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="9820012345" />
            <Input label="New PIN (6 digits)" value={form.pin} onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value }))} placeholder="Leave blank to keep existing" />
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save access'}</Button>
            <Button variant="secondary" onClick={() => setForm((f) => ({ ...f, pin: randomPin() }))}>Generate PIN</Button>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </Card>
      )}

      <Card className="overflow-x-auto p-0">
        {paged.loading ? (
          <p className="p-4 text-sm text-slate-500">Loading…</p>
        ) : paged.error ? (
          <p className="p-4 text-sm text-red-600">{paged.error}</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-2 text-left">Customer</th>
                  <th className="px-4 py-2 text-left">Branch</th>
                  <th className="px-4 py-2 text-left">Portal phone</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.items.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2">
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-slate-500">{r.id}</p>
                    </td>
                    <td className="px-4 py-2">{r.branchName ? `${r.branchCode} — ${r.branchName}` : '—'}</td>
                    <td className="px-4 py-2">{r.portalPhone ?? '—'}</td>
                    <td className="px-4 py-2">
                      {r.portalEnabled ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-950 dark:text-green-300">
                          {r.hasPin ? 'Active' : 'No PIN'}
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Disabled</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button type="button" onClick={() => openEdit(r)} className="inline-flex items-center gap-1 text-primary hover:underline">
                        <KeyRound className="h-3.5 w-3.5" /> Provision
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TablePagination
              page={paged.page}
              totalPages={displayPages}
              totalRecords={paged.total}
              pageSize={paged.pageSize}
              hasMore={paged.hasMore}
              totalIsApproximate={paged.totalIsApproximate}
              onPageChange={paged.setPage}
              onPageSizeChange={paged.setPageSize}
            />
          </>
        )}
      </Card>
    </ERPContentPage>
  )
}
