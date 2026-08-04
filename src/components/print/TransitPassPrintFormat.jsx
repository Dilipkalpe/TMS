import PrintCompanyHeader, { PrintFooter } from './PrintCompanyHeader'
import { formatPrintDate } from '../../utils/printUtils'

export default function TransitPassPrintFormat({ pass, lr, company }) {
  return (
    <div className="print-document">
      <PrintCompanyHeader
        company={company}
        documentTitle="Transit Pass / Memo"
        meta={[
          { label: 'Pass No.', value: pass.passNumber },
          { label: 'LR No.', value: lr?.lrNumber ?? pass.lrNumber },
          { label: 'Issue Date', value: formatPrintDate(pass.issueDate) },
        ]}
      />

      <div className="print-grid-2 print-box mb-3">
        <div>
          <p className="mb-1 text-[9pt] font-bold uppercase">Vehicle</p>
          <p className="text-[10pt] font-semibold">{pass.vehicleNumber || lr?.vehicle || '—'}</p>
        </div>
        <div>
          <p className="mb-1 text-[9pt] font-bold uppercase">Driver</p>
          <p className="text-[10pt] font-semibold">{pass.driverName || lr?.driver || '—'}</p>
        </div>
      </div>

      <div className="print-grid-3 print-box mb-3">
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-600">From</p>
          <p className="mt-0.5 text-[10pt] font-medium">{pass.routeFrom || lr?.from}</p>
        </div>
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-600">To</p>
          <p className="mt-0.5 text-[10pt] font-medium">{pass.routeTo || lr?.to}</p>
        </div>
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-600">Via</p>
          <p className="mt-0.5 text-[10pt] font-medium">{pass.viaPoints || '—'}</p>
        </div>
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-600">Material</p>
          <p className="mt-0.5 text-[10pt] font-medium">{lr?.material || '—'}</p>
        </div>
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-600">Quantity</p>
          <p className="mt-0.5 text-[10pt] font-medium">{lr?.quantity || '—'}</p>
        </div>
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-600">Consignee</p>
          <p className="mt-0.5 text-[10pt] font-medium">{lr?.consignee || '—'}</p>
        </div>
      </div>

      {pass.remarks && (
        <div className="print-box mb-3 text-[10pt]">
          <p className="font-semibold uppercase text-[8pt]">Remarks</p>
          <p className="mt-1">{pass.remarks}</p>
        </div>
      )}

      <div className="print-grid-2 mt-8">
        <div className="border-t border-gray-400 pt-2 text-center text-[9pt]">Driver Signature</div>
        <div className="border-t border-gray-400 pt-2 text-center text-[9pt]">Authorized Signatory</div>
      </div>

      <PrintFooter company={company} />
    </div>
  )
}
