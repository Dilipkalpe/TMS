using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tms.Api.Data;
using Tms.Api.DTOs;
using Tms.Api.Services;

namespace Tms.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class DashboardController(
    TmsDbContext db,
    MaintenanceService maintenance,
    IBranchContext branches,
    ITenantContext tenants,
    TenantCacheService cache,
    DashboardReadService dashboardRead,
    DocumentFlowService documentFlow,
    DashboardOverviewService overviewService,
    DashboardHomeService homeService) : ControllerBase
{
    Guid CompanyId => TenantScope.ResolveCompanyId(tenants);
    Guid? BranchId => branches.EffectiveBranchId;
    static readonly TimeSpan DashboardCacheTtl = TimeSpan.FromSeconds(120);

    [HttpGet("overview")]
    public async Task<ActionResult<DashboardOverviewDto>> Overview(CancellationToken ct)
    {
        var key = TenantCacheService.DashboardKey("overview", CompanyId, BranchId);
        var data = await cache.GetOrCreateAsync(key, () => overviewService.BuildAsync(ct), DashboardCacheTtl);
        return Ok(data);
    }

    [HttpGet("home")]
    public async Task<ActionResult<DashboardHomeDto>> Home(
        [FromQuery] DateOnly? dateFrom,
        [FromQuery] DateOnly? dateTo,
        [FromQuery] bool allTime = false,
        CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        // Default to last 30 days — full-history scans block the UI for large tenants.
        DateOnly from = dateFrom ?? today.AddDays(-29);
        DateOnly to = dateTo ?? today;

        if (allTime && !dateFrom.HasValue && !dateTo.HasValue)
        {
            // Resolve earliest LR inside the cache factory so cold scans are not repeated every request.
            var keyAll = TenantCacheService.DashboardKey("home-all", CompanyId, BranchId);
            try
            {
                var allData = await cache.GetOrCreateAsync(keyAll, async () =>
                {
                    var minLrDate = await TenantScope.LorryReceipts(db, tenants, branches)
                        .MinAsync(l => (DateOnly?)l.LrDate, ct);
                    var rangeFrom = minLrDate ?? today.AddYears(-1);
                    return await homeService.BuildAsync(rangeFrom, today, ct);
                }, DashboardCacheTtl);
                return Ok(allData);
            }
            catch (Exception ex)
            {
                var message = ex.InnerException?.Message ?? ex.Message;
                return StatusCode(500, new ApiError($"Dashboard load failed: {message}"));
            }
        }

        if (from > to)
            return BadRequest(new ApiError("dateFrom must be on or before dateTo."));

        try
        {
            var key = TenantCacheService.DashboardKey("home", CompanyId, BranchId, from, to);
            var data = await cache.GetOrCreateAsync(key, () => homeService.BuildAsync(from, to, ct), DashboardCacheTtl);
            return Ok(data);
        }
        catch (Exception ex)
        {
            var message = ex.InnerException?.Message ?? ex.Message;
            return StatusCode(500, new ApiError($"Dashboard load failed: {message}"));
        }
    }

    [HttpGet("stats")]
    public async Task<ActionResult<DashboardStatsDto>> Stats()
    {
        var key = TenantCacheService.DashboardKey("stats", CompanyId, BranchId);
        var stats = await cache.GetOrCreateAsync(key, LoadStatsAsync, DashboardCacheTtl);
        return Ok(stats);
    }

    async Task<DashboardStatsDto> LoadStatsAsync()
    {
        var (pendingDocuments, _, _) = await documentFlow.GetPendingDocumentCountAsync();
        var outstanding = await tenants.Filter(branches.Filter(db.Bookings.AsNoTracking()))
            .Where(b => b.Balance > 0 && b.Status != "Cancelled")
            .SumAsync(b => (decimal?)b.Balance) ?? 0;
        var pendingDelivery = await tenants.Filter(branches.Filter(db.Bookings.AsNoTracking()))
            .CountAsync(b => b.Status != "Delivered" && b.Status != "Cancelled");

        var spStats = await dashboardRead.TryGetStatsAsync(CompanyId, BranchId);
        if (spStats != null)
        {
            return spStats with
            {
                PendingLr = pendingDocuments,
                OutstandingAmount = outstanding,
                PendingDelivery = pendingDelivery,
            };
        }

        return await LoadStatsViaEfAsync(pendingDocuments, outstanding, pendingDelivery);
    }

    async Task<DashboardStatsDto> LoadStatsViaEfAsync(int pendingDocuments, decimal outstanding, int pendingDelivery)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var bookings = tenants.Filter(branches.Filter(db.Bookings.AsNoTracking()));
        var vehicles = tenants.Filter(branches.Filter(db.Vehicles.AsNoTracking()));
        var drivers = tenants.Filter(branches.Filter(db.Drivers.AsNoTracking()));

        var totalIncome = await bookings.SumAsync(b => b.Freight);
        var totalExpenses = await DashboardMetricsService.TotalExpensesAsync(db, tenants, branches);

        return new DashboardStatsDto(
            await vehicles.CountAsync(),
            await drivers.CountAsync(),
            await tenants.Filter(branches.Filter(db.Customers.AsNoTracking())).CountAsync(),
            await bookings.CountAsync(),
            pendingDocuments,
            await bookings.CountAsync(b => b.BookingDate == today),
            totalIncome,
            totalExpenses,
            totalIncome - totalExpenses,
            await AccountingBalanceService.GetCashBalanceAsync(db, tenants),
            await AccountingBalanceService.GetBankBalanceAsync(db, tenants),
            outstanding,
            pendingDelivery);
    }

    [HttpGet("recent-bookings")]
    public async Task<ActionResult<IEnumerable<RecentBookingDto>>> RecentBookings()
    {
        var list = await tenants.Filter(branches.Filter(db.Bookings.AsQueryable())).OrderByDescending(b => b.BookingDate).Take(5).ToListAsync();
        return Ok(list.Select(b => new RecentBookingDto(
            b.Id, b.CustomerName, $"{b.FromCity} → {b.ToCity}",
            b.BookingDate.ToString("yyyy-MM-dd"), b.Status, b.Payment)));
    }

    [HttpGet("recent-trips")]
    public async Task<ActionResult<IEnumerable<RecentTripDto>>> RecentTrips()
    {
        var list = await TenantScope.LorryReceipts(db, tenants, branches)
            .OrderByDescending(l => l.LrDate).Take(5).ToListAsync();
        return Ok(list.Select(l => new RecentTripDto(
            l.LrNumber, l.VehicleNumber ?? "", l.DriverName ?? "",
            l.FromCity, l.ToCity, $"₹{l.Freight:N0}")));
    }

    async Task<ActionResult<object>> CachedChart(string chart, Func<Task<object>> efLoader)
    {
        var key = TenantCacheService.DashboardKey($"chart:{chart}", CompanyId, BranchId);
        var data = await cache.GetOrCreateAsync(key, async () =>
        {
            var fromSp = await dashboardRead.TryGetChartAsync(CompanyId, BranchId, chart);
            return fromSp ?? await efLoader();
        }, DashboardCacheTtl);
        return Ok(data);
    }

    [HttpGet("charts/monthly-revenue")]
    public Task<ActionResult<object>> MonthlyRevenue() =>
        CachedChart("monthly-revenue", LoadMonthlyRevenueAsync);

    async Task<object> LoadMonthlyRevenueAsync()
    {
        var data = await tenants.Filter(branches.Filter(db.Bookings.AsNoTracking()))
            .GroupBy(b => new { b.BookingDate.Year, b.BookingDate.Month })
            .Select(g => new { month = g.Key.Month, value = g.Sum(b => b.Freight) / 100000m })
            .OrderBy(x => x.month)
            .ToListAsync();
        var months = new[] { "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" };
        return data.Select(d => new { month = months[d.month - 1], value = Math.Round(d.value, 0) }).ToList();
    }

    [HttpGet("charts/monthly-expenses")]
    public Task<ActionResult<object>> MonthlyExpenses() =>
        CachedChart("monthly-expenses", LoadMonthlyExpensesAsync);

    async Task<object> LoadMonthlyExpensesAsync()
    {
        var data = await DashboardMetricsService.MonthlyExpenseTotalsAsync(db, tenants, branches);
        var months = new[] { "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" };
        return data.Select(d => new { month = months[d.Month - 1], value = Math.Round(d.Amount / 100000m, 0) }).ToList();
    }

    [HttpGet("charts/trip-analysis")]
    public Task<ActionResult<object>> TripAnalysis() =>
        CachedChart("trip-analysis", LoadTripAnalysisAsync);

    async Task<object> LoadTripAnalysisAsync()
    {
        var statuses = await tenants.Filter(branches.Filter(db.Bookings.AsNoTracking())).GroupBy(b => b.Status).Select(g => new { label = g.Key, value = g.Count() }).ToListAsync();
        var total = statuses.Sum(s => s.value);
        var colors = new Dictionary<string, string> { ["Completed"] = "#2563eb", ["Delivered"] = "#2563eb", ["In Transit"] = "#0ea5e9", ["Pending"] = "#94a3b8", ["Confirmed"] = "#8b5cf6" };
        return statuses.Select(s => new { s.label, value = total > 0 ? (int)Math.Round(s.value * 100.0 / total) : 0, color = colors.GetValueOrDefault(s.label, "#64748b") }).ToList();
    }

    [HttpGet("charts/payment-mix")]
    public Task<ActionResult<object>> PaymentMix() =>
        CachedChart("payment-mix", LoadPaymentMixAsync);

    async Task<object> LoadPaymentMixAsync()
    {
        var payments = await tenants.Filter(branches.Filter(db.Bookings.AsNoTracking())).GroupBy(b => b.Payment).Select(g => new { label = g.Key, count = g.Count() }).ToListAsync();
        var total = payments.Sum(p => p.count);
        var colors = new Dictionary<string, string> { ["Paid"] = "#10b981", ["Partial"] = "#f59e0b", ["Unpaid"] = "#ef4444" };
        return payments.Select(p => new { p.label, value = total > 0 ? (int)Math.Round(p.count * 100.0 / total) : 0, color = colors.GetValueOrDefault(p.label, "#64748b") }).ToList();
    }

    [HttpGet("charts/expense-breakdown")]
    public Task<ActionResult<object>> ExpenseBreakdown() =>
        CachedChart("expense-breakdown", LoadExpenseBreakdownAsync);

    async Task<object> LoadExpenseBreakdownAsync()
    {
        var cats = await DashboardMetricsService.ExpenseBreakdownAsync(db, tenants, branches);
        var total = cats.Sum(c => c.Amount);
        var colors = new[] { "#f59e0b", "#2563eb", "#8b5cf6", "#10b981", "#64748b", "#ef4444" };
        return cats.Select((c, i) => new { label = c.Label, value = total > 0 ? (int)Math.Round(c.Amount * 100m / total) : 0, color = colors[i % colors.Length] }).ToList();
    }

    [HttpGet("charts/fleet-status")]
    public Task<ActionResult<object>> FleetStatus() =>
        CachedChart("fleet-status", LoadFleetStatusAsync);

    async Task<object> LoadFleetStatusAsync()
    {
        var statuses = await tenants.Filter(branches.Filter(db.Vehicles.AsNoTracking())).GroupBy(v => v.Status).Select(g => new { label = g.Key, count = g.Count() }).ToListAsync();
        var total = statuses.Sum(s => s.count);
        var colors = new Dictionary<string, string> { ["Active"] = "#2563eb", ["On Trip"] = "#0ea5e9", ["Maintenance"] = "#f59e0b", ["Idle"] = "#94a3b8" };
        return statuses.Select(s => new { s.label, value = total > 0 ? (int)Math.Round(s.count * 100.0 / total) : 0, color = colors.GetValueOrDefault(s.label, "#64748b") }).ToList();
    }

    [HttpGet("charts/vehicle-utilization")]
    public Task<ActionResult<object>> VehicleUtilization() =>
        CachedChart("vehicle-utilization", LoadVehicleUtilizationAsync);

    async Task<object> LoadVehicleUtilizationAsync() =>
        await tenants.Filter(branches.Filter(db.Vehicles.AsNoTracking())).OrderByDescending(v => v.Trips).Take(5)
            .Select(v => new { vehicle = v.Number, utilization = Math.Min(100, v.Trips * 2) }).ToListAsync();

    [HttpGet("charts/weekly-bookings")]
    public Task<ActionResult<object>> WeeklyBookings() =>
        CachedChart("weekly-bookings", LoadWeeklyBookingsAsync);

    async Task<object> LoadWeeklyBookingsAsync()
    {
        var days = new[] { "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" };
        var weekAgo = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-7));
        var data = await tenants.Filter(branches.Filter(db.Bookings.AsNoTracking())).Where(b => b.BookingDate >= weekAgo)
            .GroupBy(b => b.BookingDate.DayOfWeek).Select(g => new { dow = (int)g.Key, count = g.Count() }).ToListAsync();
        return days.Select((label, i) => new { label, value = data.FirstOrDefault(d => d.dow == i)?.count ?? 0 }).ToList();
    }

    [HttpGet("charts/route-performance")]
    public Task<ActionResult<object>> RoutePerformance() =>
        CachedChart("route-performance", LoadRoutePerformanceAsync);

    async Task<object> LoadRoutePerformanceAsync() =>
        await tenants.Filter(branches.Filter(db.Bookings.AsNoTracking())).GroupBy(b => new { b.FromCity, b.ToCity }).OrderByDescending(g => g.Count()).Take(5)
            .Select(g => new { label = $"{g.Key.FromCity}-{g.Key.ToCity}", value = g.Count() * 10 }).ToListAsync();

    [HttpGet("charts/driver-performance")]
    public Task<ActionResult<object>> DriverPerformance() =>
        CachedChart("driver-performance", LoadDriverPerformanceAsync);

    async Task<object> LoadDriverPerformanceAsync()
    {
        var drivers = await tenants.Filter(branches.Filter(db.Drivers.AsNoTracking())).OrderByDescending(d => d.Trips).Take(5).ToListAsync();
        return drivers.Select(d => new { label = d.Name.Length > 10 ? d.Name[..10] + "." : d.Name, value = d.Trips }).ToList();
    }

    [HttpGet("charts/fleet-gauge")]
    public Task<ActionResult<object>> FleetGauge() =>
        CachedChart("fleet-gauge", LoadFleetGaugeAsync);

    async Task<object> LoadFleetGaugeAsync()
    {
        var total = await tenants.Filter(branches.Filter(db.Vehicles.AsNoTracking())).CountAsync();
        var active = await tenants.Filter(branches.Filter(db.Vehicles.AsNoTracking())).CountAsync(v => v.Status == "Active" || v.Status == "On Trip");
        return new { value = total > 0 ? (int)Math.Round(active * 100.0 / total) : 0 };
    }

    [HttpGet("alerts")]
    public async Task<ActionResult<object>> Alerts()
    {
        var key = TenantCacheService.DashboardKey("alerts", CompanyId, BranchId);
        var alerts = await cache.GetOrCreateAsync(key, LoadAlertsAsync, DashboardCacheTtl);
        return Ok(alerts);
    }

    async Task<List<object>> LoadAlertsAsync()
    {
        var alerts = new List<object>();
        var bookings = await tenants.Filter(branches.Filter(db.Bookings.AsQueryable())).OrderByDescending(b => b.BookingDate).Take(50).ToListAsync();
        foreach (var b in bookings.Where(b => b.Payment == "Unpaid"))
            alerts.Add(new { id = $"unpaid-{b.Id}", type = "warning", title = $"Unpaid booking {b.Id}", message = $"{b.CustomerName} · ₹{b.Balance:N0} pending", path = "/bookings", time = b.BookingDate.ToString("yyyy-MM-dd") });
        foreach (var b in bookings.Where(b => b.Status == "Pending"))
            alerts.Add(new { id = $"pending-{b.Id}", type = "info", title = $"Pending booking {b.Id}", message = $"{b.FromCity} → {b.ToCity} awaiting confirmation", path = "/bookings", time = b.BookingDate.ToString("yyyy-MM-dd") });
        var vehicles = await tenants.Filter(branches.Filter(db.Vehicles.AsQueryable()))
            .Where(v => v.Status == "Maintenance")
            .OrderBy(v => v.Number)
            .Take(50)
            .ToListAsync();
        foreach (var v in vehicles)
            alerts.Add(new { id = $"maint-{v.Id}", type = "error", title = "Vehicle in maintenance", message = $"{v.Number} is unavailable", path = "/maintenance", time = v.LastMaintenance?.ToString("yyyy-MM-dd") ?? DateTime.UtcNow.ToString("yyyy-MM-dd") });

        try
        {
            await AddMaintenanceAlertsAsync(alerts);
        }
        catch
        {
            alerts.Add(new
            {
                id = "maint-setup",
                type = "warning",
                title = "Maintenance module setup",
                message = "Restart the API after database migration, or run npm run maintenance:install",
                path = "/maintenance",
                time = DateTime.UtcNow.ToString("yyyy-MM-dd"),
            });
        }

        var customers = await tenants.Filter(branches.Filter(db.Customers.AsNoTracking()))
            .Where(c => c.Outstanding > 50000)
            .OrderByDescending(c => c.Outstanding)
            .Take(20)
            .ToListAsync();
        foreach (var c in customers)
            alerts.Add(new { id = $"out-{c.Id}", type = "warning", title = "High receivable", message = $"{c.Name} · ₹{c.Outstanding:N0}", path = $"/customers/{c.Id}", time = DateTime.UtcNow.ToString("yyyy-MM-dd") });
        var pendingLr = await CountPendingLrAsync();
        if (pendingLr > 0)
        {
            var flow = await documentFlow.GetFlowAsync();
            var title = flow == DocumentFlow.FirstLRThenBooking ? "Booking pending for LR" : "LR generation pending";
            var message = flow == DocumentFlow.FirstLRThenBooking
                ? $"{pendingLr} LR(s) without booking"
                : $"{pendingLr} booking(s) without LR";
            var path = flow == DocumentFlow.FirstLRThenBooking ? "/bookings" : "/lr";
            alerts.Add(new { id = "lr-pending", type = "info", title, message, path, time = DateTime.UtcNow.ToString("yyyy-MM-dd") });
        }

        try
        {
            var geoEvents = await TenantScope.GeofenceEvents(db, tenants)
                .Include(e => e.Vehicle).Include(e => e.Geofence)
                .Where(e => !e.Acknowledged)
                .OrderByDescending(e => e.RecordedAt).Take(6).ToListAsync();
            foreach (var e in geoEvents)
            {
                var reg = e.Vehicle?.Number ?? e.VehicleId;
                var zone = e.Geofence?.Name ?? "Geofence";
                var verb = e.EventType == "ENTER" ? "entered" : "left";
                alerts.Add(new
                {
                    id = $"geo-{e.Id}",
                    type = "warning",
                    title = $"Geofence: {reg} {verb} {zone}",
                    message = e.RecordedAt.ToLocalTime().ToString("g"),
                    path = $"/operations/gps/alerts?eventId={e.Id}",
                    time = e.RecordedAt.ToString("yyyy-MM-dd"),
                });
            }
        }
        catch { /* GPS module tables may not exist yet */ }

        return alerts;
    }

    async Task<int> CountPendingLrAsync()
    {
        var (count, _, _) = await documentFlow.GetPendingDocumentCountAsync();
        return count;
    }

    async Task AddMaintenanceAlertsAsync(List<object> alerts)
    {
        var now = DateTime.UtcNow;
        var horizon = now.AddDays(30);
        var dueSchedules = await TenantScope.MaintenanceSchedules(db, tenants)
            .Include(s => s.Vehicle)
            .Where(s => s.IsActive && s.NextDueAt != null && s.NextDueAt <= horizon)
            .OrderBy(s => s.NextDueAt)
            .Take(8)
            .ToListAsync();
        foreach (var s in dueSchedules)
        {
            var overdue = s.NextDueAt!.Value < now;
            alerts.Add(new
            {
                id = $"sched-{s.Id}",
                type = overdue ? "error" : "warning",
                title = overdue ? "Maintenance overdue" : "Maintenance due soon",
                message = $"{s.Vehicle?.Number} · {s.ServiceType}",
                path = "/maintenance?tab=schedules",
                time = s.NextDueAt.Value.ToString("yyyy-MM-dd"),
            });
        }

        // Skip ComputePredictionsAsync here — it is expensive and delayed the whole alerts payload.
        var lowStockParts = await tenants.Filter(db.SpareParts.AsQueryable())
            .Where(p => p.StockQty <= p.MinStock).OrderBy(p => p.StockQty).Take(5).ToListAsync();
        foreach (var p in lowStockParts)
        {
            alerts.Add(new
            {
                id = $"part-{p.Id}",
                type = "warning",
                title = "Low spare part stock",
                message = $"{p.Name} · {p.StockQty} left (min {p.MinStock})",
                path = "/maintenance?tab=parts",
                time = DateTime.UtcNow.ToString("yyyy-MM-dd"),
            });
        }
    }
}

