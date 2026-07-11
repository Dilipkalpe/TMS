namespace Tms.Api.Models;

public class MaintenanceWorkOrder
{
    public Guid Id { get; set; }
    public string VehicleId { get; set; } = "";
    public Vehicle? Vehicle { get; set; }
    public Guid? ScheduleId { get; set; }
    public MaintenanceSchedule? Schedule { get; set; }
    public string Title { get; set; } = "";
    public string? Component { get; set; }
    public string Status { get; set; } = "OPEN";
    public string Priority { get; set; } = "NORMAL";
    public DateTime? DueAt { get; set; }
    public string? AssignedTo { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class MaintenancePredictionSnapshot
{
    public Guid Id { get; set; }
    public DateOnly SnapshotDate { get; set; }
    public string VehicleId { get; set; } = "";
    public Vehicle? Vehicle { get; set; }
    public int RiskScore { get; set; }
    public string RiskLevel { get; set; } = "LOW";
    public string? Factors { get; set; }
    public DateTime CreatedAt { get; set; }
}
