using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;
using Tms.Api.Services;

namespace Tms.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/maintenance")]
public class MaintenanceController(TmsDbContext db, MaintenanceService maintenance, NotificationDispatcher notifications, ITenantContext tenants, IBranchContext branches) : ControllerBase
{
    [HttpGet("overview")]
    public async Task<IActionResult> Overview()
    {
        await maintenance.SaveDailySnapshotsAsync();
        var predictions = await maintenance.ComputePredictionsAsync();
        var analytics = await maintenance.GetAnalyticsAsync();
        var lowStock = await tenants.Filter(db.SpareParts.AsNoTracking()).CountAsync(p => p.StockQty <= p.MinStock);
        var totalCost = await TenantScope.MaintenanceRecords(db, tenants).SumAsync(r => r.Cost);
        var inMaint = await TenantScope.Vehicles(db, tenants, branches).CountAsync(v => v.Status.ToLower() == "maintenance");
        var openWorkOrders = await TenantScope.MaintenanceWorkOrders(db, tenants).CountAsync(w => w.Status == "OPEN" || w.Status == "SCHEDULED");

        return Ok(new
        {
            activeSchedules = await TenantScope.MaintenanceSchedules(db, tenants).CountAsync(s => s.IsActive),
            totalRecords = await TenantScope.MaintenanceRecords(db, tenants).CountAsync(),
            vehiclesInMaintenance = inMaint,
            totalMaintenanceCost = totalCost,
            lowStockParts = lowStock,
            highRiskVehicles = predictions.Count(p => p.RiskLevel == "HIGH"),
            openWorkOrders,
            componentAlerts = predictions.Sum(p => p.ComponentAlerts.Count),
            cost90Days = analytics.TotalCost90Days,
            riskDistribution = analytics.RiskDistribution,
            componentSummary = analytics.ComponentSummary,
            predictions = predictions.Take(10),
        });
    }

    [HttpGet("predictions")]
    public async Task<IActionResult> Predictions() =>
        Ok(await maintenance.ComputePredictionsAsync());

    [HttpGet("analytics")]
    public async Task<IActionResult> Analytics() =>
        Ok(await maintenance.GetAnalyticsAsync());

    [HttpGet("vehicles/{vehicleId}")]
    public async Task<IActionResult> VehicleProfile(string vehicleId)
    {
        var profile = await maintenance.GetVehicleProfileAsync(vehicleId);
        return profile == null ? NotFound() : Ok(profile);
    }

    [HttpPost("vehicles/{vehicleId}/notify")]
    public async Task<IActionResult> NotifyVehicle(string vehicleId)
    {
        var predictions = await maintenance.ComputePredictionsAsync();
        var p = predictions.FirstOrDefault(x => x.VehicleId == vehicleId);
        if (p == null) return NotFound(new { message = "Vehicle not found" });

        if (p.RiskLevel == "HIGH")
        {
            await notifications.DispatchAsync(new DispatchNotificationRequest
            {
                EventCode = "MAINT_HIGH_RISK",
                Title = $"High maintenance risk: {p.RegistrationNo}",
                Variables = new Dictionary<string, string>
                {
                    ["vehicleNo"] = p.RegistrationNo,
                    ["riskScore"] = p.RiskScore.ToString(),
                    ["factors"] = string.Join("; ", p.Factors.Take(3)),
                },
            });
            return Ok(new { sent = true, type = "MAINT_HIGH_RISK" });
        }

        var due = await TenantScope.MaintenanceSchedules(db, tenants)
            .Where(s => s.VehicleId == vehicleId && s.IsActive && s.NextDueAt != null)
            .OrderBy(s => s.NextDueAt)
            .FirstOrDefaultAsync();
        if (due == null)
            return BadRequest(new { message = "No maintenance alert to send for this vehicle" });

        await notifications.DispatchAsync(new DispatchNotificationRequest
        {
            EventCode = "MAINT_DUE",
            Title = $"Service due: {p.RegistrationNo}",
            Variables = new Dictionary<string, string>
            {
                ["vehicleNo"] = p.RegistrationNo,
                ["serviceType"] = due.ServiceType,
                ["dueDate"] = due.NextDueAt?.ToLocalTime().ToString("dd MMM yyyy") ?? "soon",
            },
        });
        return Ok(new { sent = true, type = "MAINT_DUE" });
    }

