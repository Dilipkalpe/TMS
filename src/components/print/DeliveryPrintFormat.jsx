import PrintCompanyHeader, { PrintFooter } from './PrintCompanyHeader'
import { formatPrintDate } from '../../utils/printUtils'

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[8pt] font-semibold uppercase text-gray-600">{label}</p>
      <p className="mt-0.5 text-[10pt] font-medium">{value ?? '—'}</p>
    </div>
  )
}

export default function DeliveryPrintFormat({ model, company, variant = 'T1' }) {
  const m = model || {}
  const isPartial = m.deliveryStatus === 'Partial'
  const isFailed = m.deliveryStatus === 'Failed'

  return (
    <div className={`print-document print-variant-${variant}`}>
      <PrintCompanyHeader
        company={company}
        documentTitle="Delivery Confirmation"
        documentSubtitle={m.deliveryStatus ? `Status: ${m.deliveryStatus}` : undefined}
        meta={[
          { label: 'Delivery No.', value: m.deliveryNo },
          { label: 'LR No.', value: m.lrNumber },
          { label: 'Trip / Dispatch', value: m.dispatchNo || m.tripNo },
          { label: 'Delivery Date', value: formatPrintDate(m.deliveryDate) },
        ]}
      />

      <div className="print-grid-2 print-box mb-3">
        <Field label="Consignor / Customer" value={m.consignor} />
        <Field label="Consignee" value={m.consignee} />
        <Field label="Origin" value={m.from} />
        <Field label="Destination" value={m.to} />
        <Field label="Vehicle" value={m.vehicle} />
        <Field label="Driver" value={m.driver} />
      </div>

      <div className="print-grid-3 print-box mb-3">
        <Field label="Delivery Time" value={m.deliveryTime} />
        <Field label="Delivery Branch" value={m.deliveryBranch} />
        <Field label="Delivery Location" value={m.deliveryLocation} />
        <Field label="Transit Pass" value={m.transitPassNo} />
        <Field label="Material" value={m.material} />
        <Field label="Quantity" value={m.quantity} />
      </div>

      <table className="print-table mb-3 w-full text-[9pt]">
        <thead>
          <tr>
            <th className="text-left">Packages Expected</th>
            <th className="text-left">Packages Received</th>
            <th className="text-left">Damaged</th>
            <th className="text-left">Actual Wt (Kg)</th>
            <th className="text-left">Charged Wt (Kg)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{m.packagesTotal ?? '—'}</td>
            <td>{m.packagesReceived ?? '—'}</td>
            <td>{m.packagesDamaged ?? '—'}</td>
            <td>{m.actualWeight ?? '—'}</td>
            <td>{m.chargedWeight ?? '—'}</td>
          </tr>
        </tbody>
      </table>

      {isPartial && (
        <div className="print-box mb-3 border border-amber-400 bg-amber-50 p-2 text-[9pt]">
          <p className="font-bold uppercase">Partial Delivery</p>
          <p>Short packages: {m.shortPackages ?? '—'} · Short weight: {m.shortWeight ?? '—'}</p>
          {m.shortReason && <p>Reason: {m.shortReason}</p>}
        </div>
      )}

      {isFailed && (
        <div className="print-box mb-3 border border-red-400 bg-red-50 p-2 text-[9pt]">
          <p className="font-bold uppercase">Failed Delivery</p>
          <p>Reason: {m.failureReason || '—'}</p>
          {m.nextAttemptDate && <p>Next attempt: {formatPrintDate(m.nextAttemptDate)}</p>}
        </div>
      )}

      <div className="print-grid-3 print-box mb-3">
        <Field label="Received By" value={m.receiverName} />
        <Field label="Designation" value={m.receiverDesignation} />
        <Field label="Mobile" value={m.receiverMobile} />
      </div>

      {m.remarks && (
        <div className="print-box mb-3 text-[10pt]">
          <p className="font-semibold uppercase text-[8pt]">Remarks</p>
          <p className="mt-1">{m.remarks}</p>
        </div>
      )}

      <div className="print-grid-2 mt-8 gap-8">
        <div>
          <div className="mb-1 h-12 border-b border-gray-400" />
          <p className="text-center text-[9pt]">Receiver Signature</p>
        </div>
        <div>
          <div className="mb-1 h-12 border-b border-gray-400" />
          <p className="text-center text-[9pt]">Delivery Agent / Driver</p>
        </div>
      </div>

      <PrintFooter company={company} />
    </div>
  )
}
