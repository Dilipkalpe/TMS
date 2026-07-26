import { Building2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useBranch } from '../../context/BranchContext'

export default function BranchSelector() {
  const { user } = useAuth()
  const { branches, loading, selectedBranchId, setSelectedBranchId } = useBranch()

  if (!user?.canAccessAllBranches) {
    if (!user?.branchName) return null
    return (
      <div className="hidden items-center gap-1.5 rounded-xl border border-primary/20 bg-white/90 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-primary/30 dark:bg-slate-800/90 dark:text-slate-200 sm:flex">
        <Building2 className="h-3.5 w-3.5 text-primary" />
        {user.branchName}
      </div>
    )
  }

  return (
    <div className="hidden items-center gap-2 sm:flex">
      <Building2 className="h-4 w-4 shrink-0 text-primary" />
      <select
        value={selectedBranchId || 'all'}
        disabled={loading && branches.length === 0}
        onChange={(e) => {
          const id = e.target.value
          setSelectedBranchId(id)
          window.location.reload()
        }}
        className="max-w-[200px] truncate rounded-lg border border-primary/20 bg-white/90 px-2 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-primary dark:border-primary/30 dark:bg-slate-800 dark:text-slate-100 lg:max-w-[240px]"
        title="Active branch"
      >
        <option value="all">All branches</option>
        {branches.map((b) => (
          <option key={String(b.id)} value={String(b.id)}>
            {b.code ? `${b.code} — ${b.name}` : b.name}
          </option>
        ))}
      </select>
    </div>
  )
}
