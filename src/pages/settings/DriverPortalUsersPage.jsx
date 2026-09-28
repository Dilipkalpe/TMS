import { useMemo, useState } from 'react'
import { KeyRound, Smartphone } from 'lucide-react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import ERPDataTable from '../../components/ui/ERPDataTable'
import TablePagination from '../../components/ui/TablePagination'
import { driverPortalApi } from '../../services/api'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { useToast } from '../../context/ToastContext'

function randomPin() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export default function DriverPortalUsersPage() {
  const { toast } = useToast()
  const paged = usePagedApiResource(
    ({ page, pageSize, search }) => driverPortalApi.portalAccessList(buildListParams({ page, pageSize, search })),
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
      toast({ title: 'PIN required', message: 'Set a 6-digit PIN for new driver portal access', type: 'error' })
      return
    }
    setSaving(true)
    try {
      await driverPortalApi.setDriverPortal(editing, {
        enabled: form.enabled,
        pin: form.pin || undefined,
        phone: form.phone || undefined,
      })
      toast({ title: 'Saved', message: 'Driver portal access updated', type: 'success' })
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

  const columns = useMemo(() => [
    {
      key: 'name',
      label: 'Driver',
      render: (r) => (
        <div>
          <p className="font-medium">{r.name}</p>
          <p className="text-xs text-slate-500">{r.id}</p>
        </div>
      ),
    },
    { key: 'portalPhone', label: 'Portal phone', render: (r) => r.portalPhone ?? '—' },
    {
      key: 'status',
      label: 'Status',
      render: (r) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.portalEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
          {r.portalEnabled ? (r.hasPin ? 'Enabled' : 'Enabled (no PIN)') : 'Disabled'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <Button size="sm" variant="outline" onClick={() => openEdit(r)}>Manage</Button>
      ),
    },
  ], [])

  return (
    <ERPContentPage module="Settings" title="Driver Portal Access">
      <Card className="mb-4 p-4">
        <div className="flex items-start gap-3">
          <Smartphone className="mt-0.5 h-5 w-5 text-emerald-600" />
          <div>
            <p className="font-medium">Allow Driver App Access</p>
            <p className="mt-1 text-sm text-slate-500">
              Optional (default OFF). Enable a driver with mobile + Access PIN to use{' '}
              <code className="rounded bg-slate-100 px-1">/driver</code>. Drivers with access OFF keep working normally in TMS
              and cannot log in to the Driver Portal.
            </p>
            <p className="mt-1 text-xs text-slate-400">{enabledOnPage} enabled on this page</p>
          </div>
        </div>
      </Card>

      <ERPDataTable
        columns={columns}
        rows={paged.items}
        loading={paged.loading}
        search={paged.search}
        onSearchChange={paged.setSearch}
        emptyMessage="No drivers found"
      />
      <TablePagination
        page={paged.page}
        pageSize={paged.pageSize}
        totalPages={displayPages}
        onPageChange={paged.setPage}
        onPageSizeChange={paged.setPageSize}
      />

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <Card className="w-full max-w-md p-5">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <KeyRound className="h-5 w-5" /> Portal access
            </h3>
            <label className="mb-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
              />
              Allow Driver App Access
            </label>
            <p className="mb-2 text-sm text-slate-600">
              Driver Portal Access: <strong>{form.enabled ? 'Enabled' : 'Disabled'}</strong>
            </p>
            <Input
              label="Mobile Number"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 15) }))}
            />
            <div className="mt-3 flex gap-2">
              <Input
                label="Driver App Access PIN"
                type="password"
                value={form.pin}
                onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 8) }))}
                placeholder="Leave blank to keep existing"
              />
              <Button type="button" variant="outline" className="mt-6" onClick={() => setForm((f) => ({ ...f, pin: randomPin() }))}>
                Generate
              </Button>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </Card>
        </div>
      )}
    </ERPContentPage>
  )
}
