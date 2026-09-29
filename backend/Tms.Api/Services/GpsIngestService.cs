using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public record GpsIngestRequest(
    string VehicleId, decimal Lat, decimal Lng, decimal? SpeedKmh, decimal? Heading,
    Guid? TripId, DateTime? RecordedAt, decimal? AccuracyMeters, string? Source,
    string? DriverId = null, Guid? LoadingSlipId = null, string? TrackingStatus = null);

public record GpsIngestResult(Guid TrackId, string VehicleId, List<GeofenceEventDto> GeofenceEvents);

public class GpsIngestService(
    TmsDbContext db,
    GeofenceService geofence,
    ITenantContext tenants,
    IConfiguration config,
    ReverseGeocodeService reverseGeocode,
    ILogger<GpsIngestService> logger)
{
    int RejectStaleHours => config.GetValue("Gps:RejectStaleIngestHours", 24);

    public async Task<GpsIngestResult> IngestAsync(GpsIngestRequest req, CancellationToken ct = default)
    {
        ValidateCoordinates(req.Lat, req.Lng);

        var vehicle = await db.Vehicles.FindAsync([req.VehicleId], ct);
        if (vehicle == null || !TenantAccess.CanAccess(tenants, vehicle))
            throw new InvalidOperationException("Vehicle not found");

        var recordedAt = req.RecordedAt ?? DateTime.UtcNow;
        if (recordedAt > DateTime.UtcNow.AddMinutes(5))
            throw new InvalidOperationException("RecordedAt cannot be in the future");
        if (recordedAt < DateTime.UtcNow.AddHours(-RejectStaleHours))
            throw new InvalidOperationException($"RecordedAt is older than {RejectStaleHours} hours");

        var duplicate = await db.GpsTracks.AnyAsync(t =>
            t.VehicleId == req.VehicleId &&
            Math.Abs((t.RecordedAt - recordedAt).TotalSeconds) < 5, ct);
        if (duplicate)
        {
            var last = await db.VehicleLastPositions.FindAsync([req.VehicleId], ct);
            return new GpsIngestResult(last != null ? Guid.Empty : Guid.Empty, req.VehicleId, []);
        }

        var now = DateTime.UtcNow;
        var track = new GpsTrack
        {
            Id = Guid.NewGuid(),
            VehicleId = req.VehicleId,
            TripId = req.TripId,
            DriverId = req.DriverId,
            LoadingSlipId = req.LoadingSlipId,
            Lat = req.Lat,
            Lng = req.Lng,
            SpeedKmh = req.SpeedKmh,
            Heading = req.Heading,
            Source = string.IsNullOrWhiteSpace(req.Source) ? "DEVICE" : req.Source,
            AccuracyMeters = req.AccuracyMeters,
            RecordedAt = recordedAt,
            CreatedAt = now,
        };
        db.GpsTracks.Add(track);

        var trackingStatus = string.IsNullOrWhiteSpace(req.TrackingStatus) ? "ACTIVE" : req.TrackingStatus;
        var lastPos = await db.VehicleLastPositions.FindAsync([req.VehicleId], ct);
        var shouldGeocode = false;
        if (lastPos == null)
        {
            lastPos = new VehicleLastPosition
            {
                VehicleId = req.VehicleId,
                Lat = req.Lat,
                Lng = req.Lng,
                SpeedKmh = req.SpeedKmh,
                Heading = req.Heading,
                TripId = req.TripId,
                DriverId = req.DriverId,
                LoadingSlipId = req.LoadingSlipId,
                TrackingStatus = trackingStatus,
                AccuracyMeters = req.AccuracyMeters,
                Source = track.Source,
                RecordedAt = recordedAt,
                UpdatedAt = now,
            };
            db.VehicleLastPositions.Add(lastPos);
            shouldGeocode = true;
        }
        else
        {
            if (recordedAt >= lastPos.RecordedAt)
            {
                shouldGeocode = reverseGeocode.NeedsRefresh(
                    req.Lat, req.Lng, lastPos.LocationLabel, lastPos.GeocodedLat, lastPos.GeocodedLng);

                lastPos.Lat = req.Lat;
                lastPos.Lng = req.Lng;
                lastPos.SpeedKmh = req.SpeedKmh;
                lastPos.Heading = req.Heading;
                lastPos.TripId = req.TripId;
                if (req.DriverId != null) lastPos.DriverId = req.DriverId;
                if (req.LoadingSlipId != null) lastPos.LoadingSlipId = req.LoadingSlipId;
                lastPos.TrackingStatus = trackingStatus;
                lastPos.AccuracyMeters = req.AccuracyMeters;
                lastPos.Source = track.Source;
                lastPos.RecordedAt = recordedAt;
                lastPos.UpdatedAt = now;
                // Keep LocationLabel / GeocodedLat/Lng on failure or when move is small
            }
        }

        await db.SaveChangesAsync(ct);

        if (shouldGeocode && lastPos != null)
            await TryRefreshLocationLabelAsync(lastPos, req.Lat, req.Lng, ct);

        var events = await geofence.EvaluateVehicleAsync(
            req.VehicleId, (double)req.Lat, (double)req.Lng, req.SpeedKmh, recordedAt);

        return new GpsIngestResult(track.Id, req.VehicleId, events);
    }

    async Task TryRefreshLocationLabelAsync(VehicleLastPosition lastPos, decimal lat, decimal lng, CancellationToken ct)
    {
        try
        {
            var label = await reverseGeocode.ResolveAsync(lat, lng, ct);
            if (string.IsNullOrWhiteSpace(label)) return;

            // Re-attach in case context was disposed / entity detached (shouldn't be)
            var tracked = await db.VehicleLastPositions.FindAsync([lastPos.VehicleId], ct);
            if (tracked == null) return;

            tracked.LocationLabel = label;
            tracked.GeocodedLat = lat;
            tracked.GeocodedLng = lng;
            tracked.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
        }
        catch (OperationCanceledException)
        {
            // request aborted — leave previous label
        }
        catch (Exception ex)
        {
            // Never break GPS ingest because reverse geocode failed
            logger.LogWarning(ex, "Keeping previous location label for vehicle {VehicleId}", lastPos.VehicleId);
        }
    }

    static void ValidateCoordinates(decimal lat, decimal lng)
    {
        if (lat is < -90 or > 90) throw new InvalidOperationException("Latitude must be between -90 and 90");
        if (lng is < -180 or > 180) throw new InvalidOperationException("Longitude must be between -180 and 180");
        if (lat == 0 && lng == 0) throw new InvalidOperationException("Invalid coordinates (0,0)");
    }
}
