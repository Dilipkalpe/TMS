import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge, { statusVariant } from '../../components/ui/Badge'
import ERPDataTable from '../../components/ui/ERPDataTable'
import { formatCurrency } from '../../components/ui/ReportFilters'
import { glApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { ArrowLeft, Loader2, Pencil, Trash2 } from 'lucide-react'

export default function VoucherDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [voucher, setVoucher] = useState(null)

  useEffect(() => {
    setLoading(true)
    glApi.voucher(id)
      .then(setVoucher)
      .catch((err) => toast({ title: 'Load failed', message: err.message, type: 'error' }))
      .finally(() => setLoading(false))
  }, [id, toast])

  const lines = voucher?.lines || []
  const totalDebit = voucher?.totalDebit ?? lines.reduce((s, l) => s + (Number(l.debit) || 0), 0)
  const totalCredit = voucher?.totalCredit ?? lines.reduce((s, l) => s + (Number(l.credit) || 0), 0)
  const difference = voucher?.difference ?? Math.round((totalDebit - totalCredit) * 100) / 100

  const columns = useMemo(() => [
    { key: 'ledgerName', label: 'Account / Ledger', render: (r) => r.ledgerName || '—' },
    { key: 'description', label: 'Description', render: (r) => r.description || r.lineNarration || '—' },
    { key: 'debit', label: 'Debit', render: (r) => (r.debit ? formatCurrency(r.debit) : '—') },
    { key: 'credit', label: 'Credit', render: (r) => (r.credit ? formatCurrency(r.credit) : '—') },
  ], [])

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this voucher?')) return
    try {
      await glApi.deleteVoucher(id, { remarks: 'Deleted from voucher view' })
      toast({ title: 'Done', message: 'Voucher deleted/cancelled.', type: 'success' })
      navigate('/accounting/vouchers')
    } catch (err) {
      toast({ title: 'Delete failed', message: err.message, type: 'error' })
    }
  }

  if (loading) {
    return (
      <ERPContentPage module="Accounting" title="View Voucher">
        <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      </ERPContentPage>
    )
  }

  if (!voucher) {
    return (
      <ERPContentPage module="Accounting" title="View Voucher">
        <p className="text-sm text-slate-500">Voucher not found.</p>
        <Button className="mt-3" variant="outline" icon={ArrowLeft} onClick={() => navigate('/accounting/vouchers')}>Back to list</Button>
      </ERPContentPage>
    )
  }

  const canEdit = voucher.status !== 'REVERSED'

  return (
    <ERPContentPage module="Accounting" title={`Voucher ${voucher.voucherNo}`}>
      <div className="mb-3 flex flex-wrap gap-2">
        <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/accounting/vouchers')}>Back</Button>
        {canEdit && (
          <Button icon={Pencil} onClick={() => navigate(`/accounting/voucher-entry?id=${voucher.id}`)}>Edit</Button>
        )}
        {canEdit && (
          <Button variant="outline" className="text-red-600" icon={Trash2} onClick={handleDelete}>Delete</Button>
        )}
        <Link to="/accounting/voucher-entry" className="inline-flex">
          <Button variant="outline">+ Add Voucher</Button>
        </Link>
      </div>

      <Card className="mb-4">
        <CardHeader title="Voucher Header" subtitle="Read-only" />
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <div><dt className="text-slate-400">Voucher No.</dt><dd className="font-medium">{voucher.voucherNo}</dd></div>
          <div><dt className="text-slate-400">Voucher Date</dt><dd>{voucher.voucherDate || voucher.date}</dd></div>
          <div>
            <dt className="text-slate-400">Voucher Type</dt>
            <dd>{voucher.voucherType}</dd>
          </div>
          <div><dt className="text-slate-400">Reference No.</dt><dd>{voucher.referenceNo || '—'}</dd></div>
          <div>
            <dt className="text-slate-400">Status</dt>
            <dd>
              <Badge variant={statusVariant(voucher.status === 'POSTED' ? 'Paid' : voucher.status === 'DRAFT' ? 'Pending' : 'Cancelled')}>
                {voucher.status}
              </Badge>
            </dd>
          </div>
          <div><dt className="text-slate-400">Branch</dt><dd>{voucher.branchName || '—'}</dd></div>
          <div><dt className="text-slate-400">Created By</dt><dd>{voucher.createdBy || '—'}</dd></div>
          <div><dt className="text-slate-400">Created Date</dt><dd>{voucher.createdDate || '—'}</dd></div>
          <div className="sm:col-span-2 lg:col-span-3"><dt className="text-slate-400">Narration</dt><dd>{voucher.narration || '—'}</dd></div>
        </dl>
      </Card>

      <Card>
        <CardHeader title="Voucher Details" subtitle="Debit / Credit lines" />
        <ERPDataTable columns={columns} data={lines} showActions={false} selectable={false} emptyMessage="No lines." />
        <div className="mt-4 grid gap-2 sm:grid-cols-3 text-sm border-t pt-3 dark:border-slate-700">
          <div><span className="text-slate-400">Total Debit: </span><strong>{formatCurrency(totalDebit)}</strong></div>
          <div><span className="text-slate-400">Total Credit: </span><strong>{formatCurrency(totalCredit)}</strong></div>
          <div>
            <span className="text-slate-400">Difference: </span>
            <strong className={difference === 0 ? 'text-emerald-600' : 'text-red-600'}>{formatCurrency(difference)}</strong>
          </div>
        </div>
      </Card>
    </ERPContentPage>
  )
}
