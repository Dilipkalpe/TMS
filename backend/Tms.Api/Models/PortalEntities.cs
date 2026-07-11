namespace Tms.Api.Models;

public class BookingStatusHistory
{
    public Guid Id { get; set; }
    public string BookingId { get; set; } = "";
    public Booking? Booking { get; set; }
    public string Status { get; set; } = "";
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class BookingTrackingToken
{
    public Guid Id { get; set; }
    public string BookingId { get; set; } = "";
    public Booking? Booking { get; set; }
    public string Token { get; set; } = "";
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
