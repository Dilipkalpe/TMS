import Button from '../ui/Button'
import { Printer } from 'lucide-react'
import { usePrint } from '../../context/PrintContext'
import TablePrintFormat from './TablePrintFormat'
import RecordPrintFormat from './RecordPrintFormat'
import { formatPrintDate } from '../../utils/printUtils'

export function TablePrintButton({
  title,
  subtitle,
  columns,
  rows,
  summary,
  size = 'sm',
  label = 'Print',
}) {
  const { company, print } = usePrint()

  return (
    <Button
      variant="outline"
      size={size}
      icon={Printer}
      className="no-print"
      onClick={() => print(
        <TablePrintFormat
          company={company}
          documentTitle={title}
          documentSubtitle={subtitle ?? `Printed ${formatPrintDate(new Date())}`}
          columns={columns}
          rows={rows}
          summary={summary}
        />,
      )}
    >
      {label}
    </Button>
  )
}

export function RecordPrintButton({ title, subtitle, fields, badges, size = 'sm', label = 'Print' }) {
  const { company, print } = usePrint()

  return (
    <Button
      variant="outline"
      size={size}
      icon={Printer}
      className="no-print"
      onClick={() => print(
        <RecordPrintFormat
          company={company}
          documentTitle={title}
          documentSubtitle={subtitle}
          fields={fields}
          badges={badges}
        />,
      )}
    >
      {label}
    </Button>
  )
}
