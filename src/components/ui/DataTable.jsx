export default function DataTable({ columns, data, onRowClick, sticky = true, fill = false, dense = false }) {
  const cellPad = dense ? 'px-2.5 py-1.5 sm:px-3 sm:py-2' : 'px-3 py-2 sm:px-4 sm:py-2.5'

  return (
    <div className={fill ? 'flex h-full min-h-0 flex-col overflow-hidden' : ''}>
      <div
        className={`overflow-auto ${
          fill ? 'min-h-0 flex-1' : ''
        } ${fill ? '' : 'rounded-[12px] border border-slate-200/80 dark:border-slate-800'}`}
      >
        <table className="w-full min-w-[520px] text-left text-xs sm:text-sm">
          <thead className={sticky ? 'sticky top-0 z-10' : ''}>
            <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/80">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`whitespace-nowrap ${cellPad} text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs dark:text-slate-400`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
            {data.map((row, i) => (
              <tr
                key={row.id ?? i}
                onClick={() => onRowClick?.(row)}
                className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`whitespace-nowrap ${cellPad} text-slate-700 dark:text-slate-300`}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
