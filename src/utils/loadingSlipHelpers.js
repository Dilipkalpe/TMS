import { formatLrDate, parsePackagesWeight } from './lrDisplayHelpers'

/** Map API LR record to loading-slip grid row. */
export function mapLrToLoadingRow(lr, overrides = {}) {
  const pkg = parsePackagesWeight(lr?.quantity)
  return {
    lrNumber: lr.lrNumber,
    lrDate: formatLrDate(lr.lrDate),
    customer: lr.customerName || lr.consignor || '—',
    consignee: lr.consignee || '—',
    destination: lr.to || '—',
    items: lr.material ? String(lr.material).split(',').filter(Boolean).length || 1 : pkg.packages,
    packages: pkg.packages,
    actualWeight: pkg.weight,
    chargedWeight: pkg.weight,
    volume: '—',
    loaded: false,
    ...overrides,
  }
}

/** Map loading-sheet item + anchor LR fallback. */
export function mapLoadingSheetItems(process, lr) {
  const sheet = process?.loadingSheet
  if (!sheet) return []

  const rowStates = sheet.extendedData?.meta?.rowStates ?? []
  const items = sheet.items

  if (!items?.length) {
    if (lr?.lrNumber) {
      const state = rowStates.find((s) => s.lrNumber === lr.lrNumber)
      return [mapLrToLoadingRow(lr, { loaded: state?.loaded ?? true })]
    }
    return []
  }

  return items.map((i) => {
    const state = rowStates.find((s) => s.lrNumber === i.lrNumber)
    const pkg = parsePackagesWeight(i.quantityText || lr?.quantity)
    return {
      lrNumber: i.lrNumber,
      lrDate: formatLrDate(lr?.lrDate),
      customer: i.customerName || i.customer || lr?.customerName || lr?.consignor || '—',
      consignee: lr?.consignee || '—',
      destination: lr?.to || '—',
      items: i.quantityText ? 1 : pkg.packages,
      packages: i.quantityText || pkg.packages,
      actualWeight: i.quantityTons ?? pkg.weight,
      chargedWeight: i.quantityTons ?? pkg.weight,
      volume: '—',
      loaded: state?.loaded ?? true,
    }
  })
}

export function emptyLoadingSlipForm(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  const local = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
  return {
    slipNo: '—',
    dateTime: local,
    branch: '',
    branchId: null,
    plannedBy: '',
    loadingStatus: 'Completed',
    loadingCompletedAt: local,
    vehicleNo: '',
    vehicleId: null,
    vehicleType: '',
    driver: '',
    driverId: null,
    driverMobile: '',
    transporter: '',
    tripNo: '',
    routeFrom: '',
    routeTo: '',
    routeVia: '',
    expectedDelivery: '',
    loader: '',
    loaderMobile: '',
    supervisor: '',
    supervisorMobile: '',
    sealNo: '',
    remarks: '',
    loadingLocation: '',
  }
}

export function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
