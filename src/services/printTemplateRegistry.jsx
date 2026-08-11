import TablePrintFormat from '../components/print/TablePrintFormat'
import LRPrintFormat from '../components/print/LRPrintFormat'
import TransitPassPrintFormat from '../components/print/TransitPassPrintFormat'
import DispatchPrintFormat from '../components/print/DispatchPrintFormat'
import DeliveryPrintFormat from '../components/print/DeliveryPrintFormat'
import PodPrintFormat from '../components/print/PodPrintFormat'
import TransportBillPrint from '../components/print/TransportBillPrint'
import LoadingSlipPrintFormat from '../components/print/LoadingSlipPrintFormat'
import InTransitPrintFormat from '../components/print/InTransitPrintFormat'
import { PRINT_MODULE_CODES, normalizeTemplateCode } from '../config/printModules'
import {
  getSampleDocumentData,
  getSampleListColumns,
  getSampleListRows,
  getSampleLrDocument,
} from '../utils/printSampleData'
import { formatPrintDate } from '../utils/printUtils'

/**
 * Renders print JSX for a module + template + data payload.
 * Prefer kind: 'document' for individual transport records (LR, slip, bill, etc.).
 * @param {'list'|'document'} kind
 */
export function renderPrintNode({
  moduleCode,
  templateCode = 'T1',
  kind = 'document',
  company,
  columns,
  rows,
  documentTitle,
  documentSubtitle,
  summary,
  documentData,
}) {
  const variant = normalizeTemplateCode(templateCode)

  if (kind === 'list') {
    const cols = columns ?? getSampleListColumns(moduleCode)
    const dataRows = rows ?? getSampleListRows(moduleCode)
    return (
      <TablePrintFormat
        variant={variant}
        company={company}
        documentTitle={documentTitle ?? moduleCode}
        documentSubtitle={documentSubtitle ?? `Printed ${formatPrintDate(new Date())}`}
        columns={cols}
        rows={dataRows}
        summary={summary}
      />
    )
  }

  const sample = getSampleDocumentData(moduleCode)
  const data = { ...sample, ...documentData }
  const lr = data.lr ?? getSampleLrDocument()

  switch (moduleCode) {
    case PRINT_MODULE_CODES.LR_LIST:
      return <LRPrintFormat variant={variant} lr={lr} company={company} />
    case PRINT_MODULE_CODES.LOADING_SLIP:
      return <LoadingSlipPrintFormat variant={variant} slip={data.slip} lr={lr} company={company} />
    case PRINT_MODULE_CODES.TRANSIT_PASS:
      return (
        <TransitPassPrintFormat
          variant={variant}
          pass={data.pass}
          lr={lr}
          company={company}
          loadingItems={data.loadingItems}
        />
      )
    case PRINT_MODULE_CODES.DISPATCH:
      return (
        <DispatchPrintFormat
          variant={variant}
          dispatch={data.dispatch}
          lr={lr}
          company={company}
        />
      )
    case PRINT_MODULE_CODES.IN_TRANSIT:
      return <InTransitPrintFormat variant={variant} transit={data.transit} lr={lr} company={company} />
    case PRINT_MODULE_CODES.DELIVERY_COMPLETE:
      return <DeliveryPrintFormat variant={variant} model={data.model ?? data.delivery} company={company} />
    case PRINT_MODULE_CODES.POD:
      return <PodPrintFormat variant={variant} model={data.model ?? data.pod} company={company} />
    case PRINT_MODULE_CODES.BILLING:
      return <TransportBillPrint variant={variant} bill={data.bill} company={company} />
    default:
      return <LRPrintFormat variant={variant} lr={lr} company={company} />
  }
}

/** Preview an individual transport document with sample data + selected template. */
export function renderPrintPreview({ moduleCode, templateCode, company }) {
  return renderPrintNode({
    moduleCode,
    templateCode,
    kind: 'document',
    company,
    documentData: getSampleDocumentData(moduleCode),
  })
}
