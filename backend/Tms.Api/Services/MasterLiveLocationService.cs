using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

/// <summary>
/// Single source of truth for master screens: vehicle_last_position + active driver_trip_sessions.
/// Vehicle Master and Driver Master both read the same current location record.
/// </summary>
public record MasterLiveLocation(
    string? VehicleId,
    string? VehicleNumber,
    string? DriverId,
    string? DriverName,
    string? TripNo,
    string? LoadingSlipNumber,
    Guid? LoadingSlipId,
    Guid? SessionId,
    string? TripStatus,
    decimal? Latitude,
    decimal? Longitude,
    string? CurrentLocation,
    DateTime? LocationUpdatedAt,
    string TrackingStatus,
    string? Source);

public class MasterLiveLocationService(
    TmsDbContext db,
    IConfiguration config,
    ReverseGeocodeService reverseGeocode,
    ILogger<MasterLiveLocationService> logger)
{
    int StaleMinutes => config.GetValue("Gps:StaleThresholdMinutes", 15);
    /// <summary>Max reverse-geocode backfills per master list/detail request (avoids Nominatim storms).</summary>
    int MaxBackfillPerRequest => config.GetValue("Gps:ReverseGeocode:MaxBackfillPerRequest", 5);

    /// <summary>Display helper — readable label only (never lat/lng).</summary>
    public static string FormatLocation(string? locationLabel)
        => string.IsNullOrWhiteSpace(locationLabel) ? "" : locationLabel.Trim();

    public string ResolveTrackingStatus(string? rawStatus, DateTime? recordedAt, bool hasActiveTrip, bool tripJustCompleted)
    {
        if (tripJustCompleted) return "Trip Completed";
        if (!hasActiveTrip) return "Not Started";
        if (recordedAt == null) return "Not Started";
        if (recordedAt < DateTime.UtcNow.AddMinutes(-StaleMinutes)) return "Location Stale";
        return rawStatus?.ToUpperInvariant() switch
        {
            "ACTIVE" => "Tracking Active",
            "COMPLETED" => "Trip Completed",
            "STALE" => "Location Stale",
            "STOPPED" => "Not Started",
            _ => "Tracking Active",
        };
    }

    public async Task<Dictionary<string, MasterLiveLocation>> ForVehiclesAsync(
        IReadOnlyList<string> vehicleIds, CancellationToken ct = default)
    {
        if (vehicleIds.Count == 0) return [];

        var positions = await db.VehicleLastPositions.AsNoTracking()
            .Where(p => vehicleIds.Contains(p.VehicleId))
            .ToDictionaryAsync(p => p.VehicleId, ct);

        await BackfillMissingLabelsAsync(positions.Values, ct);

        // Reload labels that may have been persisted by backfill
        if (positions.Values.Any(p => string.IsNullOrWhiteSpace(p.LocationLabel)))
        {
            var refreshed = await db.VehicleLastPositions.AsNoTracking()
                .Where(p => vehicleIds.Contains(p.VehicleId))
                .ToDictionaryAsync(p => p.VehicleId, ct);
            foreach (var kv in refreshed) positions[kv.Key] = kv.Value;
        }

        var sessions = await db.DriverTripSessions.AsNoTracking()
            .Where(s => vehicleIds.Contains(s.VehicleId) && DriverTripStatuses.Active.Contains(s.Status))
            .OrderByDescending(s => s.UpdatedAt)
            .ToListAsync(ct);
        var sessionByVehicle = sessions.GroupBy(s => s.VehicleId).ToDictionary(g => g.Key, g => g.First());

        var driverIds = sessionByVehicle.Values.Select(s => s.DriverId)
            .Concat(positions.Values.Where(p => p.DriverId != null).Select(p => p.DriverId!))
            .Distinct().ToList();
        var drivers = driverIds.Count == 0
            ? new Dictionary<string, string>()
            : await db.Drivers.AsNoTracking()
                .Where(d => driverIds.Contains(d.Id))
                .ToDictionaryAsync(d => d.Id, d => d.Name, ct);

        var vehicles = await db.Vehicles.AsNoTracking()
            .Where(v => vehicleIds.Contains(v.Id))
            .ToDictionaryAsync(v => v.Id, v => v.Number, ct);

        var result = new Dictionary<string, MasterLiveLocation>();
        foreach (var vid in vehicleIds.Distinct())
        {
            positions.TryGetValue(vid, out var pos);
            sessionByVehicle.TryGetValue(vid, out var sess);
            var hasActive = sess != null;
            var driverId = sess?.DriverId ?? (hasActive ? pos?.DriverId : null);
            var status = ResolveTrackingStatus(pos?.TrackingStatus, pos?.RecordedAt, hasActive, false);

            result[vid] = new MasterLiveLocation(
                vid,
                vehicles.GetValueOrDefault(vid),
                driverId,
                driverId != null ? drivers.GetValueOrDefault(driverId) : null,
                sess?.TripNo,
                sess?.LoadingSlipNumber,
                sess?.LoadingSlipId,
                sess?.Id,
                sess?.Status,
                pos?.Lat,
                pos?.Lng,
                FormatLocation(pos?.LocationLabel),
                pos?.RecordedAt,
                status,
                pos?.Source);
        }
        return result;
    }

    public async Task<Dictionary<string, MasterLiveLocation>> ForDriversAsync(
        IReadOnlyList<string> driverIds, CancellationToken ct = default)
    {
        if (driverIds.Count == 0) return [];

        var sessions = await db.DriverTripSessions.AsNoTracking()
            .Where(s => driverIds.Contains(s.DriverId) && DriverTripStatuses.Active.Contains(s.Status))
            .OrderByDescending(s => s.UpdatedAt)
            .ToListAsync(ct);
        var sessionByDriver = sessions.GroupBy(s => s.DriverId).ToDictionary(g => g.Key, g => g.First());

        var vehicleIds = sessionByDriver.Values.Select(s => s.VehicleId).Distinct().ToList();
        var positions = vehicleIds.Count == 0
            ? new Dictionary<string, VehicleLastPosition>()
            : await db.VehicleLastPositions.AsNoTracking()
                .Where(p => vehicleIds.Contains(p.VehicleId))
                .ToDictionaryAsync(p => p.VehicleId, ct);

        await BackfillMissingLabelsAsync(positions.Values, ct);
        if (positions.Count > 0 && positions.Values.Any(p => string.IsNullOrWhiteSpace(p.LocationLabel)))
        {
            var refreshed = await db.VehicleLastPositions.AsNoTracking()
                .Where(p => vehicleIds.Contains(p.VehicleId))
                .ToDictionaryAsync(p => p.VehicleId, ct);
            foreach (var kv in refreshed) positions[kv.Key] = kv.Value;
        }

        var vehicles = vehicleIds.Count == 0
            ? new Dictionary<string, string>()
            : await db.Vehicles.AsNoTracking()
                .Where(v => vehicleIds.Contains(v.Id))
                .ToDictionaryAsync(v => v.Id, v => v.Number, ct);

        var drivers = await db.Drivers.AsNoTracking()
            .Where(d => driverIds.Contains(d.Id))
            .ToDictionaryAsync(d => d.Id, d => d.Name, ct);

        var result = new Dictionary<string, MasterLiveLocation>();
        foreach (var did in driverIds.Distinct())
        {
            sessionByDriver.TryGetValue(did, out var sess);
            if (sess == null)
            {
                // No active trip: clear current vehicle (history remains in driver_trip_sessions)
                result[did] = new MasterLiveLocation(
                    null, null, did, drivers.GetValueOrDefault(did),
                    null, null, null, null, null,
                    null, null, null, null,
                    "Not Started",
                    null);
                continue;
            }

            positions.TryGetValue(sess.VehicleId, out var pos);
            var status = ResolveTrackingStatus(pos?.TrackingStatus, pos?.RecordedAt, true, false);
            result[did] = new MasterLiveLocation(
                sess.VehicleId,
                vehicles.GetValueOrDefault(sess.VehicleId),
                did,
                drivers.GetValueOrDefault(did),
                sess.TripNo,
                sess.LoadingSlipNumber,
                sess.LoadingSlipId,
                sess.Id,
                sess.Status,
                pos?.Lat,
                pos?.Lng,
                FormatLocation(pos?.LocationLabel),
                pos?.RecordedAt,
                status,
                pos?.Source);
        }
        return result;
    }

    /// <summary>
    /// One-time / sparse backfill when masters open and label is missing.
    /// Never clears an existing label; never throws into the master API.
    /// </summary>
    async Task BackfillMissingLabelsAsync(IEnumerable<VehicleLastPosition> positions, CancellationToken ct)
    {
        var missing = positions
            .Where(p => string.IsNullOrWhiteSpace(p.LocationLabel))
            .Take(MaxBackfillPerRequest)
            .ToList();
        if (missing.Count == 0) return;

        foreach (var pos in missing)
        {
            try
            {
                var label = await reverseGeocode.ResolveAsync(pos.Lat, pos.Lng, ct);
                if (string.IsNullOrWhiteSpace(label)) continue;

                var tracked = await db.VehicleLastPositions.FindAsync([pos.VehicleId], ct);
                if (tracked == null) continue;
                // Keep previous if somehow filled concurrently
                if (!string.IsNullOrWhiteSpace(tracked.LocationLabel) &&
                    !reverseGeocode.NeedsRefresh(pos.Lat, pos.Lng, tracked.LocationLabel, tracked.GeocodedLat, tracked.GeocodedLng))
                    continue;

                tracked.LocationLabel = label;
                tracked.GeocodedLat = pos.Lat;
                tracked.GeocodedLng = pos.Lng;
                tracked.UpdatedAt = DateTime.UtcNow;
                await db.SaveChangesAsync(ct);
                pos.LocationLabel = label;
            }
            catch (Exception ex)
            {
                logger.LogDebug(ex, "Location label backfill skipped for {VehicleId}", pos.VehicleId);
            }
        }
    }
}
