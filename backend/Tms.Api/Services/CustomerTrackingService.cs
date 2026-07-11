using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public record PortalShipmentDto(
    string Id,
    string ShipmentCode,
    string Status,
    string Origin,
    string Destination,
    string CustomerName,
    decimal FreightAmount,
    DateOnly BookedAt,
    string? VehicleNumber,
    string? DriverName,
    bool HasPod);

public record PortalTrackingDto(
    PortalShipmentDto Shipment,
    PortalVehiclePositionDto? LivePosition,
    IReadOnlyList<PortalTimelineEventDto> Timeline,
    IReadOnlyList<PortalGpsPointDto> RouteTrail,
    PortalEtaDto? Eta,
    PortalPodSummaryDto? Pod,
    PortalTripSummaryDto? Trip);

public record PortalVehiclePositionDto(
    decimal Lat, decimal Lng, decimal? SpeedKmh, decimal? Heading,
    DateTime RecordedAt, bool IsStale);

public record PortalTimelineEventDto(string Status, string? Note, DateTime At);
public record PortalGpsPointDto(decimal Lat, decimal Lng, DateTime RecordedAt);
public record PortalEtaDto(DateTime EstimatedArrival, string Source, int? DistanceKmRemaining, int? MinutesRemaining);
public record PortalPodSummaryDto(bool Verified, string? RecipientName, DateTime? DeliveredAt);
public record PortalTripSummaryDto(string TripCode, string Status, string? DriverPhone);

public class CustomerTrackingService(TmsDbContext db, IConfiguration config)
{
    int StaleMinutes => config.GetValue("Gps:StaleThresholdMinutes", 15);

    static IQueryable<Booking> ScopeBookings(TmsDbContext db, Guid? companyId, string? customerId, string? bookingIdScope)
    {
        var q = db.Bookings.AsNoTracking().AsQueryable();
        if (companyId != null)
            q = q.Where(b => b.CompanyId == companyId.Value);
        if (!string.IsNullOrEmpty(customerId))
            q = q.Where(b => b.CustomerId == customerId);
        if (!string.IsNullOrEmpty(bookingIdScope))
            q = q.Where(b => b.Id == bookingIdScope);
        return q;
    }

    public async Task<List<PortalShipmentDto>> ListShipmentsAsync(Guid? companyId, string? customerId, string? bookingIdScope, CancellationToken ct = default)
    {
        var rows = await ScopeBookings(db, companyId, customerId, bookingIdScope)
            .OrderByDescending(b => b.BookingDate).ThenByDescending(b => b.Id).Take(100).ToListAsync(ct);
        var ids = rows.Select(r => r.Id).ToList();
        var pods = await db.ProofOfDeliveries.AsNoTracking()
            .Where(p => ids.Contains(p.BookingId))
            .ToDictionaryAsync(p => p.BookingId, ct);

        return rows.Select(b => MapShipment(b, pods.ContainsKey(b.Id))).ToList();
    }

