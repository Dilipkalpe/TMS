import { API_BASE_URL } from '../config/api'
import { getStoredCompanyId } from '../context/CompanyContext'
import { formatApiErrorBody } from '../utils/apiErrors'

const DEMO_COMPANY_ID = '00000000-0000-4000-8000-000000000001'

const TOKEN_KEY = 'tms-token'
const BRANCH_KEY = 'tms-branch-id'

function getStoredBranchId() {
  return localStorage.getItem(BRANCH_KEY)
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  constructor(message, status, details = null) {
    super(message)
    this.status = status
    this.details = details
  }
}

async function readApiError(res, fallbackMessage) {
  let message = fallbackMessage || res.statusText
  let details = null
  try {
    const err = await res.json()
    details = err
    message = formatApiErrorBody(err) || message
  } catch {
    /* ignore */
  }
  return { message, details }
}

/** Unwrap `{ items, total }` paged API responses or return arrays unchanged. */
export function unwrapList(result) {
  if (Array.isArray(result)) return result
  return result?.items ?? []
}

/** Build query string, omitting null/undefined values (URLSearchParams stringifies them as "undefined"). */
function queryString(params = {}) {
  const filtered = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v != null),
  )
  return new URLSearchParams(filtered).toString()
}

const API_TIMEOUT_MS = 60000

export async function apiRequest(path, options = {}) {
  const { method = 'GET', body, auth = true, timeout = API_TIMEOUT_MS } = options
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
    const branchId = getStoredBranchId()
    if (branchId && branchId !== 'all') headers['X-Branch-Id'] = branchId
    const companyId = getStoredCompanyId() || DEMO_COMPANY_ID
    if (companyId) headers['X-Company-Id'] = companyId
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  let res
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new ApiError(
        'Request timed out. Ensure the API is running (npm run dev:api) and PostgreSQL is reachable.',
        0,
      )
    }
    throw new ApiError(
      'Cannot reach the API server. Start the API: npm run dev:api (or cd backend/Tms.Api && dotnet run)',
      0,
    )
  } finally {
    clearTimeout(timer)
  }

  if (res.status === 401) {
    if (auth && getToken()) {
      setToken(null)
      window.dispatchEvent(new CustomEvent('tms-unauthorized'))
      throw new ApiError('Session expired. Please login again.', 401)
    }
    let message = 'Invalid username or password.'
    try {
      const err = await res.json()
      message = formatApiErrorBody(err) || err.message || err.Message || message
    } catch {
      /* ignore */
    }
    throw new ApiError(message, 401)
  }

  if (!res.ok) {
    const { message, details } = await readApiError(res, res.statusText)
    throw new ApiError(message, res.status, details)
  }

  if (res.status === 204) return null
  return res.json()
}

export const authApi = {
  login: (username, password) => apiRequest('/auth/login', { method: 'POST', body: { username, password }, auth: false }),
  me: (options = {}) => apiRequest('/auth/me', options),
}

export const platformApi = {
  companies: () => apiRequest('/platform/companies'),
  createCompany: (data) => apiRequest('/platform/companies', { method: 'POST', body: data }),
  plans: () => apiRequest('/platform/plans'),
  billing: () => apiRequest('/platform/billing'),
  changePlan: (companyId, data) => apiRequest(`/platform/companies/${companyId}/subscription`, { method: 'PUT', body: data }),
}

export const subscriptionApi = {
  current: () => apiRequest('/subscription/current'),
}

export const branchesApi = {
  list: () => apiRequest('/branches'),
  get: (id) => apiRequest(`/branches/${id}`),
  create: (data) => apiRequest('/branches', { method: 'POST', body: data }),
  update: (id, data) => apiRequest(`/branches/${id}`, { method: 'PUT', body: data }),
  remove: (id) => apiRequest(`/branches/${id}`, { method: 'DELETE' }),
}

export const bookingsApi = {
  list: (params = {}) => apiRequest(`/bookings?${new URLSearchParams(params)}`),
  get: (id) => apiRequest(`/bookings/${id}`),
  create: (data) => apiRequest('/bookings', { method: 'POST', body: data }),
  update: (id, data) => apiRequest(`/bookings/${id}`, { method: 'PUT', body: data }),
  remove: (id) => apiRequest(`/bookings/${id}`, { method: 'DELETE' }),
}