[Authorize]
[ApiController]
[Route("api/lookups")]
public class LookupsController(
    ReadOnlyTmsDbContext db,
    IBranchContext branches,
    ITenantContext tenants,
    HrService hr,
    LookupQuickCreateService quickCreate,
    TenantCacheService cache) : ControllerBase
{
    const int DefaultLookupLimit = 10;
    static readonly TimeSpan LookupCacheTtl = TimeSpan.FromSeconds(30);

    Guid CompanyId => TenantScope.ResolveCompanyId(tenants);
    Guid? BranchId => branches.EffectiveBranchId;

    static int ClampLimit(int limit) => Math.Clamp(limit, 1, 50);

    [HttpGet("vehicles")]
    public async Task<ActionResult<string[]>> Vehicles([FromQuery] string? search, [FromQuery] int limit = DefaultLookupLimit)
    {
        var cap = ClampLimit(limit);
        var key = TenantCacheService.LookupKey("vehicles", CompanyId, BranchId, search, cap);
        var items = await cache.GetOrCreateAsync(key, async () =>
        {
            var q = BranchAccess.FilterForLookup(branches, tenants.Filter(db.Vehicles.AsNoTracking()))
                .Where(v => v.Status == "Active");
            q = SearchHelper.Filter(q, search);
            return await q.OrderBy(v => v.Number).Take(cap).Select(v => v.Number).ToArrayAsync();
        }, LookupCacheTtl);
        return Ok(items);
    }

    [HttpGet("drivers")]
    public async Task<ActionResult<string[]>> Drivers([FromQuery] string? search, [FromQuery] int limit = DefaultLookupLimit)
    {
        var cap = ClampLimit(limit);
        var key = TenantCacheService.LookupKey("drivers", CompanyId, BranchId, search, cap);
        var items = await cache.GetOrCreateAsync(key, async () =>
        {
            var names = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var q = BranchAccess.FilterForLookup(branches, tenants.Filter(db.Drivers.AsNoTracking()))
                .Where(d => d.Status == "Active");
            q = SearchHelper.Filter(q, search);
            foreach (var n in await q.OrderBy(d => d.Name).Take(cap).Select(d => d.Name).ToListAsync())
                names.Add(n);
            try
            {
                foreach (var n in await hr.ListEmployeeNamesAsync("Driver", search, cap))
                    names.Add(n);
            }
            catch (PostgresException) { }
            return names.OrderBy(n => n).Take(cap).ToArray();
        }, LookupCacheTtl);
        return Ok(items);
    }

    [HttpGet("employees")]
    public async Task<ActionResult<string[]>> Employees(
        [FromQuery] string? employeeType, [FromQuery] string? search, [FromQuery] int limit = DefaultLookupLimit)
    {
        var cap = ClampLimit(limit);
        var names = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        try
        {
            foreach (var n in await hr.ListEmployeeNamesAsync(employeeType, search, cap))
                names.Add(n);
        }
        catch (PostgresException)
        {
            // HR not installed — fall through to drivers table for Driver role.
        }

        if (string.IsNullOrWhiteSpace(employeeType)
            || string.Equals(employeeType, "Driver", StringComparison.OrdinalIgnoreCase))
        {
            var q = BranchAccess.FilterForLookup(branches, tenants.Filter(db.Drivers.AsNoTracking()))
                .Where(d => d.Status == "Active");
            q = SearchHelper.Filter(q, search);
            foreach (var n in await q.OrderBy(d => d.Name).Take(cap).Select(d => d.Name).ToListAsync())
                names.Add(n);
        }

        return Ok(names.OrderBy(n => n).Take(cap).ToArray());
    }

    [HttpGet("customers")]
    public async Task<ActionResult<string[]>> Customers([FromQuery] string? search, [FromQuery] int limit = DefaultLookupLimit)
    {
        var cap = ClampLimit(limit);
        var key = TenantCacheService.LookupKey("customers", CompanyId, BranchId, search, cap);
        var items = await cache.GetOrCreateAsync(key, async () =>
        {
            var q = BranchAccess.FilterForLookup(branches, tenants.Filter(db.Customers.AsNoTracking()));
            q = SearchHelper.Filter(q, search);
            return await q.OrderBy(c => c.Name).Take(cap).Select(c => c.Name).ToArrayAsync();
        }, LookupCacheTtl);
        return Ok(items);
    }

    [HttpGet("vendors")]
    public async Task<ActionResult<string[]>> Vendors([FromQuery] string? search, [FromQuery] int limit = DefaultLookupLimit)
    {
        var cap = ClampLimit(limit);
        var key = TenantCacheService.LookupKey("vendors", CompanyId, BranchId, search, cap);
        var items = await cache.GetOrCreateAsync(key, async () =>
        {
            var q = BranchAccess.FilterForLookup(branches, tenants.Filter(db.Vendors.AsNoTracking()));
            q = SearchHelper.Filter(q, search);
            return await q.OrderBy(v => v.Name).Take(cap).Select(v => v.Name).ToArrayAsync();
        }, LookupCacheTtl);
        return Ok(items);
    }

    public record QuickCreateBody(string Type, string Name, string? EmployeeType);

    [HttpPost("quick-create")]
    public async Task<ActionResult<QuickCreateResult>> QuickCreate([FromBody] QuickCreateBody body, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(body.Type) || string.IsNullOrWhiteSpace(body.Name))
            return BadRequest(new ApiError("Type and name are required."));
        try
        {
            return Ok(await quickCreate.CreateAsync(body.Type, body.Name, body.EmployeeType, ct));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiError(ex.Message));
        }
    }
}

