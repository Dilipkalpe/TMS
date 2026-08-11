import { useEffect, useState } from 'react'
import { Building2 } from 'lucide-react'
import { useCompany } from '../../context/CompanyContext'
import { platformApi, unwrapPaginated } from '../../services/api'

export default function CompanySelector({ variant = 'header' }) {
  const { effectiveCompanyId, setSelectedCompanyId } = useCompany()
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const isSidebar = variant === 'sidebar'

  useEffect(() => {
    platformApi.companies({ pageSize: 100 })
      .then((res) => setCompanies(unwrapPaginated(res)))
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return isSidebar ? (
      <p className="text-[10px] text-slate-400">Loading company…</p>
    ) : (
      <span className="hidden text-xs text-slate-500 sm:inline">Loading…</span>
    )
  }

  if (isSidebar) {
    return (
      <div className="mt-0.5 w-full min-w-0">
        <select
          value={effectiveCompanyId ?? ''}
          onChange={(e) => {
            const id = e.target.value
            if (!id) return
            setSelectedCompanyId(id)
            window.location.reload()
          }}
          className="w-full truncate rounded-md border border-slate-600 bg-slate-800/80 px-2 py-1 text-[10px] font-medium text-slate-100 outline-none focus:border-primary"
          title="Active tenant company"
        >
          <option value="" disabled>Select company…</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.name}
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div className="hidden items-center gap-2 sm:flex">
      <Building2 className="h-4 w-4 shrink-0 text-primary" />
      <select
        value={effectiveCompanyId ?? ''}
        onChange={(e) => {
          const id = e.target.value
          if (!id) return
          setSelectedCompanyId(id)
          window.location.reload()
        }}
        className="max-w-[180px] truncate rounded-lg border border-primary/20 bg-white/90 px-2 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-primary dark:border-primary/30 dark:bg-slate-800 dark:text-slate-100 lg:max-w-[220px]"
        title="Active tenant company"
      >
        <option value="" disabled>Select company…</option>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.code} — {c.name}
          </option>
        ))}
      </select>
    </div>
  )
}
