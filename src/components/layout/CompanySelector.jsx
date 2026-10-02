import { useEffect, useState } from 'react'
import { Building2, ChevronDown } from 'lucide-react'
import { useCompany } from '../../context/CompanyContext'
import { platformApi, unwrapPaginated } from '../../services/api'

/**
 * Active Company (tenant) selector — platform admin only in practice.
 * variant "erp" matches BranchSelector height/look for header side-by-side layout.
 */
export default function CompanySelector({ variant = 'erp' }) {
  const { effectiveCompanyId, setSelectedCompanyId } = useCompany()
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const erpPill = variant === 'erp'

  useEffect(() => {
    platformApi.companies({ pageSize: 100 })
      .then((res) => setCompanies(unwrapPaginated(res)))
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false))
  }, [])

  const onChange = (e) => {
    const id = e.target.value
    if (!id) return
    setSelectedCompanyId(id)
    window.location.reload()
  }

  if (loading) {
    return (
      <span className={`inline-flex items-center text-xs text-slate-500 ${erpPill ? 'py-2' : ''}`}>
        Loading…
      </span>
    )
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Building2 className="h-4 w-4 shrink-0 text-primary" />
      <div className="relative min-w-0">
        <select
          value={effectiveCompanyId ?? ''}
          onChange={onChange}
          className={`appearance-none truncate rounded-lg border border-slate-200 bg-white py-2 pl-2 pr-7 text-xs font-medium text-slate-700 outline-none focus:border-primary dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 ${
            erpPill ? 'max-w-[10rem] text-sm sm:max-w-[12rem] lg:max-w-[14rem]' : 'max-w-[180px] lg:max-w-[220px]'
          }`}
          title="Active company"
          aria-label="Active company"
        >
          <option value="" disabled>Select company…</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.name}
            </option>
          ))}
        </select>
        {erpPill && (
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        )}
      </div>
    </div>
  )
}
