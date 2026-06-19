import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import LoginRoute from './components/auth/LoginRoute'
import Dashboard from './pages/Dashboard'
import BookingList from './pages/booking/BookingList'
import NewBooking from './pages/booking/NewBooking'
import BookingDetails from './pages/booking/BookingDetails'
import GenerateLR from './pages/lr/GenerateLR'
import LRList from './pages/lr/LRList'
import VehicleList from './pages/vehicles/VehicleList'
import VehicleDetails from './pages/vehicles/VehicleDetails'
import NewVehicle from './pages/vehicles/NewVehicle'
import DriverList from './pages/drivers/DriverList'
import DriverDetails from './pages/drivers/DriverDetails'
import NewDriver from './pages/drivers/NewDriver'
import CustomerList from './pages/customers/CustomerList'
import CustomerDetails from './pages/customers/CustomerDetails'
import NewCustomer from './pages/customers/NewCustomer'
import VendorList from './pages/vendors/VendorList'
import VendorDetails from './pages/vendors/VendorDetails'
import NewVendor from './pages/vendors/NewVendor'
import ExpenseList from './pages/expenses/ExpenseList'
import NewExpense from './pages/expenses/NewExpense'
import AccountingHub from './pages/accounting/AccountingHub'
import ChartOfAccounts from './pages/accounting/ChartOfAccounts'
import LedgerMaster from './pages/accounting/LedgerMaster'
import NewLedger from './pages/accounting/NewLedger'
import VoucherEntry from './pages/accounting/VoucherEntry'
import LedgerReport from './pages/accounting/LedgerReport'
import CustomerLedgerReport from './pages/accounting/CustomerLedgerReport'
import VendorLedgerReport from './pages/accounting/VendorLedgerReport'
import DriverLedgerReport from './pages/accounting/DriverLedgerReport'
import VehicleLedgerReport from './pages/accounting/VehicleLedgerReport'
import CashBook from './pages/accounting/CashBook'
import BankBook from './pages/accounting/BankBook'
import DayBook from './pages/accounting/DayBook'
import JournalRegister from './pages/accounting/JournalRegister'
import ReceiptRegister from './pages/accounting/ReceiptRegister'
import PaymentRegister from './pages/accounting/PaymentRegister'
import PurchaseRegister from './pages/accounting/PurchaseRegister'
import SalesRegister from './pages/accounting/SalesRegister'
import TrialBalance from './pages/accounting/TrialBalance'
import ProfitLoss from './pages/accounting/ProfitLoss'
import BalanceSheet from './pages/accounting/BalanceSheet'
import OutstandingReport from './pages/accounting/OutstandingReport'
import GSTReports from './pages/accounting/GSTReports'
import ReportsHub from './pages/reports/ReportsHub'
import TripReport from './pages/reports/TripReport'
import VehicleReport from './pages/reports/VehicleReport'
import DriverReport from './pages/reports/DriverReport'
import IncomeReport from './pages/reports/IncomeReport'
import ExpenseReportPage from './pages/reports/ExpenseReportPage'
import CustomerReport from './pages/reports/CustomerReport'
import VendorReport from './pages/reports/VendorReport'
import CashFlowReport from './pages/reports/CashFlowReport'
import Settings from './pages/settings/Settings'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="bookings" element={<BookingList />} />
        <Route path="bookings/new" element={<NewBooking />} />
        <Route path="bookings/:id" element={<BookingDetails />} />
        <Route path="lr" element={<LRList />} />
        <Route path="lr/generate" element={<GenerateLR />} />
        <Route path="vehicles" element={<VehicleList />} />
        <Route path="vehicles/new" element={<NewVehicle />} />
        <Route path="vehicles/:id" element={<VehicleDetails />} />
        <Route path="drivers" element={<DriverList />} />
        <Route path="drivers/new" element={<NewDriver />} />
        <Route path="drivers/:id" element={<DriverDetails />} />
        <Route path="customers" element={<CustomerList />} />
        <Route path="customers/new" element={<NewCustomer />} />
        <Route path="customers/:id" element={<CustomerDetails />} />
        <Route path="vendors" element={<VendorList />} />
        <Route path="vendors/new" element={<NewVendor />} />
        <Route path="vendors/:id" element={<VendorDetails />} />
        <Route path="expenses" element={<ExpenseList />} />
        <Route path="expenses/new" element={<NewExpense />} />
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
        <Route path="accounting/trial-balance" element={<TrialBalance />} />
        <Route path="accounting/profit-loss" element={<ProfitLoss />} />
        <Route path="accounting/balance-sheet" element={<BalanceSheet />} />
        <Route path="accounting/outstanding" element={<OutstandingReport />} />
        <Route path="accounting/gst" element={<GSTReports />} />
        <Route path="reports" element={<ReportsHub />} />
        <Route path="reports/trips" element={<TripReport />} />
        <Route path="reports/vehicles" element={<VehicleReport />} />
        <Route path="reports/drivers" element={<DriverReport />} />
        <Route path="reports/income" element={<IncomeReport />} />
        <Route path="reports/expenses" element={<ExpenseReportPage />} />
        <Route path="reports/customers" element={<CustomerReport />} />
        <Route path="reports/vendors" element={<VendorReport />} />
        <Route path="reports/cash-flow" element={<CashFlowReport />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