export const vehiclesApi = {
  list: (params = {}) => apiRequest(`/vehicles?${new URLSearchParams(params)}`),
  get: (id) => apiRequest(`/vehicles/${id}`),
  create: (data) => apiRequest('/vehicles', { method: 'POST', body: data }),
  update: (id, data) => apiRequest(`/vehicles/${id}`, { method: 'PUT', body: data }),
  remove: (id) => apiRequest(`/vehicles/${id}`, { method: 'DELETE' }),
}

export const driversApi = {
  list: (params = {}) => apiRequest(`/drivers?${new URLSearchParams(params)}`),
  get: (id) => apiRequest(`/drivers/${id}`),
  create: (data) => apiRequest('/drivers', { method: 'POST', body: data }),
  update: (id, data) => apiRequest(`/drivers/${id}`, { method: 'PUT', body: data }),
  remove: (id) => apiRequest(`/drivers/${id}`, { method: 'DELETE' }),
}

export const customersApi = {
  list: (params = {}) => apiRequest(`/customers?${new URLSearchParams(params)}`),
  get: (id) => apiRequest(`/customers/${id}`),
  create: (data) => apiRequest('/customers', { method: 'POST', body: data }),
  update: (id, data) => apiRequest(`/customers/${id}`, { method: 'PUT', body: data }),
  remove: (id) => apiRequest(`/customers/${id}`, { method: 'DELETE' }),
  portalAccessList: (params = {}) => apiRequest(`/customers/portal-access/list?${new URLSearchParams(params)}`),
  setPortalAccess: (id, data) => apiRequest(`/customers/${id}/portal`, { method: 'PUT', body: data }),
}

export const vendorsApi = {
  list: (params = {}) => apiRequest(`/vendors?${new URLSearchParams(params)}`),
  get: (id) => apiRequest(`/vendors/${id}`),
  create: (data) => apiRequest('/vendors', { method: 'POST', body: data }),
  update: (id, data) => apiRequest(`/vendors/${id}`, { method: 'PUT', body: data }),
  remove: (id) => apiRequest(`/vendors/${id}`, { method: 'DELETE' }),
}

export const expensesApi = {
  list: (params = {}) => apiRequest(`/expenses?${new URLSearchParams(params)}`),
  get: (id) => apiRequest(`/expenses/${id}`),
  create: (data) => apiRequest('/expenses', { method: 'POST', body: data }),
  update: (id, data) => apiRequest(`/expenses/${id}`, { method: 'PUT', body: data }),
  remove: (id) => apiRequest(`/expenses/${id}`, { method: 'DELETE' }),
  categories: () => apiRequest('/expenses/categories'),
}

export const lrApi = {
  list: (params = {}) => apiRequest(`/lr?${new URLSearchParams(params)}`),
  recent: () => apiRequest('/lr?page=1&pageSize=15'),
  get: (lrNumber) => apiRequest(`/lr/${encodeURIComponent(lrNumber)}`),
  prefillFromBooking: (bookingId) => apiRequest(`/lr/prefill/${encodeURIComponent(bookingId)}`),
  create: (data) => apiRequest('/lr', { method: 'POST', body: data }),
  update: (lrNumber, data) => apiRequest(`/lr/${encodeURIComponent(lrNumber)}`, { method: 'PUT', body: data }),
  remove: (lrNumber) => apiRequest(`/lr/${encodeURIComponent(lrNumber)}`, { method: 'DELETE' }),
}

