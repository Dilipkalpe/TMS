import { useNavigate } from 'react-router-dom'

export default function OpsWorkflowChain({ lrNumber, process }) {
  const navigate = useNavigate()
  if (!lrNumber) return null

  const inTransitStatus = process?.deliverySheet?.inTransitStatus
    || process?.deliverySheet?.extendedData?.inTransitStatus
  const reachedDestination = inTransitStatus === 'Reached Destination'
  const delivered = process?.deliverySheet?.shipmentStatus === 'Delivered'
    || process?.deliverySheet?.shipmentStatus === 'POD Received'
    || process?.deliverySheet?.shipmentStatus === 'Closed'

  const links = [
    { label: 'LR', path: `/lr/${encodeURIComponent(String(lrNumber).replaceAll('/', '~'))}`, done: true },
    { label: 'Loading Slip', path: `/operations/loading-slip?lr=${encodeURIComponent(lrNumber)}`, done: !!process?.loadingSheet },
    { label: 'Transit Pass', path: `/operations/transit-pass?lr=${encodeURIComponent(lrNumber)}`, done: !!process?.transitPass },
    { label: 'Dispatch', path: `/operations/dispatch?lr=${encodeURIComponent(lrNumber)}`, done: !!process?.deliverySheet?.dispatchNo || process?.deliverySheet?.shipmentStatus === 'In Transit' || delivered },
    { label: 'In Transit', path: `/operations/in-transit?lr=${encodeURIComponent(lrNumber)}`, done: reachedDestination || delivered },
    { label: 'Delivery', path: `/operations/delivery-complete?lr=${encodeURIComponent(lrNumber)}`, done: delivered },
    { label: 'POD', path: `/operations/delivery/pod?lr=${encodeURIComponent(lrNumber)}`, done: process?.deliverySheet?.shipmentStatus === 'POD Received' || process?.deliveryDocuments?.length > 0 },
  ]

  return (
    <div className="flex flex-wrap items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900">
      {links.map((l, i) => (
        <span key={l.label} className="inline-flex items-center gap-1">
          {i > 0 && <span className="text-slate-400">→</span>}
          <button
            type="button"
            className={`rounded px-1.5 py-0.5 font-medium ${l.done ? 'text-blue-700 hover:bg-blue-50 dark:text-blue-300' : 'text-slate-500'}`}
            onClick={() => navigate(l.path)}
          >
            {l.label}
          </button>
        </span>
      ))}
    </div>
  )
}
