using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public record RouteWaypointDto(string Label, double Lat, double Lng, Guid? StopId = null, int? OriginalSequence = null);

public record RouteOptimizeOptions(
    bool TrafficAware = true,
    bool TollOptimized = true,
    bool FuelOptimized = true,
    bool AvoidTolls = false);

public record RouteOptimizeResultDto(
    Guid JobId,
    Guid? TripId,
    string Provider,
    double OriginalDistanceKm,
    double OptimizedDistanceKm,
    int OriginalEtaMinutes,
    int OptimizedEtaMinutes,
    decimal TollCost,
    decimal FuelCost,
    decimal FuelLiters,
    decimal SavingsPct,
    IReadOnlyList<RouteWaypointDto> OptimizedWaypoints,
    IReadOnlyList<RouteWaypointDto> OriginalWaypoints,
    string RoutePolyline,
    string? Notes);

public class RouteOptimizationService(TmsDbContext db, IConfiguration config, IHttpClientFactory httpClientFactory)
{
    public async Task<RouteOptimizeResultDto> OptimizeTripAsync(Guid tripId, RouteOptimizeOptions options, CancellationToken ct = default)
    {
        var trip = await db.Trips.Include(t => t.Stops).FirstOrDefaultAsync(t => t.Id == tripId, ct)
            ?? throw new InvalidOperationException("Trip not found");

        var waypoints = BuildWaypoints(trip.Origin, trip.Destination, trip.Stops.OrderBy(s => s.SequenceNo).ToList());
        var result = await OptimizeWaypointsAsync(tripId, waypoints, options, ct);

        var job = await SaveJobAsync(tripId, result, options, ct);
        return result with { JobId = job.Id };
    }

    public async Task<RouteOptimizeResultDto> OptimizeAdHocAsync(
        string origin,
        string destination,
        IReadOnlyList<(string Address, decimal? Lat, decimal? Lng)> stops,
        RouteOptimizeOptions options,
        CancellationToken ct = default)
    {
        var stopEntities = stops.Select((s, i) => new TripStop
        {
            SequenceNo = i + 1,
            Address = s.Address,
            Latitude = s.Lat,
            Longitude = s.Lng,
        }).ToList();

        var waypoints = BuildWaypoints(origin, destination, stopEntities);
        var result = await OptimizeWaypointsAsync(null, waypoints, options, ct);
        var job = await SaveJobAsync(null, result, options, ct);
        return result with { JobId = job.Id };
    }

    List<RouteWaypointDto> BuildWaypoints(string origin, string destination, IReadOnlyList<TripStop> stops)
    {
        var list = new List<RouteWaypointDto>();
        var originPt = RouteGeocoding.Resolve(origin, null, null)
            ?? throw new InvalidOperationException($"Could not geocode origin: {origin}");
        list.Add(new RouteWaypointDto(origin, originPt.Lat, originPt.Lng));

        foreach (var s in stops)
        {
            var pt = RouteGeocoding.Resolve(s.Address, s.Latitude, s.Longitude)
                ?? throw new InvalidOperationException($"Could not geocode stop: {s.Address}");
            list.Add(new RouteWaypointDto(s.Address, pt.Lat, pt.Lng, s.Id, s.SequenceNo));
        }

        var destPt = RouteGeocoding.Resolve(destination, null, null)
            ?? throw new InvalidOperationException($"Could not geocode destination: {destination}");
        if (list.Count == 0 || list[^1].Label != destination)
            list.Add(new RouteWaypointDto(destination, destPt.Lat, destPt.Lng));

        return list;
    }

