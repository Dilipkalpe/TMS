using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public record FleetLiveItemDto(
    string VehicleId,
    string RegistrationNo,
    string Status,
    string? DriverName,
    string? DriverId,
    string? TripNo,
    string? LoadingSlipNumber,
    string? TripStatus,
    string? TrackingStatus,
    FleetPositionDto? LastPosition,
    IReadOnlyList<GeofenceNameDto> InsideGeofences);

public record FleetPositionDto(
    decimal Lat, decimal Lng, decimal? SpeedKmh, decimal? Heading,
    DateTime RecordedAt, string Source, bool IsStale, string? TrackingStatus = null);

public record GeofenceNameDto(Guid Id, string Name);

public record FleetHistoryDto(
    string VehicleId, string RegistrationNo,
    DateTime From, DateTime To,
    IReadOnlyList<FleetHistoryPointDto> Points,
    FleetHistorySummaryDto Summary);

public record FleetHistoryPointDto(decimal Lat, decimal Lng, decimal? SpeedKmh, decimal? Heading, DateTime RecordedAt);
public record FleetHistorySummaryDto(int PointCount, decimal? MaxSpeedKmh, decimal? AvgSpeedKmh, decimal DistanceKm);

public class FleetLiveService(TmsDbContext db, ITenantContext tenants, IBranchContext branches, IConfiguration config)
{
    int StaleMinutes => config.GetValue("Gps:StaleThresholdMinutes", 15);
    int MaxHistory => config.GetValue("Gps:MaxHistoryPoints", 5000);

    public async Task<List<FleetLiveItemDto>> GetLiveAsync(string? statusFilter, CancellationToken ct = default)
    {
        var staleCutoff = DateTime.UtcNow.AddMinutes(-StaleMinutes);
        var q = TenantScope.Vehicles(db, tenants, branches).AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(statusFilter))
            q = q.Where(v => v.Status == statusFilter);
        else
            q = q.Where(v => v.Status == "Active" || v.Status == "On Trip" || v.Status == "Maintenance");

        var vehicles = await q.OrderBy(v => v.Number).ToListAsync(ct);
        var vehicleIds = vehicles.Select(v => v.Id).ToList();

        var positions = await db.VehicleLastPositions.AsNoTracking()
            .Where(p => vehicleIds.Contains(p.VehicleId))
            .ToDictionaryAsync(p => p.VehicleId, ct);

        var insideStates = await db.GeofenceVehicleStates.AsNoTracking()
            .Include(s => s.Geofence)
            .Where(s => vehicleIds.Contains(s.VehicleId) && s.IsInside && s.Geofence!.IsActive)
            .ToListAsync(ct);

        var insideByVehicle = insideStates
            .GroupBy(s => s.VehicleId)
            .ToDictionary(g => g.Key, g => g.Select(s => new GeofenceNameDto(s.GeofenceId, s.Geofence!.Name)).ToList());

        var activeTrips = await TenantScope.Trips(db, tenants, branches).AsNoTracking()
            .Include(t => t.Driver)
            .Where(t => t.VehicleId != null && vehicleIds.Contains(t.VehicleId!) &&
                        (t.Status == "IN_TRANSIT" || t.Status == "ASSIGNED"))
            .ToListAsync(ct);
        var driverByVehicle = activeTrips
            .GroupBy(t => t.VehicleId!)
            .ToDictionary(g => g.Key, g => g.First().Driver?.Name);

        var driverSessions = await db.DriverTripSessions.AsNoTracking()
            .Where(s => vehicleIds.Contains(s.VehicleId) && DriverTripStatuses.Active.Contains(s.Status))
            .OrderByDescending(s => s.UpdatedAt)
            .ToListAsync(ct);
        var sessionByVehicle = driverSessions
            .GroupBy(s => s.VehicleId)
            .ToDictionary(g => g.Key, g => g.First());

        var driverIds = sessionByVehicle.Values.Select(s => s.DriverId).Distinct().ToList();
        var drivers = await db.Drivers.AsNoTracking()
            .Where(d => driverIds.Contains(d.Id))
            .ToDictionaryAsync(d => d.Id, d => d.Name, ct);

