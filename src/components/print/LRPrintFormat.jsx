import PrintCompanyHeader, { PrintFooter } from './PrintCompanyHeader'
import { formatPrintCurrency, formatPrintDate, lrTotalCharges } from '../../utils/printUtils'

function Cell({ label, value, wide }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <p className="text-[8pt] font-semibold uppercase text-gray-600">{label}</p>
      <p className="mt-0.5 text-[10pt] font-medium">{value || '—'}</p>
    </div>
  )
}

export default function LRPrintFormat({ lr, company }) {
  const total = lrTotalCharges(lr)
  const balance = lr.balance != null ? Number(lr.balance) : total - Number(lr.advance || 0)

  return (
    <div className="print-document">
      <PrintCompanyHeader
        company={company}
        documentTitle="Lorry Receipt / Consignment Note"
        meta={[
          { label: 'LR No.', value: lr.lrNumber || 'Draft' },
          { label: 'Date', value: formatPrintDate(lr.lrDate) },
        ]}
      />

      <div className="print-grid-2 print-box mb-3">
        <div>
          <p className="mb-1 text-[9pt] font-bold uppercase">Consignor (Sender)</p>
          <p className="text-[10pt] font-semibold">{lr.consignor || '—'}</p>
        </div>
        <div>
          <p className="mb-1 text-[9pt] font-bold uppercase">Consignee (Receiver)</p>
          <p className="text-[10pt] font-semibold">{lr.consignee || '—'}</p>
        </div>
      </div>

      <div className="print-grid-3 print-box mb-3">
        <Cell label="From" value={lr.from} />
        <Cell label="To" value={lr.to} />
        <Cell label="Vehicle No." value={lr.vehicle} />
        <Cell label="Driver" value={lr.driver} />
        <Cell label="Material / Goods" value={lr.material} />
        <Cell label="Quantity" value={lr.quantity} />
      </div>

      <table className="print-table mb-3">
        <thead>
          <tr>
            <th>Particulars</th>
            <th className="num">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['Freight', lr.freight],
            ['GST', lr.gst],
            ['Hamali / Labour', lr.hamali],
            ['Loading Charges', lr.loadingCharges],
            ['Unloading Charges', lr.unloadingCharges],
            ['Insurance', lr.insurance],
          ].map(([label, val]) => (
            Number(val) > 0 || label === 'Freight' ? (
              <tr key={label}>
                <td>{label}</td>
                <td className="num">{formatPrintCurrency(val)}</td>
              </tr>
            ) : null
          ))}
          <tr>
            <td className="font-bold">Total Charges</td>
            <td className="num font-bold">{formatPrintCurrency(total)}</td>
          </tr>
          <tr>
            <td>Advance Paid</td>
            <td className="num">{formatPrintCurrency(lr.advance)}</td>
          </tr>
          <tr>
            <td className="font-bold">Balance Due</td>
            <td className="num font-bold">{formatPrintCurrency(balance)}</td>
          </tr>
        </tbody>
      </table>

      <div className="print-grid-2 mb-3">
        <div className="print-box">
          <p className="text-[8pt] font-semibold uppercase text-gray-600">Payment Type</p>
          <p className="mt-1 text-[11pt] font-bold">{lr.paymentType || 'To Pay'}</p>
        </div>
        <div className="print-box">
          <p className="text-[8pt] font-semibold uppercase text-gray-600">Booking Ref.</p>
          <p className="mt-1 text-[10pt]">{lr.bookingId || '—'}</p>
        </div>
      </div>

      {lr.remarks && (
        <div className="print-box mb-3">
          <p className="text-[8pt] font-semibold uppercase text-gray-600">Remarks</p>
          <p className="mt-1 text-[10pt] whitespace-pre-line">{lr.remarks}</p>
        </div>
      )}

      <div className="mb-3 text-[8pt] leading-snug text-gray-700">
        <p className="font-semibold uppercase">Terms &amp; Conditions</p>
        <ol className="mt-1 list-decimal pl-4">
          <li>Goods are transported at owner&apos;s risk unless insured.</li>
          <li>Freight and charges as per agreement; balance payable on delivery unless marked Paid/TBB.</li>
          <li>Claims for shortage or damage must be noted at the time of delivery.</li>
          <li>Subject to local jurisdiction. E.&amp;O.E.</li>
        </ol>
      </div>

      <div className="print-signatures">
        <div><div className="line">Consignor Signature</div></div>
        <div><div className="line">Driver Signature</div></div>
        <div><div className="line">Receiver Signature</div></div>
      </div>

      <PrintFooter company={company} />
    </div>
  )
}