    public async Task<PortalTrackingDto?> GetTrackingAsync(string bookingId, Guid? companyId, string? customerId, string? bookingIdScope, CancellationToken ct = default)
    {
        if (bookingIdScope != null && bookingIdScope != bookingId) return null;

        var booking = await db.Bookings.AsNoTracking().FirstOrDefaultAsync(b => b.Id == bookingId, ct);
        if (booking == null) return null;
        if (companyId != null && booking.CompanyId != companyId.Value) return null;
        if (customerId != null && booking.CustomerId != customerId) return null;

        var trip = await db.Trips.AsNoTracking()
            .Include(t => t.Driver)
            .Include(t => t.Vehicle)
            .Include(t => t.Stops)
            .Include(t => t.StatusHistory)
            .FirstOrDefaultAsync(t => t.BookingId == bookingId && (companyId == null || t.CompanyId == companyId.Value), ct);

        var vehicleId = booking.VehicleId ?? trip?.VehicleId;
        VehicleLastPosition? pos = null;
        if (vehicleId != null)
        {
            pos = await db.VehicleLastPositions.AsNoTracking()
                .FirstOrDefaultAsync(p => p.VehicleId == vehicleId &&
                    (companyId == null || db.Vehicles.Any(v => v.Id == vehicleId && v.CompanyId == companyId.Value)), ct);
        }

        var staleCutoff = DateTime.UtcNow.AddMinutes(-StaleMinutes);
        var trail = vehicleId == null
            ? new List<GpsTrack>()
            : await db.GpsTracks.AsNoTracking()
                .Where(g => g.VehicleId == vehicleId && g.RecordedAt >= DateTime.UtcNow.AddHours(-24) &&
                    (companyId == null || db.Vehicles.Any(v => v.Id == vehicleId && v.CompanyId == companyId.Value)))
                .OrderBy(g => g.RecordedAt)
                .Take(200)
                .ToListAsync(ct);

        var history = await db.BookingStatusHistories.AsNoTracking()
            .Where(h => h.BookingId == bookingId)
            .OrderBy(h => h.CreatedAt)
            .ToListAsync(ct);

        if (history.Count == 0)
        {
            history =
            [
                new BookingStatusHistory { Status = "Booked", Note = "Booking created", CreatedAt = booking.CreatedAt },
                .. booking.Status is not ("Pending" or "Booked")
                    ? [new BookingStatusHistory { Status = booking.Status, CreatedAt = booking.UpdatedAt }]
                    : Array.Empty<BookingStatusHistory>()
            ];
        }

        var pod = await db.ProofOfDeliveries.AsNoTracking().FirstOrDefaultAsync(p => p.BookingId == bookingId, ct);
        var destStop = trip?.Stops.OrderByDescending(s => s.SequenceNo).FirstOrDefault(s => s.Latitude != null);

        PortalVehiclePositionDto? live = pos == null ? null : new PortalVehiclePositionDto(
            pos.Lat, pos.Lng, pos.SpeedKmh, pos.Heading, pos.RecordedAt, pos.RecordedAt < staleCutoff);

        var eta = ComputeEta(booking, trip, live, destStop);

        return new PortalTrackingDto(
            MapShipment(booking, pod != null),
            live,
            history.Select(h => new PortalTimelineEventDto(h.Status, h.Note, h.CreatedAt)).ToList(),
            trail.Select(p => new PortalGpsPointDto(p.Lat, p.Lng, p.RecordedAt)).ToList(),
            eta,
            pod == null ? null : new PortalPodSummaryDto(pod.OtpVerified, pod.RecipientName, pod.DeliveredAt),
            trip == null ? null : new PortalTripSummaryDto(trip.TripCode, trip.Status, trip.Driver?.Phone));
    }

    static PortalShipmentDto MapShipment(Booking b, bool hasPod) => new(
        b.Id, b.Id, b.Status, b.FromCity, b.ToCity, b.CustomerName, b.Freight,
        b.BookingDate, b.VehicleNumber, b.DriverName, hasPod);

    static PortalEtaDto? ComputeEta(Booking booking, Trip? trip, PortalVehiclePositionDto? live, TripStop? destStop)
    {
        if (booking.Status is "Delivered" or "Completed" or "Cancelled") return null;

        if (trip?.PlannedEnd != null && trip.PlannedEnd > DateTime.UtcNow)
        {
            var mins = (int)Math.Max(0, (trip.PlannedEnd.Value - DateTime.UtcNow).TotalMinutes);
            return new PortalEtaDto(trip.PlannedEnd.Value, "Trip schedule", null, mins);
        }

        if (live != null && destStop?.Latitude != null && destStop.Longitude != null)
        {
            var dist = HaversineKm((double)live.Lat, (double)live.Lng, (double)destStop.Latitude.Value, (double)destStop.Longitude.Value);
            var speed = live.SpeedKmh is > 5 ? (double)live.SpeedKmh.Value : 45;
            var hours = dist / speed;
            var eta = DateTime.UtcNow.AddHours(hours);
            return new PortalEtaDto(eta, "GPS estimate", (int)Math.Round(dist), (int)Math.Round(hours * 60));
        }

        if (trip?.PlannedEnd != null)
            return new PortalEtaDto(trip.PlannedEnd.Value, "Trip schedule (past due)", null, null);

        var fallback = booking.BookingDate.AddDays(2).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        return new PortalEtaDto(fallback, "Estimated delivery window", null, null);
    }

    static double HaversineKm(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371;
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLon = (lon2 - lon1) * Math.PI / 180;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
            + Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180)
            * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }

    public static async Task RecordStatusAsync(TmsDbContext db, string bookingId, string status, string? note = null, CancellationToken ct = default)
    {
        try
        {
            var last = await db.BookingStatusHistories
                .Where(h => h.BookingId == bookingId)
                .OrderByDescending(h => h.CreatedAt)
                .FirstOrDefaultAsync(ct);
            if (last?.Status == status) return;

            db.BookingStatusHistories.Add(new BookingStatusHistory
            {
                Id = Guid.NewGuid(),
                BookingId = bookingId,
                Status = status,
                Note = note,
                CreatedAt = DateTime.UtcNow,
            });
        }
        catch
        {
            // booking_status_history may be missing on older DBs until portal schema runs
        }
    }
}
