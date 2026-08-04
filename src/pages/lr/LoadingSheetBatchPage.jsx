import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { lrOperationsApi } from '../../services/api'
import { lrProcessPath } from '../../utils/docPath'
import { useToast } from '../../context/ToastContext'
import { usePagedApiResource, buildListParams } from '../../hooks/usePagedApiResource'
import { CheckSquare, Square } from 'lucide-react'

export default function LoadingSheetBatchPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [selected, setSelected] = useState([])
  const paged = usePagedApiResource(
    ({ page, pageSize, search }) =>
      lrOperationsApi.queue('loading-sheet', buildListParams({ page, pageSize, search })),
    [],
  )

  useEffect(() => {
    setSelected([])
  }, [paged.items])

  const toggle = (num) => {
    setSelected((prev) => (prev.includes(num) ? prev.filter((x) => x !== num) : [...prev, num]))
  }

  const startLoadingSheet = () => {
    if (selected.length === 0) {
      toast({ title: 'Select LRs', message: 'Choose at least one LR for the loading sheet.', type: 'warning' })
      return
    }
    const anchor = selected[0]
    navigate(lrProcessPath(anchor, 'loading'))
  }

  return (
    <div>
      <Card className="mb-4 border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Select multiple LRs (same customer for FTL, or PTL consolidation). Open the loading sheet on the anchor LR to attach all selected LRs.
        </p>
        <Button className="mt-3" disabled={selected.length === 0} onClick={startLoadingSheet}>
          Create Loading Sheet ({selected.length} selected)
        </Button>
      </Card>

      {paged.loading ? (
        <p className="text-sm text-slate-500">Loading pending LRs…</p>
      ) : paged.items.length === 0 ? (
        <p className="text-sm text-slate-500">No LRs pending for loading sheet.</p>
      ) : (
        <ul className="space-y-2">
          {paged.items.map((row) => {
            const on = selected.includes(row.lrNumber)
            return (
              <li
                key={row.lrNumber}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:border-violet-300 dark:border-slate-700"
                onClick={() => toggle(row.lrNumber)}
              >
                {on ? <CheckSquare className="h-5 w-5 text-violet-600" /> : <Square className="h-5 w-5 text-slate-400" />}
                <div className="flex-1">
                  <p className="font-semibold">{row.lrNumber}</p>
                  <p className="text-sm text-slate-500">{row.consignor} → {row.consignee} · {row.from} → {row.to}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(lrProcessPath(row.lrNumber, 'loading'))
                  }}
                >
                  Single LR sheet
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
