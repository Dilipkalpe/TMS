import PrintLogo from './PrintLogo'
import { formatPrintDateTime } from '../../utils/printUtils'

export default function PrintCompanyHeader({ company, documentTitle, documentSubtitle, meta = [] }) {
  const name = company?.companyName || 'TMS Pro Transport'
  const address = company?.address
  const gstin = company?.gstin
  const pan = company?.pan
  const phone = company?.phone
  const email = company?.email

  return (
    <header className="print-company-header mb-4 border-b-2 border-black pb-3">
      <div className="print-header-top flex items-start gap-4">
        <PrintLogo company={company} />
        <div className="print-header-info min-w-0 flex-1">
          <h1 className="text-base font-bold uppercase tracking-wide text-black">{name}</h1>
          {address && <p className="mt-1 text-[9pt] whitespace-pre-line text-gray-800">{address}</p>}
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[9pt] text-gray-700">
            {gstin && <span>GSTIN: {gstin}</span>}
            {pan && <span>PAN: {pan}</span>}
            {phone && <span>Ph: {phone}</span>}
            {email && <span>{email}</span>}
          </div>
        </div>
        {meta.length > 0 && (
          <div className="print-header-meta shrink-0 text-right text-[9pt]">
            {meta.map((m) => (
              <div key={m.label}>
                <span className="font-semibold">{m.label}: </span>
                <span>{m.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {documentTitle && (
        <h2 className="print-doc-title mt-3 border-t border-gray-300 pt-2 text-center text-sm font-bold uppercase tracking-widest text-black">
          {documentTitle}
        </h2>
      )}
      {documentSubtitle && (
        <p className="mt-1 text-center text-[10pt] text-gray-700">{documentSubtitle}</p>
      )}
    </header>
  )
}

export function PrintFooter({ company }) {
  return (
    <footer className="print-footer">
      Printed on {formatPrintDateTime(new Date())}
      {company?.companyName ? ` · ${company.companyName}` : ''}
      {' · '}This is a computer-generated document.
    </footer>
  )
}