    async Task<RouteOptimizeResultDto> OptimizeWaypointsAsync(
        Guid? tripId,
        List<RouteWaypointDto> waypoints,
        RouteOptimizeOptions options,
        CancellationToken ct)
    {
        var coords = waypoints.Select(w => (w.Lat, w.Lng)).ToList();
        var originalOrder = Enumerable.Range(0, coords.Count).ToList();
        var originalDist = RouteMath.RouteDistanceKm(coords);

        var middleCount = Math.Max(0, coords.Count - 2);
        List<int> optimizedOrder;
        if (middleCount <= 1)
        {
            optimizedOrder = originalOrder;
        }
        else
        {
            var middleIndices = Enumerable.Range(1, middleCount).ToList();
            var middleCoords = middleIndices.Select(i => coords[i]).ToList();
            var nn = RouteMath.NearestNeighborOrder(middleCoords, 0);
            var improved = RouteMath.TwoOptImprove(middleCoords, nn);
            optimizedOrder = [0, .. improved.Select(i => middleIndices[i]), coords.Count - 1];
        }

        var optimizedCoords = optimizedOrder.Select(i => coords[i]).ToList();
        var optimizedDist = RouteMath.RouteDistanceKm(optimizedCoords);

        var trafficFactor = options.TrafficAware ? config.GetValue("Routing:TrafficFactor", 1.15) : 1.0;
        var avgSpeed = config.GetValue("Routing:AvgSpeedKmh", 52);
        var originalEta = (int)Math.Ceiling(originalDist / avgSpeed * 60 * trafficFactor);
        var optimizedEta = (int)Math.Ceiling(optimizedDist / avgSpeed * 60 * trafficFactor);

        var tollPerKm = options.TollOptimized && !options.AvoidTolls
            ? config.GetValue("Routing:TollPerKm", 2.8m)
            : 0m;
        var tollCost = (decimal)Math.Round(optimizedDist * (double)tollPerKm, 0);

        var kmpl = config.GetValue("Routing:AvgKmpl", 4.5m);
        var fuelPrice = config.GetValue("Routing:FuelPricePerLiter", 95m);
        var fuelLiters = options.FuelOptimized
            ? Math.Round((decimal)(optimizedDist / (double)kmpl), 1)
            : Math.Round((decimal)(optimizedDist / 6.0), 1);
        var fuelCost = Math.Round(fuelLiters * fuelPrice, 0);

        var savings = originalDist > 0
            ? Math.Round((decimal)((originalDist - optimizedDist) / originalDist * 100), 1)
            : 0m;
        if (savings < 0) savings = 0;

        var provider = "TMS_HEURISTIC";
        var polylinePoints = optimizedCoords;

        if (config.GetValue("Routing:UseOsrm", false))
        {
            var osrm = await TryOsrmRouteAsync(optimizedCoords, ct);
            if (osrm is { } route)
            {
                optimizedDist = route.DistanceKm;
                optimizedEta = (int)Math.Ceiling(route.DurationMinutes * trafficFactor);
                polylinePoints = route.Points;
                provider = "OSRM";
            }
        }

        var polylineJson = JsonSerializer.Serialize(polylinePoints.Select(p => new { lat = p.Lat, lng = p.Lng }));

        return new RouteOptimizeResultDto(
            Guid.Empty,
            tripId,
            provider,
            Math.Round(originalDist, 1),
            Math.Round(optimizedDist, 1),
            originalEta,
            optimizedEta,
            tollCost,
            fuelCost,
            fuelLiters,
            savings,
            optimizedOrder.Select(i => waypoints[i]).ToList(),
            originalOrder.Select(i => waypoints[i]).ToList(),
            polylineJson,
            middleCount > 1 ? $"Re-sequenced {middleCount} delivery stop(s)" : "Direct route");
    }

    async Task<(double DistanceKm, double DurationMinutes, List<(double Lat, double Lng)> Points)?> TryOsrmRouteAsync(
        IReadOnlyList<(double Lat, double Lng)> coords,
        CancellationToken ct)
    {
        if (coords.Count < 2) return null;
        try
        {
            var coordStr = string.Join(";", coords.Select(c => $"{c.Lng:F6},{c.Lat:F6}"));
            var url = $"https://router.project-osrm.org/route/v1/driving/{coordStr}?overview=full&geometries=geojson";
            var client = httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(15);
            var json = await client.GetStringAsync(url, ct);
            using var doc = JsonDocument.Parse(json);
            var routes = doc.RootElement.GetProperty("routes");
            if (routes.GetArrayLength() == 0) return null;
            var route = routes[0];
            var distanceKm = route.GetProperty("distance").GetDouble() / 1000;
            var durationMin = route.GetProperty("duration").GetDouble() / 60;
            var points = new List<(double Lat, double Lng)>();
            foreach (var pt in route.GetProperty("geometry").GetProperty("coordinates").EnumerateArray())
            {
                points.Add((pt[1].GetDouble(), pt[0].GetDouble()));
            }
            return (distanceKm, durationMin, points);
        }
        catch
        {
            return null;
        }
    }

