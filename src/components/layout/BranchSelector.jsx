import { useRef } from 'react'
import { Building2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useBranch } from '../../context/BranchContext'
import LocalSearchSelect from '../ui/LocalSearchSelect'

export default function BranchSelector() {
  const { user } = useAuth()
  const { branches, loading, selectedBranchId, setSelectedBranchId } = useBranch()
  const wrapRef = useRef(null)

  if (!user?.canAccessAllBranches) {
    if (!user?.branchName) return null
    return (
      <div className="hidden items-center gap-1.5 rounded-xl border border-primary/20 bg-white/90 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-primary/30 dark:bg-slate-800/90 dark:text-slate-200 sm:flex">
        <Building2 className="h-3.5 w-3.5 text-primary" />
        {user.branchName}
      </div>
    )
  }

  if (loading && branches.length === 0) return null

  const branchOptions = [
    { value: 'all', label: 'All branches' },
    ...branches.map((b) => ({ value: b.id, label: `${b.code} — ${b.name}` })),
  ]

  return (
    <div ref={wrapRef} className="hidden sm:block">
      <div className="flex items-center gap-1.5 rounded-xl border border-primary/20 bg-white/90 px-2 py-1 dark:border-primary/30 dark:bg-slate-800/90">
        <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" />
        <LocalSearchSelect
          options={branchOptions}
          value={selectedBranchId}
          onChange={(id) => {
            setSelectedBranchId(id)
            window.location.reload()
          }}
          placeholder="Search branch…"
          limit={10}
          className="[&_input]:border-0 [&_input]:bg-transparent [&_input]:py-1 [&_input]:text-xs [&_input]:shadow-none [&_input]:ring-0"
          getOptionValue={(o) => o.value}
          getOptionLabel={(o) => o.label}
        />
      </div>
    </div>
  )
}
