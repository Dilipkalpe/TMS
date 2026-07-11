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
    public string Source { get; set; } = "DEVICE";
    public DateTime RecordedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
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
