using System.Text.Json;

namespace Tms.Api.Models;

public class VehicleLastPosition
{
    public string VehicleId { get; set; } = "";
    public Vehicle? Vehicle { get; set; }
    public decimal Lat { get; set; }
    public decimal Lng { get; set; }
    public decimal? SpeedKmh { get; set; }
    public decimal? Heading { get; set; }
    public Guid? TripId { get; set; }
    public string? DriverId { get; set; }
    public Guid? LoadingSlipId { get; set; }
    public string TrackingStatus { get; set; } = "STOPPED";
    public decimal? AccuracyMeters { get; set; }
    public string Source { get; set; } = "DEVICE";
    public DateTime RecordedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>Active driver trip linked from Loading Slip assignment (browser GPS portal).</summary>
public class DriverTripSession : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string DriverId { get; set; } = "";
    public string VehicleId { get; set; } = "";
    public Guid? LoadingSlipId { get; set; }
    public string LrNumber { get; set; } = "";
    public string? LoadingSlipNumber { get; set; }
    public string? TripNo { get; set; }
    public string? CustomerName { get; set; }
    public string? Source { get; set; }
    public string? Destination { get; set; }
    public string Status { get; set; } = DriverTripStatuses.Assigned;
    public bool TrackingActive { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class DriverTripStatusHistory
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public DriverTripSession? Session { get; set; }
    public Guid CompanyId { get; set; }
    public string? OldStatus { get; set; }
    public string NewStatus { get; set; } = "";
    public string? ChangedBy { get; set; }
    public DateTime ChangedAt { get; set; }
    public string? Notes { get; set; }
}

public static class DriverTripStatuses
{
    public const string Assigned = "ASSIGNED";
    public const string Started = "STARTED";
    public const string ReachedPickup = "REACHED_PICKUP";
    public const string LoadingCompleted = "LOADING_COMPLETED";
    public const string InTransit = "IN_TRANSIT";
    public const string ReachedDestination = "REACHED_DESTINATION";
    public const string DeliveryCompleted = "DELIVERY_COMPLETED";

    public static readonly string[] Active =
    [
        Assigned, Started, ReachedPickup, LoadingCompleted, InTransit, ReachedDestination
    ];

    public static readonly string[] WorkflowOrder =
    [
        Assigned, Started, ReachedPickup, LoadingCompleted, InTransit, ReachedDestination, DeliveryCompleted
    ];

    public static bool CanTransition(string from, string to)
    {
        if (string.Equals(from, to, StringComparison.OrdinalIgnoreCase)) return true;
        var fi = Array.FindIndex(WorkflowOrder, s => s.Equals(from, StringComparison.OrdinalIgnoreCase));
        var ti = Array.FindIndex(WorkflowOrder, s => s.Equals(to, StringComparison.OrdinalIgnoreCase));
        return fi >= 0 && ti >= 0 && ti >= fi;
    }
}

public class Geofence : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public string ShapeType { get; set; } = "CIRCLE";
    public decimal? CenterLat { get; set; }
    public decimal? CenterLng { get; set; }
    public int? RadiusMeters { get; set; }
    public JsonDocument? PolygonGeojson { get; set; }
    public string Color { get; set; } = "#3B82F6";
    public bool AlertOnEnter { get; set; }
    public bool AlertOnExit { get; set; } = true;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public ICollection<GeofenceAssignment> Assignments { get; set; } = [];
}

public class GeofenceAssignment
{
    public Guid Id { get; set; }
    public Guid GeofenceId { get; set; }
    public Geofence? Geofence { get; set; }
    public string? VehicleId { get; set; }
    public Vehicle? Vehicle { get; set; }
    public bool AppliesToAll { get; set; }
}

public class GeofenceVehicleState
{
    public Guid GeofenceId { get; set; }
    public Geofence? Geofence { get; set; }
    public string VehicleId { get; set; } = "";
    public Vehicle? Vehicle { get; set; }
    public bool IsInside { get; set; }
    public DateTime? LastEventAt { get; set; }
}

public class GeofenceEvent
{
    public Guid Id { get; set; }
    public Guid GeofenceId { get; set; }
    public Geofence? Geofence { get; set; }
    public string VehicleId { get; set; } = "";
    public Vehicle? Vehicle { get; set; }
    public string EventType { get; set; } = "";
    public decimal Lat { get; set; }
    public decimal Lng { get; set; }
    public decimal? SpeedKmh { get; set; }
    public DateTime RecordedAt { get; set; }
    public bool Acknowledged { get; set; }
    public string? AcknowledgedBy { get; set; }
    public DateTime? AcknowledgedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class GpsDevice
{
    public Guid Id { get; set; }
    public string VehicleId { get; set; } = "";
    public Vehicle? Vehicle { get; set; }
    public string? DeviceImei { get; set; }
    public string ApiKeyHash { get; set; } = "";
    public string? Label { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? LastSeenAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
