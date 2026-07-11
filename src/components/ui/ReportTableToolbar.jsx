import Button from './Button'
import { TablePrintButton } from '../print/ReportPrintButton'
import { Download } from 'lucide-react'
import { exportToCsv } from '../../utils/export'
import { useToast } from '../../context/ToastContext'

export default function ReportTableToolbar({ title, columns, rows, filename, summary }) {
  const { toast } = useToast()

  const handleExport = () => {
    const ok = exportToCsv(rows, columns, filename ?? 'report-export.csv')
    if (ok) toast({ title: 'Export complete', message: `${rows.length} rows exported`, type: 'success' })
    else toast({ title: 'Nothing to export', type: 'warning' })
  }

  return (
    <div className="mb-4 flex flex-wrap justify-end gap-2">
      <Button variant="outline" size="sm" icon={Download} onClick={handleExport}>Export Data</Button>
      <TablePrintButton title={title} columns={columns} rows={rows} summary={summary} />
    </div>
  )
}