        return vehicles.Select(v =>
        {
            positions.TryGetValue(v.Id, out var pos);
            sessionByVehicle.TryGetValue(v.Id, out var sess);
            var isStale = pos != null && pos.RecordedAt < staleCutoff;
            var trackingStatus = pos == null ? null
                : isStale ? "STALE"
                : (pos.TrackingStatus ?? (sess?.TrackingActive == true ? "ACTIVE" : "STOPPED"));

            FleetPositionDto? last = pos == null ? null : new FleetPositionDto(
                pos.Lat, pos.Lng, pos.SpeedKmh, pos.Heading,
                pos.RecordedAt, pos.Source, isStale, trackingStatus);

            var driverName = sess != null
                ? drivers.GetValueOrDefault(sess.DriverId) ?? driverByVehicle.GetValueOrDefault(v.Id)
                : driverByVehicle.GetValueOrDefault(v.Id);

            return new FleetLiveItemDto(
                v.Id, v.Number, v.Status,
                driverName,
                sess?.DriverId ?? pos?.DriverId,
                sess?.TripNo,
                sess?.LoadingSlipNumber,
                sess?.Status,
                trackingStatus,
                last,
                insideByVehicle.GetValueOrDefault(v.Id) ?? []);
        }).ToList();
    }

    public async Task<FleetHistoryDto?> GetHistoryAsync(
        string vehicleId, DateTime? from, DateTime? to, int? limit, CancellationToken ct = default)
    {
        var vehicle = await TenantScope.Vehicles(db, tenants, branches).AsNoTracking()
            .FirstOrDefaultAsync(v => v.Id == vehicleId, ct);
        if (vehicle == null) return null;

        var end = to ?? DateTime.UtcNow;
        var start = from ?? end.AddHours(-24);
        var take = Math.Min(limit ?? 2000, MaxHistory);

        var points = await TenantScope.GpsTracks(db, tenants, branches).AsNoTracking()
            .Where(t => t.VehicleId == vehicleId && t.RecordedAt >= start && t.RecordedAt <= end)
            .OrderBy(t => t.RecordedAt)
            .Take(take)
            .Select(t => new FleetHistoryPointDto(t.Lat, t.Lng, t.SpeedKmh, t.Heading, t.RecordedAt))
            .ToListAsync(ct);

        decimal distance = 0;
        for (var i = 1; i < points.Count; i++)
            distance += (decimal)GeoMath.HaversineKm(
                (double)points[i - 1].Lat, (double)points[i - 1].Lng,
                (double)points[i].Lat, (double)points[i].Lng);

        var speeds = points.Where(p => p.SpeedKmh > 0).Select(p => p.SpeedKmh!.Value).ToList();

        return new FleetHistoryDto(
            vehicleId, vehicle.Number, start, end, points,
            new FleetHistorySummaryDto(
                points.Count,
                speeds.Count > 0 ? speeds.Max() : null,
                speeds.Count > 0 ? Math.Round(speeds.Average(), 1) : null,
                Math.Round(distance, 1)));
    }

    public async Task<object> GetFleetSummaryAsync(CancellationToken ct = default)
    {
        var staleCutoff = DateTime.UtcNow.AddMinutes(-StaleMinutes);
        var activeStatuses = new[] { "Active", "On Trip" };
        var vehicleQ = TenantScope.Vehicles(db, tenants, branches);
        var vehicleIds = await vehicleQ.Select(v => v.Id).ToListAsync(ct);

        var totalActive = await vehicleQ.CountAsync(v => activeStatuses.Contains(v.Status), ct);
        var onTrip = await vehicleQ.CountAsync(v => v.Status == "On Trip", ct);
        var withRecent = await db.VehicleLastPositions.CountAsync(p => vehicleIds.Contains(p.VehicleId) && p.RecordedAt >= staleCutoff, ct);
        var stale = await db.VehicleLastPositions.CountAsync(p => vehicleIds.Contains(p.VehicleId) && p.RecordedAt < staleCutoff, ct);
        var unack = await TenantScope.GeofenceEvents(db, tenants, branches).CountAsync(e => !e.Acknowledged, ct);
        return new { totalActive, onTrip, withRecentGps = withRecent, staleGps = stale, unackGeofenceEvents = unack };
    }
}
