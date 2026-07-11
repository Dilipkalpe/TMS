import { useState } from 'react'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Select } from '../../components/ui/Input'
import ERPDataTable from '../../components/ui/ERPDataTable'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { useApiResource } from '../../hooks/useApiResource'
import { hrApi, unwrapList } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { CalendarCheck, Loader2, Users } from 'lucide-react'

const STATUSES = ['Present', 'Absent', 'Half Day', 'Leave', 'Holiday']

export default function AttendancePage() {
  const { toast } = useToast()
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [busy, setBusy] = useState(false)
  const { data: attendance, loading, error, refresh } = useApiResource(
    () => hrApi.attendance({ date }),
    [date],
  )
  const { data: employees } = useApiResource(
    () => hrApi.employees({ status: 'Active', pageSize: 200 }).then(unwrapList),
    [],
  )

  const columns = [
    { key: 'employeeCode', label: 'Code' },
    { key: 'employeeName', label: 'Employee' },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
    { key: 'checkIn', label: 'Check In', render: (r) => r.checkIn?.slice(0, 5) ?? '—' },
    { key: 'checkOut', label: 'Check Out', render: (r) => r.checkOut?.slice(0, 5) ?? '—' },
    { key: 'overtimeHours', label: 'OT Hrs' },
  ]

  const markAllPresent = async () => {
    if (!employees?.length) return
    setBusy(true)
    try {
      const result = await hrApi.bulkAttendance({
        date,
        employeeIds: employees.map((e) => e.id),
        status: 'Present',
      })
      toast({ title: 'Attendance marked', message: `${result.count ?? result} employees marked present.`, type: 'success' })
      refresh()
    } catch (err) {
      toast({ title: 'Failed', message: err.message, type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <ERPContentPage module="HR" title="Attendance">
      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-4 p-4">
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
          <Button icon={busy ? Loader2 : Users} disabled={busy} onClick={markAllPresent}>
            Mark All Active Present
          </Button>
        </div>
      </Card>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-slate-500"><CalendarCheck className="h-5 w-5" /> Loading attendance…</div>
      ) : (
        <Card>
          <CardHeader title={`Attendance — ${date}`} subtitle={`${attendance?.length ?? 0} records`} />
          <ERPDataTable columns={columns} data={attendance ?? []} emptyMessage="No attendance for this date. Use Mark All Present." />
        </Card>
      )}
    </ERPContentPage>
  )
}