[Authorize]
[ApiController]
[Route("api/reports")]
public class ReportsController(OpsReportsService reports, ReadOnlyTmsDbContext db, ITenantContext tenants) : ControllerBase
{
    [HttpGet("trips")]
    public async Task<ActionResult<object>> Trips(
        [FromQuery] string? search,
        [FromQuery] string? fromDate,
        [FromQuery] string? toDate,
        [FromQuery] string? status,
        [FromQuery] string? vehicle,
        [FromQuery] string? workflow,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true,
        CancellationToken ct = default) =>
        Ok(await reports.LrRegisterAsync(search, fromDate, toDate, status, vehicle, workflow, page, pageSize, includeTotal, ct));

    [HttpGet("loading-dispatch")]
    public async Task<ActionResult<object>> LoadingDispatch(
        [FromQuery] string? search,
        [FromQuery] string? fromDate,
        [FromQuery] string? toDate,
        [FromQuery] string? workflow,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true,
        CancellationToken ct = default) =>
        Ok(await reports.LoadingDispatchAsync(search, fromDate, toDate, workflow, page, pageSize, includeTotal, ct));

    [HttpGet("hub-transfer")]
    public async Task<ActionResult<object>> HubTransfer(
        [FromQuery] string? search,
        [FromQuery] string? fromDate,
        [FromQuery] string? toDate,
        [FromQuery] string? status,
        [FromQuery] Guid? hubBranchId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true,
        CancellationToken ct = default) =>
        Ok(await reports.HubTransferReportAsync(search, fromDate, toDate, status, hubBranchId, page, pageSize, includeTotal, ct));