    [HttpGet("alerts")]
    public async Task<IActionResult> Alerts()
    {
        var predictions = await maintenance.ComputePredictionsAsync();
        var horizon = DateTime.UtcNow.AddDays(30);
        var dueSchedules = await TenantScope.MaintenanceSchedules(db, tenants)
            .Include(s => s.Vehicle)
            .Where(s => s.IsActive && (s.NextDueAt == null || s.NextDueAt <= horizon))
            .OrderBy(s => s.NextDueAt)
            .ToListAsync();

        var parts = await tenants.Filter(db.SpareParts.AsNoTracking()).OrderBy(p => p.Name).Take(500).ToListAsync();
        var lowStock = parts.Where(p => p.StockQty <= p.MinStock).ToList();
        var now = DateTime.UtcNow;

        return Ok(new
        {
            maintenanceAlerts = dueSchedules.Select(s => new
            {
                type = "MAINTENANCE_DUE",
                vehicleId = s.VehicleId,
                registrationNo = s.Vehicle?.Number,
                serviceType = s.ServiceType,
                component = MatchComponentName(s.ServiceType),
                nextDueAt = s.NextDueAt,
                overdue = s.NextDueAt.HasValue && s.NextDueAt.Value < now,
            }),
            componentAlerts = predictions
                .SelectMany(p => p.ComponentAlerts.Select(a => new
                {
                    vehicleId = p.VehicleId,
                    registrationNo = p.RegistrationNo,
                    a.Component,
                    a.Severity,
                    a.Message,
                }))
                .Take(20),
            complianceAlerts = predictions
                .Where(p => p.ComplianceAlerts.Count > 0)
                .Select(p => new { p.VehicleId, p.RegistrationNo, alerts = p.ComplianceAlerts }),
            lowStockParts = lowStock,
        });
    }

    static string? MatchComponentName(string serviceType)
    {
        var lower = serviceType.ToLowerInvariant();
        if (lower.Contains("engine") || lower.Contains("oil")) return "Engine";
        if (lower.Contains("tyre") || lower.Contains("tire")) return "Tyre";
        if (lower.Contains("brake")) return "Brake";
        if (lower.Contains("transmission") || lower.Contains("clutch")) return "Transmission";
        return null;
    }

    [HttpGet("schedules")]
    public async Task<IActionResult> Schedules([FromQuery] int limit = 500)
    {
        await maintenance.SyncKmBasedSchedulesAsync();
        var take = Math.Min(Math.Max(limit, 1), 1000);
        var items = await TenantScope.MaintenanceSchedules(db, tenants)
            .Include(s => s.Vehicle)
            .OrderBy(s => s.NextDueAt)
            .Take(take)
            .Select(s => new
            {
                s.Id,
                s.VehicleId,
                s.ServiceType,
                component = MatchComponentName(s.ServiceType),
                s.IntervalKm,
                s.IntervalDays,
                s.LastServiceAt,
                s.NextDueAt,
                s.IsActive,
                vehicle = new
                {
                    registrationNo = s.Vehicle!.Number,
                    currentOdometer = s.Vehicle.Odometer,
                    status = s.Vehicle.Status,
                },
            })
            .ToListAsync();
        return Ok(items);
    }

    public record CreateScheduleRequest(
        string VehicleId,
        string ServiceType,
        int? IntervalKm,
        int? IntervalDays,
        DateTime? LastServiceAt);

    [HttpPost("schedules")]
    public async Task<IActionResult> CreateSchedule([FromBody] CreateScheduleRequest body)
    {
        if (string.IsNullOrWhiteSpace(body.VehicleId) || string.IsNullOrWhiteSpace(body.ServiceType))
            return BadRequest(new { message = "vehicleId and serviceType are required" });

        var vehicle = await TenantScope.FindVehicleAsync(db, tenants, branches, body.VehicleId);
        if (vehicle == null) return NotFound(new { message = "Vehicle not found" });

        var lastService = body.LastServiceAt ?? DateTime.UtcNow;
        DateTime? nextDue = body.IntervalDays.HasValue
            ? lastService.AddDays(body.IntervalDays.Value)
            : null;

        var schedule = new MaintenanceSchedule
        {
            Id = Guid.NewGuid(),
            VehicleId = body.VehicleId,
            ServiceType = body.ServiceType.Trim(),
            IntervalKm = body.IntervalKm,
            IntervalDays = body.IntervalDays,
            LastServiceAt = lastService,
            NextDueAt = nextDue,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.MaintenanceSchedules.Add(schedule);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(Schedules), new
        {
            schedule.Id,
            schedule.VehicleId,
            schedule.ServiceType,
            schedule.IntervalKm,
            schedule.IntervalDays,
            schedule.LastServiceAt,
            schedule.NextDueAt,
            schedule.IsActive,
            vehicle = new { registrationNo = vehicle.Number },
        });
    }

