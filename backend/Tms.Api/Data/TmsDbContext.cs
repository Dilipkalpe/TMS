using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Tms.Api.Models;

namespace Tms.Api.Data;

public class TmsDbContext(DbContextOptions options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Vendor> Vendors => Set<Vendor>();
    public DbSet<Driver> Drivers => Set<Driver>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<MaintenanceRecord> MaintenanceRecords => Set<MaintenanceRecord>();
    public DbSet<MaintenanceSchedule> MaintenanceSchedules => Set<MaintenanceSchedule>();
    public DbSet<SparePart> SpareParts => Set<SparePart>();
    public DbSet<MaintenanceWorkOrder> MaintenanceWorkOrders => Set<MaintenanceWorkOrder>();
    public DbSet<MaintenancePredictionSnapshot> MaintenancePredictionSnapshots => Set<MaintenancePredictionSnapshot>();
    public DbSet<FuelEntry> FuelEntries => Set<FuelEntry>();
    public DbSet<GpsTrack> GpsTracks => Set<GpsTrack>();
    public DbSet<VehicleLastPosition> VehicleLastPositions => Set<VehicleLastPosition>();
    public DbSet<Geofence> Geofences => Set<Geofence>();
    public DbSet<GeofenceAssignment> GeofenceAssignments => Set<GeofenceAssignment>();
    public DbSet<GeofenceVehicleState> GeofenceVehicleStates => Set<GeofenceVehicleState>();
    public DbSet<GeofenceEvent> GeofenceEvents => Set<GeofenceEvent>();
    public DbSet<GpsDevice> GpsDevices => Set<GpsDevice>();
    public DbSet<Trip> Trips => Set<Trip>();
    public DbSet<RouteOptimizationJob> RouteOptimizationJobs => Set<RouteOptimizationJob>();
    public DbSet<TripStop> TripStops => Set<TripStop>();
    public DbSet<TripStatusHistory> TripStatusHistories => Set<TripStatusHistory>();
    public DbSet<ProofOfDelivery> ProofOfDeliveries => Set<ProofOfDelivery>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<NotificationTemplate> NotificationTemplates => Set<NotificationTemplate>();
    public DbSet<NotificationOutbox> NotificationOutbox => Set<NotificationOutbox>();
    public DbSet<NotificationPreference> NotificationPreferences => Set<NotificationPreference>();
    public DbSet<NotificationChannelSettings> NotificationChannelSettings => Set<NotificationChannelSettings>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceLine> InvoiceLines => Set<InvoiceLine>();
    public DbSet<MarketplaceListing> MarketplaceListings => Set<MarketplaceListing>();
    public DbSet<FreightBid> FreightBids => Set<FreightBid>();
    public DbSet<Warehouse> Warehouses => Set<Warehouse>();
    public DbSet<WarehouseInventory> WarehouseInventories => Set<WarehouseInventory>();
    public DbSet<IotDevice> IotDevices => Set<IotDevice>();
    public DbSet<IotSensorReading> IotSensorReadings => Set<IotSensorReading>();
    public DbSet<AiChatSession> AiChatSessions => Set<AiChatSession>();
    public DbSet<AiMessage> AiMessages => Set<AiMessage>();
    public DbSet<ForecastSnapshot> ForecastSnapshots => Set<ForecastSnapshot>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<BookingStatusHistory> BookingStatusHistories => Set<BookingStatusHistory>();
    public DbSet<BookingTrackingToken> BookingTrackingTokens => Set<BookingTrackingToken>();
    public DbSet<LorryReceipt> LorryReceipts => Set<LorryReceipt>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<LedgerAccount> LedgerAccounts => Set<LedgerAccount>();
    public DbSet<Voucher> Vouchers => Set<Voucher>();
    public DbSet<VoucherLine> VoucherLines => Set<VoucherLine>();
    public DbSet<AccountingReportJob> AccountingReportJobs => Set<AccountingReportJob>();
    public DbSet<CompanySettings> CompanySettings => Set<CompanySettings>();
    public DbSet<Broker> Brokers => Set<Broker>();
    public DbSet<BookingBrokerCharge> BookingBrokerCharges => Set<BookingBrokerCharge>();
    public DbSet<BookingExpense> BookingExpenses => Set<BookingExpense>();
    public DbSet<BookingPayment> BookingPayments => Set<BookingPayment>();
    public DbSet<Provision> Provisions => Set<Provision>();
    public DbSet<TransportBill> TransportBills => Set<TransportBill>();
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<SubscriptionPlan> SubscriptionPlans => Set<SubscriptionPlan>();
    public DbSet<CompanySubscription> CompanySubscriptions => Set<CompanySubscription>();
    public DbSet<CompanyUsage> CompanyUsages => Set<CompanyUsage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(e =>
        {
            e.ToTable("users");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Username).HasColumnName("username");
            e.Property(x => x.PasswordHash).HasColumnName("password_hash");
            e.Property(x => x.FullName).HasColumnName("full_name");
            e.Property(x => x.Role).HasColumnName("role");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.BranchId).HasColumnName("branch_id");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasOne(x => x.Branch).WithMany().HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Company).WithMany().HasForeignKey(x => x.CompanyId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Customer>(e =>
        {
            e.ToTable("customers");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.BranchId).HasColumnName("branch_id");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.Contact).HasColumnName("contact");
            e.Property(x => x.Phone).HasColumnName("phone");
            e.Property(x => x.Email).HasColumnName("email");
            e.Property(x => x.Gst).HasColumnName("gst");
            e.Property(x => x.Address).HasColumnName("address");
            e.Property(x => x.Outstanding).HasColumnName("outstanding");
            e.Property(x => x.CreditLimit).HasColumnName("credit_limit");
            e.Property(x => x.TotalTrips).HasColumnName("total_trips");
            e.Property(x => x.LedgerBalance).HasColumnName("ledger_balance");
            e.Property(x => x.PortalEnabled).HasColumnName("portal_enabled");
            e.Property(x => x.PortalPinHash).HasColumnName("portal_pin_hash");
            e.Property(x => x.PortalPhone).HasColumnName("portal_phone");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<Vendor>(e =>
        {
            e.ToTable("vendors");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.Contact).HasColumnName("contact");
            e.Property(x => x.Phone).HasColumnName("phone");
            e.Property(x => x.Email).HasColumnName("email");
            e.Property(x => x.Gst).HasColumnName("gst");
            e.Property(x => x.Address).HasColumnName("address");
            e.Property(x => x.Outstanding).HasColumnName("outstanding");
            e.Property(x => x.Category).HasColumnName("category");
            e.Property(x => x.TotalBills).HasColumnName("total_bills");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<Driver>(e =>
        {
            e.ToTable("drivers");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.BranchId).HasColumnName("branch_id");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.License).HasColumnName("license");
            e.Property(x => x.LicenseExpiry).HasColumnName("license_expiry");
            e.Property(x => x.Phone).HasColumnName("phone");
            e.Property(x => x.Email).HasColumnName("email");
            e.Property(x => x.Address).HasColumnName("address");
            e.Property(x => x.Salary).HasColumnName("salary");
            e.Property(x => x.Advance).HasColumnName("advance");
            e.Property(x => x.Status).HasColumnName("status");
            e.Property(x => x.Trips).HasColumnName("trips");
            e.Property(x => x.Rating).HasColumnName("rating");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<Vehicle>(e =>
        {
            e.ToTable("vehicles");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.BranchId).HasColumnName("branch_id");
            e.Property(x => x.Number).HasColumnName("number");
            e.Property(x => x.Type).HasColumnName("type");
            e.Property(x => x.Model).HasColumnName("model");
            e.Property(x => x.Capacity).HasColumnName("capacity");
            e.Property(x => x.Owner).HasColumnName("owner");
            e.Property(x => x.Status).HasColumnName("status");
            e.Property(x => x.Insurance).HasColumnName("insurance");
            e.Property(x => x.Fitness).HasColumnName("fitness");
            e.Property(x => x.Permit).HasColumnName("permit");
            e.Property(x => x.Puc).HasColumnName("puc");
            e.Property(x => x.LastMaintenance).HasColumnName("last_maintenance");
            e.Property(x => x.Odometer).HasColumnName("odometer");
            e.Property(x => x.Trips).HasColumnName("trips");
            e.Property(x => x.Revenue).HasColumnName("revenue");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<MaintenanceRecord>(e =>
        {
            e.ToTable("maintenance_records");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.VehicleId).HasColumnName("vehicle_id");
            e.Property(x => x.RecordDate).HasColumnName("record_date");
            e.Property(x => x.Type).HasColumnName("type");
            e.Property(x => x.RecordType).HasColumnName("record_type");
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.Odometer).HasColumnName("odometer");
            e.Property(x => x.NextDueAt).HasColumnName("next_due_at");
            e.Property(x => x.PerformedAt).HasColumnName("performed_at");
            e.Property(x => x.Cost).HasColumnName("cost");
            e.Property(x => x.Vendor).HasColumnName("vendor");
            e.Property(x => x.Remarks).HasColumnName("remarks");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<MaintenanceSchedule>(e =>
        {
            e.ToTable("maintenance_schedules");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.VehicleId).HasColumnName("vehicle_id");
            e.Property(x => x.ServiceType).HasColumnName("service_type");
            e.Property(x => x.IntervalKm).HasColumnName("interval_km");
            e.Property(x => x.IntervalDays).HasColumnName("interval_days");
            e.Property(x => x.LastServiceAt).HasColumnName("last_service_at");
            e.Property(x => x.NextDueAt).HasColumnName("next_due_at");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<SparePart>(e =>
        {
            e.ToTable("spare_parts");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.Sku).HasColumnName("sku");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.UnitCost).HasColumnName("unit_cost");
            e.Property(x => x.StockQty).HasColumnName("stock_qty");
            e.Property(x => x.MinStock).HasColumnName("min_stock");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });

        ConfigureModuleEntities(modelBuilder);
        ConfigureGpsEntities(modelBuilder);
        ConfigureNotificationEntities(modelBuilder);
        ConfigurePortalEntities(modelBuilder);
        ConfigureMaintenancePhase4Entities(modelBuilder);
        ConfigureRouteEntities(modelBuilder);
        ConfigureBranchEntities(modelBuilder);
        ConfigureTenantEntities(modelBuilder);
        ConfigureBookingFinanceEntities(modelBuilder);

        modelBuilder.Entity<Booking>(e =>
        {
            e.ToTable("bookings");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.BranchId).HasColumnName("branch_id");
            e.Property(x => x.BookingDate).HasColumnName("booking_date");
            e.Property(x => x.CustomerId).HasColumnName("customer_id");
            e.Property(x => x.CustomerName).HasColumnName("customer_name");
            e.Property(x => x.Consignor).HasColumnName("consignor");
            e.Property(x => x.Consignee).HasColumnName("consignee");
            e.Property(x => x.FromCity).HasColumnName("from_city");
            e.Property(x => x.ToCity).HasColumnName("to_city");
            e.Property(x => x.Material).HasColumnName("material");
            e.Property(x => x.Quantity).HasColumnName("quantity");
            e.Property(x => x.VehicleId).HasColumnName("vehicle_id");
            e.Property(x => x.VehicleNumber).HasColumnName("vehicle_number");
            e.Property(x => x.DriverId).HasColumnName("driver_id");
            e.Property(x => x.DriverName).HasColumnName("driver_name");
            e.Property(x => x.Freight).HasColumnName("freight");
            e.Property(x => x.Status).HasColumnName("status");
            e.Property(x => x.Payment).HasColumnName("payment");
            e.Property(x => x.Advance).HasColumnName("advance");
            e.Property(x => x.Balance).HasColumnName("balance");
            e.Property(x => x.Remarks).HasColumnName("remarks");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<LorryReceipt>(e =>
        {
            e.ToTable("lorry_receipts");
            e.HasKey(x => x.LrNumber);
            e.Property(x => x.LrNumber).HasColumnName("lr_number");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.LrDate).HasColumnName("lr_date");
            e.Property(x => x.BookingId).HasColumnName("booking_id");
            e.Property(x => x.Consignor).HasColumnName("consignor");
            e.Property(x => x.Consignee).HasColumnName("consignee");
            e.Property(x => x.FromCity).HasColumnName("from_city");
            e.Property(x => x.ToCity).HasColumnName("to_city");
            e.Property(x => x.VehicleId).HasColumnName("vehicle_id");
            e.Property(x => x.VehicleNumber).HasColumnName("vehicle_number");
            e.Property(x => x.DriverId).HasColumnName("driver_id");
            e.Property(x => x.DriverName).HasColumnName("driver_name");
            e.Property(x => x.Material).HasColumnName("material");
            e.Property(x => x.Quantity).HasColumnName("quantity");
            e.Property(x => x.Freight).HasColumnName("freight");
            e.Property(x => x.Gst).HasColumnName("gst");
            e.Property(x => x.Balance).HasColumnName("balance");
            e.Property(x => x.PaymentType).HasColumnName("payment_type");
            e.Property(x => x.Hamali).HasColumnName("hamali");
            e.Property(x => x.LoadingCharges).HasColumnName("loading_charges");
            e.Property(x => x.UnloadingCharges).HasColumnName("unloading_charges");
            e.Property(x => x.Insurance).HasColumnName("insurance");
            e.Property(x => x.Advance).HasColumnName("advance");
            e.Property(x => x.Remarks).HasColumnName("remarks");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<Expense>(e =>
        {
            e.ToTable("expenses");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.BranchId).HasColumnName("branch_id");
            e.Property(x => x.ExpenseDate).HasColumnName("expense_date");
            e.Property(x => x.Category).HasColumnName("category");
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.VehicleId).HasColumnName("vehicle_id");
            e.Property(x => x.VehicleNumber).HasColumnName("vehicle_number");
            e.Property(x => x.VendorId).HasColumnName("vendor_id");
            e.Property(x => x.VendorName).HasColumnName("vendor_name");
            e.Property(x => x.Amount).HasColumnName("amount");
            e.Property(x => x.PaymentMode).HasColumnName("payment_mode");
            e.Property(x => x.Status).HasColumnName("status");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<LedgerAccount>(e =>
        {
            e.ToTable("ledger_accounts");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.Code).HasColumnName("code");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.AccountType).HasColumnName("account_type");
            e.Property(x => x.GroupName).HasColumnName("group_name");
            e.Property(x => x.Balance).HasColumnName("balance");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<Voucher>(e =>
        {
            e.ToTable("vouchers");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.VoucherNo).HasColumnName("voucher_no");
            e.Property(x => x.VoucherDate).HasColumnName("voucher_date");
            e.Property(x => x.VoucherType).HasColumnName("voucher_type");
            e.Property(x => x.PartyName).HasColumnName("party_name");
            e.Property(x => x.Mode).HasColumnName("mode");
            e.Property(x => x.Narration).HasColumnName("narration");
            e.Property(x => x.TotalAmount).HasColumnName("total_amount");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<VoucherLine>(e =>
        {
            e.ToTable("voucher_lines");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.VoucherId).HasColumnName("voucher_id");
            e.Property(x => x.LedgerAccountId).HasColumnName("ledger_account_id");
            e.Property(x => x.LedgerName).HasColumnName("ledger_name");
            e.Property(x => x.Debit).HasColumnName("debit");
            e.Property(x => x.Credit).HasColumnName("credit");
            e.Property(x => x.LineNarration).HasColumnName("line_narration");
        });

        modelBuilder.Entity<AccountingReportJob>(e =>
        {
            e.ToTable("accounting_report_jobs");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.ReportType).HasColumnName("report_type");
            e.Property(x => x.Status).HasColumnName("status");
            e.Property(x => x.ResultJson).HasColumnName("result_json");
            e.Property(x => x.Error).HasColumnName("error_text");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.CompletedAt).HasColumnName("completed_at");
        });

        modelBuilder.Entity<CompanySettings>(e =>
        {
            e.ToTable("company_settings");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.CompanyName).HasColumnName("company_name");
            e.Property(x => x.Address).HasColumnName("address");
            e.Property(x => x.Gstin).HasColumnName("gstin");
            e.Property(x => x.Pan).HasColumnName("pan");
            e.Property(x => x.FinancialYear).HasColumnName("financial_year");
            e.Property(x => x.GstRate).HasColumnName("gst_rate");
            e.Property(x => x.LogoUrl).HasColumnName("logo_url");
            e.Property(x => x.Phone).HasColumnName("phone");
            e.Property(x => x.Email).HasColumnName("email");
            e.Property(x => x.TransportLicenseNo).HasColumnName("transport_license_no");
            e.Property(x => x.FleetSize).HasColumnName("fleet_size");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });
    }

    static void ConfigureModuleEntities(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<FuelEntry>(e =>
        {
            e.ToTable("fuel_entries");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.VehicleId).HasColumnName("vehicle_id");
            e.Property(x => x.TripId).HasColumnName("trip_id");
            e.Property(x => x.BookingId).HasColumnName("booking_id");
            e.Property(x => x.Liters).HasColumnName("liters");
            e.Property(x => x.CostPerLiter).HasColumnName("cost_per_liter");
            e.Property(x => x.TotalCost).HasColumnName("total_cost");
            e.Property(x => x.Odometer).HasColumnName("odometer");
            e.Property(x => x.MileageKmpl).HasColumnName("mileage_kmpl");
            e.Property(x => x.StationName).HasColumnName("station_name");
            e.Property(x => x.FilledAt).HasColumnName("filled_at");
            e.Property(x => x.IsSuspicious).HasColumnName("is_suspicious");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<GpsTrack>(e =>
        {
            e.ToTable("gps_tracks");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.VehicleId).HasColumnName("vehicle_id");
            e.Property(x => x.TripId).HasColumnName("trip_id");
            e.Property(x => x.Lat).HasColumnName("lat");
            e.Property(x => x.Lng).HasColumnName("lng");
            e.Property(x => x.SpeedKmh).HasColumnName("speed_kmh");
            e.Property(x => x.Heading).HasColumnName("heading");
            e.Property(x => x.Source).HasColumnName("source");
            e.Property(x => x.AccuracyMeters).HasColumnName("accuracy_meters");
            e.Property(x => x.RecordedAt).HasColumnName("recorded_at");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<Trip>(e =>
        {
            e.ToTable("trips");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.BranchId).HasColumnName("branch_id");
            e.Property(x => x.TripCode).HasColumnName("trip_code");
            e.Property(x => x.VehicleId).HasColumnName("vehicle_id");
            e.Property(x => x.DriverId).HasColumnName("driver_id");
            e.Property(x => x.BookingId).HasColumnName("booking_id");
            e.Property(x => x.Status).HasColumnName("status");
            e.Property(x => x.Origin).HasColumnName("origin");
            e.Property(x => x.Destination).HasColumnName("destination");
            e.Property(x => x.PlannedStart).HasColumnName("planned_start");
            e.Property(x => x.PlannedEnd).HasColumnName("planned_end");
            e.Property(x => x.ActualStart).HasColumnName("actual_start");
            e.Property(x => x.ActualEnd).HasColumnName("actual_end");
            e.Property(x => x.DistanceKm).HasColumnName("distance_km");
            e.Property(x => x.TollCost).HasColumnName("toll_cost");
            e.Property(x => x.RoutePolyline).HasColumnName("route_polyline");
            e.Property(x => x.AiOptimized).HasColumnName("ai_optimized");
            e.Property(x => x.EstimatedFuelL).HasColumnName("estimated_fuel_l");
            e.Property(x => x.EtaMinutes).HasColumnName("eta_minutes");
            e.Property(x => x.OptimizationSavingsPct).HasColumnName("optimization_savings_pct");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<TripStop>(e =>
        {
            e.ToTable("trip_stops");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TripId).HasColumnName("trip_id");
            e.Property(x => x.SequenceNo).HasColumnName("sequence_no");
            e.Property(x => x.Address).HasColumnName("address");
            e.Property(x => x.Latitude).HasColumnName("latitude");
            e.Property(x => x.Longitude).HasColumnName("longitude");
            e.Property(x => x.PlannedArrival).HasColumnName("planned_arrival");
            e.Property(x => x.Status).HasColumnName("status");
        });

        modelBuilder.Entity<TripStatusHistory>(e =>
        {
            e.ToTable("trip_status_history");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TripId).HasColumnName("trip_id");
            e.Property(x => x.Status).HasColumnName("status");
            e.Property(x => x.Note).HasColumnName("note");
            e.Property(x => x.ChangedBy).HasColumnName("changed_by");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<ProofOfDelivery>(e =>
        {
            e.ToTable("proof_of_delivery");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.BookingId).HasColumnName("booking_id");
            e.Property(x => x.OtpCode).HasColumnName("otp_code");
            e.Property(x => x.OtpVerified).HasColumnName("otp_verified");
            e.Property(x => x.RecipientName).HasColumnName("recipient_name");
            e.Property(x => x.DeliveryLat).HasColumnName("delivery_lat");
            e.Property(x => x.DeliveryLng).HasColumnName("delivery_lng");
            e.Property(x => x.SignatureUrl).HasColumnName("signature_url");
            e.Property(x => x.PhotoUrl).HasColumnName("photo_url");
            e.Property(x => x.ConfirmedBy).HasColumnName("confirmed_by");
            e.Property(x => x.DeliveredAt).HasColumnName("delivered_at");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<Document>(e =>
        {
            e.ToTable("documents");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.EntityType).HasColumnName("entity_type");
            e.Property(x => x.EntityId).HasColumnName("entity_id");
            e.Property(x => x.DocType).HasColumnName("doc_type");
            e.Property(x => x.Title).HasColumnName("title");
            e.Property(x => x.FileUrl).HasColumnName("file_url");
            e.Property(x => x.ExpiresAt).HasColumnName("expires_at");
            e.Property(x => x.RenewedAt).HasColumnName("renewed_at");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<Notification>(e =>
        {
            e.ToTable("notifications");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.Channel).HasColumnName("channel");
            e.Property(x => x.Title).HasColumnName("title");
            e.Property(x => x.Body).HasColumnName("body");
            e.Property(x => x.Status).HasColumnName("status");
            e.Property(x => x.Metadata).HasColumnName("metadata").HasColumnType("jsonb");
            e.Property(x => x.ExternalChannel).HasColumnName("external_channel");
            e.Property(x => x.OutboxId).HasColumnName("outbox_id");
            e.Property(x => x.SentAt).HasColumnName("sent_at");
            e.Property(x => x.ReadAt).HasColumnName("read_at");
        });

        modelBuilder.Entity<Invoice>(e =>
        {
            e.ToTable("invoices");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.InvoiceNo).HasColumnName("invoice_no");
            e.Property(x => x.CustomerId).HasColumnName("customer_id");
            e.Property(x => x.BookingId).HasColumnName("booking_id");
            e.Property(x => x.Status).HasColumnName("status");
            e.Property(x => x.Amount).HasColumnName("amount");
            e.Property(x => x.TaxAmount).HasColumnName("tax_amount");
            e.Property(x => x.TotalAmount).HasColumnName("total_amount");
            e.Property(x => x.IssuedAt).HasColumnName("issued_at");
            e.Property(x => x.DueAt).HasColumnName("due_at");
            e.Property(x => x.PaidAt).HasColumnName("paid_at");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<InvoiceLine>(e =>
        {
            e.ToTable("invoice_lines");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.InvoiceId).HasColumnName("invoice_id");
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.Quantity).HasColumnName("quantity");
            e.Property(x => x.UnitPrice).HasColumnName("unit_price");
            e.Property(x => x.Amount).HasColumnName("amount");
        });

        modelBuilder.Entity<MarketplaceListing>(e =>
        {
            e.ToTable("marketplace_listings");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.ListingType).HasColumnName("listing_type");
            e.Property(x => x.Origin).HasColumnName("origin");
            e.Property(x => x.Destination).HasColumnName("destination");
            e.Property(x => x.AvailableAt).HasColumnName("available_at");
            e.Property(x => x.Rate).HasColumnName("rate");
            e.Property(x => x.CapacityKg).HasColumnName("capacity_kg");
            e.Property(x => x.VehicleId).HasColumnName("vehicle_id");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<FreightBid>(e =>
        {
            e.ToTable("freight_bids");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.ListingId).HasColumnName("listing_id");
            e.Property(x => x.BidderName).HasColumnName("bidder_name");
            e.Property(x => x.Amount).HasColumnName("amount");
            e.Property(x => x.Status).HasColumnName("status");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<Warehouse>(e =>
        {
            e.ToTable("warehouses");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.Address).HasColumnName("address");
            e.Property(x => x.CapacityCbm).HasColumnName("capacity_cbm");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<WarehouseInventory>(e =>
        {
            e.ToTable("warehouse_inventory");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.WarehouseId).HasColumnName("warehouse_id");
            e.Property(x => x.Sku).HasColumnName("sku");
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.Quantity).HasColumnName("quantity");
            e.Property(x => x.WeightKg).HasColumnName("weight_kg");
        });

        modelBuilder.Entity<IotDevice>(e =>
        {
            e.ToTable("iot_devices");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.VehicleId).HasColumnName("vehicle_id");
            e.Property(x => x.DeviceType).HasColumnName("device_type");
            e.Property(x => x.DeviceSerial).HasColumnName("device_serial");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.LastSeenAt).HasColumnName("last_seen_at");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<IotSensorReading>(e =>
        {
            e.ToTable("iot_sensor_readings");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.DeviceId).HasColumnName("device_id");
            e.Property(x => x.Metric).HasColumnName("metric");
            e.Property(x => x.Value).HasColumnName("value");
            e.Property(x => x.Unit).HasColumnName("unit");
            e.Property(x => x.RecordedAt).HasColumnName("recorded_at");
        });

        modelBuilder.Entity<AiChatSession>(e =>
        {
            e.ToTable("ai_chat_sessions");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.Title).HasColumnName("title");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<AiMessage>(e =>
        {
            e.ToTable("ai_messages");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.SessionId).HasColumnName("session_id");
            e.Property(x => x.Role).HasColumnName("role");
            e.Property(x => x.Content).HasColumnName("content");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<ForecastSnapshot>(e =>
        {
            e.ToTable("forecast_snapshots");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.ForecastType).HasColumnName("forecast_type");
            e.Property(x => x.PeriodStart).HasColumnName("period_start");
            e.Property(x => x.PeriodEnd).HasColumnName("period_end");
            e.Property(x => x.PredictedValue).HasColumnName("predicted_value");
            e.Property(x => x.Confidence).HasColumnName("confidence");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });
    }

    static void ConfigureGpsEntities(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<VehicleLastPosition>(e =>
        {
            e.ToTable("vehicle_last_position");
            e.HasKey(x => x.VehicleId);
            e.Property(x => x.VehicleId).HasColumnName("vehicle_id");
            e.Property(x => x.Lat).HasColumnName("lat");
            e.Property(x => x.Lng).HasColumnName("lng");
            e.Property(x => x.SpeedKmh).HasColumnName("speed_kmh");
            e.Property(x => x.Heading).HasColumnName("heading");
            e.Property(x => x.TripId).HasColumnName("trip_id");
            e.Property(x => x.Source).HasColumnName("source");
            e.Property(x => x.RecordedAt).HasColumnName("recorded_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasOne(x => x.Vehicle)
                .WithOne()
                .HasForeignKey<VehicleLastPosition>(x => x.VehicleId)
                .HasPrincipalKey<Vehicle>(v => v.Id);
        });

        modelBuilder.Entity<Geofence>(e =>
        {
            e.ToTable("geofences");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.ShapeType).HasColumnName("shape_type");
            e.Property(x => x.CenterLat).HasColumnName("center_lat");
            e.Property(x => x.CenterLng).HasColumnName("center_lng");
            e.Property(x => x.RadiusMeters).HasColumnName("radius_meters");
            e.Property(x => x.PolygonGeojson)
                .HasColumnName("polygon_geojson")
                .HasColumnType("jsonb")
                .HasConversion(JsonDocumentValueConverter.Instance);
            e.Property(x => x.Color).HasColumnName("color");
            e.Property(x => x.AlertOnEnter).HasColumnName("alert_on_enter");
            e.Property(x => x.AlertOnExit).HasColumnName("alert_on_exit");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<GeofenceAssignment>(e =>
        {
            e.ToTable("geofence_assignments");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.GeofenceId).HasColumnName("geofence_id");
            e.Property(x => x.VehicleId).HasColumnName("vehicle_id");
            e.Property(x => x.AppliesToAll).HasColumnName("applies_to_all");
        });

        modelBuilder.Entity<GeofenceVehicleState>(e =>
        {
            e.ToTable("geofence_vehicle_state");
            e.HasKey(x => new { x.GeofenceId, x.VehicleId });
            e.Property(x => x.GeofenceId).HasColumnName("geofence_id");
            e.Property(x => x.VehicleId).HasColumnName("vehicle_id");
            e.Property(x => x.IsInside).HasColumnName("is_inside");
            e.Property(x => x.LastEventAt).HasColumnName("last_event_at");
        });

        modelBuilder.Entity<GeofenceEvent>(e =>
        {
            e.ToTable("geofence_events");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.GeofenceId).HasColumnName("geofence_id");
            e.Property(x => x.VehicleId).HasColumnName("vehicle_id");
            e.Property(x => x.EventType).HasColumnName("event_type");
            e.Property(x => x.Lat).HasColumnName("lat");
            e.Property(x => x.Lng).HasColumnName("lng");
            e.Property(x => x.SpeedKmh).HasColumnName("speed_kmh");
            e.Property(x => x.RecordedAt).HasColumnName("recorded_at");
            e.Property(x => x.Acknowledged).HasColumnName("acknowledged");
            e.Property(x => x.AcknowledgedBy).HasColumnName("acknowledged_by");
            e.Property(x => x.AcknowledgedAt).HasColumnName("acknowledged_at");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<GpsDevice>(e =>
        {
            e.ToTable("gps_devices");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.VehicleId).HasColumnName("vehicle_id");
            e.Property(x => x.DeviceImei).HasColumnName("device_imei");
            e.Property(x => x.ApiKeyHash).HasColumnName("api_key_hash");
            e.Property(x => x.Label).HasColumnName("label");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.LastSeenAt).HasColumnName("last_seen_at");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });
    }

    static void ConfigureNotificationEntities(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<NotificationTemplate>(e =>
        {
            e.ToTable("notification_templates");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.Code).HasColumnName("code");
            e.Property(x => x.Channel).HasColumnName("channel");
            e.Property(x => x.Language).HasColumnName("language");
            e.Property(x => x.Subject).HasColumnName("subject");
            e.Property(x => x.BodyTemplate).HasColumnName("body_template");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<NotificationOutbox>(e =>
        {
            e.ToTable("notification_outbox");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.TemplateCode).HasColumnName("template_code");
            e.Property(x => x.Channel).HasColumnName("channel");
            e.Property(x => x.RecipientPhone).HasColumnName("recipient_phone");
            e.Property(x => x.RecipientName).HasColumnName("recipient_name");
            e.Property(x => x.MessageBody).HasColumnName("message_body");
            e.Property(x => x.Payload).HasColumnName("payload").HasColumnType("jsonb");
            e.Property(x => x.Status).HasColumnName("status");
            e.Property(x => x.Provider).HasColumnName("provider");
            e.Property(x => x.ProviderMessageId).HasColumnName("provider_message_id");
            e.Property(x => x.ErrorMessage).HasColumnName("error_message");
            e.Property(x => x.AttemptCount).HasColumnName("attempt_count");
            e.Property(x => x.SentAt).HasColumnName("sent_at");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<NotificationPreference>(e =>
        {
            e.ToTable("notification_preferences");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.EntityType).HasColumnName("entity_type");
            e.Property(x => x.EntityId).HasColumnName("entity_id");
            e.Property(x => x.EventCode).HasColumnName("event_code");
            e.Property(x => x.Channel).HasColumnName("channel");
            e.Property(x => x.Enabled).HasColumnName("enabled");
        });

        modelBuilder.Entity<NotificationChannelSettings>(e =>
        {
            e.ToTable("notification_channel_settings");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.SmsEnabled).HasColumnName("sms_enabled");
            e.Property(x => x.WhatsappEnabled).HasColumnName("whatsapp_enabled");
            e.Property(x => x.AdminPhone).HasColumnName("admin_phone");
            e.Property(x => x.DefaultCountryCode).HasColumnName("default_country_code");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });
    }

    static void ConfigurePortalEntities(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<BookingStatusHistory>(e =>
        {
            e.ToTable("booking_status_history");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.BookingId).HasColumnName("booking_id");
            e.Property(x => x.Status).HasColumnName("status");
            e.Property(x => x.Note).HasColumnName("note");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<BookingTrackingToken>(e =>
        {
            e.ToTable("booking_tracking_tokens");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.BookingId).HasColumnName("booking_id");
            e.Property(x => x.Token).HasColumnName("token");
            e.Property(x => x.ExpiresAt).HasColumnName("expires_at");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });
    }

    static void ConfigureMaintenancePhase4Entities(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<MaintenanceWorkOrder>(e =>
        {
            e.ToTable("maintenance_work_orders");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.VehicleId).HasColumnName("vehicle_id");
            e.Property(x => x.ScheduleId).HasColumnName("schedule_id");
            e.Property(x => x.Title).HasColumnName("title");
            e.Property(x => x.Component).HasColumnName("component");
            e.Property(x => x.Status).HasColumnName("status");
            e.Property(x => x.Priority).HasColumnName("priority");
            e.Property(x => x.DueAt).HasColumnName("due_at");
            e.Property(x => x.AssignedTo).HasColumnName("assigned_to");
            e.Property(x => x.Notes).HasColumnName("notes");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.CompletedAt).HasColumnName("completed_at");
        });

        modelBuilder.Entity<MaintenancePredictionSnapshot>(e =>
        {
            e.ToTable("maintenance_prediction_snapshots");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.SnapshotDate).HasColumnName("snapshot_date");
            e.Property(x => x.VehicleId).HasColumnName("vehicle_id");
            e.Property(x => x.RiskScore).HasColumnName("risk_score");
            e.Property(x => x.RiskLevel).HasColumnName("risk_level");
            e.Property(x => x.Factors).HasColumnName("factors").HasColumnType("jsonb");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });
    }

    static void ConfigureRouteEntities(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<RouteOptimizationJob>(e =>
        {
            e.ToTable("route_optimization_jobs");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.TripId).HasColumnName("trip_id");
            e.Property(x => x.Status).HasColumnName("status");
            e.Property(x => x.TrafficAware).HasColumnName("traffic_aware");
            e.Property(x => x.TollOptimized).HasColumnName("toll_optimized");
            e.Property(x => x.FuelOptimized).HasColumnName("fuel_optimized");
            e.Property(x => x.OriginalDistanceKm).HasColumnName("original_distance_km");
            e.Property(x => x.OptimizedDistanceKm).HasColumnName("optimized_distance_km");
            e.Property(x => x.OriginalEtaMinutes).HasColumnName("original_eta_minutes");
            e.Property(x => x.OptimizedEtaMinutes).HasColumnName("optimized_eta_minutes");
            e.Property(x => x.TollCost).HasColumnName("toll_cost");
            e.Property(x => x.FuelCost).HasColumnName("fuel_cost");
            e.Property(x => x.FuelLiters).HasColumnName("fuel_liters");
            e.Property(x => x.SavingsPct).HasColumnName("savings_pct");
            e.Property(x => x.StopOrder).HasColumnName("stop_order").HasColumnType("jsonb");
            e.Property(x => x.RoutePolyline).HasColumnName("route_polyline");
            e.Property(x => x.Provider).HasColumnName("provider");
            e.Property(x => x.Notes).HasColumnName("notes");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.CompletedAt).HasColumnName("completed_at");
            e.HasOne(x => x.Trip).WithMany().HasForeignKey(x => x.TripId).OnDelete(DeleteBehavior.SetNull);
        });
    }

    static void ConfigureBranchEntities(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Branch>(e =>
        {
            e.ToTable("branches");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.Code).HasColumnName("code");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.City).HasColumnName("city");
            e.Property(x => x.State).HasColumnName("state");
            e.Property(x => x.Phone).HasColumnName("phone");
            e.Property(x => x.Address).HasColumnName("address");
            e.Property(x => x.IsHeadOffice).HasColumnName("is_head_office");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });
    }

    static void ConfigureTenantEntities(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Company>(e =>
        {
            e.ToTable("companies");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Code).HasColumnName("code");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.LegalName).HasColumnName("legal_name");
            e.Property(x => x.Gstin).HasColumnName("gstin");
            e.Property(x => x.Email).HasColumnName("email");
            e.Property(x => x.Phone).HasColumnName("phone");
            e.Property(x => x.Address).HasColumnName("address");
            e.Property(x => x.City).HasColumnName("city");
            e.Property(x => x.State).HasColumnName("state");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<SubscriptionPlan>(e =>
        {
            e.ToTable("subscription_plans");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Code).HasColumnName("code");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.PriceInr).HasColumnName("price_inr");
            e.Property(x => x.BillingCycle).HasColumnName("billing_cycle");
            e.Property(x => x.MaxUsers).HasColumnName("max_users");
            e.Property(x => x.MaxBookingsMonth).HasColumnName("max_bookings_month");
            e.Property(x => x.FeaturesJson).HasColumnName("features").HasColumnType("jsonb");
            e.Property(x => x.IsCustom).HasColumnName("is_custom");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.SortOrder).HasColumnName("sort_order");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<CompanySubscription>(e =>
        {
            e.ToTable("company_subscriptions");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.PlanId).HasColumnName("plan_id");
            e.Property(x => x.Status).HasColumnName("status");
            e.Property(x => x.StartedAt).HasColumnName("started_at");
            e.Property(x => x.ExpiresAt).HasColumnName("expires_at");
            e.Property(x => x.AmountInr).HasColumnName("amount_inr");
            e.Property(x => x.Notes).HasColumnName("notes");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasOne(x => x.Company).WithMany().HasForeignKey(x => x.CompanyId);
            e.HasOne(x => x.Plan).WithMany().HasForeignKey(x => x.PlanId);
        });

        modelBuilder.Entity<CompanyUsage>(e =>
        {
            e.ToTable("company_usage");
            e.HasKey(x => new { x.CompanyId, x.UsageMonth });
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.UsageMonth).HasColumnName("usage_month");
            e.Property(x => x.BookingsCount).HasColumnName("bookings_count");
            e.Property(x => x.UsersCount).HasColumnName("users_count");
        });
    }

    static void ConfigureBookingFinanceEntities(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Broker>(e =>
        {
            e.ToTable("brokers");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.Phone).HasColumnName("phone");
            e.Property(x => x.Gst).HasColumnName("gst");
            e.Property(x => x.Address).HasColumnName("address");
            e.Property(x => x.Outstanding).HasColumnName("outstanding");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<BookingBrokerCharge>(e =>
        {
            e.ToTable("booking_broker_charges");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.BookingId).HasColumnName("booking_id");
            e.Property(x => x.BrokerId).HasColumnName("broker_id");
            e.Property(x => x.BrokerName).HasColumnName("broker_name");
            e.Property(x => x.ChargeType).HasColumnName("charge_type");
            e.Property(x => x.Amount).HasColumnName("amount");
            e.Property(x => x.PaidAmount).HasColumnName("paid_amount");
            e.Property(x => x.Remarks).HasColumnName("remarks");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<BookingExpense>(e =>
        {
            e.ToTable("booking_expenses");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.BookingId).HasColumnName("booking_id");
            e.Property(x => x.ExpenseDate).HasColumnName("expense_date");
            e.Property(x => x.Category).HasColumnName("category");
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.Amount).HasColumnName("amount");
            e.Property(x => x.VendorId).HasColumnName("vendor_id");
            e.Property(x => x.VendorName).HasColumnName("vendor_name");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<BookingPayment>(e =>
        {
            e.ToTable("booking_payments");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.BookingId).HasColumnName("booking_id");
            e.Property(x => x.PaymentDate).HasColumnName("payment_date");
            e.Property(x => x.Amount).HasColumnName("amount");
            e.Property(x => x.PaymentMode).HasColumnName("payment_mode");
            e.Property(x => x.ReferenceNo).HasColumnName("reference_no");
            e.Property(x => x.Remarks).HasColumnName("remarks");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<Provision>(e =>
        {
            e.ToTable("provisions");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.ProvisionType).HasColumnName("provision_type");
            e.Property(x => x.PartyId).HasColumnName("party_id");
            e.Property(x => x.PartyName).HasColumnName("party_name");
            e.Property(x => x.ProvisionDate).HasColumnName("provision_date");
            e.Property(x => x.Amount).HasColumnName("amount");
            e.Property(x => x.ReferenceNo).HasColumnName("reference_no");
            e.Property(x => x.Remarks).HasColumnName("remarks");
            e.Property(x => x.IsReversed).HasColumnName("is_reversed");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<TransportBill>(e =>
        {
            e.ToTable("transport_bills");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CompanyId).HasColumnName("company_id");
            e.Property(x => x.BillNo).HasColumnName("bill_no");
            e.Property(x => x.BillType).HasColumnName("bill_type");
            e.Property(x => x.BookingId).HasColumnName("booking_id");
            e.Property(x => x.BillDate).HasColumnName("bill_date");
            e.Property(x => x.CustomerName).HasColumnName("customer_name");
            e.Property(x => x.Gstin).HasColumnName("gstin");
            e.Property(x => x.PlaceOfSupply).HasColumnName("place_of_supply");
            e.Property(x => x.TaxableAmount).HasColumnName("taxable_amount");
            e.Property(x => x.GstAmount).HasColumnName("gst_amount");
            e.Property(x => x.TotalAmount).HasColumnName("total_amount");
            e.Property(x => x.BillDataJson).HasColumnName("bill_data").HasColumnType("jsonb");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });
    }
}