    [HttpGet("delivery-pod")]
    public async Task<ActionResult<object>> DeliveryPod(
        [FromQuery] string? search,
        [FromQuery] string? fromDate,
        [FromQuery] string? toDate,
        [FromQuery] string? status,
        [FromQuery] string? workflow,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true,
        CancellationToken ct = default) =>
        Ok(await reports.DeliveryPodAsync(search, fromDate, toDate, status, workflow, page, pageSize, includeTotal, ct));

    [HttpGet("income")]
    public async Task<ActionResult<object>> Income(
        [FromQuery] string? fromDate,
        [FromQuery] string? toDate,
        [FromQuery] string? workflow,
        CancellationToken ct = default) =>
        Ok(await reports.IncomeAsync(fromDate, toDate, workflow, ct));

    [HttpGet("direct-lr-profit-loss")]
    public async Task<ActionResult<object>> DirectLrProfitLoss(
        [FromQuery] string? search,
        [FromQuery] string? fromDate,
        [FromQuery] string? toDate,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true,
        CancellationToken ct = default) =>
        Ok(await reports.DirectLrProfitLossAsync(search, fromDate, toDate, page, pageSize, includeTotal, ct));

    [HttpGet("expenses")]
    public async Task<ActionResult<object>> Expenses(
        [FromQuery] string? fromDate,
        [FromQuery] string? toDate,
        CancellationToken ct = default) =>
        Ok(await reports.ExpensesAsync(fromDate, toDate, ct));