export const dashboardApi = {
  stats: () => apiRequest('/dashboard/stats'),
  recentBookings: () => apiRequest('/dashboard/recent-bookings'),
  recentTrips: () => apiRequest('/dashboard/recent-trips'),
  alerts: () => apiRequest('/dashboard/alerts'),
  monthlyRevenue: () => apiRequest('/dashboard/charts/monthly-revenue'),
  monthlyExpenses: () => apiRequest('/dashboard/charts/monthly-expenses'),
  tripAnalysis: () => apiRequest('/dashboard/charts/trip-analysis'),
  paymentMix: () => apiRequest('/dashboard/charts/payment-mix'),
  expenseBreakdown: () => apiRequest('/dashboard/charts/expense-breakdown'),
  fleetStatus: () => apiRequest('/dashboard/charts/fleet-status'),
  vehicleUtilization: () => apiRequest('/dashboard/charts/vehicle-utilization'),
  weeklyBookings: () => apiRequest('/dashboard/charts/weekly-bookings'),
  routePerformance: () => apiRequest('/dashboard/charts/route-performance'),
  driverPerformance: () => apiRequest('/dashboard/charts/driver-performance'),
  fleetGauge: () => apiRequest('/dashboard/charts/fleet-gauge'),
}

export const lookupsApi = {
  vehicles: (search = '', limit = 10) =>
    apiRequest(`/lookups/vehicles?${new URLSearchParams({ limit, ...(search?.trim() ? { search: search.trim() } : {}) })}`),
  drivers: (search = '', limit = 10) =>
    apiRequest(`/lookups/drivers?${new URLSearchParams({ limit, ...(search?.trim() ? { search: search.trim() } : {}) })}`),
  employees: (employeeType = '', search = '', limit = 10) =>
    apiRequest(`/lookups/employees?${new URLSearchParams({
      limit,
      ...(employeeType?.trim() ? { employeeType: employeeType.trim() } : {}),
      ...(search?.trim() ? { search: search.trim() } : {}),
    })}`),
  customers: (search = '', limit = 10) =>
    apiRequest(`/lookups/customers?${new URLSearchParams({ limit, ...(search?.trim() ? { search: search.trim() } : {}) })}`),
  vendors: (search = '', limit = 10) =>
    apiRequest(`/lookups/vendors?${new URLSearchParams({ limit, ...(search?.trim() ? { search: search.trim() } : {}) })}`),
  quickCreate: (type, name, employeeType) =>
    apiRequest('/lookups/quick-create', {
      method: 'POST',
      body: { type, name, employeeType: employeeType || undefined },
    }),
}

export const importApi = {
  upload: (entity, rows) =>
    apiRequest(`/import/${entity}`, { method: 'POST', body: { rows } }),
}

export const reportsApi = {
  trips: () => apiRequest('/reports/trips'),
  income: () => apiRequest('/reports/income'),
  expenses: () => apiRequest('/reports/expenses'),
  vehicles: (params = {}) => apiRequest(`/reports/vehicles?${new URLSearchParams(params)}`),
  drivers: (params = {}) => apiRequest(`/reports/drivers?${new URLSearchParams(params)}`),
  customers: (params = {}) => apiRequest(`/reports/customers?${new URLSearchParams(params)}`),
  vendors: (params = {}) => apiRequest(`/reports/vendors?${new URLSearchParams(params)}`),
  cashFlow: () => apiRequest('/reports/cash-flow'),
  cashFlowDetails: (params = {}) => apiRequest(`/reports/cash-flow/details?${new URLSearchParams(params)}`),
}

export const accountingApi = {
  chartOfAccounts: () => apiRequest('/accounting/chart-of-accounts'),
  ledgerMaster: () => apiRequest('/accounting/ledger-master'),
  createLedger: (data) => apiRequest('/accounting/ledger-master', { method: 'POST', body: data }),
  voucherTypes: () => apiRequest('/accounting/voucher-types'),
  createVoucher: (data) => apiRequest('/accounting/vouchers', { method: 'POST', body: data }),
  cashBook: () => apiRequest('/accounting/cash-book'),
  bankBook: () => apiRequest('/accounting/bank-book'),
  dayBook: () => apiRequest('/accounting/day-book'),
  journalRegister: () => apiRequest('/accounting/journal-register'),
  receiptRegister: () => apiRequest('/accounting/receipt-register'),
  paymentRegister: () => apiRequest('/accounting/payment-register'),
  purchaseRegister: () => apiRequest('/accounting/purchase-register'),
  salesRegister: () => apiRequest('/accounting/sales-register'),
  ledgerReport: (params = {}) => apiRequest(`/accounting/ledger-report?${new URLSearchParams(params)}`),
  customerLedger: (params = {}) => apiRequest(`/accounting/customer-ledger?${new URLSearchParams(params)}`),
  vendorLedger: () => apiRequest('/accounting/vendor-ledger'),
  driverLedger: () => apiRequest('/accounting/driver-ledger'),
  vehicleLedger: () => apiRequest('/accounting/vehicle-ledger'),
  trialBalance: () => apiRequest('/accounting/trial-balance'),
  profitLoss: () => apiRequest('/accounting/profit-loss'),
  balanceSheet: (params = {}) => apiRequest(`/accounting/balance-sheet?${new URLSearchParams(params)}`),
  outstanding: (params = {}) => apiRequest(`/accounting/outstanding?${new URLSearchParams(params)}`),
  gst: () => apiRequest('/accounting/gst'),
}

