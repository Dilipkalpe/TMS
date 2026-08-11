import { Building2, ChevronDown } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useBranch } from '../../context/BranchContext'

export default function BranchSelector({ variant = 'default' }) {
  const { user } = useAuth()
  const { branches, loading, selectedBranchId, setSelectedBranchId } = useBranch()

  const multiAssigned = !user?.canAccessAllBranches && (user?.allowedBranchIds?.length || 0) > 1
  const erpPill = variant === 'erp'

  const selectedLabel = () => {
    if (selectedBranchId && selectedBranchId !== 'all') {
      const b = branches.find((x) => String(x.id) === String(selectedBranchId))
      if (b) return b.name || b.code
    }
    if (user?.branchName) return user.branchName
    if (branches[0]) return branches[0].name || branches[0].code
    return user?.canAccessAllBranches ? 'All branches' : 'Branch'
  }

  if (!user?.canAccessAllBranches && !multiAssigned) {
    if (!user?.branchName && branches.length === 0) return null
    const label = selectedLabel()
    if (!label) return null
    return (
      <div className={`flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 ${erpPill ? 'text-sm' : ''}`}>
        <Building2 className="h-4 w-4 text-primary" />
        <span className="max-w-[10rem] truncate">{label}</span>
        {erpPill && <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-1.5 ${erpPill ? '' : 'hidden sm:flex sm:gap-2'}`}>
      <Building2 className="h-4 w-4 shrink-0 text-primary" />
      <div className="relative">
        <select
          value={selectedBranchId || 'all'}
          disabled={loading && branches.length === 0}
          onChange={(e) => {
            const id = e.target.value
            setSelectedBranchId(id)
            window.location.reload()
          }}
          className={`appearance-none truncate rounded-lg border border-slate-200 bg-white py-2 pl-2 pr-7 text-xs font-medium text-slate-700 outline-none focus:border-primary dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 ${
            erpPill ? 'max-w-[11rem] text-sm' : 'max-w-[200px] lg:max-w-[240px]'
          }`}
          title="Active branch"
        >
          <option value="all">{user?.canAccessAllBranches ? 'All branches' : 'All my branches'}</option>
          {branches.map((b) => (
            <option key={String(b.id)} value={String(b.id)}>
              {b.code ? `${b.code} — ${b.name}` : b.name}
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
