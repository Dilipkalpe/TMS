import { useNavigate } from 'react-router-dom'
import { WORKFLOW_STEPS, activeWorkflowStep } from '../../utils/opsWorkflowUtils'

export default function OpsWorkflowFlowBanner({ lrNumber, lr, process, currentStep }) {
  const navigate = useNavigate()
  const active = currentStep || activeWorkflowStep(lr, process)

  return (
    <div className="billing-flow-banner mb-2 shrink-0">
      <div className="billing-flow-steps">
        {WORKFLOW_STEPS.map((step, i) => {
          const isActive = step.id === active
          const isPast = WORKFLOW_STEPS.findIndex((s) => s.id === active) > i
          return (
            <button
              key={step.id}
              type="button"
              className={`billing-flow-step ${isActive ? 'is-active' : ''} ${isPast ? 'is-done' : ''}`}
              onClick={() => lrNumber && navigate(step.path(lrNumber))}
              disabled={!lrNumber}
            >
              <span className="billing-flow-step-num">{i + 1}</span>
              <span className="billing-flow-step-label">{step.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