    async Task<RouteOptimizationJob> SaveJobAsync(Guid? tripId, RouteOptimizeResultDto result, RouteOptimizeOptions options, CancellationToken ct)
    {
        var job = new RouteOptimizationJob
        {
            Id = Guid.NewGuid(),
            CompanyId = tripId != null
                ? (await db.Trips.FindAsync([tripId], ct))?.CompanyId ?? TenantContext.DefaultCompanyId
                : TenantContext.DefaultCompanyId,
            TripId = tripId,
            Status = "COMPLETED",
            TrafficAware = options.TrafficAware,
            TollOptimized = options.TollOptimized,
            FuelOptimized = options.FuelOptimized,
            OriginalDistanceKm = (decimal)result.OriginalDistanceKm,
            OptimizedDistanceKm = (decimal)result.OptimizedDistanceKm,
            OriginalEtaMinutes = result.OriginalEtaMinutes,
            OptimizedEtaMinutes = result.OptimizedEtaMinutes,
            TollCost = result.TollCost,
            FuelCost = result.FuelCost,
            FuelLiters = result.FuelLiters,
            SavingsPct = result.SavingsPct,
            StopOrder = JsonSerializer.Serialize(result.OptimizedWaypoints.Select(w => new { w.Label, w.Lat, w.Lng, w.StopId, w.OriginalSequence })),
            RoutePolyline = result.RoutePolyline,
            Provider = result.Provider,
            Notes = result.Notes,
            CreatedAt = DateTime.UtcNow,
            CompletedAt = DateTime.UtcNow,
        };
        db.RouteOptimizationJobs.Add(job);
        await db.SaveChangesAsync(ct);
        return job;
    }

    public async Task ApplyToTripAsync(Guid jobId, CancellationToken ct = default)
    {
        var job = await db.RouteOptimizationJobs.Include(j => j.Trip).ThenInclude(t => t!.Stops)
            .FirstOrDefaultAsync(j => j.Id == jobId, ct)
            ?? throw new InvalidOperationException("Optimization job not found");

        if (job.Trip == null) throw new InvalidOperationException("Job is not linked to a trip");

        var optimized = JsonSerializer.Deserialize<List<OptimizedStopRef>>(job.StopOrder ?? "[]") ?? [];
        var stopWaypoints = optimized.Where(w => w.StopId != null).ToList();

        var seq = 1;
        foreach (var wp in stopWaypoints)
        {
            var stop = job.Trip.Stops.FirstOrDefault(s => s.Id == wp.StopId);
            if (stop == null) continue;
            stop.SequenceNo = seq++;
        }

        job.Trip.DistanceKm = job.OptimizedDistanceKm;
        job.Trip.TollCost = job.TollCost ?? 0;
        job.Trip.RoutePolyline = job.RoutePolyline;
        job.Trip.AiOptimized = true;
        job.Trip.EstimatedFuelL = job.FuelLiters;
        job.Trip.EtaMinutes = job.OptimizedEtaMinutes;
        job.Trip.OptimizationSavingsPct = job.SavingsPct;
        job.Trip.UpdatedAt = DateTime.UtcNow;

        if (job.Trip.PlannedStart.HasValue && job.OptimizedEtaMinutes.HasValue)
            job.Trip.PlannedEnd = job.Trip.PlannedStart.Value.AddMinutes(job.OptimizedEtaMinutes.Value);

        await db.SaveChangesAsync(ct);
    }

    record OptimizedStopRef(string Label, double Lat, double Lng, Guid? StopId, int? OriginalSequence);
}