export const bookingFinanceApi = {
  summary: (bookingId) => apiRequest(`/bookings/${encodeURIComponent(bookingId)}/finance`),
  listPayments: (bookingId) => apiRequest(`/bookings/${encodeURIComponent(bookingId)}/payments`),
  recordPayment: (bookingId, data) => apiRequest(`/bookings/${encodeURIComponent(bookingId)}/payments`, { method: 'POST', body: data }),
  addBrokerCharge: (bookingId, data) => apiRequest(`/bookings/${encodeURIComponent(bookingId)}/broker-charges`, { method: 'POST', body: data }),
  addExpense: (bookingId, data) => apiRequest(`/bookings/${encodeURIComponent(bookingId)}/expenses`, { method: 'POST', body: data }),
  createBill: (bookingId, data) => apiRequest(`/bookings/${encodeURIComponent(bookingId)}/bills`, { method: 'POST', body: data }),
  deleteBill: (bookingId, billId) => apiRequest(`/bookings/${encodeURIComponent(bookingId)}/bills/${billId}`, { method: 'DELETE' }),
  profitLoss: (bookingId) => apiRequest(`/bookings/${encodeURIComponent(bookingId)}/profit-loss`),
  bookingProfitLossReport: (params = {}) => apiRequest(`/reports/booking-profit-loss?${queryString(params)}`),
  brokerOutstanding: () => apiRequest('/reports/broker-outstanding'),
  provisions: (type) => apiRequest(`/provisions${type ? `?type=${encodeURIComponent(type)}` : ''}`),
  createProvision: (data) => apiRequest('/provisions', { method: 'POST', body: data }),
  reverseProvision: (id) => apiRequest(`/provisions/${id}/reverse`, { method: 'POST' }),
  brokers: () => apiRequest('/brokers'),
}

