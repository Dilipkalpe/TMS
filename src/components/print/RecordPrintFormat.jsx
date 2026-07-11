import PrintCompanyHeader, { PrintFooter } from './PrintCompanyHeader'

export default function RecordPrintFormat({ company, documentTitle, documentSubtitle, fields = [], badges = [] }) {
  return (
    <div className="print-document">
      <PrintCompanyHeader
        company={company}
        documentTitle={documentTitle}
        documentSubtitle={documentSubtitle}
      />

      {badges.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {badges.map((b) => (
            <span key={b} className="rounded border border-gray-400 px-2 py-0.5 text-[9pt] font-medium">
              {b}
            </span>
          ))}
        </div>
      )}

      <table className="print-table">
        <tbody>
          {fields.map((f) => (
            <tr key={f.label}>
              <th style={{ width: '32%' }}>{f.label}</th>
              <td>{f.value ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <PrintFooter company={company} />
    </div>
  )
}
