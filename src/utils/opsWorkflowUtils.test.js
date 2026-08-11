import { describe, it, expect } from 'vitest'
import {
  WORKFLOW_STEPS,
  activeWorkflowStep,
  deriveTransitPassStatus,
  deriveDispatchStatus,
  deriveInTransitStatus,
  derivePodVerificationStatus,
  mergeExtendedData,
  normalizeCheckpoints,
  statusBadgeVariant,
} from './opsWorkflowUtils'
import {
  workflowStageSamples,
  WORKFLOW_STAGE_ORDER,
  SAMPLE_LR_NUMBER,
} from './opsWorkflowFixtures'

describe('WORKFLOW_STEPS', () => {
  it('defines operational flow from LR through billing', () => {
    expect(WORKFLOW_STEPS.map((s) => s.id)).toEqual([
      'lr', 'loading', 'transit', 'dispatch', 'in-transit', 'delivery', 'pod', 'billing',
    ])
    expect(WORKFLOW_STEPS[0].path(SAMPLE_LR_NUMBER)).toContain(encodeURIComponent(SAMPLE_LR_NUMBER))
  })
})

describe('activeWorkflowStep — sample flow entries', () => {
  it.each(WORKFLOW_STAGE_ORDER)('stage %s maps to expected UI step', (stageKey) => {
    const sample = workflowStageSamples[stageKey]
    expect(activeWorkflowStep(sample.lr, sample.process)).toBe(sample.expectedStep)
  })

  it('in-transit LR without delivery sheet points to dispatch', () => {
    const sample = workflowStageSamples.inTransit
    expect(activeWorkflowStep(sample.lr, {})).toBe('dispatch')
  })
})

describe('deriveTransitPassStatus', () => {
  it('returns Ready for Dispatch when pass is marked ready', () => {
    const { lr, process } = workflowStageSamples.transitPassGenerated
    expect(deriveTransitPassStatus(lr, process.transitPass)).toBe('Ready for Dispatch')
  })

  it('returns Cancelled when extended passStatus is Cancelled', () => {
    expect(deriveTransitPassStatus(
      workflowStageSamples.transitPassGenerated.lr,
      { extendedData: { passStatus: 'Cancelled' } },
    )).toBe('Cancelled')
  })
})

describe('deriveDispatchStatus', () => {
  it('returns Dispatched when shipment is In Transit', () => {
    const { lr, process } = workflowStageSamples.inTransit
    expect(deriveDispatchStatus(lr, process.deliverySheet)).toBe('Dispatched')
  })

  it('returns Pending when transit pass generated but no delivery sheet', () => {
    const { lr } = workflowStageSamples.transitPassGenerated
    expect(deriveDispatchStatus(lr, null)).toBe('Pending')
  })
})

describe('deriveInTransitStatus', () => {
  it('reads inTransitStatus from delivery sheet sample', () => {
    const { process } = workflowStageSamples.inTransit
    expect(deriveInTransitStatus(process.deliverySheet)).toBe('In Transit')
  })
})

describe('derivePodVerificationStatus', () => {
  it('returns Verified for POD uploaded sample', () => {
    const { process } = workflowStageSamples.podUploaded
    expect(derivePodVerificationStatus(process.deliverySheet)).toBe('Verified')
  })

  it('returns Pending before verification', () => {
    const { process } = workflowStageSamples.deliveryCompleted
    expect(derivePodVerificationStatus(process.deliverySheet)).toBe('Pending')
  })
})

describe('mergeExtendedData', () => {
  it('preserves dispatch when saving delivery outcome (flow sample)', () => {
    const { deliverySheet } = workflowStageSamples.inTransit.process
    const merged = mergeExtendedData(deliverySheet.extendedData, {
      deliveryOutcome: 'Delivered',
      failureReason: '',
    })
    expect(merged.dispatch.dispatchNo).toBe('TC/PN/2026-27/TRP/00001')
    expect(merged.checkpoints).toHaveLength(1)
    expect(merged.deliveryOutcome).toBe('Delivered')
  })

  it('deep-merges nested dispatch fields without wiping siblings', () => {
    const base = { dispatch: { dispatchNo: 'D1', startingKm: 100 }, checkpoints: [] }
    const merged = mergeExtendedData(base, { dispatch: { remarks: 'Gate out' } })
    expect(merged.dispatch).toEqual({ dispatchNo: 'D1', startingKm: 100, remarks: 'Gate out' })
  })
})

describe('normalizeCheckpoints', () => {
  it('returns checkpoints from in-transit sample', () => {
    const { deliverySheet } = workflowStageSamples.inTransit.process
    const cps = normalizeCheckpoints(deliverySheet)
    expect(cps).toHaveLength(1)
    expect(cps[0].location).toBe('Lonavala')
  })

  it('returns empty array when missing', () => {
    expect(normalizeCheckpoints(null)).toEqual([])
  })
})

describe('statusBadgeVariant', () => {
  it('maps workflow statuses to badge variants', () => {
    expect(statusBadgeVariant('Delivered')).toBe('Paid')
    expect(statusBadgeVariant('In Transit')).toBe('info')
    expect(statusBadgeVariant('Pending')).toBe('Pending')
    expect(statusBadgeVariant('Cancelled')).toBe('Cancelled')
  })
})
