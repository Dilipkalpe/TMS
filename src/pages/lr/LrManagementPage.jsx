import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ERPContentPage from '../../components/ui/ERPContentPage'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import LrOperationalStatusFlow from '../../components/lr/LrOperationalStatusFlow'
import LrWorkflowGrid from './LrWorkflowGrid'
import LoadingSheetBatchPanel from './LoadingSheetBatchPanel'
import { LR_OPERATION_FLOW, getFlowStep } from '../../constants/lrStatusNavigation'
import { lrOperationsApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { Plus } from 'lucide-react'

const DEFAULT_STAGE = 'lr-created'

export default function LrManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()
  const [counts, setCounts] = useState({})

  const stage = searchParams.get('status') || DEFAULT_STAGE
  const flowStep = getFlowStep(stage) ?? LR_OPERATION_FLOW[0]

  const reloadCounts = useCallback(() => {
    lrOperationsApi.summary()
      .then((res) => setCounts(res.counts ?? {}))
      .catch((e) => toast({ title: 'Counts unavailable', message: e.message, type: 'warning' }))
  }, [toast])

  useEffect(() => {
    reloadCounts()
  }, [stage, reloadCounts])

  const selectStage = (step) => {
    setSearchParams({ status: step.stage }, { replace: true })
  }

  const batchMode = flowStep.batchLoading === true

  const gridKey = useMemo(() => `${stage}-${batchMode ? 'batch' : 'grid'}`, [stage, batchMode])

  return (
    <ERPContentPage
      module="LR Management"
      title="LR Management"
      toolbar={(
        <Link to="/lr/generate">
          <Button icon={Plus}>Create LR</Button>
        </Link>
      )}
    >
      <Card className="mb-4 border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900 dark:bg-violet-950/20">
        <LrOperationalStatusFlow
          steps={LR_OPERATION_FLOW}
          selectedId={flowStep.id}
          onSelect={selectStage}
          counts={counts}
        />
      </Card>

      {batchMode ? (
        <LoadingSheetBatchPanel key={gridKey} stage={stage} onChanged={reloadCounts} />
      ) : (
        <LrWorkflowGrid
          key={gridKey}
          stage={stage}
          stageActionLabel={flowStep.label}
          onChanged={reloadCounts}
        />
      )}
    </ERPContentPage>
  )
}
