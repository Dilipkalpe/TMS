import { useEffect, useState } from 'react'
import { Building2 } from 'lucide-react'
import { useCompany } from '../../context/CompanyContext'
import { platformApi } from '../../services/api'

export default function CompanySelector() {
  const { effectiveCompanyId, setSelectedCompanyId } = useCompany()
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    platformApi.companies()
      .then(setCompanies)
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <span className="hidden text-xs text-slate-500 sm:inline">Loading companies…</span>
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
