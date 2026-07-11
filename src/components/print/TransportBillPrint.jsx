function fmt(n) {
  return Number(n ?? 0).toLocaleString('en-IN')
}

export default function TransportBillPrint({ bill, company, booking }) {
  const isRcm = bill.billType === 'RCM'
  const lines = Array.isArray(bill.lines) ? bill.lines : [
    {
      description: `Transport freight ${booking ? `${booking.from} → ${booking.to}` : ''}`,
      amount: bill.taxableAmount ?? 0,
    },
  ]
  const advance = Number(bill.advance ?? 0)
  const grossTotal = Number(bill.grossTotal ?? (Number(bill.taxableAmount ?? 0) + (isRcm ? 0 : Number(bill.gstAmount ?? 0))))
  const netPayable = Number(bill.netPayable ?? bill.totalAmount ?? 0)

  return (
    <div className="p-8 text-sm text-black" style={{ fontFamily: 'Arial, sans-serif', maxWidth: 800 }}>
      <div className="border-b-2 border-slate-800 pb-3">
        <h1 className="text-xl font-bold">{company?.name ?? 'TMS Pro Transport'}</h1>
        <p>{company?.address ?? ''}</p>
        <p>GSTIN: {company?.gst ?? '—'}</p>
      </div>
      <div className="mt-4 flex justify-between">
        <div>
          <h2 className="text-lg font-bold">{isRcm ? 'RCM Tax Invoice (Reverse Charge)' : 'FC Freight Collection Bill'}</h2>
          <p>Bill No: {bill.billNo}</p>
          <p>Date: {bill.billDate}</p>
          <p>Booking: {bill.bookingId}</p>
        </div>
        <div className="text-right">
          <p><strong>To:</strong> {bill.customerName}</p>
          <p>GSTIN: {bill.gstin ?? '—'}</p>
          <p>Place of Supply: {bill.placeOfSupply}</p>
        </div>
      </div>
      <table className="mt-6 w-full border-collapse text-left">
        <thead>
          <tr className="border border-slate-400 bg-slate-100">
            <th className="border border-slate-400 p-2">Description</th>
            <th className="border border-slate-400 p-2 text-right">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => (
            <tr key={i}>
              <td className="border border-slate-400 p-2">
                {line.description}
                {line.detail ? <span className="block text-xs text-slate-600">{line.detail}</span> : null}
              </td>
              <td className="border border-slate-400 p-2 text-right">{fmt(line.amount)}</td>
            </tr>
          ))}
          <tr>
            <td className="border border-slate-400 p-2 font-medium">Taxable subtotal</td>
            <td className="border border-slate-400 p-2 text-right">{fmt(bill.taxableAmount)}</td>
          </tr>
          <tr>
            <td className="border border-slate-400 p-2">
              GST ({isRcm ? '5% RCM' : '18%'})
              {isRcm ? ' — payable by recipient' : ''}
            </td>
            <td className="border border-slate-400 p-2 text-right">{fmt(bill.gstAmount)}</td>
          </tr>
          {!isRcm && (
            <tr>
              <td className="border border-slate-400 p-2 font-medium">Gross total</td>
              <td className="border border-slate-400 p-2 text-right">{fmt(grossTotal)}</td>
            </tr>
          )}
          {advance > 0 && (
            <tr>
              <td className="border border-slate-400 p-2 text-green-700">Less: Advance received (booking + payments)</td>
              <td className="border border-slate-400 p-2 text-right text-green-700">- {fmt(advance)}</td>
            </tr>
          )}
          <tr className="bg-slate-50 font-bold">
            <td className="border border-slate-400 p-2">Balance due</td>
            <td className="border border-slate-400 p-2 text-right">{fmt(netPayable)}</td>
          </tr>
        </tbody>
      </table>
      {isRcm && (
        <p className="mt-4 text-xs italic">
          Tax payable under Reverse Charge Mechanism (RCM) as per GST provisions. Recipient is liable to pay GST.
        </p>
      )}
      <div className="mt-8 flex justify-between">
        <div><p>Prepared by</p><p className="mt-8 border-t border-slate-400 pt-1">Authorised Signatory</p></div>
        <div className="text-right"><p className="font-bold">Balance Due: ₹ {fmt(netPayable)}</p></div>
      </div>
    </div>
  )
}
