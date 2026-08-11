import { useNavigate } from 'react-router-dom'
import OpsLrQueueGate from '../../components/ops/OpsLrQueueGate'
import BillingInvoicePageContent from '../../components/billing/BillingInvoicePageContent'

export default function CreateInvoicePage() {
  const navigate = useNavigate()

  return (
    <OpsLrQueueGate
      module="Billing"
      title="New Billing Invoice"
      stage="pod-uploaded"
      processStep="invoice"
      basePath="/operations/billing/invoice"
      listPath="/operations/billing/list"
      queueHint="Select an LR with POD uploaded to create a freight invoice."
    >
      {(ctx) => (
        <BillingInvoicePageContent
          lrNumber={ctx.lrNumber}
          lr={ctx.lr}
          process={ctx.process}
          saving={ctx.saving}
          runSave={ctx.runSave}
          onBack={() => navigate('/operations/billing/list')}
        />
      )}
    </OpsLrQueueGate>
  )
}
