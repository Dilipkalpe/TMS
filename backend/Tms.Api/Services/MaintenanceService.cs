using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public record ComponentAlertDto(string Component, string Severity, string Message, int? KmRemaining, DateOnly? DueDate);
public record MaintenancePredictionDto(
    string VehicleId,
    string RegistrationNo,
    int RiskScore,
    string RiskLevel,
    List<string> Factors,
    string? NextDue,
    List<ComponentAlertDto> ComponentAlerts,
    List<string> ComplianceAlerts,
    int? KmUntilNextService);

public record MaintenanceAnalyticsDto(
    decimal TotalCost90Days,
    IReadOnlyList<MonthlyCostDto> CostByMonth,
    IReadOnlyList<RiskBucketDto> RiskDistribution,
    IReadOnlyList<ComponentSummaryDto> ComponentSummary);

public record MonthlyCostDto(string Month, decimal Cost);
public record RiskBucketDto(string Level, int Count);
public record ComponentSummaryDto(string Component, int AlertCount, int HighSeverity);

public static class MaintenanceRecordHelpers
{
    public static DateTime PerformedAtUtc(MaintenanceRecord r) =>
        r.PerformedAt ?? DateTime.SpecifyKind(r.RecordDate.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
}

public class MaintenanceService(TmsDbContext db, ITenantContext tenants)
{
    static readonly (string Component, string[] Keywords, int OverdueScore, int DueSoonScore, int KmOverScore)[] ComponentRules =
    [
        ("Engine", ["engine", "oil", "filter", "coolant", "turbo"], 35, 18, 28),
        ("Tyre", ["tyre", "tire", "rotation", "alignment"], 30, 15, 25),
        ("Brake", ["brake", "pad", "liner"], 30, 15, 22),
        ("Transmission", ["transmission", "clutch", "gearbox"], 25, 12, 20),
        ("Electrical", ["battery", "alternator", "electrical"], 20, 10, 15),
    ];

    static string RiskLevel(int score) => score >= 50 ? "HIGH" : score >= 25 ? "MEDIUM" : "LOW";

    static bool IsInMaintenance(string? status) =>
        status != null && status.Equals("Maintenance", StringComparison.OrdinalIgnoreCase);

    static string? MatchComponent(string serviceType)
    {
        foreach (var rule in ComponentRules)
            if (rule.Keywords.Any(k => serviceType.Contains(k, StringComparison.OrdinalIgnoreCase)))
                return rule.Component;
        return null;
    }

