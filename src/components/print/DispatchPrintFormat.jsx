import PrintCompanyHeader, { PrintFooter } from './PrintCompanyHeader'
import { formatPrintDate } from '../../utils/printUtils'

export default function DispatchPrintFormat({ dispatch, lr, pass, company, variant = 'T1' }) {
  const d = dispatch?.extendedData?.dispatch || dispatch?.dispatch || {}
  return (
    <div className={`print-document print-variant-${variant}`}>
      <PrintCompanyHeader
        company={company}
        documentTitle="Dispatch / Gate-Out Slip"
        meta={[
          { label: 'Dispatch No.', value: dispatch?.dispatchNo || d.dispatchNo || dispatch?.tripNo },
          { label: 'Transit Pass', value: pass?.passNumber },
          { label: 'LR No.', value: lr?.lrNumber },
          { label: 'Dispatch Date', value: formatPrintDate(d.dispatchDate || dispatch?.updatedAt) },
        ]}
      />

      <div className="print-grid-2 print-box mb-3">
        <div>
          <p className="mb-1 text-[9pt] font-bold uppercase">Vehicle</p>
          <p className="text-[10pt] font-semibold">{pass?.vehicleNumber || lr?.vehicle || '—'}</p>
        </div>
        <div>
          <p className="mb-1 text-[9pt] font-bold uppercase">Driver</p>
          <p className="text-[10pt] font-semibold">{pass?.driverName || lr?.driver || '—'}</p>
        </div>
      </div>

      <div className="print-grid-3 print-box mb-3">
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-600">Origin</p>
          <p className="mt-0.5 text-[10pt] font-medium">{pass?.routeFrom || lr?.from}</p>
        </div>
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-600">Destination</p>
          <p className="mt-0.5 text-[10pt] font-medium">{pass?.routeTo || lr?.to}</p>
        </div>
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-600">Dispatch Time</p>
          <p className="mt-0.5 text-[10pt] font-medium">{d.dispatchTime || '—'}</p>
        </div>
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-600">Starting KM</p>
          <p className="mt-0.5 text-[10pt] font-medium">{d.startingKm ?? '—'}</p>
        </div>
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-600">Fuel Level</p>
          <p className="mt-0.5 text-[10pt] font-medium">{d.fuelLevel || '—'}</p>
        </div>
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-600">Odometer</p>
          <p className="mt-0.5 text-[10pt] font-medium">{d.odometerReading ?? '—'}</p>
        </div>
      </div>

      {d.remarks && (
        <div className="print-box mb-3">
          <p className="text-[8pt] font-semibold uppercase text-gray-600">Remarks</p>
          <p className="mt-0.5 text-[10pt]">{d.remarks}</p>
        </div>
      )}

      <div className="print-grid-2 mt-6 gap-8">
        <div className="border-t border-gray-400 pt-1 text-center text-[9pt]">Driver Signature</div>
        <div className="border-t border-gray-400 pt-1 text-center text-[9pt]">Gate Officer</div>
      </div>

      <PrintFooter />
    </div>
  )
}
