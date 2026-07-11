import PrintCompanyHeader, { PrintFooter } from './PrintCompanyHeader'
import { getCellValue } from '../../utils/printUtils'

export default function TablePrintFormat({
  company,
  documentTitle,
  documentSubtitle,
  columns = [],
  rows = [],
  summary,
}) {
  const cols = columns.filter((c) => c.key && c.key !== '__action' && c.key !== '__sr')

  return (
    <div className="print-document">
      <PrintCompanyHeader
        company={company}
        documentTitle={documentTitle}
        documentSubtitle={documentSubtitle}
        meta={summary ? [{ label: 'Records', value: String(rows.length) }] : undefined}
      />

      <table className="print-table">
        <thead>
          <tr>
            <th>#</th>
            {cols.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={cols.length + 1} className="text-center text-gray-500">
                No records to print.
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={row.id ?? row.lrNumber ?? row.lrNo ?? i}>
                <td>{i + 1}</td>
                {cols.map((c) => (
                  <td key={c.key} className={c.align === 'right' ? 'num' : ''}>
                    {getCellValue(c, row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {summary && (
        <div className="mt-3 text-[9pt] font-medium">{summary}</div>
      )}

      <PrintFooter company={company} />
    </div>
  )
}
