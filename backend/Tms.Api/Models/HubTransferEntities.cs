namespace Tms.Api.Models;

public static class HubManifestStatuses
{
    public const string Draft = "Draft";
    public const string VehicleAssigned = "VehicleAssigned";
    public const string ReadyForDispatch = "ReadyForDispatch";
    public const string Dispatched = "Dispatched";
    public const string Completed = "Completed";
    public const string Cancelled = "Cancelled";
}

public static class HubManifestLineStatuses
{
    public const string Assigned = "Assigned";
    public const string Received = "Received";
    public const string Unloaded = "Unloaded";
    public const string Dispatched = "Dispatched";
    public const string Cancelled = "Cancelled";
}

public static class LrMovementTypes
{
    public const string Direct = "Direct";
    public const string HubTransfer = "HubTransfer";
    public const string FinalDelivery = "FinalDelivery";
}

public static class LrMovementStatuses
{
    public const string Created = "Created";
    public const string Loaded = "Loaded";
    public const string Dispatched = "Dispatched";
    public const string InTransit = "InTransit";
    public const string HubReceived = "HubReceived";
    public const string Unloaded = "Unloaded";
    public const string ReadyForReManifest = "ReadyForReManifest";
    public const string ReManifested = "ReManifested";
    public const string Delivered = "Delivered";
    public const string Cancelled = "Cancelled";
    public const string Completed = "Completed";

    public static readonly HashSet<string> Terminal =
    [
        Delivered, Cancelled, Completed, ReManifested
    ];
}

public class HubManifest : IBranchScoped, IAuditable
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid? BranchId { get; set; }
    public string ManifestNo { get; set; } = "";
    public Guid? FromHubBranchId { get; set; }
    public string FromHubName { get; set; } = "";
    public string ToDestination { get; set; } = "";
    public string? VehicleId { get; set; }
    public string? VehicleNumber { get; set; }
    public string? VehicleType { get; set; }
    public string? DriverId { get; set; }
    public string? DriverName { get; set; }
    public string? DriverMobile { get; set; }
    public string Status { get; set; } = HubManifestStatuses.Draft;
    public DateTime? DispatchAt { get; set; }
    public Guid? SourceLoadingSheetId { get; set; }
    public bool IsInbound { get; set; }
    public string? Remarks { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
    public ICollection<HubManifestLr> Lines { get; set; } = [];
}

public class HubManifestLr
{
    public Guid Id { get; set; }
    public Guid ManifestId { get; set; }
    public HubManifest? Manifest { get; set; }
    public string LrNumber { get; set; } = "";
    public int? Packages { get; set; }
    public decimal? Weight { get; set; }
    public int SortOrder { get; set; }
    public string LineStatus { get; set; } = HubManifestLineStatuses.Assigned;
    public DateTime CreatedAt { get; set; }
}

public class LrMovement : ITenantScoped, IAuditable
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string LrNumber { get; set; } = "";
    public int MovementNo { get; set; }
    public string MovementType { get; set; } = LrMovementTypes.HubTransfer;
    public string FromLocation { get; set; } = "";
    public string ToLocation { get; set; } = "";
    public Guid? CurrentHubBranchId { get; set; }
    public string? CurrentHubName { get; set; }
    public string? VehicleId { get; set; }
    public string? VehicleNumber { get; set; }
    public string? DriverId { get; set; }
    public string? DriverName { get; set; }
    public Guid? ManifestId { get; set; }
    public HubManifest? Manifest { get; set; }
    public string Status { get; set; } = LrMovementStatuses.Created;
    public DateTime? DispatchAt { get; set; }
    public DateTime? HubReceivedAt { get; set; }
    public DateTime? UnloadAt { get; set; }
    public DateTime? DeliveryAt { get; set; }
    public string? ReceivedBy { get; set; }
    public string? Remarks { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
}

public class HubTransferAudit
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string? LrNumber { get; set; }
    public Guid? ManifestId { get; set; }
    public Guid? MovementId { get; set; }
    public string Action { get; set; } = "";
    public string? PreviousStatus { get; set; }
    public string? NewStatus { get; set; }
    public string? Remarks { get; set; }
    public string? PerformedBy { get; set; }
    public DateTime PerformedAt { get; set; }
}
