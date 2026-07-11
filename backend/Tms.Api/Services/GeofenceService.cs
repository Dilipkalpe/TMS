using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public static class GeoMath
{
    public static double HaversineKm(double lat1, double lng1, double lat2, double lng2)
    {
        const double R = 6371.0;
        var dLat = DegreesToRadians(lat2 - lat1);
        var dLng = DegreesToRadians(lng2 - lng1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(DegreesToRadians(lat1)) * Math.Cos(DegreesToRadians(lat2)) *
                Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
        return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }

    static double DegreesToRadians(double deg) => deg * Math.PI / 180.0;

    public static bool IsInsideCircle(double lat, double lng, double centerLat, double centerLng, int radiusMeters) =>
        HaversineKm(lat, lng, centerLat, centerLng) * 1000.0 <= radiusMeters;

    public static bool IsInsidePolygon(double lat, double lng, JsonDocument? polygonGeojson)
    {
        if (polygonGeojson == null) return false;
        var root = polygonGeojson.RootElement;
        if (!root.TryGetProperty("coordinates", out var coords)) return false;

        JsonElement ring;
        if (root.TryGetProperty("type", out var typeEl) && typeEl.GetString() == "Polygon")
            ring = coords[0];
        else
            ring = coords;

        var vertices = new List<(double lng, double lat)>();
        foreach (var pt in ring.EnumerateArray())
        {
            if (pt.GetArrayLength() < 2) continue;
            vertices.Add((pt[0].GetDouble(), pt[1].GetDouble()));
        }
        if (vertices.Count < 3) return false;

        var inside = false;
        for (int i = 0, j = vertices.Count - 1; i < vertices.Count; j = i++)
        {
            var (xi, yi) = vertices[i];
            var (xj, yj) = vertices[j];
            if ((yi > lat) != (yj > lat) &&
                lng < (xj - xi) * (lat - yi) / (yj - yi + double.Epsilon) + xi)
                inside = !inside;
        }
        return inside;
    }
}

public class GeofenceService(TmsDbContext db, NotificationDispatcher notifications, ITenantContext tenants, IConfiguration config)
{
    int DebounceSeconds => config.GetValue("Gps:GeofenceDebounceSeconds", 60);

    public bool IsInside(Geofence geofence, double lat, double lng) =>
        geofence.ShapeType.Equals("POLYGON", StringComparison.OrdinalIgnoreCase)
            ? GeoMath.IsInsidePolygon(lat, lng, geofence.PolygonGeojson)
            : geofence.CenterLat != null && geofence.CenterLng != null && geofence.RadiusMeters != null &&
              GeoMath.IsInsideCircle(lat, lng, (double)geofence.CenterLat, (double)geofence.CenterLng, geofence.RadiusMeters.Value);

    public async Task<List<Geofence>> GetApplicableGeofencesAsync(string vehicleId)
    {
        var active = await tenants.Filter(db.Geofences.AsNoTracking())
            .Include(g => g.Assignments)
            .Where(g => g.IsActive)
            .ToListAsync();

        return active.Where(g =>
            g.Assignments.Any(a => a.AppliesToAll) ||
            g.Assignments.Any(a => a.VehicleId == vehicleId)).ToList();
    }

    public async Task<List<GeofenceEventDto>> EvaluateVehicleAsync(
        string vehicleId, double lat, double lng, decimal? speedKmh, DateTime recordedAt)
    {
        var geofences = await GetApplicableGeofencesAsync(vehicleId);
        if (geofences.Count == 0) return [];

        var states = await db.GeofenceVehicleStates
            .Where(s => s.VehicleId == vehicleId)
            .ToDictionaryAsync(s => s.GeofenceId);

        var vehicle = await db.Vehicles.FindAsync(vehicleId);
        var regNo = vehicle?.Number ?? vehicleId;
        var generated = new List<GeofenceEventDto>();
        var now = DateTime.UtcNow;

        foreach (var g in geofences)
        {
            var wasInside = states.TryGetValue(g.Id, out var state) && state.IsInside;
            var nowInside = IsInside(g, lat, lng);

            if (wasInside == nowInside) continue;

            var eventType = nowInside ? "ENTER" : "EXIT";
            if (nowInside && !g.AlertOnEnter) { UpsertState(g.Id, vehicleId, nowInside, recordedAt, state); continue; }
            if (!nowInside && !g.AlertOnExit) { UpsertState(g.Id, vehicleId, nowInside, recordedAt, state); continue; }

            if (state?.LastEventAt != null &&
                (recordedAt - state.LastEventAt.Value).TotalSeconds < DebounceSeconds)
                continue;

            var evt = new GeofenceEvent
            {
                Id = Guid.NewGuid(),
                GeofenceId = g.Id,
                VehicleId = vehicleId,
                EventType = eventType,
                Lat = (decimal)lat,
                Lng = (decimal)lng,
                SpeedKmh = speedKmh,
                RecordedAt = recordedAt,
                CreatedAt = now,
            };
            db.GeofenceEvents.Add(evt);

            var title = eventType == "ENTER"
                ? $"Vehicle {regNo} entered {g.Name}"
                : $"Vehicle {regNo} left {g.Name}";

            var timeStr = recordedAt.ToLocalTime().ToString("g");
            await notifications.DispatchAsync(new DispatchNotificationRequest
            {
                EventCode = $"GEOFENCE_{eventType}",
                Title = title,
                Body = $"Detected at {timeStr}",
                Variables = new Dictionary<string, string>
                {
                    ["vehicleNo"] = regNo,
                    ["zoneName"] = g.Name,
                    ["time"] = timeStr,
                    ["eventType"] = eventType,
                },
                Metadata = $"{{\"eventId\":\"{evt.Id}\",\"type\":\"GEOFENCE_{eventType}\",\"geofenceId\":\"{g.Id}\",\"vehicleId\":\"{vehicleId}\"}}",
            });

            generated.Add(new GeofenceEventDto(evt.Id, g.Id, g.Name, eventType, vehicleId, regNo));
            UpsertState(g.Id, vehicleId, nowInside, recordedAt, state);
        }

        await db.SaveChangesAsync();
        return generated;
    }

    void UpsertState(Guid geofenceId, string vehicleId, bool isInside, DateTime recordedAt, GeofenceVehicleState? existing)
    {
        if (existing != null)
        {
            existing.IsInside = isInside;
            existing.LastEventAt = recordedAt;
            return;
        }

        db.GeofenceVehicleStates.Add(new GeofenceVehicleState
        {
            GeofenceId = geofenceId,
            VehicleId = vehicleId,
            IsInside = isInside,
            LastEventAt = recordedAt,
        });
    }
}

public record GeofenceEventDto(Guid EventId, Guid GeofenceId, string GeofenceName, string EventType, string VehicleId, string RegistrationNo);
