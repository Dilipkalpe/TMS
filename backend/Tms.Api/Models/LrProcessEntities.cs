namespace Tms.Api.Models;

public static class LrStatuses
{
    public const string Draft = "Draft";
    public const string LRCreated = "LR Created";
    public const string LoadingCompleted = "Loading Completed";
    public const string TransitPassGenerated = "Transit Pass Generated";
    public const string InTransit = "In Transit";
    public const string DeliveryCompleted = "Delivery Completed";
    public const string PodUploaded = "POD Uploaded";
    public const string InvoiceGenerated = "Invoice Generated";
    public const string ExpenseAdded = "Expense Added";
    public const string ExpenseApproved = "Expense Approved";
    public const string Closed = "Closed";

    public static readonly IReadOnlyList<string> All =
    [
        Draft, LRCreated, LoadingCompleted, TransitPassGenerated, InTransit,
        DeliveryCompleted, PodUploaded, InvoiceGenerated, ExpenseAdded, ExpenseApproved, Closed,
    ];
}

public static class LrExpenseCategories
{
    public const string Diesel = "Diesel";
    public const string DriverBhatta = "Driver Bhatta";
    public const string Toll = "Toll";
    public const string LoadingUnloading = "Loading/Unloading";
    public const string RepairMaintenance = "Repair/Maintenance";
    public const string Other = "Other";

    public static readonly IReadOnlyList<string> All =
    [Diesel, DriverBhatta, Toll, LoadingUnloading, RepairMaintenance, Other];
}

public class LrLoadingSheet : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string LrNumber { get; set; } = "";
    public string SheetNumber { get; set; } = "";
    public string BusinessType { get; set; } = LrBusinessTypes.FTL;
    public string? VehicleId { get; set; }
    public string? VehicleNumber { get; set; }
    public string LoadingLocation { get; set; } = "";
    public string? MaterialQuantity { get; set; }
    public decimal? TotalQuantity { get; set; }
    public decimal? CapacityLimit { get; set; }
    public decimal? CapacityUsed { get; set; }
    public DateTime LoadingAt { get; set; }
    public string LoadingStatus { get; set; } = "Completed";
    public string? Remarks { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public ICollection<LrLoadingSheetItem> Items { get; set; } = [];
}

public class LrLoadingSheetItem
{
    public Guid Id { get; set; }
    public Guid LoadingSheetId { get; set; }
    public LrLoadingSheet? LoadingSheet { get; set; }
    public string LrNumber { get; set; } = "";
    public string? CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? QuantityText { get; set; }
    public decimal? QuantityTons { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class LrTransitPass : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string LrNumber { get; set; } = "";
    public Guid? LoadingSheetId { get; set; }
    public string PassNumber { get; set; } = "";
    public string? VehicleNumber { get; set; }
    public string? DriverName { get; set; }
    public string RouteFrom { get; set; } = "";
    public string RouteTo { get; set; } = "";
    public string? ViaPoints { get; set; }
    public DateOnly IssueDate { get; set; }
    public string? Remarks { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class LrDeliverySheet : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string LrNumber { get; set; } = "";
    public Guid? LoadingSheetId { get; set; }
    public string SheetNumber { get; set; } = "";
    public string ShipmentStatus { get; set; } = "In Transit";
    public DateOnly? DeliveryDate { get; set; }
    public string? DeliveryLocation { get; set; }
    public string? ReceiverName { get; set; }
    public string? Remarks { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class LrExpense : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string LrNumber { get; set; } = "";
    public DateOnly ExpenseDate { get; set; }
    public string Category { get; set; } = "";
    public string? Description { get; set; }
    public decimal Amount { get; set; }
    public string? AttachmentUrl { get; set; }
    public string Status { get; set; } = "Pending";
    public string? AddedBy { get; set; }
    public string? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? RejectionRemarks { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class LrStatusHistory : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string LrNumber { get; set; } = "";
    public string? OldStatus { get; set; }
    public string NewStatus { get; set; } = "";
    public string? ChangedBy { get; set; }
    public DateTime ChangedAt { get; set; }
    public string? Remarks { get; set; }
}
