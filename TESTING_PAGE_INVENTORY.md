# TESTING_PAGE_INVENTORY

Generated from `src/App.jsx` route table. **UI page-load for every row was not executed** (Vite blocked by full C: disk). Backend API smoke + automated suites were executed — see `COMPLETE_TMS_TEST_REPORT.md`.

- **Generated:** 2026-09-30
- **Route entries extracted:** 211
- **Primary sources:** `src/App.jsx`, page components under `src/pages/**`
- **Live API:** healthy + PostgreSQL connected (`admin` / company-scoped)
- **Frontend UI E2E:** `NOT EXECUTED – ENVIRONMENT DEPENDENCY` (C: drive 0 bytes free; Vite could not start)

## Status legend

| Status | Meaning |
| ------ | ------- |
| INVENTORIED | Page/route discovered; UI not browser-tested this run |
| AUTOMATED | Covered by unit/integration tests (see COMPLETE report) |
| API_SMOKE | Matching list/report API exercised live |
| CODE_REVIEW | Static code/API wiring reviewed |
| NOT_EXECUTED_ENV | UI/browser blocked by environment |
| REDIRECT | Navigate wrapper only |

## Inventory

| Sr No | Module | Page | URL/Route | Functionality | CRUD | API | Database | Accounting Impact | Status |
| ----- | ------ | ---- | --------- | ------------- | ---- | --- | -------- | ----------------- | ------ |
| 1 | Auth | LoginRoute | `/login` | LoginRoute screen | R | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 2 | Customer Portal | PortalAuthProvider | `/portal/login` | PortalAuthProvider screen | R | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 3 | Customer Portal | PortalPublicTrack | `/portal/shared/:bookingId` | PortalPublicTrack screen | R | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 4 | Customer Portal | PortalAuthProvider | `/portal` | PortalAuthProvider screen | R | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 5 | Core | PortalDashboard | `/portal` | PortalDashboard screen | R | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 6 | Other | PortalTrackPage | `/track/:id` | PortalTrackPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 7 | Other | PortalInvoices | `/invoices` | PortalInvoices screen | R | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 8 | Other | PortalInvoiceView | `/invoices/:id` | PortalInvoiceView screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 9 | Driver Portal | DriverAuthProvider | `/driver/login` | DriverAuthProvider screen | R | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 10 | Driver Portal | DriverAuthProvider | `/driver` | DriverAuthProvider screen | R | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 11 | Core | Dashboard | `/driver` | Dashboard screen | R | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 12 | Shipment | ShipmentManagementHub | `/shipment-management` | ShipmentManagementHub screen | N/A (nav/hub) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 13 | Shipment | HubTransferPage | `/shipment-management/hub-transfer` | HubTransferPage screen | N/A (nav/hub) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 14 | Shipment | Navigate | `/operations/hub-transfer` | Navigate | N/A (nav/hub) | — | — | None / ops only | REDIRECT |
| 15 | Delivery | DeliveryManagementHub | `/delivery-management` | DeliveryManagementHub screen | N/A (nav/hub) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 16 | Bookings | BookingManagementLayout | `/bookings` | BookingManagementLayout screen | N/A (nav/hub) | via `src/services/api.js` clients | PostgreSQL via API | Indirect (billing/expense later) | INVENTORIED / NOT_EXECUTED_ENV |
| 17 | Core | Navigate | `/driver` | Navigate | N/A (nav/hub) | — | — | None / ops only | REDIRECT |
| 18 | Bookings | BookingQuotationsTab | `/quotations` | BookingQuotationsTab screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | Indirect (billing/expense later) | INVENTORIED / NOT_EXECUTED_ENV |
| 19 | Bookings | BookingPendingTab | `/pending` | BookingPendingTab screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | Indirect (billing/expense later) | INVENTORIED / NOT_EXECUTED_ENV |
| 20 | Bookings | BookingConfirmedTab | `/confirmed` | BookingConfirmedTab screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | Indirect (billing/expense later) | INVENTORIED / NOT_EXECUTED_ENV |
| 21 | Bookings | BookingCancelledTab | `/cancelled` | BookingCancelledTab screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | Indirect (billing/expense later) | INVENTORIED / NOT_EXECUTED_ENV |
| 22 | Bookings | NewBooking | `/bookings/new` | NewBooking screen | C (create) | via `src/services/api.js` clients | PostgreSQL via API | Indirect (billing/expense later) | INVENTORIED / NOT_EXECUTED_ENV |
| 23 | Bookings | EditBooking | `/bookings/:id/edit` | EditBooking screen | U (edit) | via `src/services/api.js` clients | PostgreSQL via API | Indirect (billing/expense later) | INVENTORIED / NOT_EXECUTED_ENV |
| 24 | Bookings | BookingDetails | `/bookings/:id` | BookingDetails screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | Indirect (billing/expense later) | INVENTORIED / NOT_EXECUTED_ENV |
| 25 | LR / Operations Workflow | LrRootRedirect | `/lr` | LrRootRedirect screen | N/A (nav/hub) | via `src/services/api.js` clients | PostgreSQL via API | Indirect (billing/expense later) | INVENTORIED / NOT_EXECUTED_ENV |
| 26 | LR / Operations Workflow | Navigate | `/lr/loading-pending` | Navigate | N/A (nav/hub) | — | — | Indirect (billing/expense later) | REDIRECT |
| 27 | LR / Operations Workflow | Navigate | `/lr/loading-sheet` | Navigate | N/A (nav/hub) | — | — | Indirect (billing/expense later) | REDIRECT |
| 28 | LR / Operations Workflow | Navigate | `/lr/transit-pass` | Navigate | N/A (nav/hub) | — | — | Indirect (billing/expense later) | REDIRECT |
| 29 | LR / Operations Workflow | Navigate | `/lr/dispatch` | Navigate | N/A (nav/hub) | — | — | Indirect (billing/expense later) | REDIRECT |
| 30 | LR / Operations Workflow | Navigate | `/lr/delivery` | Navigate | N/A (nav/hub) | — | — | Indirect (billing/expense later) | REDIRECT |
| 31 | LR / Operations Workflow | Navigate | `/lr/pod-pending` | Navigate | N/A (nav/hub) | — | — | Indirect (billing/expense later) | REDIRECT |
| 32 | LR / Operations Workflow | Navigate | `/lr/invoice-pending` | Navigate | N/A (nav/hub) | — | — | Indirect (billing/expense later) | REDIRECT |
| 33 | LR / Operations Workflow | Navigate | `/lr/expense-pending` | Navigate | N/A (nav/hub) | — | — | Auto-post when AutoPostOps | REDIRECT |
| 34 | LR / Operations Workflow | Navigate | `/lr/closed` | Navigate | N/A (nav/hub) | — | — | Indirect (billing/expense later) | REDIRECT |
| 35 | LR / Operations Workflow | LrExpenseApprovalPage | `/lr/expense-approval` | LrExpenseApprovalPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | Auto-post when AutoPostOps | INVENTORIED / NOT_EXECUTED_ENV |
| 36 | LR / Operations Workflow | LrListPage | `/lr/list` | LrListPage screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | Indirect (billing/expense later) | INVENTORIED / NOT_EXECUTED_ENV |
| 37 | LR / Operations Workflow | LrEntryPage | `/lr/entry` | LrEntryPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | Indirect (billing/expense later) | INVENTORIED / NOT_EXECUTED_ENV |
| 38 | LR / Operations Workflow | UltraLrEntryPage | `/lr/bulk` | UltraLrEntryPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | Indirect (billing/expense later) | INVENTORIED / NOT_EXECUTED_ENV |
| 39 | LR / Operations Workflow | Navigate | `/lr/ultra-entry` | Navigate | N/A (nav/hub) | — | — | Indirect (billing/expense later) | REDIRECT |
| 40 | LR / Operations Workflow | GenerateLR | `/lr/generate` | GenerateLR screen | R | via `src/services/api.js` clients | PostgreSQL via API | Indirect (billing/expense later) | INVENTORIED / NOT_EXECUTED_ENV |
| 41 | LR / Operations Workflow | Navigate | `/lr/expenses/approval` | Navigate | N/A (nav/hub) | — | — | Auto-post when AutoPostOps | REDIRECT |
| 42 | LR / Operations Workflow | LRProcessPage | `/lr/:lrNumber/process` | LRProcessPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | Indirect (billing/expense later) | INVENTORIED / NOT_EXECUTED_ENV |
| 43 | LR / Operations Workflow | EditLR | `/lr/:lrNumber/edit` | EditLR screen | U (edit) | via `src/services/api.js` clients | PostgreSQL via API | Indirect (billing/expense later) | INVENTORIED / NOT_EXECUTED_ENV |
| 44 | LR / Operations Workflow | LrDetailPage | `/lr/:lrNumber` | LrDetailPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | Indirect (billing/expense later) | INVENTORIED / NOT_EXECUTED_ENV |
| 45 | Fleet | VehicleList | `/vehicles` | VehicleList screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 46 | Fleet | NewVehicle | `/vehicles/new` | NewVehicle screen | C (create) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 47 | Fleet | EditVehicle | `/vehicles/:id/edit` | EditVehicle screen | U (edit) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 48 | Fleet | VehicleDetails | `/vehicles/:id` | VehicleDetails screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 49 | Fleet | MaintenancePage | `/maintenance` | MaintenancePage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 50 | Operations | OperationsHub | `/operations` | OperationsHub screen | N/A (nav/hub) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 51 | Operations | LoadingSlipListPage | `/operations/loading-slip/list` | LoadingSlipListPage screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 52 | Operations | LoadingSlipPage | `/operations/loading-slip` | LoadingSlipPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 53 | Operations | TransitPassListPage | `/operations/transit-pass/list` | TransitPassListPage screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 54 | Operations | TransitPassCreatePage | `/operations/transit-pass` | TransitPassCreatePage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 55 | Operations | DispatchListPage | `/operations/dispatch/list` | DispatchListPage screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 56 | Operations | DispatchPage | `/operations/dispatch` | DispatchPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 57 | Operations | InTransitListPage | `/operations/in-transit/list` | InTransitListPage screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 58 | Operations | InTransitPage | `/operations/in-transit` | InTransitPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 59 | Operations | DeliveryCompleteListPage | `/operations/delivery-complete/list` | DeliveryCompleteListPage screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 60 | Operations | DeliveryCompletePage | `/operations/delivery-complete` | DeliveryCompletePage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 61 | Operations | PodListPage | `/operations/delivery/pod/list` | PodListPage screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 62 | Operations | PodEntryPage | `/operations/delivery/pod` | PodEntryPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 63 | Operations | BillingListPage | `/operations/billing/list` | BillingListPage screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | Auto-post when AutoPostOps | INVENTORIED / NOT_EXECUTED_ENV |
| 64 | Operations | CreateInvoicePage | `/operations/billing/invoice` | CreateInvoicePage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | Auto-post when AutoPostOps | INVENTORIED / NOT_EXECUTED_ENV |
| 65 | Operations | TmsModuleListRoute | `/operations/trip-expenses/list` | TmsModuleListRoute screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | Auto-post when AutoPostOps | INVENTORIED / NOT_EXECUTED_ENV |
| 66 | Operations | TripExpensesEntryPage | `/operations/trip-expenses` | TripExpensesEntryPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | Auto-post when AutoPostOps | INVENTORIED / NOT_EXECUTED_ENV |
| 67 | Operations | Navigate | `/operations/lr-management` | Navigate | N/A (nav/hub) | — | — | None / ops only | REDIRECT |
| 68 | Operations | Navigate | `/operations/loading` | Navigate | N/A (nav/hub) | — | — | None / ops only | REDIRECT |
| 69 | Operations | Navigate | `/operations/delivery` | Navigate | N/A (nav/hub) | — | — | None / ops only | REDIRECT |
| 70 | Operations | Navigate | `/operations/invoice` | Navigate | N/A (nav/hub) | — | — | None / ops only | REDIRECT |
| 71 | Operations | Navigate | `/operations/lr-expenses` | Navigate | N/A (nav/hub) | — | — | Auto-post when AutoPostOps | REDIRECT |
| 72 | Operations | Navigate | `/operations/expense-approval` | Navigate | N/A (nav/hub) | — | — | Auto-post when AutoPostOps | REDIRECT |
| 73 | Operations | Navigate | `/operations/lr-closing` | Navigate | N/A (nav/hub) | — | — | None / ops only | REDIRECT |
| 74 | Operations | FuelPage | `/operations/fuel` | FuelPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 75 | Operations | FleetMapPage | `/operations/gps` | FleetMapPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 76 | Operations | GeofenceManagerPage | `/operations/gps/geofences` | GeofenceManagerPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 77 | Operations | GeofenceAlertsPage | `/operations/gps/alerts` | GeofenceAlertsPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 78 | Operations | VehicleHistoryPage | `/operations/gps/vehicles/:vehicleId` | VehicleHistoryPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 79 | Operations | EpodPage | `/operations/epod` | EpodPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 80 | Operations | PodPage | `/operations/pod` | PodPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 81 | Operations | CustomerPortalPage | `/operations/customer-portal` | CustomerPortalPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 82 | Operations | TripsPage | `/operations/trips` | TripsPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 83 | Operations | RouteOptimizerPage | `/operations/routing` | RouteOptimizerPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 84 | Operations | ShipmentsPage | `/operations/shipments` | ShipmentsPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 85 | Operations | FinanceModulePage | `/operations/finance` | FinanceModulePage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 86 | Operations | DocumentsPage | `/operations/documents` | DocumentsPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 87 | Operations | EwayBillPage | `/operations/eway-bill` | EwayBillPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 88 | Operations | NotificationsPage | `/operations/notifications` | NotificationsPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 89 | Operations | AnalyticsPage | `/operations/analytics` | AnalyticsPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 90 | Operations | MarketplacePage | `/operations/marketplace` | MarketplacePage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 91 | Operations | WarehousePage | `/operations/warehouse` | WarehousePage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 92 | Operations | IotPage | `/operations/iot` | IotPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 93 | Operations | AiPage | `/operations/ai` | AiPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 94 | Driver Portal | DriverList | `/drivers` | DriverList screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 95 | Driver Portal | NewDriver | `/drivers/new` | NewDriver screen | C (create) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 96 | Driver Portal | DriverDetails | `/drivers/:id` | DriverDetails screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 97 | Customers | CustomerList | `/customers` | CustomerList screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 98 | Customers | NewCustomer | `/customers/new` | NewCustomer screen | C (create) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 99 | Customers | CustomerDetails | `/customers/:id` | CustomerDetails screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 100 | Freight Rates | FreightRateList | `/freight-rates` | FreightRateList screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 101 | Freight Rates | NewFreightRate | `/freight-rates/new` | NewFreightRate screen | C (create) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 102 | Freight Rates | FreightRateDetails | `/freight-rates/:id` | FreightRateDetails screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 103 | Bookings | Navigate | `/quotations` | Navigate | N/A (nav/hub) | — | — | Indirect (billing/expense later) | REDIRECT |
| 104 | Bookings | NewQuotation | `/quotations/new` | NewQuotation screen | C (create) | via `src/services/api.js` clients | PostgreSQL via API | Indirect (billing/expense later) | INVENTORIED / NOT_EXECUTED_ENV |
| 105 | Bookings | QuotationDetails | `/quotations/:id` | QuotationDetails screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | Indirect (billing/expense later) | INVENTORIED / NOT_EXECUTED_ENV |
| 106 | Vendors | VendorList | `/vendors` | VendorList screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 107 | Vendors | NewVendor | `/vendors/new` | NewVendor screen | C (create) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 108 | Vendors | VendorDetails | `/vendors/:id` | VendorDetails screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 109 | Consignors | ConsignorList | `/consignors` | ConsignorList screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 110 | Consignors | NewConsignor | `/consignors/new` | NewConsignor screen | C (create) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 111 | Consignors | ConsignorDetails | `/consignors/:id` | ConsignorDetails screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 112 | Consignees | ConsigneeList | `/consignees` | ConsigneeList screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 113 | Consignees | NewConsignee | `/consignees/new` | NewConsignee screen | C (create) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 114 | Consignees | ConsigneeDetails | `/consignees/:id` | ConsigneeDetails screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 115 | Items | ItemList | `/items` | ItemList screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 116 | Items | NewItem | `/items/new` | NewItem screen | C (create) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 117 | Items | ItemDetails | `/items/:id` | ItemDetails screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 118 | Expenses | ExpensesHub | `/expenses` | ExpensesHub screen | N/A (nav/hub) | via `src/services/api.js` clients | PostgreSQL via API | Auto-post when AutoPostOps | INVENTORIED / NOT_EXECUTED_ENV |
| 119 | Expenses | ExpenseList | `/expenses/management` | ExpenseList screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | Auto-post when AutoPostOps | INVENTORIED / NOT_EXECUTED_ENV |
| 120 | Expenses | NewExpense | `/expenses/new` | NewExpense screen | C (create) | via `src/services/api.js` clients | PostgreSQL via API | Auto-post when AutoPostOps | INVENTORIED / NOT_EXECUTED_ENV |
| 121 | Expenses | EditExpense | `/expenses/:id/edit` | EditExpense screen | U (edit) | via `src/services/api.js` clients | PostgreSQL via API | Auto-post when AutoPostOps | INVENTORIED / NOT_EXECUTED_ENV |
| 122 | Payroll | PayrollHub | `/payroll` | PayrollHub screen | N/A (nav/hub) | via `src/services/api.js` clients | PostgreSQL via API | Auto-post when AutoPostOps | INVENTORIED / NOT_EXECUTED_ENV |
| 123 | Payroll | PayrollList | `/payroll/runs` | PayrollList screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | Auto-post when AutoPostOps | INVENTORIED / NOT_EXECUTED_ENV |
| 124 | Payroll | PayrollDetails | `/payroll/runs/:id` | PayrollDetails screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | Auto-post when AutoPostOps | INVENTORIED / NOT_EXECUTED_ENV |
| 125 | Payroll | ProcessPayroll | `/payroll/generate` | ProcessPayroll screen | R | via `src/services/api.js` clients | PostgreSQL via API | Auto-post when AutoPostOps | INVENTORIED / NOT_EXECUTED_ENV |
| 126 | Payroll | PayslipList | `/payroll/payslips` | PayslipList screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | Auto-post when AutoPostOps | INVENTORIED / NOT_EXECUTED_ENV |
| 127 | Payroll | PayslipView | `/payroll/payslips/:entryId` | PayslipView screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | Auto-post when AutoPostOps | INVENTORIED / NOT_EXECUTED_ENV |
| 128 | Payroll | PayrollSettings | `/payroll/settings` | PayrollSettings screen | R | via `src/services/api.js` clients | PostgreSQL via API | Auto-post when AutoPostOps | INVENTORIED / NOT_EXECUTED_ENV |
| 129 | Payroll | SalaryRegister | `/payroll/salary-register` | SalaryRegister screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | Auto-post when AutoPostOps | INVENTORIED / NOT_EXECUTED_ENV |
| 130 | HR | HrHub | `/hr` | HrHub screen | N/A (nav/hub) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 131 | HR | EmployeeList | `/hr/employees` | EmployeeList screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 132 | HR | EmployeeDetails | `/hr/employees/new` | EmployeeDetails screen | C (create) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 133 | HR | EmployeeDetails | `/hr/employees/:id` | EmployeeDetails screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 134 | HR | DepartmentList | `/hr/departments` | DepartmentList screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 135 | HR | AttendancePage | `/hr/attendance` | AttendancePage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 136 | HR | LeaveManagement | `/hr/leaves` | LeaveManagement screen | R | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 137 | HR | HolidaysPage | `/hr/holidays` | HolidaysPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 138 | HR | HrTmsNorms | `/hr/tms-norms` | HrTmsNorms screen | R | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 139 | Other | Navigate | `/admin` | Navigate | N/A (nav/hub) | — | — | None / ops only | REDIRECT |
| 140 | Accounting | AccountingHub | `/accounting` | AccountingHub screen | N/A (nav/hub) | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 141 | Accounting | ChartOfAccounts | `/accounting/chart-of-accounts` | ChartOfAccounts screen | R | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 142 | Accounting | LedgerMaster | `/accounting/ledger-master` | LedgerMaster screen | R | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 143 | Accounting | NewLedger | `/accounting/ledger-master/new` | NewLedger screen | C (create) | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 144 | Accounting | VoucherEntry | `/accounting/voucher-entry` | VoucherEntry screen | R | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 145 | Accounting | LedgerReport | `/accounting/ledger-report` | LedgerReport screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 146 | Accounting | CustomerLedgerReport | `/accounting/customer-ledger` | CustomerLedgerReport screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 147 | Accounting | VendorLedgerReport | `/accounting/vendor-ledger` | VendorLedgerReport screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 148 | Accounting | DriverLedgerReport | `/accounting/driver-ledger` | DriverLedgerReport screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 149 | Accounting | VehicleLedgerReport | `/accounting/vehicle-ledger` | VehicleLedgerReport screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 150 | Accounting | CashBook | `/accounting/cash-book` | CashBook screen | R | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 151 | Accounting | BankBook | `/accounting/bank-book` | BankBook screen | R | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 152 | Accounting | DayBook | `/accounting/day-book` | DayBook screen | R | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 153 | Accounting | JournalRegister | `/accounting/journal-register` | JournalRegister screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 154 | Accounting | ReceiptRegister | `/accounting/receipt-register` | ReceiptRegister screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 155 | Accounting | PaymentRegister | `/accounting/payment-register` | PaymentRegister screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 156 | Accounting | PurchaseRegister | `/accounting/purchase-register` | PurchaseRegister screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 157 | Accounting | SalesRegister | `/accounting/sales-register` | SalesRegister screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 158 | Accounting | FreightInvoiceList | `/accounting/freight-invoices` | FreightInvoiceList screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 159 | Accounting | FreightInvoiceDetails | `/accounting/freight-invoices/:id` | FreightInvoiceDetails screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 160 | Accounting | TrialBalance | `/accounting/trial-balance` | TrialBalance screen | R | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 161 | Accounting | ProfitLoss | `/accounting/profit-loss` | ProfitLoss screen | R | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 162 | Accounting | BalanceSheet | `/accounting/balance-sheet` | BalanceSheet screen | R | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 163 | Accounting | BookingPaymentAdjustment | `/accounting/payment-adjustment` | BookingPaymentAdjustment screen | R | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 164 | Accounting | ProvisionsPage | `/accounting/provisions` | ProvisionsPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 165 | Accounting | OutstandingReport | `/accounting/outstanding` | OutstandingReport screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 166 | Accounting | GSTReports | `/accounting/gst` | GSTReports screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 167 | Accounting / TDS | TdsSettingsPage | `/accounting/tds/settings` | TdsSettingsPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 168 | Accounting / TDS | TdsSectionsPage | `/accounting/tds/sections` | TdsSectionsPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 169 | Accounting / TDS | TdsRatesPage | `/accounting/tds/rates` | TdsRatesPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 170 | Accounting / TDS | TdsExemptionsPage | `/accounting/tds/exemptions` | TdsExemptionsPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 171 | Accounting / TDS | TdsVendorPaymentPage | `/accounting/tds/vendor-payment` | TdsVendorPaymentPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 172 | Accounting / TDS | TdsTransactionsPage | `/accounting/tds/transactions` | TdsTransactionsPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 173 | Accounting / TDS | TdsReportsPage | `/accounting/tds/reports` | TdsReportsPage screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 174 | Accounting / GL | GlJournalPage | `/accounting/gl/journal` | GlJournalPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 175 | Accounting / GL | GlVendorBillsPage | `/accounting/gl/vendor-bills` | GlVendorBillsPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 176 | Accounting / GL | GlCreditDebitNotesPage | `/accounting/gl/credit-debit-notes` | GlCreditDebitNotesPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 177 | Accounting / GL | GlBankReconPage | `/accounting/gl/bank-recon` | GlBankReconPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 178 | Accounting / GL | GlControlsPage | `/accounting/gl/controls` | GlControlsPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 179 | Accounting / GL | GlCompliancePage | `/accounting/gl/compliance` | GlCompliancePage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | Direct GL/TDS/GST | INVENTORIED / NOT_EXECUTED_ENV |
| 180 | Reports | ReportsHub | `/reports` | ReportsHub screen | N/A (nav/hub) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 181 | Reports | TripReport | `/reports/trips` | TripReport screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 182 | Reports | LrMovementReport | `/reports/lr-movement` | LrMovementReport screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 183 | Reports | LoadingDispatchReport | `/reports/loading-dispatch` | LoadingDispatchReport screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 184 | Shipment | HubTransferReport | `/reports/hub-transfer` | HubTransferReport screen | N/A (nav/hub) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 185 | Reports | DeliveryPodReport | `/reports/delivery-pod` | DeliveryPodReport screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 186 | Reports | VehicleReport | `/reports/vehicles` | VehicleReport screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 187 | Reports | DriverReport | `/reports/drivers` | DriverReport screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 188 | Reports | IncomeReport | `/reports/income` | IncomeReport screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 189 | Reports | ExpenseReportPage | `/reports/expenses` | ExpenseReportPage screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | Auto-post when AutoPostOps | INVENTORIED / NOT_EXECUTED_ENV |
| 190 | Reports | CustomerReport | `/reports/customers` | CustomerReport screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 191 | Reports | BookingPlReport | `/reports/booking-pl` | BookingPlReport screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 192 | Reports | DirectLrPlReport | `/reports/direct-lr-pl` | DirectLrPlReport screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 193 | Reports | BrokerOutstandingReport | `/reports/broker-outstanding` | BrokerOutstandingReport screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 194 | Reports | VendorReport | `/reports/vendors` | VendorReport screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 195 | Reports | CashFlowReport | `/reports/cash-flow` | CashFlowReport screen | R (list/search/filter) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 196 | Platform | PlatformHub | `/platform` | PlatformHub screen | N/A (nav/hub) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 197 | Masters | MastersHub | `/masters` | MastersHub screen | N/A (nav/hub) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 198 | Settings | SettingsHub | `/settings` | SettingsHub screen | N/A (nav/hub) | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 199 | Settings | Settings | `/settings/general` | Settings screen | R | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 200 | Settings | DataCleanupPage | `/settings/data-cleanup` | DataCleanupPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 201 | Settings | BranchesPage | `/settings/branches` | BranchesPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 202 | Settings | UsersPage | `/settings/users` | UsersPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 203 | Settings | RoleMenusPage | `/settings/role-menus` | RoleMenusPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 204 | Settings | DocumentNumberingPage | `/settings/document-numbering` | DocumentNumberingPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 205 | Settings | FieldConfigurationPage | `/settings/field-configuration` | FieldConfigurationPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 206 | Settings | PortalUsersPage | `/settings/portal-users` | PortalUsersPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 207 | Settings | DriverPortalUsersPage | `/settings/driver-portal-users` | DriverPortalUsersPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 208 | Settings | NotificationSettings | `/settings/notifications` | NotificationSettings screen | R | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 209 | Settings | PrintTemplateSettingsPage | `/settings/print-templates` | PrintTemplateSettingsPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 210 | Settings | LabelTemplatesSettingsPage | `/settings/label-templates` | LabelTemplatesSettingsPage screen | R/U | via `src/services/api.js` clients | PostgreSQL via API | None / ops only | INVENTORIED / NOT_EXECUTED_ENV |
| 211 | Core | Navigate | `/*` | Navigate | N/A (nav/hub) | — | — | None / ops only | REDIRECT |

## Module counts

- **Operations:** 44
- **Accounting:** 27
- **LR / Operations Workflow:** 20
- **Reports:** 15
- **Settings:** 13
- **Bookings:** 11
- **HR:** 9
- **Payroll:** 8
- **Accounting / TDS:** 7
- **Accounting / GL:** 6
- **Driver Portal:** 5
- **Fleet:** 5
- **Core:** 4
- **Other:** 4
- **Shipment:** 4
- **Expenses:** 4
- **Customer Portal:** 3
- **Customers:** 3
- **Freight Rates:** 3
- **Vendors:** 3
- **Consignors:** 3
- **Consignees:** 3
- **Items:** 3
- **Auth:** 1
- **Delivery:** 1
- **Platform:** 1
- **Masters:** 1

## Notes

- Nested booking tabs (`/bookings/pending|confirmed|cancelled|quotations`) share `BookingManagementLayout`.
- Many `/lr/*` status URLs are redirects into `/lr?status=…` (LR list KPI filters).
- Portal and Driver apps have separate auth providers.
- Platform hub may expose additional company/tenant admin screens loaded inside the hub component.
