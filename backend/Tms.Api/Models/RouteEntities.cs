namespace Tms.Api.Models;

public class RouteOptimizationJob : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }    public Guid? TripId { get; set; }
    public Trip? Trip { get; set; }
    public string Status { get; set; } = "COMPLETED";
    public bool TrafficAware { get; set; } = true;
    public bool TollOptimized { get; set; } = true;
    public bool FuelOptimized { get; set; } = true;
    public decimal? OriginalDistanceKm { get; set; }
    public decimal? OptimizedDistanceKm { get; set; }
    public int? OriginalEtaMinutes { get; set; }
    public int? OptimizedEtaMinutes { get; set; }
    public decimal? TollCost { get; set; }
    public decimal? FuelCost { get; set; }
    public decimal? FuelLiters { get; set; }
    public decimal? SavingsPct { get; set; }
    public string? StopOrder { get; set; }
    public string? RoutePolyline { get; set; }
    public string Provider { get; set; } = "TMS_HEURISTIC";
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}
