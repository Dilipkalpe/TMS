import { Suspense } from 'react'
import { Navigate, Routes, Route } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import TenantGuard from './components/auth/TenantGuard'
import LoginRoute from './components/auth/LoginRoute'
import PageFallback from './components/ui/PageFallback'
import {
  Dashboard, NewBooking, BookingDetails, EditBooking,
  GenerateLR, EditLR, LRProcessPage, LrExpenseApprovalPage,
  LrManagementPage, LrDetailPage, LrListPage, LrEntryPage, UltraLrEntryPage,
  BookingManagementLayout, BookingQuotationsTab, BookingPendingTab, BookingConfirmedTab, BookingCancelledTab,
  VehicleList, VehicleDetails, NewVehicle, EditVehicle,
  CustomerList, CustomerDetails, NewCustomer,
  FreightRateList, NewFreightRate, FreightRateDetails,
  QuotationList, NewQuotation, QuotationDetails,
  VendorList, VendorDetails, NewVendor,
  ConsignorList, ConsignorDetails, NewConsignor,
  ConsigneeList, ConsigneeDetails, NewConsignee,
  ExpenseList, NewExpense,
  Settings, BranchesPage, PortalUsersPage, UsersPage, DocumentNumberingPage, NotificationSettings,
  PortalLogin, PortalLayout, PortalDashboard, PortalTrackPage,
  PortalInvoices, PortalInvoiceView, PortalPublicTrack,
  AdminHub,
  AccountingHub, ChartOfAccounts, LedgerMaster, NewLedger, VoucherEntry,
  LedgerReport, CustomerLedgerReport, VendorLedgerReport, DriverLedgerReport,
  VehicleLedgerReport, CashBook, BankBook, DayBook, JournalRegister,
  ReceiptRegister, PaymentRegister, PurchaseRegister, SalesRegister,
  FreightInvoiceList, FreightInvoiceDetails,
  TrialBalance, ProfitLoss, BalanceSheet, BookingPaymentAdjustment,
  ProvisionsPage, OutstandingReport, GSTReports,
  ReportsHub, TripReport, VehicleReport, DriverReport, IncomeReport,
  ExpenseReportPage, CustomerReport, BookingPlReport, BrokerOutstandingReport,
  VendorReport, CashFlowReport,
  PayrollHub, PayrollList, ProcessPayroll, PayrollDetails, PayslipList,
  PayslipView, PayrollSettings, SalaryRegister,
  HrHub, EmployeeList, EmployeeDetails, DepartmentList, AttendancePage,
  LeaveManagement, HolidaysPage, HrTmsNorms,
  MaintenancePage, OperationsHub, FleetMapPage, RouteOptimizerPage,
  VehicleHistoryPage, GeofenceManagerPage, GeofenceAlertsPage,
  FuelPage, EpodPage, PodPage, CustomerPortalPage, TripsPage, ShipmentsPage,
  LoadingSlipPage, TransitPassCreatePage, PodEntryPage, CreateInvoicePage, TripExpensesEntryPage,
  FinanceModulePage, DocumentsPage, NotificationsPage, AnalyticsPage,
  MarketplacePage, WarehousePage, IotPage, AiPage, PlatformHub,
} from './routes/lazyPages'
import { PortalAuthProvider } from './context/PortalAuthContext'
import PortalProtectedRoute from './components/portal/PortalProtectedRoute'

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/portal/login" element={<PortalAuthProvider><PortalLogin /></PortalAuthProvider>} />
      <Route path="/portal/shared/:bookingId" element={<PortalPublicTrack />} />
      <Route path="/portal" element={<PortalAuthProvider><PortalProtectedRoute><PortalLayout /></PortalProtectedRoute></PortalAuthProvider>}>
        <Route index element={<PortalDashboard />} />
        <Route path="track/:id" element={<PortalTrackPage />} />
        <Route path="invoices" element={<PortalInvoices />} />
        <Route path="invoices/:id" element={<PortalInvoiceView />} />
      </Route>
      <Route
        element={
          <ProtectedRoute>
            <TenantGuard>
              <MainLayout />
            </TenantGuard>
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="bookings" element={<BookingManagementLayout />}>
          <Route index element={<Navigate to="/bookings/pending" replace />} />
          <Route path="quotations" element={<BookingQuotationsTab />} />
          <Route path="pending" element={<BookingPendingTab />} />
          <Route path="confirmed" element={<BookingConfirmedTab />} />
          <Route path="cancelled" element={<BookingCancelledTab />} />
        </Route>
        <Route path="bookings/new" element={<NewBooking />} />
        <Route path="bookings/:id/edit" element={<EditBooking />} />
        <Route path="bookings/:id" element={<BookingDetails />} />
        <Route path="lr" element={<LrManagementPage />} />
        <Route path="lr/loading-pending" element={<Navigate to="/lr?status=loading-pending" replace />} />
        <Route path="lr/loading-sheet" element={<Navigate to="/lr?status=loading-pending" replace />} />
        <Route path="lr/transit-pass" element={<Navigate to="/lr?status=transit-pass-generated" replace />} />
        <Route path="lr/dispatch" element={<Navigate to="/lr?status=dispatched" replace />} />
        <Route path="lr/delivery" element={<Navigate to="/lr?status=delivered" replace />} />
        <Route path="lr/pod-pending" element={<Navigate to="/lr?status=delivered" replace />} />
        <Route path="lr/invoice-pending" element={<Navigate to="/lr?status=pod-uploaded" replace />} />
        <Route path="lr/expense-pending" element={<Navigate to="/lr?status=expense-pending" replace />} />
        <Route path="lr/closed" element={<Navigate to="/lr?status=closed" replace />} />
        <Route path="lr/expense-approval" element={<LrExpenseApprovalPage />} />
        <Route path="lr/list" element={<LrListPage />} />
        <Route path="lr/entry" element={<LrEntryPage />} />
        <Route path="lr/ultra-entry" element={<UltraLrEntryPage />} />
        <Route path="lr/generate" element={<GenerateLR />} />
        <Route path="lr/expenses/approval" element={<Navigate to="/lr/expense-approval" replace />} />
        <Route path="lr/:lrNumber/process" element={<LRProcessPage />} />
        <Route path="lr/:lrNumber/edit" element={<EditLR />} />
        <Route path="lr/:lrNumber" element={<LrDetailPage />} />
        <Route path="vehicles" element={<VehicleList />} />
        <Route path="vehicles/new" element={<NewVehicle />} />
        <Route path="vehicles/:id/edit" element={<EditVehicle />} />
        <Route path="vehicles/:id" element={<VehicleDetails />} />
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="operations" element={<OperationsHub />} />
        <Route path="operations/loading-slip" element={<LoadingSlipPage />} />
        <Route path="operations/transit-pass" element={<TransitPassCreatePage />} />
        <Route path="operations/delivery/pod" element={<PodEntryPage />} />
        <Route path="operations/billing/invoice" element={<CreateInvoicePage />} />
        <Route path="operations/trip-expenses" element={<TripExpensesEntryPage />} />
        <Route path="operations/lr-management" element={<Navigate to="/lr" replace />} />
        <Route path="operations/loading" element={<Navigate to="/operations/loading-slip" replace />} />
        <Route path="operations/delivery" element={<Navigate to="/operations/delivery/pod" replace />} />
        <Route path="operations/invoice" element={<Navigate to="/operations/billing/invoice" replace />} />
        <Route path="operations/lr-expenses" element={<Navigate to="/operations/trip-expenses" replace />} />
        <Route path="operations/expense-approval" element={<Navigate to="/lr/expense-approval" replace />} />
        <Route path="operations/lr-closing" element={<Navigate to="/lr?status=expense-approved" replace />} />
        <Route path="operations/fuel" element={<FuelPage />} />
        <Route path="operations/gps" element={<FleetMapPage />} />
        <Route path="operations/gps/geofences" element={<GeofenceManagerPage />} />
        <Route path="operations/gps/alerts" element={<GeofenceAlertsPage />} />
        <Route path="operations/gps/vehicles/:vehicleId" element={<VehicleHistoryPage />} />
        <Route path="operations/epod" element={<EpodPage />} />
        <Route path="operations/pod" element={<PodPage />} />
        <Route path="operations/customer-portal" element={<CustomerPortalPage />} />
        <Route path="operations/trips" element={<TripsPage />} />
        <Route path="operations/routing" element={<RouteOptimizerPage />} />
        <Route path="operations/shipments" element={<ShipmentsPage />} />
        <Route path="operations/finance" element={<FinanceModulePage />} />
        <Route path="operations/documents" element={<DocumentsPage />} />
        <Route path="operations/notifications" element={<NotificationsPage />} />
        <Route path="operations/analytics" element={<AnalyticsPage />} />
        <Route path="operations/marketplace" element={<MarketplacePage />} />
        <Route path="operations/warehouse" element={<WarehousePage />} />
        <Route path="operations/iot" element={<IotPage />} />
        <Route path="operations/ai" element={<AiPage />} />
        <Route path="drivers" element={<Navigate to="/hr/employees" replace />} />
        <Route path="drivers/new" element={<Navigate to="/hr/employees/new" replace />} />
        <Route path="drivers/:id" element={<Navigate to="/hr/employees" replace />} />
        <Route path="customers" element={<CustomerList />} />
        <Route path="customers/new" element={<NewCustomer />} />
        <Route path="customers/:id" element={<CustomerDetails />} />
        <Route path="freight-rates" element={<FreightRateList />} />
        <Route path="freight-rates/new" element={<NewFreightRate />} />
        <Route path="freight-rates/:id" element={<FreightRateDetails />} />
        <Route path="quotations" element={<Navigate to="/bookings/quotations" replace />} />
        <Route path="quotations/new" element={<NewQuotation />} />
        <Route path="quotations/:id" element={<QuotationDetails />} />
        <Route path="vendors" element={<VendorList />} />
        <Route path="vendors/new" element={<NewVendor />} />
        <Route path="vendors/:id" element={<VendorDetails />} />
        <Route path="consignors" element={<ConsignorList />} />
        <Route path="consignors/new" element={<NewConsignor />} />
        <Route path="consignors/:id" element={<ConsignorDetails />} />
        <Route path="consignees" element={<ConsigneeList />} />
        <Route path="consignees/new" element={<NewConsignee />} />
        <Route path="consignees/:id" element={<ConsigneeDetails />} />
        <Route path="expenses" element={<ExpenseList />} />
        <Route path="expenses/new" element={<NewExpense />} />
        <Route path="payroll" element={<PayrollHub />} />
        <Route path="payroll/runs" element={<PayrollList />} />
        <Route path="payroll/runs/:id" element={<PayrollDetails />} />
        <Route path="payroll/generate" element={<ProcessPayroll />} />
        <Route path="payroll/payslips" element={<PayslipList />} />
        <Route path="payroll/payslips/:entryId" element={<PayslipView />} />
        <Route path="payroll/settings" element={<PayrollSettings />} />
        <Route path="payroll/salary-register" element={<SalaryRegister />} />
        <Route path="hr" element={<HrHub />} />
        <Route path="hr/employees" element={<EmployeeList />} />
        <Route path="hr/employees/new" element={<EmployeeDetails />} />
        <Route path="hr/employees/:id" element={<EmployeeDetails />} />
        <Route path="hr/departments" element={<DepartmentList />} />
        <Route path="hr/attendance" element={<AttendancePage />} />
        <Route path="hr/leaves" element={<LeaveManagement />} />
        <Route path="hr/holidays" element={<HolidaysPage />} />
        <Route path="hr/tms-norms" element={<HrTmsNorms />} />
        <Route path="admin" element={<AdminHub />} />
        <Route path="accounting" element={<AccountingHub />} />
        <Route path="accounting/chart-of-accounts" element={<ChartOfAccounts />} />
        <Route path="accounting/ledger-master" element={<LedgerMaster />} />
        <Route path="accounting/ledger-master/new" element={<NewLedger />} />
        <Route path="accounting/voucher-entry" element={<VoucherEntry />} />
        <Route path="accounting/ledger-report" element={<LedgerReport />} />
        <Route path="accounting/customer-ledger" element={<CustomerLedgerReport />} />
        <Route path="accounting/vendor-ledger" element={<VendorLedgerReport />} />
        <Route path="accounting/driver-ledger" element={<DriverLedgerReport />} />
        <Route path="accounting/vehicle-ledger" element={<VehicleLedgerReport />} />
        <Route path="accounting/cash-book" element={<CashBook />} />
        <Route path="accounting/bank-book" element={<BankBook />} />
        <Route path="accounting/day-book" element={<DayBook />} />
        <Route path="accounting/journal-register" element={<JournalRegister />} />
        <Route path="accounting/receipt-register" element={<ReceiptRegister />} />
        <Route path="accounting/payment-register" element={<PaymentRegister />} />
        <Route path="accounting/purchase-register" element={<PurchaseRegister />} />
        <Route path="accounting/sales-register" element={<SalesRegister />} />
        <Route path="accounting/freight-invoices" element={<FreightInvoiceList />} />
        <Route path="accounting/freight-invoices/:id" element={<FreightInvoiceDetails />} />
        <Route path="accounting/trial-balance" element={<TrialBalance />} />
        <Route path="accounting/profit-loss" element={<ProfitLoss />} />
        <Route path="accounting/balance-sheet" element={<BalanceSheet />} />
        <Route path="accounting/payment-adjustment" element={<BookingPaymentAdjustment />} />
        <Route path="accounting/provisions" element={<ProvisionsPage />} />
        <Route path="accounting/outstanding" element={<OutstandingReport />} />
        <Route path="accounting/gst" element={<GSTReports />} />
        <Route path="reports" element={<ReportsHub />} />
        <Route path="reports/trips" element={<TripReport />} />
        <Route path="reports/vehicles" element={<VehicleReport />} />
        <Route path="reports/drivers" element={<DriverReport />} />
        <Route path="reports/income" element={<IncomeReport />} />
        <Route path="reports/expenses" element={<ExpenseReportPage />} />
        <Route path="reports/customers" element={<CustomerReport />} />
        <Route path="reports/booking-pl" element={<BookingPlReport />} />
        <Route path="reports/broker-outstanding" element={<BrokerOutstandingReport />} />
        <Route path="reports/vendors" element={<VendorReport />} />
        <Route path="reports/cash-flow" element={<CashFlowReport />} />
        <Route path="platform" element={<PlatformHub />} />
        <Route path="settings" element={<Settings />} />
        <Route path="settings/branches" element={<BranchesPage />} />
        <Route path="settings/users" element={<UsersPage />} />
        <Route path="settings/document-numbering" element={<DocumentNumberingPage />} />
        <Route path="settings/portal-users" element={<PortalUsersPage />} />
        <Route path="settings/notifications" element={<NotificationSettings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    </Suspense>
  )
}
