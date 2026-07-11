import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'
import ERPDataTable from '../../components/ui/ERPDataTable'
import { useApiResource } from '../../hooks/useApiResource'
import { hrApi } from '../../services/api'

export default function HolidaysPage() {
  const year = new Date().getFullYear()
  const { data: holidays, loading } = useApiResource(() => hrApi.holidays(year), [year])

  const columns = [
    { key: 'holidayDate', label: 'Date', render: (r) => r.holidayDate?.slice(0, 10) },
    { key: 'name', label: 'Holiday' },
    { key: 'year', label: 'Year' },
  ]

  return (
    <ERPContentPage module="HR" title="Holiday Calendar">
      <Card>
        <CardHeader title={`Holidays ${year}`} />
        {loading ? (
          <p className="p-4 text-slate-500">Loading…</p>
        ) : (
          <ERPDataTable columns={columns} data={holidays ?? []} emptyMessage="No holidays configured." />
        )}
      </Card>
    </ERPContentPage>
  )
}
