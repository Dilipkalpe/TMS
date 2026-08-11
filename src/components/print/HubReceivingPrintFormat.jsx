import PrintCompanyHeader, { PrintFooter } from './PrintCompanyHeader'
import { formatPrintDate } from '../../utils/printUtils'

export default function HubReceivingPrintFormat({ manifest, receiveEvents, company, variant = 'T1' }) {
  const m = manifest || {}
  const lines = m.lines || []
  const events = receiveEvents || []
  return (
    <div className={`print-document print-variant-${variant}`}>
      <PrintCompanyHeader
        company={company}
        documentTitle="Hub Receiving Report"
        meta={[
          { label: 'Manifest / Ref', value: m.manifestNo },
          { label: 'Hub', value: m.toDestination || m.fromHubName },
          { label: 'Vehicle', value: m.vehicleNumber },
        ]}
      />

      <div className="print-grid-2 print-box mb-3">
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-600">Received From Route</p>
          <p className="mt-0.5 text-[10pt] font-medium">{m.fromHubName || '—'} → {m.toDestination || '—'}</p>
        </div>
        <div>
          <p className="text-[8pt] font-semibold uppercase text-gray-600">Unload Status</p>
          <p className="mt-0.5 text-[10pt] font-medium">
            {lines.filter((l) => l.lineStatus === 'Unloaded').length} / {lines.length} unloaded
          </p>
        </div>
      </div>

      <table className="mb-3 w-full border-collapse text-[9pt]">
        <thead>
          <tr className="border-b border-gray-400 text-left">
            <th className="py-1 pr-2">LR No</th>
            <th className="py-1 pr-2">Final Dest</th>
            <th className="py-1 pr-2">Pkgs</th>
            <th className="py-1 pr-2">Weight</th>
            <th className="py-1">Line Status</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.lrNumber} className="border-b border-gray-200">
              <td className="py-1 pr-2 font-semibold">{l.lrNumber}</td>
              <td className="py-1 pr-2">{l.finalDestination || '—'}</td>
              <td className="py-1 pr-2">{l.packages ?? '—'}</td>
              <td className="py-1 pr-2">{l.weight ?? '—'}</td>
              <td className="py-1">{l.lineStatus || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {events.length > 0 && (
        <div className="print-box mb-3">
          <p className="mb-1 text-[8pt] font-semibold uppercase text-gray-600">Receive events</p>
          {events.map((e) => (
            <p key={e.id} className="text-[9pt]">
              {e.lrNumber}: {formatPrintDate(e.performedAt)} by {e.performedBy || '—'}
            </p>
          ))}
        </div>
      )}

      <div className="print-grid-2 mt-8 gap-8">
        <div className="border-t border-gray-400 pt-1 text-center text-[9pt]">Received By</div>
        <div className="border-t border-gray-400 pt-1 text-center text-[9pt]">Hub Supervisor</div>
      </div>

      <PrintFooter />
    </div>
  )
}
