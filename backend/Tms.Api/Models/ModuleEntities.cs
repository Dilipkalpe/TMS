namespace Tms.Api.Models;

public class FuelEntry
{
    public Guid Id { get; set; }
    public string VehicleId { get; set; } = "";
    public Vehicle? Vehicle { get; set; }
    public Guid? TripId { get; set; }
    public Trip? Trip { get; set; }
    public string? BookingId { get; set; }
    public decimal Liters { get; set; }
    public decimal CostPerLiter { get; set; }
    public decimal TotalCost { get; set; }
    public int? Odometer { get; set; }
    public decimal? MileageKmpl { get; set; }
    public string? StationName { get; set; }
    public DateTime FilledAt { get; set; }
    public bool IsSuspicious { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class GpsTrack
{
    public Guid Id { get; set; }
    public string VehicleId { get; set; } = "";
    public Vehicle? Vehicle { get; set; }
    public Guid? TripId { get; set; }
    public decimal Lat { get; set; }
    public decimal Lng { get; set; }
    public decimal? SpeedKmh { get; set; }
    public decimal? Heading { get; set; }
    public string Source { get; set; } = "DEVICE";
    public decimal? AccuracyMeters { get; set; }
    public DateTime RecordedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class Trip : IBranchScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid? BranchId { get; set; }
    public Branch? Branch { get; set; }
    public string TripCode { get; set; } = "";
    public string? VehicleId { get; set; }
    public Vehicle? Vehicle { get; set; }
    public string? DriverId { get; set; }
    public Driver? Driver { get; set; }
    public string? BookingId { get; set; }
    public Booking? Booking { get; set; }
    public string Status { get; set; } = "PLANNED";
    public string Origin { get; set; } = "";
    public string Destination { get; set; } = "";
    public DateTime? PlannedStart { get; set; }
    public DateTime? PlannedEnd { get; set; }
    public DateTime? ActualStart { get; set; }
    public DateTime? ActualEnd { get; set; }
    public decimal? DistanceKm { get; set; }
    public decimal TollCost { get; set; }
    public string? RoutePolyline { get; set; }
    public bool AiOptimized { get; set; }
    public decimal? EstimatedFuelL { get; set; }
    public int? EtaMinutes { get; set; }
    public decimal? OptimizationSavingsPct { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public ICollection<TripStop> Stops { get; set; } = [];
    public ICollection<TripStatusHistory> StatusHistory { get; set; } = [];
}

public class TripStop
{
    public Guid Id { get; set; }
    public Guid TripId { get; set; }
    public Trip? Trip { get; set; }
    public int SequenceNo { get; set; }
    public string Address { get; set; } = "";
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public DateTime? PlannedArrival { get; set; }
    public string Status { get; set; } = "PENDING";
}

public class TripStatusHistory
{
    public Guid Id { get; set; }
    public Guid TripId { get; set; }
    public string Status { get; set; } = "";
    public string? Note { get; set; }
    public string? ChangedBy { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ProofOfDelivery : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string BookingId { get; set; } = "";
    public Booking? Booking { get; set; }
    public string? OtpCode { get; set; }
    public bool OtpVerified { get; set; }
    public string? RecipientName { get; set; }
    public decimal? DeliveryLat { get; set; }
    public decimal? DeliveryLng { get; set; }
    public string? SignatureUrl { get; set; }
    public string? PhotoUrl { get; set; }
    public string? ConfirmedBy { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class Document : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string EntityType { get; set; } = "";
    public string EntityId { get; set; } = "";
    public string DocType { get; set; } = "";
    public string Title { get; set; } = "";
    public string? FileUrl { get; set; }
    public DateOnly? ExpiresAt { get; set; }
    public DateOnly? RenewedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class Notification : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid? UserId { get; set; }
    public User? User { get; set; }
    public string Channel { get; set; } = "IN_APP";
    public string Title { get; set; } = "";
    public string? Body { get; set; }
    public string Status { get; set; } = "UNREAD";
    public string? Metadata { get; set; }
    public string? ExternalChannel { get; set; }
    public Guid? OutboxId { get; set; }
    public DateTime SentAt { get; set; }
    public DateTime? ReadAt { get; set; }
}

public class Invoice : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string InvoiceNo { get; set; } = "";
    public string? CustomerId { get; set; }
    public Customer? Customer { get; set; }
    public string? BookingId { get; set; }
    public string Status { get; set; } = "PENDING";
    public decimal Amount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public DateOnly IssuedAt { get; set; }
    public DateOnly? DueAt { get; set; }
    public DateOnly? PaidAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public ICollection<InvoiceLine> Lines { get; set; } = [];
}

public class InvoiceLine
{
    public Guid Id { get; set; }
    public Guid InvoiceId { get; set; }
    public Invoice? Invoice { get; set; }
    public string Description { get; set; } = "";
    public decimal Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
}

public class MarketplaceListing : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string ListingType { get; set; } = "LOAD";
    public string Origin { get; set; } = "";
    public string Destination { get; set; } = "";
    public DateTime? AvailableAt { get; set; }
    public decimal? Rate { get; set; }
    public decimal? CapacityKg { get; set; }
    public string? VehicleId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public ICollection<FreightBid> Bids { get; set; } = [];
}

public class FreightBid : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid ListingId { get; set; }
    public MarketplaceListing? Listing { get; set; }
    public string BidderName { get; set; } = "";
    public decimal Amount { get; set; }
    public string Status { get; set; } = "PENDING";
    public DateTime CreatedAt { get; set; }
}

public class Warehouse : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string Name { get; set; } = "";
    public string? Address { get; set; }
    public decimal? CapacityCbm { get; set; }
    public DateTime CreatedAt { get; set; }
    public ICollection<WarehouseInventory> Inventory { get; set; } = [];
}

public class WarehouseInventory : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid WarehouseId { get; set; }
    public Warehouse? Warehouse { get; set; }
    public string Sku { get; set; } = "";
    public string? Description { get; set; }
    public decimal Quantity { get; set; }
    public decimal WeightKg { get; set; }
}

public class IotDevice : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string? VehicleId { get; set; }
    public Vehicle? Vehicle { get; set; }
    public string DeviceType { get; set; } = "";
    public string DeviceSerial { get; set; } = "";
    public bool IsActive { get; set; } = true;
    public DateTime? LastSeenAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class IotSensorReading : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid DeviceId { get; set; }
    public IotDevice? Device { get; set; }
    public string Metric { get; set; } = "";
    public decimal Value { get; set; }
    public string? Unit { get; set; }
    public DateTime RecordedAt { get; set; }
}

public class AiChatSession : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid? UserId { get; set; }
    public User? User { get; set; }
    public string? Title { get; set; }
    public DateTime CreatedAt { get; set; }
    public ICollection<AiMessage> Messages { get; set; } = [];
}

public class AiMessage : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid SessionId { get; set; }
    public AiChatSession? Session { get; set; }
    public string Role { get; set; } = "";
    public string Content { get; set; } = "";
    public DateTime CreatedAt { get; set; }
}

public class ForecastSnapshot : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string ForecastType { get; set; } = "";
    public DateOnly PeriodStart { get; set; }
    public DateOnly PeriodEnd { get; set; }
    public decimal PredictedValue { get; set; }
    public decimal? Confidence { get; set; }
    public DateTime CreatedAt { get; set; }
}
