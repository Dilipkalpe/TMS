using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;
using Tms.Api.Services;

namespace Tms.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/gps")]
public class GpsController(
    FleetLiveService fleet,
    GpsIngestService ingest,
    IConfiguration config) : ControllerBase
{
    [HttpGet("live")]
    public async Task<IActionResult> Live([FromQuery] string? status, [FromQuery] int? staleMinutes) =>
        Ok(await fleet.GetLiveAsync(status));

    [HttpGet("fleet-summary")]
    public async Task<IActionResult> FleetSummary() =>
        Ok(await fleet.GetFleetSummaryAsync());

    [HttpGet("vehicles/{id}/history")]
    public async Task<IActionResult> History(
        string id, [FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] int? limit)
    {
        var result = await fleet.GetHistoryAsync(id, from, to, limit);
        return result == null ? NotFound() : Ok(result);
    }

    [HttpPost("ingest")]
    public async Task<IActionResult> Ingest([FromBody] IngestGpsBody body)
    {
        try
        {
            var result = await ingest.IngestAsync(new GpsIngestRequest(
                body.VehicleId, body.Lat, body.Lng, body.SpeedKmh, body.Heading,
                body.TripId, body.RecordedAt, body.AccuracyMeters, body.Source));
            return CreatedAtAction(nameof(History), new { id = body.VehicleId }, new
            {
                trackId = result.TrackId,
                vehicleId = result.VehicleId,
                geofenceEvents = result.GeofenceEvents,
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("simulate")]
    public async Task<IActionResult> Simulate([FromBody] IngestGpsBody body)
    {
        if (!config.GetValue("Gps:AllowSimulator", true))
            return Forbid();

        body = body with { Source = "SIMULATOR" };
        try
        {
            var result = await ingest.IngestAsync(new GpsIngestRequest(
                body.VehicleId, body.Lat, body.Lng, body.SpeedKmh, body.Heading,
                body.TripId, body.RecordedAt, body.AccuracyMeters, body.Source));
            return Ok(new { trackId = result.TrackId, vehicleId = result.VehicleId, geofenceEvents = result.GeofenceEvents });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    public record IngestGpsBody(
        string VehicleId, decimal Lat, decimal Lng, decimal? SpeedKmh, decimal? Heading,
        Guid? TripId, DateTime? RecordedAt, decimal? AccuracyMeters, string? Source);
}

[Authorize]
[ApiController]
[Route("api/geofences")]
public class GeofenceController(TmsDbContext db, ITenantContext tenants) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var rows = await tenants.Filter(db.Geofences.AsNoTracking())
            .Include(g => g.Assignments)
            .OrderBy(g => g.Name)
            .ToListAsync();
        return Ok(rows.Select(g => MapGeofence(g)));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var g = await db.Geofences.Include(x => x.Assignments).FirstOrDefaultAsync(x => x.Id == id);
        if (g == null || !TenantScope.CanAccessTenantEntity(tenants, g)) return NotFound();
        return Ok(MapGeofence(g, includeAssignments: true));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SaveGeofenceBody body)
    {
        var err = ValidateGeofenceBody(body);
        if (err != null) return BadRequest(new { message = err });

        var now = DateTime.UtcNow;
        var g = new Geofence
        {
            Id = Guid.NewGuid(),
            CompanyId = TenantScope.ResolveCompanyId(tenants),
            Name = body.Name.Trim(),
            Description = body.Description,
            ShapeType = body.ShapeType.ToUpperInvariant(),
            CenterLat = body.CenterLat,
            CenterLng = body.CenterLng,
            RadiusMeters = body.RadiusMeters,
            PolygonGeojson = body.PolygonGeojson != null ? JsonDocument.Parse(body.PolygonGeojson) : null,
            Color = body.Color ?? "#3B82F6",
            AlertOnEnter = body.AlertOnEnter,
            AlertOnExit = body.AlertOnExit,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Geofences.Add(g);
        try
        {
            await ApplyAssignmentsAsync(g, body.AppliesToAll, body.VehicleIds);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = g.Id }, MapGeofence(g, includeAssignments: true));
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] SaveGeofenceBody body)
    {
        var g = await db.Geofences.Include(x => x.Assignments).FirstOrDefaultAsync(x => x.Id == id);
        if (g == null || !TenantScope.CanAccessTenantEntity(tenants, g)) return NotFound();

        if (!string.IsNullOrWhiteSpace(body.Name)) g.Name = body.Name.Trim();
        g.Description = body.Description ?? g.Description;
        if (!string.IsNullOrWhiteSpace(body.ShapeType)) g.ShapeType = body.ShapeType.ToUpperInvariant();
        if (body.CenterLat != null) g.CenterLat = body.CenterLat;
        if (body.CenterLng != null) g.CenterLng = body.CenterLng;
        if (body.RadiusMeters != null) g.RadiusMeters = body.RadiusMeters;
        if (body.PolygonGeojson != null) g.PolygonGeojson = JsonDocument.Parse(body.PolygonGeojson);
        if (body.Color != null) g.Color = body.Color;
        g.AlertOnEnter = body.AlertOnEnter;
        g.AlertOnExit = body.AlertOnExit;
        if (body.IsActive != null) g.IsActive = body.IsActive.Value;
        g.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(MapGeofence(g, includeAssignments: true));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var g = await db.Geofences.FindAsync(id);
        if (g == null || !TenantScope.CanAccessTenantEntity(tenants, g)) return NotFound();
        g.IsActive = false;
        g.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("{id:guid}/assignments")]
    public async Task<IActionResult> SetAssignments(Guid id, [FromBody] AssignmentsBody body)
    {
        var g = await db.Geofences.Include(x => x.Assignments).FirstOrDefaultAsync(x => x.Id == id);
        if (g == null || !TenantScope.CanAccessTenantEntity(tenants, g)) return NotFound();
        db.GeofenceAssignments.RemoveRange(g.Assignments);
        g.Assignments.Clear();
        try
        {
            await ApplyAssignmentsAsync(g, body.AppliesToAll, body.VehicleIds);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        g.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(MapGeofence(g, includeAssignments: true));
    }

    [HttpGet("events")]
    public async Task<IActionResult> Events(
        [FromQuery] string? vehicleId, [FromQuery] Guid? geofenceId,
        [FromQuery] string? eventType, [FromQuery] bool? acknowledged,
        [FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] int limit = 50)
    {
        var q = TenantScope.GeofenceEvents(db, tenants).AsNoTracking()
            .Include(e => e.Geofence).Include(e => e.Vehicle).AsQueryable();
        if (!string.IsNullOrEmpty(vehicleId)) q = q.Where(e => e.VehicleId == vehicleId);
        if (geofenceId != null) q = q.Where(e => e.GeofenceId == geofenceId);
        if (!string.IsNullOrEmpty(eventType)) q = q.Where(e => e.EventType == eventType.ToUpperInvariant());
        if (acknowledged != null) q = q.Where(e => e.Acknowledged == acknowledged);
        if (from != null) q = q.Where(e => e.RecordedAt >= from);
        if (to != null) q = q.Where(e => e.RecordedAt <= to);

        var rows = await q.OrderByDescending(e => e.RecordedAt).Take(Math.Min(limit, 200)).ToListAsync();
        return Ok(rows.Select(e => new
        {
            e.Id, e.GeofenceId, geofenceName = e.Geofence?.Name,
            e.VehicleId, registrationNo = e.Vehicle?.Number,
            e.EventType, e.Lat, e.Lng, e.SpeedKmh, e.RecordedAt,
            e.Acknowledged, e.AcknowledgedBy, e.AcknowledgedAt,
        }));
    }

    [HttpPatch("events/{id:guid}/acknowledge")]
    public async Task<IActionResult> Acknowledge(Guid id)
    {
        var e = await db.GeofenceEvents.FindAsync(id);
        if (e == null) return NotFound();
        var inScope = await TenantScope.GeofenceEvents(db, tenants).AnyAsync(x => x.Id == id);
        if (!inScope) return NotFound();
        e.Acknowledged = true;
        e.AcknowledgedBy = User.Identity?.Name;
        e.AcknowledgedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(e);
    }

    static object MapGeofence(Geofence g, bool includeAssignments = false)
    {
        var appliesToAll = g.Assignments.Any(a => a.AppliesToAll);
        return new
        {
            g.Id, g.Name, g.Description,
            shapeType = g.ShapeType,
            centerLat = g.CenterLat, centerLng = g.CenterLng,
            radiusMeters = g.RadiusMeters,
            polygonGeojson = g.PolygonGeojson?.RootElement,
            g.Color, alertOnEnter = g.AlertOnEnter, alertOnExit = g.AlertOnExit,
            isActive = g.IsActive,
            appliesToAll,
            assignedVehicleCount = appliesToAll ? 0 : g.Assignments.Count(a => a.VehicleId != null),
            vehicleIds = includeAssignments
                ? g.Assignments.Where(a => a.VehicleId != null).Select(a => a.VehicleId).ToList()
                : null,
        };
    }

    async Task ApplyAssignmentsAsync(Geofence g, bool appliesToAll, List<string>? vehicleIds)
    {
        if (!appliesToAll && vehicleIds?.Count > 0)
        {
            if (!await TenantScope.ValidateVehicleIdsAsync(db, tenants, vehicleIds))
                throw new InvalidOperationException("One or more vehicles are not in your company.");
        }

        if (appliesToAll)
        {
            g.Assignments.Add(new GeofenceAssignment { Id = Guid.NewGuid(), GeofenceId = g.Id, AppliesToAll = true });
            return;
        }
        foreach (var vid in vehicleIds ?? [])
            g.Assignments.Add(new GeofenceAssignment { Id = Guid.NewGuid(), GeofenceId = g.Id, VehicleId = vid });
    }

    static string? ValidateGeofenceBody(SaveGeofenceBody body)
    {
        if (string.IsNullOrWhiteSpace(body.Name)) return "Name is required";
        var shape = body.ShapeType.ToUpperInvariant();
        if (shape == "CIRCLE")
        {
            if (body.CenterLat == null || body.CenterLng == null || body.RadiusMeters == null)
                return "Circle requires centerLat, centerLng, radiusMeters";
            if (body.RadiusMeters < 50 || body.RadiusMeters > 50000)
                return "radiusMeters must be between 50 and 50000";
        }
        else if (shape == "POLYGON")
        {
            if (string.IsNullOrWhiteSpace(body.PolygonGeojson)) return "Polygon requires polygonGeojson";
        }
        else return "shapeType must be CIRCLE or POLYGON";
        return null;
    }

    public record SaveGeofenceBody(
        string Name, string ShapeType, string? Description,
        decimal? CenterLat, decimal? CenterLng, int? RadiusMeters,
        string? PolygonGeojson, string? Color,
        bool AlertOnEnter, bool AlertOnExit,
        bool AppliesToAll, List<string>? VehicleIds, bool? IsActive);

    public record AssignmentsBody(bool AppliesToAll, List<string>? VehicleIds);
}
