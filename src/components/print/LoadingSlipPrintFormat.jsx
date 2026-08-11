import PrintCompanyHeader, { PrintFooter } from './PrintCompanyHeader'
import { formatPrintDate } from '../../utils/printUtils'

export default function LoadingSlipPrintFormat({ slip, lr, company, variant = 'T1' }) {
  const s = slip || {}
  return (
    <div className={`print-document print-variant-${variant}`}>
      <PrintCompanyHeader
        company={company}
        documentTitle="Loading Slip"
        meta={[
          { label: 'Slip No.', value: s.sheetNumber || s.slipNo || '—' },
          { label: 'LR No.', value: lr?.lrNumber || s.lrNumber },
          { label: 'Date', value: formatPrintDate(s.loadingDate || lr?.lrDate) },
        ]}
      />

      <div className="print-grid-2 print-box mb-3">
        <div>
          <p className="mb-1 text-[9pt] font-bold uppercase">Vehicle</p>
          <p className="text-[10pt] font-semibold">{s.vehicle || lr?.vehicle || '—'}</p>
        </div>
        <div>
          <p className="mb-1 text-[9pt] font-bold uppercase">Driver</p>
          <p className="text-[10pt] font-semibold">{s.driver || lr?.driver || '—'}</p>
        </div>
      </div>

      <div className="print-grid-3 print-box mb-3">
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-600">From</p>
          <p className="mt-0.5 text-[10pt] font-medium">{s.fromCity || lr?.from || '—'}</p>
        </div>
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-600">To</p>
          <p className="mt-0.5 text-[10pt] font-medium">{s.toCity || lr?.to || '—'}</p>
        </div>
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-600">Trip No.</p>
          <p className="mt-0.5 text-[10pt] font-medium">{s.tripNo || '—'}</p>
        </div>
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-600">Packages</p>
          <p className="mt-0.5 text-[10pt] font-medium">{s.totalPackages ?? s.packages ?? '—'}</p>
        </div>
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-600">Weight (Kg)</p>
          <p className="mt-0.5 text-[10pt] font-medium">{s.totalWeight ?? s.weight ?? '—'}</p>
        </div>
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-600">Status</p>
          <p className="mt-0.5 text-[10pt] font-medium">{s.status || 'Loaded'}</p>
        </div>
      </div>

      <div className="print-grid-2 mt-6 gap-8">
        <div className="border-t border-gray-400 pt-1 text-center text-[9pt]">Loader Signature</div>
        <div className="border-t border-gray-400 pt-1 text-center text-[9pt]">Supervisor</div>
      </div>

      <PrintFooter company={company} />
    </div>
  )
}