export const settingsApi = {
  get: () => apiRequest('/settings'),
  update: (data) => apiRequest('/settings', { method: 'PUT', body: data }),
  uploadLogo: async (file) => {
    const token = getToken()
    const headers = {}
    if (token) headers.Authorization = `Bearer ${token}`
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${API_BASE_URL}/settings/logo`, { method: 'POST', headers, body: form })
    if (!res.ok) {
      const { message } = await readApiError(res, res.statusText)
      throw new ApiError(message, res.status)
    }
    return res.json()
  },
  deleteLogo: () => apiRequest('/settings/logo', { method: 'DELETE' }),
}

export const payrollApi = {
  summary: () => apiRequest('/payroll/summary'),
  runs: (params = {}) => apiRequest(`/payroll/runs?${new URLSearchParams(params)}`),
  getRun: (id) => apiRequest(`/payroll/runs/${id}`),
  entries: (id) => apiRequest(`/payroll/runs/${id}/entries`),
  accounting: (id) => apiRequest(`/payroll/runs/${id}/accounting`),
  generate: (month, year) => apiRequest('/payroll/generate', { method: 'POST', body: { month, year } }),
  process: (id) => apiRequest(`/payroll/runs/${id}/process`, { method: 'POST' }),
  pay: (id, paymentMode = 'Bank Transfer') =>
    apiRequest(`/payroll/runs/${id}/pay`, { method: 'POST', body: { paymentMode } }),
  cancel: (id) => apiRequest(`/payroll/runs/${id}`, { method: 'DELETE' }),
  settings: () => apiRequest('/payroll/settings'),
  updateSetting: (key, value) => apiRequest('/payroll/settings', { method: 'PUT', body: { key, value } }),
  payslips: (params = {}) => apiRequest(`/payroll/payslips?${new URLSearchParams(params)}`),
  getPayslip: (entryId) => apiRequest(`/payroll/payslips/${entryId}`),
  salaryRegister: (params = {}) => apiRequest(`/payroll/salary-register?${queryString(params)}`),
}

export const hrApi = {
  summary: () => apiRequest('/hr/summary'),
  departments: () => apiRequest('/hr/departments'),
  saveDepartment: (data) => apiRequest('/hr/departments', { method: 'POST', body: data }),
  designations: () => apiRequest('/hr/designations'),
  employees: (params = {}) => apiRequest(`/hr/employees?${new URLSearchParams(params)}`),
  getEmployee: (id) => apiRequest(`/hr/employees/${id}`),
  saveEmployee: (data) => apiRequest('/hr/employees', { method: 'POST', body: data }),
  deleteEmployee: (id) => apiRequest(`/hr/employees/${id}`, { method: 'DELETE' }),
  attendance: (params = {}) => apiRequest(`/hr/attendance?${new URLSearchParams(params)}`),
  markAttendance: (data) => apiRequest('/hr/attendance', { method: 'POST', body: data }),
  bulkAttendance: (data) => apiRequest('/hr/attendance/bulk', { method: 'POST', body: data }),
  leaveTypes: () => apiRequest('/hr/leave-types'),
  leaves: (params = {}) => apiRequest(`/hr/leaves?${new URLSearchParams(params)}`),
  applyLeave: (data) => apiRequest('/hr/leaves', { method: 'POST', body: data }),
  approveLeave: (id) => apiRequest(`/hr/leaves/${id}/approve`, { method: 'POST' }),
  rejectLeave: (id) => apiRequest(`/hr/leaves/${id}/reject`, { method: 'POST' }),
  holidays: (year) => apiRequest(`/hr/holidays?${year ? `year=${year}` : ''}`),
}

export const maintenanceApi = {
  overview: () => apiRequest('/maintenance/overview'),
  predictions: () => apiRequest('/maintenance/predictions'),
  analytics: () => apiRequest('/maintenance/analytics'),
  alerts: () => apiRequest('/maintenance/alerts'),
  vehicleProfile: (vehicleId) => apiRequest(`/maintenance/vehicles/${vehicleId}`),
  notifyVehicle: (vehicleId) => apiRequest(`/maintenance/vehicles/${vehicleId}/notify`, { method: 'POST' }),
  schedules: () => apiRequest('/maintenance/schedules'),
  addSchedule: (data) => apiRequest('/maintenance/schedules', { method: 'POST', body: data }),
  records: () => apiRequest('/maintenance/records'),
  addRecord: (data) => apiRequest('/maintenance/records', { method: 'POST', body: data }),
  workOrders: (params = {}) => apiRequest(`/maintenance/work-orders?${new URLSearchParams(params)}`),
  addWorkOrder: (data) => apiRequest('/maintenance/work-orders', { method: 'POST', body: data }),
  updateWorkOrderStatus: (id, status) => apiRequest(`/maintenance/work-orders/${id}/status`, { method: 'PATCH', body: { status } }),
  spareParts: () => apiRequest('/maintenance/spare-parts'),
  addSparePart: (data) => apiRequest('/maintenance/spare-parts', { method: 'POST', body: data }),
  updateStock: (id, stockQty) => apiRequest(`/maintenance/spare-parts/${id}/stock`, { method: 'PATCH', body: { stockQty } }),
}

export const fuelApi = {
  entries: (params = {}) => apiRequest(`/fuel/entries?${new URLSearchParams(params)}`),
  addEntry: (data) => apiRequest('/fuel/entries', { method: 'POST', body: data }),
  analytics: () => apiRequest('/fuel/analytics'),
  suspicious: () => apiRequest('/fuel/suspicious'),
}

export const gpsApi = {
  live: (params = {}) => apiRequest(`/gps/live?${new URLSearchParams(params)}`),
  fleetSummary: () => apiRequest('/gps/fleet-summary'),
  history: (vehicleId, params = {}) => apiRequest(`/gps/vehicles/${vehicleId}/history?${new URLSearchParams(params)}`),
  ingest: (data) => apiRequest('/gps/ingest', { method: 'POST', body: data }),
  simulate: (data) => apiRequest('/gps/simulate', { method: 'POST', body: data }),
}

export const geofenceApi = {
  list: () => apiRequest('/geofences'),
  get: (id) => apiRequest(`/geofences/${id}`),
  create: (data) => apiRequest('/geofences', { method: 'POST', body: data }),
  update: (id, data) => apiRequest(`/geofences/${id}`, { method: 'PATCH', body: data }),
  remove: (id) => apiRequest(`/geofences/${id}`, { method: 'DELETE' }),
  setAssignments: (id, data) => apiRequest(`/geofences/${id}/assignments`, { method: 'PUT', body: data }),
  events: (params = {}) => apiRequest(`/geofences/events?${new URLSearchParams(params)}`),
  acknowledge: (id) => apiRequest(`/geofences/events/${id}/acknowledge`, { method: 'PATCH', body: {} }),
}

export const podApi = {
  sendOtp: (bookingId) => apiRequest(`/pod/${bookingId}/send-otp`, { method: 'POST' }),
  confirm: (bookingId, data) => apiRequest(`/pod/${bookingId}/confirm`, { method: 'POST', body: data }),
  get: (bookingId) => apiRequest(`/pod/${bookingId}`),
}

export const customerPortalApi = {
  shipments: () => apiRequest('/customer-portal/shipments'),
  createBooking: (data) => apiRequest('/customer-portal/bookings', { method: 'POST', body: data }),
  track: (id) => apiRequest(`/customer-portal/shipments/${id}/track`),
  invoices: () => apiRequest('/customer-portal/invoices'),
  pod: (bookingId) => apiRequest(`/customer-portal/pod/${bookingId}`),
}

const PORTAL_TOKEN_KEY = 'tms-portal-token'

export function getPortalToken() {
  return localStorage.getItem(PORTAL_TOKEN_KEY)
}

export function setPortalToken(token) {
  if (token) localStorage.setItem(PORTAL_TOKEN_KEY, token)
  else localStorage.removeItem(PORTAL_TOKEN_KEY)
}

export async function portalRequest(path, options = {}) {
  const { method = 'GET', body, auth = true } = options
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }
  if (auth) {
    const token = getPortalToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    if (auth && getPortalToken()) {
      setPortalToken(null)
      window.dispatchEvent(new CustomEvent('tms-portal-unauthorized'))
    }
    let message = 'Session expired. Please sign in again.'
    if (!auth) {
      try {
        const err = await res.json()
        message = formatApiErrorBody(err) || err.message || err.Message || 'Invalid phone or PIN'
      } catch {
        message = 'Invalid phone or PIN'
      }
    }
    throw new ApiError(message, 401)
  }

  if (!res.ok) {
    const { message, details } = await readApiError(res, res.statusText)
    throw new ApiError(message, res.status, details)
  }

  if (res.status === 204) return null
  return res.json()
}

export const portalApi = {
  demoLogins: () => apiRequest('/portal/auth/demo-logins', { auth: false }),
  login: async (phone, pin) => {
    const res = await portalRequest('/portal/auth/login', { method: 'POST', body: { phone, pin }, auth: false })
    setPortalToken(res.token)
    return res
  },
  trackLogin: async (bookingId, phone) => {
    const res = await portalRequest('/portal/auth/track', { method: 'POST', body: { bookingId, phone }, auth: false })
    setPortalToken(res.token)
    return res
  },
  me: () => portalRequest('/portal/auth/me'),
  logout: () => setPortalToken(null),
  shipments: () => portalRequest('/portal/shipments'),
  tracking: (id) => portalRequest(`/portal/shipments/${id}/tracking`),
  invoices: () => portalRequest('/portal/invoices'),
  invoice: (id) => portalRequest(`/portal/invoices/${id}`),
  pod: (bookingId) => portalRequest(`/portal/pod/${bookingId}`),
  shareLink: (id) => portalRequest(`/portal/shipments/${id}/share-link`, { method: 'POST' }),
  publicTrack: (bookingId, token) =>
    apiRequest(`/portal/public/track/${encodeURIComponent(bookingId)}?token=${encodeURIComponent(token)}`, { auth: false }),
  setCustomerPortal: (customerId, data) =>
    apiRequest(`/customers/${customerId}/portal`, { method: 'PUT', body: data }),
}

export const shipmentsApi = {
  list: () => apiRequest('/shipments'),
  track: (id) => apiRequest(`/shipments/${id}/track`),
}

export const tripsApi = {
  list: (params = {}) => apiRequest(`/trips?${new URLSearchParams(params)}`),
  create: (data) => apiRequest('/trips', { method: 'POST', body: data }),
  updateStatus: (id, data) => apiRequest(`/trips/${id}/status`, { method: 'PATCH', body: data }),
}

export const routingApi = {
  tripDetail: (tripId) => apiRequest(`/routing/trips/${tripId}`),
  optimizeTrip: (tripId, options = {}) => apiRequest(`/routing/trips/${tripId}/optimize`, { method: 'POST', body: options }),
  optimizeAdHoc: (data) => apiRequest('/routing/optimize', { method: 'POST', body: data }),
  applyJob: (jobId) => apiRequest(`/routing/jobs/${jobId}/apply`, { method: 'POST' }),
  jobs: (limit = 30) => apiRequest(`/routing/jobs?limit=${limit}`),
  job: (jobId) => apiRequest(`/routing/jobs/${jobId}`),
}

export const financeApi = {
  summary: () => apiRequest('/finance/summary'),
  invoices: () => apiRequest('/finance/invoices'),
  expenses: () => apiRequest('/finance/expenses'),
  createInvoice: (data) => apiRequest('/finance/invoices', { method: 'POST', body: data }),
}

export const documentsApi = {
  expiring: (days = 30) => apiRequest(`/documents/expiring?days=${days}`),
  save: (data) => apiRequest('/documents', { method: 'POST', body: data }),
}

export const notificationsApi = {
  list: () => apiRequest('/notifications'),
  markRead: (id) => apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }),
  templates: () => apiRequest('/notifications/templates'),
  updateTemplate: (id, data) => apiRequest(`/notifications/templates/${id}`, { method: 'PUT', body: data }),
  outbox: (params = {}) => apiRequest(`/notifications/outbox?${new URLSearchParams(params)}`),
  channelSettings: () => apiRequest('/notifications/channel-settings'),
  updateChannelSettings: (data) => apiRequest('/notifications/channel-settings', { method: 'PUT', body: data }),
  preferences: () => apiRequest('/notifications/preferences'),
  savePreferences: (items) => apiRequest('/notifications/preferences', { method: 'PUT', body: items }),
  sendTest: (data) => apiRequest('/notifications/send-test', { method: 'POST', body: data }),
}

export const analyticsApi = {
  fleetUtilization: () => apiRequest('/analytics/fleet-utilization'),
  routeProfitability: () => apiRequest('/analytics/route-profitability'),
}

export const marketplaceApi = {
  listings: () => apiRequest('/marketplace/listings'),
  createListing: (data) => apiRequest('/marketplace/listings', { method: 'POST', body: data }),
  bid: (id, data) => apiRequest(`/marketplace/listings/${id}/bid`, { method: 'POST', body: data }),
}

export const warehouseApi = {
  list: () => apiRequest('/warehouses'),
  create: (data) => apiRequest('/warehouses', { method: 'POST', body: data }),
  addInventory: (id, data) => apiRequest(`/warehouses/${id}/inventory`, { method: 'POST', body: data }),
}

export const iotApi = {
  devices: () => apiRequest('/iot/devices'),
  register: (data) => apiRequest('/iot/devices', { method: 'POST', body: data }),
  reading: (id, data) => apiRequest(`/iot/devices/${id}/readings`, { method: 'POST', body: data }),
}

export const aiApi = {
  chat: (message, sessionId) => apiRequest('/ai/chat', { method: 'POST', body: { message, sessionId } }),
  forecasts: () => apiRequest('/ai/forecasts'),
}
