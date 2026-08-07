import OpsModuleListPage from '../../../components/ops/OpsModuleListPage'
import { TMS_MODULES } from '../../../config/tmsModules'

const PAGES = {
  'loading-slip': { mod: TMS_MODULES.loadingSlip, key: 'loading-slips', addLabel: 'New Loading Slip' },
  'transit-pass': { mod: TMS_MODULES.transitPass, key: 'transit-passes', addLabel: 'New Transit Pass' },
  'delivery-complete': { mod: TMS_MODULES.deliveryComplete, key: 'delivery-complete', addLabel: 'Delivery Complete' },
  pod: { mod: TMS_MODULES.pod, key: 'pod', addLabel: 'New POD' },
  billing: { mod: TMS_MODULES.billing, key: 'billing', addLabel: 'New Bill', lrLinkKey: 'lrNumber' },
  'trip-expenses': { mod: TMS_MODULES.tripExpenses, key: 'trip-expenses', addLabel: 'Add Trip Expense', lrLinkKey: 'lrNumber' },
}

export default function TmsModuleListRoute({ module }) {
  const cfg = PAGES[module]
  if (!cfg) return null
  return (
    <OpsModuleListPage
      moduleKey={cfg.key}
      title={`${cfg.mod.title} List`}
      addPath={cfg.mod.addPath}
      addLabel={cfg.addLabel}
      lrLinkKey={cfg.lrLinkKey || 'lrNumber'}
      searchPlaceholder={`Search ${cfg.mod.title}…`}
    />
  )
}
