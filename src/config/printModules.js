/** Stable module codes for individual transport document print templates. */
export const PRINT_MODULE_CODES = {
  LR_LIST: 'LR_LIST', // Lorry Receipt / Consignment Note (code kept for API compat)
  LOADING_SLIP: 'LOADING_SLIP',
  TRANSIT_PASS: 'TRANSIT_PASS',
  DISPATCH: 'DISPATCH',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERY_COMPLETE: 'DELIVERY_COMPLETE',
  POD: 'POD',
  BILLING: 'BILLING',
  HUB_MANIFEST: 'HUB_MANIFEST',
  HUB_RECEIVING: 'HUB_RECEIVING',
}

export const PRINT_TEMPLATE_CODES = ['T1', 'T2', 'T3', 'T4', 'T5']

/** Standard transport-business layout styles for a single document. */
export const PRINT_TEMPLATE_LABELS = {
  T1: 'T1 — Standard (A4 Consignment)',
  T2: 'T2 — Compact (half-page)',
  T3: 'T3 — Full Border (office copy)',
  T4: 'T4 — Branded Modern',
  T5: 'T5 — Minimal (thermal-friendly)',
}

/** Individual document types — not list printouts. */
export const PRINT_MODULES = [
  {
    moduleCode: PRINT_MODULE_CODES.LR_LIST,
    label: 'Lorry Receipt / Consignment Note',
    shortLabel: 'LR / CN',
    document: true,
  },
  {
    moduleCode: PRINT_MODULE_CODES.LOADING_SLIP,
    label: 'Loading Slip',
    shortLabel: 'Loading Slip',
    document: true,
  },
  {
    moduleCode: PRINT_MODULE_CODES.TRANSIT_PASS,
    label: 'Transit Pass / Memo',
    shortLabel: 'Transit Pass',
    document: true,
  },
  {
    moduleCode: PRINT_MODULE_CODES.DISPATCH,
    label: 'Dispatch / Gate-Out Slip',
    shortLabel: 'Dispatch',
    document: true,
  },
  {
    moduleCode: PRINT_MODULE_CODES.IN_TRANSIT,
    label: 'In-Transit Status Sheet',
    shortLabel: 'In Transit',
    document: true,
  },
  {
    moduleCode: PRINT_MODULE_CODES.DELIVERY_COMPLETE,
    label: 'Delivery Confirmation',
    shortLabel: 'Delivery',
    document: true,
  },
  {
    moduleCode: PRINT_MODULE_CODES.POD,
    label: 'Proof of Delivery (POD)',
    shortLabel: 'POD',
    document: true,
  },
  {
    moduleCode: PRINT_MODULE_CODES.BILLING,
    label: 'Freight Bill / Tax Invoice',
    shortLabel: 'Freight Bill',
    document: true,
  },
  {
    moduleCode: PRINT_MODULE_CODES.HUB_MANIFEST,
    label: 'Hub Re-Manifest',
    shortLabel: 'Hub Manifest',
    document: true,
  },
  {
    moduleCode: PRINT_MODULE_CODES.HUB_RECEIVING,
    label: 'Hub Receiving Report',
    shortLabel: 'Hub Receiving',
    document: true,
  },
]

export function normalizeTemplateCode(code) {
  const c = String(code || 'T1').toUpperCase()
  return PRINT_TEMPLATE_CODES.includes(c) ? c : 'T1'
}

export function moduleLabel(moduleCode) {
  return PRINT_MODULES.find((m) => m.moduleCode === moduleCode)?.label ?? moduleCode
}

/** Map ops module keys / routes to print module codes. */
export const OPS_MODULE_PRINT_MAP = {
  dispatch: PRINT_MODULE_CODES.DISPATCH,
  'loading-slips': PRINT_MODULE_CODES.LOADING_SLIP,
  'transit-passes': PRINT_MODULE_CODES.TRANSIT_PASS,
  'in-transit': PRINT_MODULE_CODES.IN_TRANSIT,
  'delivery-complete': PRINT_MODULE_CODES.DELIVERY_COMPLETE,
  pod: PRINT_MODULE_CODES.POD,
  billing: PRINT_MODULE_CODES.BILLING,
}
