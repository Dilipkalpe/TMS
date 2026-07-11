using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public record GpsIngestRequest(
    string VehicleId, decimal Lat, decimal Lng, decimal? SpeedKmh, decimal? Heading,
    Guid? TripId, DateTime? RecordedAt, decimal? AccuracyMeters, string? Source);

public record GpsIngestResult(Guid TrackId, string VehicleId, List<GeofenceEventDto> GeofenceEvents);

public class GpsIngestService(TmsDbContext db, GeofenceService geofence, ITenantContext tenants, IConfiguration config)
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

        var lastPos = await db.VehicleLastPositions.FindAsync([req.VehicleId], ct);
        if (lastPos == null)
        {
            db.VehicleLastPositions.Add(new VehicleLastPosition
            {
                VehicleId = req.VehicleId,
                Lat = req.Lat,
                Lng = req.Lng,
                SpeedKmh = req.SpeedKmh,
                Heading = req.Heading,
                TripId = req.TripId,
                Source = track.Source,
                RecordedAt = recordedAt,
                UpdatedAt = now,
            });
        }
        else
        {
            if (recordedAt >= lastPos.RecordedAt)
            {
                lastPos.Lat = req.Lat;
                lastPos.Lng = req.Lng;
                lastPos.SpeedKmh = req.SpeedKmh;
                lastPos.Heading = req.Heading;
                lastPos.TripId = req.TripId;
                lastPos.Source = track.Source;
                lastPos.RecordedAt = recordedAt;
                lastPos.UpdatedAt = now;
            }
        }

        await db.SaveChangesAsync(ct);

        var events = await geofence.EvaluateVehicleAsync(
            req.VehicleId, (double)req.Lat, (double)req.Lng, req.SpeedKmh, recordedAt);

        return new GpsIngestResult(track.Id, req.VehicleId, events);
    }

    static void ValidateCoordinates(decimal lat, decimal lng)
    {
        if (lat is < -90 or > 90) throw new InvalidOperationException("Latitude must be between -90 and 90");
        if (lng is < -180 or > 180) throw new InvalidOperationException("Longitude must be between -180 and 180");
        if (lat == 0 && lng == 0) throw new InvalidOperationException("Invalid coordinates (0,0)");
    }
}