    [HttpGet("vehicles")]
    public async Task<ActionResult<object>> Vehicles(
        [FromQuery] string? search,
        [FromQuery] string? fromDate,
        [FromQuery] string? toDate,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true,
        CancellationToken ct = default) =>
        Ok(await reports.VehiclesLiveAsync(search, fromDate, toDate, page, pageSize, includeTotal, ct));

    [HttpGet("drivers")]
    public async Task<ActionResult<object>> Drivers(
        [FromQuery] string? search,
        [FromQuery] string? fromDate,
        [FromQuery] string? toDate,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true,
        CancellationToken ct = default) =>
        Ok(await reports.DriversLiveAsync(search, fromDate, toDate, page, pageSize, includeTotal, ct));

    [HttpGet("customers")]
    public async Task<ActionResult<object>> Customers(
        [FromQuery] string? search,
        [FromQuery] string? fromDate,
        [FromQuery] string? toDate,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true,
        CancellationToken ct = default) =>
        Ok(await reports.CustomersLiveAsync(search, fromDate, toDate, page, pageSize, includeTotal, ct));

    [HttpGet("vendors")]
    public async Task<ActionResult<object>> Vendors(
        [FromQuery] string? search,
        [FromQuery] string? fromDate,
        [FromQuery] string? toDate,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true,
        CancellationToken ct = default) =>
        Ok(await reports.VendorsLiveAsync(search, fromDate, toDate, page, pageSize, includeTotal, ct));

    [HttpGet("cash-flow")]
    public async Task<ActionResult<object>> CashFlow(
        [FromQuery] string? fromDate,
        [FromQuery] string? toDate,
        CancellationToken ct = default) =>
        Ok(await AccountingReportService.BuildCashFlowAsync(db, tenants, fromDate, toDate, ct));

    [HttpGet("cash-flow/details")]
    public async Task<ActionResult<object>> CashFlowDetails([FromQuery] int month, [FromQuery] int? year)
    {
        if (month is < 1 or > 12) return BadRequest(new { message = "Month must be 1–12." });
        return Ok(await AccountingReportService.BuildCashFlowDetailsAsync(db, tenants, month, year ?? DateTime.UtcNow.Year));
    }
}
