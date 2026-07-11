import Button from '../ui/Button'
import { Printer } from 'lucide-react'
import { usePrint } from '../../context/PrintContext'
import RecordPrintFormat from './RecordPrintFormat'

export default function PrintButton({ title, subtitle, fields, badges, size = 'sm', variant = 'outline', label = 'Print' }) {
  const { company, print } = usePrint()

  return (
    <Button
      variant={variant}
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

export { TablePrintButton, RecordPrintButton } from './ReportPrintButton'
