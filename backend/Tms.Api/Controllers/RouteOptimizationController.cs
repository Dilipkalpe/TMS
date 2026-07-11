using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Services;

namespace Tms.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/routing")]
public class RouteOptimizationController(TmsDbContext db, RouteOptimizationService routing, ITenantContext tenants, IBranchContext branches) : ControllerBase
{
    public record OptimizeTripRequest(bool TrafficAware = true, bool TollOptimized = true, bool FuelOptimized = true, bool AvoidTolls = false);
    public record OptimizeAdHocRequest(
        string Origin,
        string Destination,
        List<AdHocStop>? Stops,
        bool TrafficAware = true,
        bool TollOptimized = true,
        bool FuelOptimized = true,
        bool AvoidTolls = false);
    public record AdHocStop(string Address, decimal? Latitude, decimal? Longitude);

    [HttpPost("trips/{tripId:guid}/optimize")]
    public async Task<IActionResult> OptimizeTrip(Guid tripId, [FromBody] OptimizeTripRequest? body)
    {
        var trip = await TenantScope.Trips(db, tenants, branches).FirstOrDefaultAsync(t => t.Id == tripId);
        if (trip == null) return NotFound();

        try
        {
            var options = new RouteOptimizeOptions(
                body?.TrafficAware ?? true,
                body?.TollOptimized ?? true,
                body?.FuelOptimized ?? true,
                body?.AvoidTolls ?? false);
            var result = await routing.OptimizeTripAsync(tripId, options);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("optimize")]
    public async Task<IActionResult> OptimizeAdHoc([FromBody] OptimizeAdHocRequest body)
    {
        if (string.IsNullOrWhiteSpace(body.Origin) || string.IsNullOrWhiteSpace(body.Destination))
            return BadRequest(new { message = "Origin and destination required" });

        try
        {
            var stops = (body.Stops ?? []).Select(s => (s.Address, s.Latitude, s.Longitude)).ToList();
            var options = new RouteOptimizeOptions(body.TrafficAware, body.TollOptimized, body.FuelOptimized, body.AvoidTolls);
            var result = await routing.OptimizeAdHocAsync(body.Origin, body.Destination, stops, options);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("jobs/{jobId:guid}/apply")]
    public async Task<IActionResult> ApplyJob(Guid jobId)
    {
        var inScope = await TenantScope.RouteOptimizationJobs(db, tenants).AnyAsync(j => j.Id == jobId);
        if (!inScope) return NotFound();

        try
        {
            await routing.ApplyToTripAsync(jobId);
            return Ok(new { applied = true, jobId });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("jobs")]
    public async Task<IActionResult> Jobs([FromQuery] int limit = 30)
    {
        var rows = await TenantScope.RouteOptimizationJobs(db, tenants).AsNoTracking()
            .Include(j => j.Trip)
            .OrderByDescending(j => j.CreatedAt)
            .Take(Math.Min(limit, 100))
            .ToListAsync();

        return Ok(rows.Select(j => new
        {
            j.Id,
            j.TripId,
            tripCode = j.Trip?.TripCode,
            j.Status,
            j.OriginalDistanceKm,
            j.OptimizedDistanceKm,
            j.OriginalEtaMinutes,
            j.OptimizedEtaMinutes,
            j.TollCost,
            j.FuelCost,
            j.FuelLiters,
            j.SavingsPct,
            j.Provider,
            j.Notes,
            j.CreatedAt,
        }));
    }

    [HttpGet("jobs/{jobId:guid}")]
    public async Task<IActionResult> JobDetail(Guid jobId)
    {
        var j = await TenantScope.RouteOptimizationJobs(db, tenants).AsNoTracking()
            .Include(x => x.Trip).FirstOrDefaultAsync(x => x.Id == jobId);
        return j == null ? NotFound() : Ok(j);
    }

    [HttpGet("trips/{tripId:guid}")]
    public async Task<IActionResult> TripRoute(Guid tripId)
    {
        var trip = await TenantScope.Trips(db, tenants, branches).AsNoTracking()
            .Include(t => t.Stops).Include(t => t.Vehicle).Include(t => t.Driver)
            .FirstOrDefaultAsync(t => t.Id == tripId);
        if (trip == null) return NotFound();

        var lastJob = await TenantScope.RouteOptimizationJobs(db, tenants).AsNoTracking()
            .Where(j => j.TripId == tripId)
            .OrderByDescending(j => j.CreatedAt)
            .FirstOrDefaultAsync();

        return Ok(new
        {
            trip = new
            {
                trip.Id,
                trip.TripCode,
                trip.Origin,
                trip.Destination,
                trip.Status,
                trip.DistanceKm,
                trip.TollCost,
                trip.EtaMinutes,
                trip.EstimatedFuelL,
                trip.AiOptimized,
                trip.OptimizationSavingsPct,
                trip.RoutePolyline,
                vehicle = trip.Vehicle == null ? null : new { trip.Vehicle.Number },
                driver = trip.Driver == null ? null : new { trip.Driver.Name },
                stops = trip.Stops.OrderBy(s => s.SequenceNo).Select(s => new
                {
                    s.Id,
                    s.SequenceNo,
                    s.Address,
                    s.Latitude,
                    s.Longitude,
                    s.Status,
                }),
            },
            lastOptimization = lastJob,
        });
    }
}
