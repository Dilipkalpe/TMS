namespace Tms.Api.Models;

public class User
{
    public Guid Id { get; set; }
    public Guid? CompanyId { get; set; }
    public Company? Company { get; set; }
    public string Username { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string FullName { get; set; } = "";
    public string Role { get; set; } = "Operator";
    public Guid? BranchId { get; set; }
    public Branch? Branch { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
}

public class Customer : IBranchScoped
{
    public string Id { get; set; } = "";
    public Guid CompanyId { get; set; }
    public Guid? BranchId { get; set; }
    public Branch? Branch { get; set; }
    public string Name { get; set; } = "";
    public string? Contact { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Gst { get; set; }
    public string? Address { get; set; }
    public decimal Outstanding { get; set; }
    public decimal CreditLimit { get; set; }
    public int TotalTrips { get; set; }
    public decimal LedgerBalance { get; set; }
    public bool PortalEnabled { get; set; }
    public string? PortalPinHash { get; set; }
    public string? PortalPhone { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class Vendor : ITenantScoped
{
    public string Id { get; set; } = "";
    public Guid CompanyId { get; set; }
    public string Name { get; set; } = "";
    public string? Contact { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Gst { get; set; }
    public string? Address { get; set; }
    public decimal Outstanding { get; set; }
    public string? Category { get; set; }
    public int TotalBills { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class Driver : IBranchScoped
{
    public string Id { get; set; } = "";
    public Guid CompanyId { get; set; }
    public Guid? BranchId { get; set; }
    public Branch? Branch { get; set; }
    public string Name { get; set; } = "";
    public string? License { get; set; }
    public DateOnly? LicenseExpiry { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public decimal Salary { get; set; }
    public decimal Advance { get; set; }
    public string Status { get; set; } = "Active";
    public int Trips { get; set; }
    public decimal Rating { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class Vehicle : IBranchScoped
{
    public string Id { get; set; } = "";
    public Guid CompanyId { get; set; }
    public Guid? BranchId { get; set; }
    public Branch? Branch { get; set; }
    public string Number { get; set; } = "";
    public string? Type { get; set; }
    public string? Model { get; set; }
    public string? Capacity { get; set; }
    public string? Owner { get; set; }
    public string Status { get; set; } = "Active";
    public DateOnly? Insurance { get; set; }
    public DateOnly? Fitness { get; set; }
    public DateOnly? Permit { get; set; }
    public DateOnly? Puc { get; set; }
    public DateOnly? LastMaintenance { get; set; }
    public int Odometer { get; set; }
    public int Trips { get; set; }
    public decimal Revenue { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public ICollection<MaintenanceRecord> MaintenanceRecords { get; set; } = [];
    public ICollection<MaintenanceSchedule> MaintenanceSchedules { get; set; } = [];
}

public class MaintenanceRecord
{
    public Guid Id { get; set; }
    public string VehicleId { get; set; } = "";
    public Vehicle? Vehicle { get; set; }
    public DateOnly RecordDate { get; set; }
    public string? Type { get; set; }
    public string RecordType { get; set; } = "SCHEDULED";
    public string? Description { get; set; }
    public int? Odometer { get; set; }
    public DateTime? NextDueAt { get; set; }
    public DateTime? PerformedAt { get; set; }
    public decimal Cost { get; set; }
    public string? Vendor { get; set; }
    public string? Remarks { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class MaintenanceSchedule
{
    public Guid Id { get; set; }
    public string VehicleId { get; set; } = "";
    public Vehicle? Vehicle { get; set; }
    public string ServiceType { get; set; } = "";
    public int? IntervalKm { get; set; }
    public int? IntervalDays { get; set; }
    public DateTime? LastServiceAt { get; set; }
    public DateTime? NextDueAt { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class SparePart : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string Sku { get; set; } = "";
    public string Name { get; set; } = "";
    public decimal UnitCost { get; set; }
    public int StockQty { get; set; }
    public int MinStock { get; set; } = 5;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class Booking : IBranchScoped
{
    public string Id { get; set; } = "";
    public Guid CompanyId { get; set; }
    public Guid? BranchId { get; set; }
    public Branch? Branch { get; set; }
    public DateOnly BookingDate { get; set; }
    public string? CustomerId { get; set; }
    public string CustomerName { get; set; } = "";
    public string? Consignor { get; set; }
    public string? Consignee { get; set; }
    public string FromCity { get; set; } = "";
    public string ToCity { get; set; } = "";
    public string? Material { get; set; }
    public string? Quantity { get; set; }
    public string? VehicleId { get; set; }
    public string? VehicleNumber { get; set; }
    public string? DriverId { get; set; }
    public string? DriverName { get; set; }
    public decimal Freight { get; set; }
    public string Status { get; set; } = "Pending";
    public string Payment { get; set; } = "Unpaid";
    public decimal Advance { get; set; }
    public decimal Balance { get; set; }
    public string? Remarks { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class LorryReceipt : ITenantScoped
{
    public string LrNumber { get; set; } = "";
    public Guid CompanyId { get; set; }
    public DateOnly LrDate { get; set; }
    public string? BookingId { get; set; }
    public string? Consignor { get; set; }
    public string? Consignee { get; set; }
    public string FromCity { get; set; } = "";
    public string ToCity { get; set; } = "";
    public string? VehicleId { get; set; }
    public string? VehicleNumber { get; set; }
    public string? DriverId { get; set; }
    public string? DriverName { get; set; }
    public string? Material { get; set; }
    public string? Quantity { get; set; }
    public decimal Freight { get; set; }
    public decimal Gst { get; set; }
    public decimal Balance { get; set; }
    public string PaymentType { get; set; } = "To Pay";
    public decimal? Hamali { get; set; }
    public decimal? LoadingCharges { get; set; }
    public decimal? UnloadingCharges { get; set; }
    public decimal? Insurance { get; set; }
    public decimal? Advance { get; set; }
    public string? Remarks { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class Expense : IBranchScoped
{
    public string Id { get; set; } = "";
    public Guid CompanyId { get; set; }
    public Guid? BranchId { get; set; }
    public Branch? Branch { get; set; }
    public DateOnly ExpenseDate { get; set; }
    public string Category { get; set; } = "";
    public string? Description { get; set; }
    public string? VehicleId { get; set; }
    public string? VehicleNumber { get; set; }
    public string? VendorId { get; set; }
    public string? VendorName { get; set; }
    public decimal Amount { get; set; }
    public string? PaymentMode { get; set; }
    public string Status { get; set; } = "Approved";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class LedgerAccount : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public string AccountType { get; set; } = "";
    public string? GroupName { get; set; }
    public decimal Balance { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
}

public class Voucher : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string VoucherNo { get; set; } = "";
    public DateOnly VoucherDate { get; set; }
    public string VoucherType { get; set; } = "";
    public string? PartyName { get; set; }
    public string? Mode { get; set; }
    public string? Narration { get; set; }
    public decimal TotalAmount { get; set; }
    public DateTime CreatedAt { get; set; }
    public ICollection<VoucherLine> Lines { get; set; } = [];
}

public class VoucherLine : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid VoucherId { get; set; }
    public Voucher? Voucher { get; set; }
    public Guid? LedgerAccountId { get; set; }
    public string? LedgerName { get; set; }
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
    public string? LineNarration { get; set; }
}

public class AccountingReportJob : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string ReportType { get; set; } = "";
    public string Status { get; set; } = "Pending";
    public string? ResultJson { get; set; }
    public string? Error { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class CompanySettings : ITenantScoped
{
    public int Id { get; set; }
    public Guid CompanyId { get; set; }
    public string? CompanyName { get; set; }
    public string? Address { get; set; }
    public string? Gstin { get; set; }
    public string? Pan { get; set; }
    public string? FinancialYear { get; set; }
    public decimal GstRate { get; set; } = 18;
    public string? LogoUrl { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? TransportLicenseNo { get; set; }
    public int? FleetSize { get; set; }
    /// <summary>FirstLRThenBooking | FirstBookingThenLR</summary>
    public string DocumentFlow { get; set; } = "FirstBookingThenLR";
    public DateTime UpdatedAt { get; set; }
}