    [HttpGet("records")]
    public async Task<IActionResult> Records()
    {
        var rows = await TenantScope.MaintenanceRecords(db, tenants)
            .Include(r => r.Vehicle)
            .OrderByDescending(r => r.RecordDate)
            .Take(100)
            .ToListAsync();

        var items = rows.Select(r => new
        {
            r.Id,
            type = r.RecordType,
            description = r.Description ?? r.Type,
            r.Cost,
            r.Odometer,
            performedAt = MaintenanceRecordHelpers.PerformedAtUtc(r),
            vehicle = new { registrationNo = r.Vehicle!.Number },
        });
        return Ok(items);
    }

    public record CreateRecordRequest(
        string VehicleId,
        string Type,
        string Description,
        decimal Cost,
        int? Odometer,
        DateTime? PerformedAt,
        string? Vendor);

    [HttpPost("records")]
    public async Task<IActionResult> CreateRecord([FromBody] CreateRecordRequest body)
    {
        if (string.IsNullOrWhiteSpace(body.VehicleId) || string.IsNullOrWhiteSpace(body.Description))
            return BadRequest(new { message = "vehicleId and description are required" });

        var vehicle = await TenantScope.FindVehicleAsync(db, tenants, branches, body.VehicleId);
        if (vehicle == null) return NotFound(new { message = "Vehicle not found" });

        var performed = body.PerformedAt ?? DateTime.UtcNow;
        var recordType = string.IsNullOrWhiteSpace(body.Type) ? "SCHEDULED" : body.Type.ToUpperInvariant();

        var record = new MaintenanceRecord
        {
            Id = Guid.NewGuid(),
            VehicleId = body.VehicleId,
            RecordDate = DateOnly.FromDateTime(performed),
            Type = body.Description,
            RecordType = recordType,
            Description = body.Description,
            Cost = body.Cost,
            Odometer = body.Odometer,
            PerformedAt = performed,
            Vendor = body.Vendor,
            CreatedAt = DateTime.UtcNow,
        };
        db.MaintenanceRecords.Add(record);

        vehicle.LastMaintenance = DateOnly.FromDateTime(performed);
        if (body.Odometer.HasValue)
            vehicle.Odometer = body.Odometer.Value;
        if (recordType == "BREAKDOWN")
            vehicle.Status = "Maintenance";
        vehicle.UpdatedAt = DateTime.UtcNow;

        var schedules = await TenantScope.MaintenanceSchedules(db, tenants)
            .Where(s => s.VehicleId == body.VehicleId && s.IsActive)
            .ToListAsync();
        foreach (var sch in schedules.Where(s =>
            body.Description.Contains(s.ServiceType, StringComparison.OrdinalIgnoreCase)))
        {
            sch.LastServiceAt = performed;
            if (sch.IntervalDays.HasValue)
                sch.NextDueAt = performed.AddDays(sch.IntervalDays.Value);
            sch.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(Records), new
        {
            record.Id,
            type = record.RecordType,
            record.Description,
            record.Cost,
            record.Odometer,
            performedAt = record.PerformedAt,
            vehicle = new { registrationNo = vehicle.Number },
        });
    }

    [HttpGet("work-orders")]
    public async Task<IActionResult> WorkOrders([FromQuery] string? status)
    {
        var q = TenantScope.MaintenanceWorkOrders(db, tenants).Include(w => w.Vehicle).AsQueryable();
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(w => w.Status == status.ToUpperInvariant());
        var rows = await q.OrderByDescending(w => w.CreatedAt).Take(100).ToListAsync();
        return Ok(rows.Select(w => new
        {
            w.Id,
            w.VehicleId,
            registrationNo = w.Vehicle?.Number,
            w.Title,
            w.Component,
            w.Status,
            w.Priority,
            w.DueAt,
            w.AssignedTo,
            w.Notes,
            w.CreatedAt,
            w.CompletedAt,
        }));
    }

