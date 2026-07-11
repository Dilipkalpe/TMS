import { useState } from 'react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Select } from '../../components/ui/Input'
import EmployeeLookupSelect from '../../components/ui/EmployeeLookupSelect'
import ERPDataTable from '../../components/ui/ERPDataTable'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { useApiResource } from '../../hooks/useApiResource'
import { hrApi, unwrapList } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { CheckCircle, Loader2, Plus, XCircle } from 'lucide-react'

export default function LeaveManagement() {
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ employeeId: '', leaveTypeId: '', fromDate: '', toDate: '', days: 1, reason: '' })
  const { data: leaves, loading, error, refresh } = useApiResource(() => hrApi.leaves(), [])
  const { data: employees, refresh: refreshEmployees } = useApiResource(
    () => hrApi.employees({ pageSize: 200 }).then(unwrapList),
    [],
  )
  const { data: leaveTypes } = useApiResource(() => hrApi.leaveTypes(), [])

  const columns = [
    { key: 'employeeName', label: 'Employee' },
    { key: 'leaveTypeName', label: 'Leave Type' },
    { key: 'fromDate', label: 'From', render: (r) => r.fromDate?.slice(0, 10) },
    { key: 'toDate', label: 'To', render: (r) => r.toDate?.slice(0, 10) },
    { key: 'days', label: 'Days' },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => r.status === 'Pending' ? (
        <div className="flex gap-1">
          <Button size="sm" icon={CheckCircle} disabled={busy} onClick={() => act('approve', r.id)}>Approve</Button>
          <Button size="sm" variant="outline" icon={XCircle} disabled={busy} onClick={() => act('reject', r.id)}>Reject</Button>
        </div>
      ) : null,
    },
  ]

  const act = async (action, id) => {
    setBusy(true)
    try {
      if (action === 'approve') await hrApi.approveLeave(id)
      else await hrApi.rejectLeave(id)
      toast({ title: `Leave ${action}d`, type: 'success' })
      refresh()
    } catch (err) {
      toast({ title: 'Action failed', message: err.message, type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const submitLeave = async () => {
    if (!form.employeeId || !form.leaveTypeId || !form.fromDate || !form.toDate) {
      toast({ title: 'Missing fields', message: 'Employee, leave type, and dates are required.', type: 'error' })
      return
    }
    setBusy(true)
    try {
      await hrApi.applyLeave({
        ...form,
        employeeId: form.employeeId,
        leaveTypeId: form.leaveTypeId,
        days: Number(form.days),
      })
      toast({ title: 'Leave applied', type: 'success' })
      setShowForm(false)
      refresh()
    } catch (err) {
      toast({ title: 'Failed', message: err.message, type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <ERPContentPage module="HR" title="Leave Management">
      <div className="mb-4 flex justify-end">
        <Button icon={Plus} onClick={() => setShowForm(!showForm)}>Apply Leave</Button>
      </div>

      {showForm && (
        <Card className="mb-4">
          <CardHeader title="New Leave Request" />
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <EmployeeLookupSelect
              label="Employee"
              employees={employees ?? []}
              employeeId={form.employeeId}
              onEmployeeChange={(id) => setForm((p) => ({ ...p, employeeId: id }))}
              onEmployeesRefresh={async () => {
                await refreshEmployees()
                return unwrapList(await hrApi.employees({ pageSize: 200 }))
              }}
            />
            <Select
              label="Leave Type"
              options={[{ value: '', label: 'Select…' }, ...(leaveTypes ?? []).map((t) => ({ value: t.id, label: t.name }))]}
              value={form.leaveTypeId}
              onChange={(e) => setForm((p) => ({ ...p, leaveTypeId: e.target.value }))}
            />
            <Input label="Days" type="number" value={form.days} onChange={(e) => setForm((p) => ({ ...p, days: e.target.value }))} />
            <Input label="From Date" type="date" value={form.fromDate} onChange={(e) => setForm((p) => ({ ...p, fromDate: e.target.value }))} />
            <Input label="To Date" type="date" value={form.toDate} onChange={(e) => setForm((p) => ({ ...p, toDate: e.target.value }))} />
            <Input label="Reason" value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} className="sm:col-span-2" />
          </div>
          <div className="flex gap-2 p-4 pt-0">
            <Button icon={busy ? Loader2 : Plus} disabled={busy} onClick={submitLeave}>Submit</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Leave Requests" />
        {error && (
          <div className="mx-4 mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}
        {loading ? (
          <p className="p-4 text-slate-500">Loading…</p>
        ) : (
          <ERPDataTable columns={columns} data={leaves ?? []} emptyMessage="No leave requests." />
        )}
      </Card>
    </ERPContentPage>
  )
}
