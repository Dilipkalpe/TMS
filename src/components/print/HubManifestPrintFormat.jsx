import PrintCompanyHeader, { PrintFooter } from './PrintCompanyHeader'
import { formatPrintDate } from '../../utils/printUtils'

export default function HubManifestPrintFormat({ manifest, company, variant = 'T1' }) {
  const m = manifest || {}
  const lines = m.lines || []
  return (
    <div className={`print-document print-variant-${variant}`}>
      <PrintCompanyHeader
        company={company}
        documentTitle="Hub Re-Manifest"
        meta={[
          { label: 'Manifest No.', value: m.manifestNo },
          { label: 'Date', value: formatPrintDate(m.dispatchAt || m.createdAt) },
          { label: 'Status', value: m.status },
        ]}
      />

      <div className="print-grid-3 print-box mb-3">
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-600">From Hub</p>
          <p className="mt-0.5 text-[10pt] font-medium">{m.fromHubName || '—'}</p>
        </div>
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-600">To Destination</p>
          <p className="mt-0.5 text-[10pt] font-medium">{m.toDestination || '—'}</p>
        </div>
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-600">Vehicle</p>
          <p className="mt-0.5 text-[10pt] font-medium">{m.vehicleNumber || '—'}</p>
          <p className="text-[8pt] text-gray-600">{m.vehicleType || ''}</p>
        </div>
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-600">Driver</p>
          <p className="mt-0.5 text-[10pt] font-medium">{m.driverName || '—'}</p>
          <p className="text-[8pt] text-gray-600">{m.driverMobile || ''}</p>
        </div>
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-600">Total LR</p>
          <p className="mt-0.5 text-[10pt] font-medium">{m.totalLr ?? lines.length}</p>
        </div>
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-600">Packages / Weight</p>
          <p className="mt-0.5 text-[10pt] font-medium">{m.totalPackages ?? '—'} / {m.totalWeight ?? '—'}</p>
        </div>
      </div>

      <table className="mb-3 w-full border-collapse text-[9pt]">
        <thead>
          <tr className="border-b border-gray-400 text-left">
            <th className="py-1 pr-2">#</th>
            <th className="py-1 pr-2">LR No</th>
            <th className="py-1 pr-2">Consignor</th>
            <th className="py-1 pr-2">Consignee</th>
            <th className="py-1 pr-2">Final Dest</th>
            <th className="py-1 pr-2">Pkgs</th>
            <th className="py-1">Weight</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={l.lrNumber || i} className="border-b border-gray-200">
              <td className="py-1 pr-2">{i + 1}</td>
              <td className="py-1 pr-2 font-semibold">{l.lrNumber}</td>
              <td className="py-1 pr-2">{l.consignor || '—'}</td>
              <td className="py-1 pr-2">{l.consignee || '—'}</td>
              <td className="py-1 pr-2">{l.finalDestination || '—'}</td>
              <td className="py-1 pr-2">{l.packages ?? '—'}</td>
              <td className="py-1">{l.weight ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {m.remarks && (
        <div className="print-box mb-3">
          <p className="text-[8pt] font-semibold uppercase text-gray-600">Remarks</p>
          <p className="mt-0.5 text-[10pt]">{m.remarks}</p>
        </div>
      )}

      <div className="print-grid-3 mt-8 gap-6">
        <div className="border-t border-gray-400 pt-1 text-center text-[9pt]">Prepared By</div>
        <div className="border-t border-gray-400 pt-1 text-center text-[9pt]">Driver Signature</div>
        <div className="border-t border-gray-400 pt-1 text-center text-[9pt]">Hub In-Charge</div>
      </div>

      <PrintFooter />
    </div>
  )
}