    public record CreateWorkOrderRequest(
        string VehicleId,
        string Title,
        string? Component,
        string? Priority,
        DateTime? DueAt,
        string? AssignedTo,
        string? Notes,
        Guid? ScheduleId);

    [HttpPost("work-orders")]
    public async Task<IActionResult> CreateWorkOrder([FromBody] CreateWorkOrderRequest body)
    {
        if (string.IsNullOrWhiteSpace(body.VehicleId) || string.IsNullOrWhiteSpace(body.Title))
            return BadRequest(new { message = "vehicleId and title are required" });

        var vehicle = await TenantScope.FindVehicleAsync(db, tenants, branches, body.VehicleId);
        if (vehicle == null) return NotFound();

        var wo = new MaintenanceWorkOrder
        {
            Id = Guid.NewGuid(),
            VehicleId = body.VehicleId,
            ScheduleId = body.ScheduleId,
            Title = body.Title.Trim(),
            Component = body.Component,
            Status = "OPEN",
            Priority = string.IsNullOrWhiteSpace(body.Priority) ? "NORMAL" : body.Priority.ToUpperInvariant(),
            DueAt = body.DueAt,
            AssignedTo = body.AssignedTo,
            Notes = body.Notes,
            CreatedAt = DateTime.UtcNow,
        };
        db.MaintenanceWorkOrders.Add(wo);
        await db.SaveChangesAsync();
        return Ok(wo);
    }

    public record UpdateWorkOrderStatusRequest(string Status);

    [HttpPatch("work-orders/{id:guid}/status")]
    public async Task<IActionResult> UpdateWorkOrderStatus(Guid id, [FromBody] UpdateWorkOrderStatusRequest body)
    {
        var wo = await db.MaintenanceWorkOrders.FindAsync(id);
        if (wo == null) return NotFound();
        var inScope = await TenantScope.MaintenanceWorkOrders(db, tenants).AnyAsync(w => w.Id == id);
        if (!inScope) return NotFound();
        wo.Status = body.Status.ToUpperInvariant();
        if (wo.Status is "COMPLETED" or "CANCELLED") wo.CompletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(wo);
    }

    [HttpGet("spare-parts")]
    public async Task<IActionResult> SpareParts()
    {
        var items = await tenants.Filter(db.SpareParts.AsNoTracking()).OrderBy(p => p.Name).Take(500).ToListAsync();
        return Ok(items);
    }

    public record UpsertSparePartRequest(string Sku, string Name, decimal UnitCost, int StockQty, int MinStock);

    [HttpPost("spare-parts")]
    public async Task<IActionResult> UpsertSparePart([FromBody] UpsertSparePartRequest body)
    {
        if (string.IsNullOrWhiteSpace(body.Sku) || string.IsNullOrWhiteSpace(body.Name))
            return BadRequest(new { message = "sku and name are required" });

        var companyId = TenantScope.ResolveCompanyId(tenants);
        var existing = await tenants.Filter(db.SpareParts.AsQueryable())
            .FirstOrDefaultAsync(p => p.Sku == body.Sku);
        if (existing != null)
        {
            if (!TenantScope.CanAccessTenantEntity(tenants, existing)) return NotFound();
            existing.Name = body.Name;
            existing.UnitCost = body.UnitCost;
            existing.StockQty = body.StockQty;
            existing.MinStock = body.MinStock;
            existing.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Ok(existing);
        }

        var part = new SparePart
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            Sku = body.Sku.Trim(),
            Name = body.Name.Trim(),
            UnitCost = body.UnitCost,
            StockQty = body.StockQty,
            MinStock = body.MinStock,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.SpareParts.Add(part);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(SpareParts), part);
    }

    public record UpdateStockRequest(int StockQty);

    [HttpPatch("spare-parts/{id:guid}/stock")]
    public async Task<IActionResult> UpdateStock(Guid id, [FromBody] UpdateStockRequest body)
    {
        var part = await tenants.Filter(db.SpareParts.AsQueryable()).FirstOrDefaultAsync(p => p.Id == id);
        if (part == null) return NotFound(new { message = "Part not found" });
        part.StockQty = body.StockQty;
        part.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(part);
    }
}
