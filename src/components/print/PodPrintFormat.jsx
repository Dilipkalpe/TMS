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

function SignatureBlock({ label, dataUrl }) {
  return (
    <div className="text-center">
      <p className="mb-1 text-[8pt] font-semibold uppercase text-gray-600">{label}</p>
      {dataUrl?.startsWith?.('data:') ? (
        <img src={dataUrl} alt={label} className="mx-auto h-14 max-w-full object-contain" />
      ) : (
        <div className="mx-auto h-14 border-b border-gray-400" />
      )}
    </div>
  )
}

export default function PodPrintFormat({ model, company, variant = 'T1' }) {
  const m = model || {}
  const attachments = m.attachments || []

  return (
    <div className={`print-document print-variant-${variant}`}>
      <PrintCompanyHeader
        company={company}
        documentTitle="Proof of Delivery (POD)"
        documentSubtitle={m.verificationStatus ? `Verification: ${m.verificationStatus}` : undefined}
        meta={[
          { label: 'POD No.', value: m.podNo },
          { label: 'Delivery No.', value: m.deliveryNo },
          { label: 'LR No.', value: m.lrNumber },
          { label: 'Delivery Date', value: formatPrintDate(m.deliveryDate) },
        ]}
      />

      <div className="print-grid-2 print-box mb-3">
        <Field label="Consignor / Customer" value={m.consignor} />
        <Field label="Consignee" value={m.consignee} />
        <Field label="Receiver Name" value={m.receiverName} />
        <Field label="Delivery Location" value={m.deliveryLocation} />
        <Field label="Route" value={m.from && m.to ? `${m.from} → ${m.to}` : undefined} />
        <Field label="Shipment Status" value={m.shipmentStatus} />
        <Field label="Vehicle" value={m.vehicle} />
        <Field label="Driver" value={m.driver} />
      </div>

      <div className="print-grid-4 print-box mb-3">
        <Field label="Packages" value={m.packages} />
        <Field label="Actual Weight (Kg)" value={m.actualWeight} />
        <Field label="Charged Weight (Kg)" value={m.chargedWeight} />
        <Field label="Condition" value={m.condition} />
        <Field label="Delivery Note No." value={m.deliveryNoteNo} />
        <Field label="Delivery Time" value={m.deliveryTime} />
        <Field label="Photos Uploaded" value={m.photoCount > 0 ? String(m.photoCount) : attachments.length ? String(attachments.length) : '—'} />
        <Field label="Printed On" value={m.printedAt} />
      </div>

      <div className="print-grid-2 print-box mb-3 gap-4">
        <SignatureBlock label="Receiver Signature" dataUrl={m.receiverSignature} />
        <SignatureBlock label="Receiver Stamp / Seal" dataUrl={m.receiverStamp} />
      </div>

      {attachments.length > 0 && (
        <div className="print-box mb-3">
          <p className="mb-2 text-[8pt] font-bold uppercase">POD Documents</p>
          <table className="print-table w-full text-[9pt]">
            <thead>
              <tr>
                <th className="text-left">Title</th>
                <th className="text-left">Type</th>
              </tr>
            </thead>
            <tbody>
              {attachments.map((a, i) => (
                <tr key={a.fileUrl || i}>
                  <td>{a.title || '—'}</td>
                  <td>{a.docType || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {m.remarks && (
        <div className="print-box mb-3 text-[10pt]">
          <p className="font-semibold uppercase text-[8pt]">Remarks</p>
          <p className="mt-1">{m.remarks}</p>
        </div>
      )}

      {m.verificationStatus === 'Verified' && (
        <div className="print-box mb-3 border border-green-600 p-2 text-center text-[10pt] font-semibold uppercase text-green-800">
          POD Verified
        </div>
      )}

      {m.verificationStatus === 'Rejected' && (
        <div className="print-box mb-3 border border-red-600 p-2 text-center text-[10pt] font-semibold uppercase text-red-800">
          POD Rejected
        </div>
      )}

      <div className="print-grid-2 mt-6 gap-8">
        <div className="border-t border-gray-400 pt-1 text-center text-[9pt]">Company Authorised Signatory</div>
        <div className="border-t border-gray-400 pt-1 text-center text-[9pt]">POD Received By (Office)</div>
      </div>

      <PrintFooter company={company} />
    </div>
  )
}