    public async Task<List<MaintenancePredictionDto>> ComputePredictionsAsync(CancellationToken ct = default)
    {
        await SyncKmBasedSchedulesAsync(ct);

        var vehicles = await TenantScope.Vehicles(db, tenants)
            .AsNoTracking()
            .Include(v => v.MaintenanceSchedules.Where(s => s.IsActive))
            .ToListAsync(ct);

        var recentRecords = await TenantScope.MaintenanceRecords(db, tenants)
            .AsNoTracking()
            .OrderByDescending(r => r.RecordDate)
            .ToListAsync(ct);

        var recordsByVehicle = recentRecords
            .GroupBy(r => r.VehicleId)
            .ToDictionary(
                g => g.Key,
                g => g.OrderByDescending(MaintenanceRecordHelpers.PerformedAtUtc).Take(5).ToList());

        var suspiciousFuel = await TenantScope.FuelEntries(db, tenants)
            .Where(e => e.IsSuspicious && e.FilledAt >= DateTime.UtcNow.AddDays(-60))
            .GroupBy(e => e.VehicleId)
            .Select(g => g.Key)
            .ToListAsync(ct);
        var suspiciousSet = suspiciousFuel.ToHashSet();

        var expenseByVehicle = await tenants.Filter(db.Expenses.AsQueryable())
            .Where(e => e.Category == "Maintenance" && e.ExpenseDate >= DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-90)))
            .GroupBy(e => e.VehicleId)
            .Select(g => new { VehicleId = g.Key, Total = g.Sum(e => e.Amount) })
            .ToDictionaryAsync(x => x.VehicleId ?? "", x => x.Total, ct);

        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);
        var horizon = today.AddDays(30);
        var predictions = new List<MaintenancePredictionDto>();

        foreach (var v in vehicles)
        {
            var vehicleRecords = recordsByVehicle.GetValueOrDefault(v.Id, []);
            var score = 0;
            var factors = new List<string>();
            var componentAlerts = new List<ComponentAlertDto>();
            var complianceAlerts = new List<string>();
            int? minKmUntil = null;

            foreach (var sch in v.MaintenanceSchedules)
            {
                var component = MatchComponent(sch.ServiceType) ?? "General";
                var rule = ComponentRules.FirstOrDefault(r => r.Component == component);

                if (sch.NextDueAt.HasValue && sch.NextDueAt.Value < now)
                {
                    var pts = rule.Component != null ? rule.OverdueScore : 40;
                    score += pts;
                    factors.Add($"Overdue: {sch.ServiceType}");
                    componentAlerts.Add(new ComponentAlertDto(component, "HIGH", $"{sch.ServiceType} is overdue", null, DateOnly.FromDateTime(sch.NextDueAt.Value)));
                }
                else if (sch.NextDueAt.HasValue && (sch.NextDueAt.Value - now).TotalDays < 7)
                {
                    var pts = rule.Component != null ? rule.DueSoonScore : 20;
                    score += pts;
                    factors.Add($"Due soon: {sch.ServiceType}");
                    componentAlerts.Add(new ComponentAlertDto(component, "MEDIUM", $"{sch.ServiceType} due within 7 days", null, DateOnly.FromDateTime(sch.NextDueAt.Value)));
                }

                if (sch.IntervalKm.HasValue && sch.IntervalKm > 0 && v.Odometer > 0)
                {
                    var lastRecord = vehicleRecords.FirstOrDefault(m =>
                        (m.Description != null && m.Description.Contains(sch.ServiceType, StringComparison.OrdinalIgnoreCase)) ||
                        m.RecordType == "SCHEDULED");
                    var sinceKm = lastRecord?.Odometer != null ? v.Odometer - lastRecord.Odometer.Value : v.Odometer;
                    var remaining = sch.IntervalKm.Value - sinceKm;
                    if (remaining < minKmUntil || minKmUntil == null) minKmUntil = remaining;

                    if (sinceKm > sch.IntervalKm * 1.2)
                    {
                        var pts = rule.Component != null ? rule.KmOverScore : 30;
                        score += pts;
                        factors.Add($"{sch.ServiceType} exceeded km interval ({sinceKm} km since service)");
                        componentAlerts.Add(new ComponentAlertDto(component, "HIGH", $"{sch.ServiceType}: {sinceKm} km since last service (limit {sch.IntervalKm} km)", remaining, null));
                    }
                    else if (sinceKm > sch.IntervalKm * 0.9)
                    {
                        componentAlerts.Add(new ComponentAlertDto(component, "MEDIUM", $"{sch.ServiceType}: approaching km limit ({remaining} km left)", remaining, null));
                    }
                }
            }

            if (vehicleRecords.Any(m => m.RecordType == "BREAKDOWN"))
            {
                score += 25;
                factors.Add("Recent breakdown history");
                componentAlerts.Add(new ComponentAlertDto("Engine", "HIGH", "Recent breakdown recorded", null, null));
            }

            if (suspiciousSet.Contains(v.Id))
            {
                score += 15;
                factors.Add("Abnormal fuel consumption (60 days)");
                componentAlerts.Add(new ComponentAlertDto("Engine", "MEDIUM", "Suspicious fuel entries detected", null, null));
            }

            if (expenseByVehicle.TryGetValue(v.Id, out var maintCost) && maintCost > 50000)
            {
                score += 15;
                factors.Add("High maintenance spend (90 days)");
            }

            if (IsInMaintenance(v.Status))
            {
                score += 20;
                factors.Add("Currently in maintenance");
            }

            foreach (var (label, date) in ComplianceDates(v))
            {
                if (date == null) continue;
                if (date.Value < today)
                {
                    score += 20;
                    factors.Add($"{label} expired");
                    complianceAlerts.Add($"{label} expired on {date.Value:yyyy-MM-dd}");
                }
                else if (date.Value <= horizon)
                {
                    score += 10;
                    factors.Add($"{label} expiring soon");
                    complianceAlerts.Add($"{label} expires {date.Value:yyyy-MM-dd}");
                }
            }

            var nextDue = v.MaintenanceSchedules
                .Where(s => s.NextDueAt.HasValue)
                .Select(s => s.NextDueAt!.Value)
                .OrderBy(d => d)
                .FirstOrDefault();

            predictions.Add(new MaintenancePredictionDto(
                v.Id,
                v.Number,
                Math.Min(score, 100),
                RiskLevel(score),
                factors.Distinct().ToList(),
                nextDue == default ? null : nextDue.ToString("yyyy-MM-dd"),
                componentAlerts,
                complianceAlerts,
                minKmUntil));
        }

        return predictions.OrderByDescending(p => p.RiskScore).ToList();
    }

    static IEnumerable<(string Label, DateOnly? Date)> ComplianceDates(Vehicle v)
    {
        yield return ("Insurance", v.Insurance);
        yield return ("Fitness", v.Fitness);
        yield return ("Permit", v.Permit);
        yield return ("PUC", v.Puc);
    }

    public async Task SyncKmBasedSchedulesAsync(CancellationToken ct = default)
    {
        var schedules = await TenantScope.MaintenanceSchedules(db, tenants)
            .Include(s => s.Vehicle)
            .Where(s => s.IsActive && s.IntervalKm != null && s.IntervalKm > 0)
            .ToListAsync(ct);

        var changed = false;
        foreach (var sch in schedules)
        {
            if (sch.Vehicle == null || sch.Vehicle.Odometer <= 0) continue;

            var lastRecord = await TenantScope.MaintenanceRecords(db, tenants)
                .Where(r => r.VehicleId == sch.VehicleId &&
                    (r.Description != null && r.Description.Contains(sch.ServiceType) || r.RecordType == "SCHEDULED"))
                .OrderByDescending(r => r.RecordDate)
                .FirstOrDefaultAsync(ct);

            var sinceKm = lastRecord?.Odometer != null
                ? sch.Vehicle.Odometer - lastRecord.Odometer.Value
                : sch.Vehicle.Odometer;
            var remaining = sch.IntervalKm!.Value - sinceKm;
            if (remaining <= 0 && sch.NextDueAt?.Date > DateTime.UtcNow.Date)
            {
                sch.NextDueAt = DateTime.UtcNow;
                sch.UpdatedAt = DateTime.UtcNow;
                changed = true;
            }
        }

        if (changed) await db.SaveChangesAsync(ct);
    }

    public async Task SaveDailySnapshotsAsync(CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (await db.MaintenancePredictionSnapshots.AnyAsync(s => s.SnapshotDate == today, ct))
            return;

        var predictions = await ComputePredictionsAsync(ct);
        foreach (var p in predictions)
        {
            db.MaintenancePredictionSnapshots.Add(new MaintenancePredictionSnapshot
            {
                Id = Guid.NewGuid(),
                SnapshotDate = today,
                VehicleId = p.VehicleId,
                RiskScore = p.RiskScore,
                RiskLevel = p.RiskLevel,
                Factors = JsonSerializer.Serialize(p.Factors),
                CreatedAt = DateTime.UtcNow,
            });
        }
        await db.SaveChangesAsync(ct);
    }

    public async Task<MaintenanceAnalyticsDto> GetAnalyticsAsync(CancellationToken ct = default)
    {
        var since = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-6));
        var records = await TenantScope.MaintenanceRecords(db, tenants)
            .Where(r => r.RecordDate >= since)
            .ToListAsync(ct);

        var costByMonth = records
            .GroupBy(r => r.RecordDate.ToString("yyyy-MM"))
            .OrderBy(g => g.Key)
            .Select(g => new MonthlyCostDto(g.Key, g.Sum(r => r.Cost)))
            .ToList();

        var predictions = await ComputePredictionsAsync(ct);
        var riskDistribution = new[]
        {
            new RiskBucketDto("HIGH", predictions.Count(p => p.RiskLevel == "HIGH")),
            new RiskBucketDto("MEDIUM", predictions.Count(p => p.RiskLevel == "MEDIUM")),
            new RiskBucketDto("LOW", predictions.Count(p => p.RiskLevel == "LOW")),
        };

        var componentSummary = ComponentRules.Select(rule =>
        {
            var alerts = predictions.SelectMany(p => p.ComponentAlerts.Where(a => a.Component == rule.Component)).ToList();
            return new ComponentSummaryDto(rule.Component, alerts.Count, alerts.Count(a => a.Severity == "HIGH"));
        }).Where(c => c.AlertCount > 0).ToList();

        return new MaintenanceAnalyticsDto(
            records.Where(r => r.RecordDate >= DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-90))).Sum(r => r.Cost),
            costByMonth,
            riskDistribution,
            componentSummary);
    }

    public async Task<object?> GetVehicleProfileAsync(string vehicleId, CancellationToken ct = default)
    {
        var vehicle = await TenantScope.Vehicles(db, tenants).FirstOrDefaultAsync(v => v.Id == vehicleId, ct);
        if (vehicle == null) return null;

        var predictions = await ComputePredictionsAsync(ct);
        var prediction = predictions.FirstOrDefault(p => p.VehicleId == vehicleId);

        var schedules = await TenantScope.MaintenanceSchedules(db, tenants)
            .Where(s => s.VehicleId == vehicleId && s.IsActive)
            .OrderBy(s => s.NextDueAt)
            .ToListAsync(ct);

        var records = await TenantScope.MaintenanceRecords(db, tenants)
            .Where(r => r.VehicleId == vehicleId)
            .OrderByDescending(r => r.RecordDate)
            .Take(10)
            .ToListAsync(ct);

        var workOrders = await TenantScope.MaintenanceWorkOrders(db, tenants)
            .Where(w => w.VehicleId == vehicleId && w.Status != "COMPLETED" && w.Status != "CANCELLED")
            .OrderBy(w => w.DueAt)
            .ToListAsync(ct);

        return new
        {
            vehicle = new { vehicle.Id, registrationNo = vehicle.Number, vehicle.Odometer, vehicle.Status },
            prediction,
            schedules,
            records = records.Select(r => new
            {
                r.Id,
                type = r.RecordType,
                r.Description,
                r.Cost,
                r.Odometer,
                performedAt = MaintenanceRecordHelpers.PerformedAtUtc(r),
            }),
            workOrders,
        };
    }
}
