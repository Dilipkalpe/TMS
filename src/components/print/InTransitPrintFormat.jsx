import PrintCompanyHeader, { PrintFooter } from './PrintCompanyHeader'
import { formatPrintDate } from '../../utils/printUtils'

export default function InTransitPrintFormat({ transit, lr, company, variant = 'T1' }) {
  const t = transit || {}
  return (
    <div className={`print-document print-variant-${variant}`}>
      <PrintCompanyHeader
        company={company}
        documentTitle="In Transit Status"
        meta={[
          { label: 'Trip No.', value: t.tripNo || '—' },
          { label: 'LR No.', value: lr?.lrNumber || t.lrNumber },
          { label: 'Status', value: t.status || 'In Transit' },
        ]}
      />

      <div className="print-grid-2 print-box mb-3">
        <div>
          <p className="mb-1 text-[9pt] font-bold uppercase">Vehicle</p>
          <p className="text-[10pt] font-semibold">{t.vehicle || lr?.vehicle || '—'}</p>
        </div>
        <div>
          <p className="mb-1 text-[9pt] font-bold uppercase">Driver</p>
          <p className="text-[10pt] font-semibold">{t.driver || lr?.driver || '—'}</p>
        </div>
      </div>

      <div className="print-grid-3 print-box mb-3">
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-600">Origin</p>
          <p className="mt-0.5 text-[10pt] font-medium">{t.from || lr?.from || '—'}</p>
        </div>
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-600">Destination</p>
          <p className="mt-0.5 text-[10pt] font-medium">{t.to || lr?.to || '—'}</p>
        </div>
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-600">Dispatch Time</p>
          <p className="mt-0.5 text-[10pt] font-medium">{t.dispatchTime || formatPrintDate(t.dispatchDate) || '—'}</p>
        </div>
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-600">Expected Delivery</p>
          <p className="mt-0.5 text-[10pt] font-medium">{formatPrintDate(t.expectedDelivery) || '—'}</p>
        </div>
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-600">Last Location</p>
          <p className="mt-0.5 text-[10pt] font-medium">{t.lastLocation || '—'}</p>
        </div>
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-600">Transit Pass</p>
          <p className="mt-0.5 text-[10pt] font-medium">{t.transitPassNo || '—'}</p>
        </div>
      </div>

      <PrintFooter company={company} />
    </div>
  )
}
