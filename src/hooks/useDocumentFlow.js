import { useCallback, useEffect, useState } from 'react'
import { settingsApi } from '../services/api'

export const DOCUMENT_FLOW = {
  FirstLRThenBooking: 'FirstLRThenBooking',
  FirstBookingThenLR: 'FirstBookingThenLR',
}

export const DOCUMENT_FLOW_LABELS = {
  FirstLRThenBooking: 'First LR → Next Booking',
  FirstBookingThenLR: 'First Booking → Next LR',
}

/**
 * Loads company Document Flow Preference for Booking/LR workflows.
 */
export function useDocumentFlow() {
  const [documentFlow, setDocumentFlow] = useState(DOCUMENT_FLOW.FirstBookingThenLR)
  const [documentFlowLabel, setDocumentFlowLabel] = useState(DOCUMENT_FLOW_LABELS.FirstBookingThenLR)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await settingsApi.getDocumentFlow()
      const flow = res?.documentFlow || DOCUMENT_FLOW.FirstBookingThenLR
      setDocumentFlow(flow)
      setDocumentFlowLabel(res?.documentFlowLabel || DOCUMENT_FLOW_LABELS[flow] || flow)
      return flow
    } catch {
      setDocumentFlow(DOCUMENT_FLOW.FirstBookingThenLR)
      setDocumentFlowLabel(DOCUMENT_FLOW_LABELS.FirstBookingThenLR)
      return DOCUMENT_FLOW.FirstBookingThenLR
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    documentFlow,
    documentFlowLabel,
    loading,
    refresh,
    isFirstLrThenBooking: documentFlow === DOCUMENT_FLOW.FirstLRThenBooking,
    isFirstBookingThenLr: documentFlow === DOCUMENT_FLOW.FirstBookingThenLR,
  }
}
