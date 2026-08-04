import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import LrKpiCards from '../../components/lr/LrKpiCards'
import LrStatusTabs from '../../components/lr/LrStatusTabs'
import LrMasterListGrid from './LrMasterListGrid'
import LrWorkflowGrid from './LrWorkflowGrid'
import LoadingSheetBatchPanel from './LoadingSheetBatchPanel'
import { LR_MANAGEMENT_TABS, getManagementTab } from '../../constants/lrStatusNavigation'
import { lrOperationsApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'

const DEFAULT_STAGE = 'lr-list'

export default function LrManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()
  const [summary, setSummary] = useState({ counts: {} })

  const stage = searchParams.get('status') || DEFAULT_STAGE
  const tab = getManagementTab(stage)

  const reloadSummary = useCallback(() => {
    lrOperationsApi.summary()
      .then((res) => setSummary(res ?? {}))
      .catch((e) => toast({ title: 'Summary unavailable', message: e.message, type: 'warning' }))
  }, [toast])

  useEffect(() => {
    reloadSummary()
  }, [stage, reloadSummary])

  const selectStage = (nextStage) => {
    setSearchParams({ status: nextStage }, { replace: true })
  }

  const selectTab = (step) => selectStage(step.stage)

  const batchMode = tab.batchLoading === true
  const isMasterList = tab.masterView === true

  const gridKey = useMemo(() => `${stage}-${batchMode ? 'batch' : isMasterList ? 'list' : 'grid'}`, [stage, batchMode, isMasterList])

  return (
    <ERPContentPage module="LR Management" title="LR Management">
      <LrKpiCards summary={summary} onSelectStage={selectStage} />

      <LrStatusTabs
        tabs={LR_MANAGEMENT_TABS}
        selectedStage={stage}
        counts={summary.counts ?? {}}
        totalCount={summary.totalLR ?? 0}
        onSelect={selectTab}
      />

      {summary.notifications?.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          {summary.notifications.map((n) => (
            <button
              key={n.stage}
              type="button"
              className="mr-4 underline-offset-2 hover:underline"
              onClick={() => selectStage(n.stage)}
            >
              {n.message} ({n.count})
            </button>
          ))}
        </div>
      )}

      {isMasterList ? (
        <LrMasterListGrid key={gridKey} onChanged={reloadSummary} />
      ) : batchMode ? (
        <LoadingSheetBatchPanel key={gridKey} stage={stage} onChanged={reloadSummary} />
      ) : (
        <LrWorkflowGrid
          key={gridKey}
          stage={stage}
          stageActionLabel={tab.label}
          onChanged={reloadSummary}
        />
      )}
    </ERPContentPage>
  )
}
