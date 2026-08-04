import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge, { statusVariant } from '../../components/ui/Badge'
import Input from '../../components/ui/Input'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { lrProcessApi } from '../../services/api'
import { lrProcessPath } from '../../utils/docPath'
import { useToast } from '../../context/ToastContext'
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react'

export default function LrExpenseApprovalPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [remarks, setRemarks] = useState({})

  const reload = () => {
    setLoading(true)
    lrProcessApi.pendingExpenses()
      .then(setRows)
      .catch((e) => toast({ title: 'Load failed', message: e.message, type: 'error' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { reload() }, [])

  const approve = async (row) => {
    setSaving(true)
    try {
      await lrProcessApi.approveExpense(row.lrNumber, row.id)
      toast({ title: 'Approved', type: 'success' })
      reload()
    } catch (err) {
      toast({ title: 'Failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const reject = async (row) => {
    const text = remarks[row.id]
    if (!text?.trim()) {
      toast({ title: 'Validation', message: 'Rejection remarks required.', type: 'warning' })
      return
    }
    setSaving(true)
    try {
      await lrProcessApi.rejectExpense(row.lrNumber, row.id, text)
      toast({ title: 'Rejected', type: 'success' })
      reload()
    } catch (err) {
      toast({ title: 'Failed', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ERPContentPage
      module="LR Management"
      title="Expense Approval"
      toolbar={(
        <Link to="/lr/expense-pending">
          <Button variant="outline" icon={ArrowLeft}>Expense Pending</Button>
        </Link>
      )}
    >
      <Card className="p-4">
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500">No pending expenses.</p>
        ) : (
          <ul className="space-y-4">
            {rows.map((row) => (
              <li key={row.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link to={lrProcessPath(row.lrNumber, 'expense')} className="font-semibold text-violet-600 hover:underline">
                      LR {row.lrNumber}
                    </Link>
                    <p className="text-sm">{row.category} · {formatCurrency(row.amount)} · {row.expenseDate}</p>
                    <p className="text-sm text-slate-500">{row.description || '—'}</p>
                    <p className="text-xs text-slate-400">Added by {row.addedBy || '—'}</p>
                    {row.attachmentUrl && (
                      <a href={row.attachmentUrl} target="_blank" rel="noreferrer" className="text-sm text-violet-600 hover:underline">View attachment</a>
                    )}
                  </div>
                  <Badge variant={statusVariant('Pending')}>{row.status}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <Button size="sm" icon={CheckCircle2} disabled={saving} onClick={() => approve(row)}>Approve</Button>
                  <Input
                    placeholder="Rejection remarks"
                    value={remarks[row.id] ?? ''}
                    onChange={(e) => setRemarks({ ...remarks, [row.id]: e.target.value })}
                    className="max-w-sm"
                  />
                  <Button size="sm" variant="outline" icon={XCircle} disabled={saving} onClick={() => reject(row)}>Reject</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </ERPContentPage>
  )
}
