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
    DocumentFlowService documentFlow) : ControllerBase
{
    Guid CompanyId => TenantScope.ResolveCompanyId(tenants);
    Guid? BranchId => branches.EffectiveBranchId;
    static readonly TimeSpan DashboardCacheTtl = TimeSpan.FromSeconds(45);

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
        var spStats = await dashboardRead.TryGetStatsAsync(CompanyId, BranchId);
        if (spStats != null)
        {
            return spStats with { PendingLr = pendingDocuments };
        }

        return await LoadStatsViaEfAsync();
    }

    async Task<DashboardStatsDto> LoadStatsViaEfAsync()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var bookings = tenants.Filter(branches.Filter(db.Bookings.AsNoTracking()));
        var vehicles = tenants.Filter(branches.Filter(db.Vehicles.AsNoTracking()));
        var drivers = tenants.Filter(branches.Filter(db.Drivers.AsNoTracking()));

        var totalIncome = await bookings.SumAsync(b => b.Freight);
        var totalExpenses = await DashboardMetricsService.TotalExpensesAsync(db, tenants, branches);
        var (pendingDocuments, _, _) = await documentFlow.GetPendingDocumentCountAsync();

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
            await AccountingBalanceService.GetBankBalanceAsync(db, tenants));
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
        var list = await tenants.Filter(db.LorryReceipts.AsQueryable()).OrderByDescending(l => l.LrDate).Take(5).ToListAsync();
        return Ok(list.Select(l => new RecentTripDto(
            l.LrNumber, l.VehicleNumber ?? "", l.DriverName ?? "",
            l.FromCity, l.ToCity, $"₹{l.Freight:N0}")));
    }

    async Task<ActionResult<object>> CachedChart(string chart, Func<Task<object>> loader)
    {
        var key = TenantCacheService.DashboardKey($"chart:{chart}", CompanyId, BranchId);
        return Ok(await cache.GetOrCreateAsync(key, loader, DashboardCacheTtl));
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

        var predictions = await maintenance.ComputePredictionsAsync();
        foreach (var p in predictions.Where(p => p.RiskLevel == "HIGH").Take(5))
        {
            alerts.Add(new
            {
                id = $"risk-{p.VehicleId}",
                type = "error",
                title = "High breakdown risk",
                message = $"{p.RegistrationNo} · risk score {p.RiskScore}",
                path = "/maintenance?tab=overview",
                time = DateTime.UtcNow.ToString("yyyy-MM-dd"),
            });
        }

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
            var q = tenants.Filter(db.Vendors.AsNoTracking());
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
public class ReportsController(ReadOnlyTmsDbContext db, IBranchContext branches, ITenantContext tenants) : ControllerBase
{
    [HttpGet("trips")]
    public async Task<ActionResult<object>> Trips()
    {
        var list = await tenants.Filter(db.LorryReceipts.AsQueryable()).OrderByDescending(l => l.LrDate).Take(50).ToListAsync();
        return Ok(list.Select(l => new
        {
            lr = l.LrNumber,
            date = l.LrDate.ToString("yyyy-MM-dd"),
            vehicle = l.VehicleNumber,
            driver = l.DriverName,
            route = $"{l.FromCity} → {l.ToCity}",
            distance = "—",
            freight = l.Freight,
            expense = 0,
            profit = l.Freight
        }));
    }

    [HttpGet("income")]
    public async Task<ActionResult<object>> Income()
    {
        var months = new[] { "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" };
        var data = await tenants.Filter(branches.Filter(db.Bookings.AsNoTracking())).GroupBy(b => b.BookingDate.Month)
            .Select(g => new { month = g.Key, freight = g.Sum(b => b.Freight), loading = g.Sum(b => b.Freight * 0.05m), total = g.Sum(b => b.Freight) })
            .ToListAsync();
        return Ok(data.Select(d => new { month = months[d.month - 1], d.freight, d.loading, d.total }));
    }

    [HttpGet("expenses")]
    public async Task<ActionResult<object>> Expenses()
    {
        var months = new[] { "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" };
        var data = await tenants.Filter(branches.Filter(db.Expenses.AsNoTracking())).GroupBy(e => e.ExpenseDate.Month)
            .Select(g => new { month = g.Key, fuel = g.Where(e => e.Category == "Fuel").Sum(e => e.Amount), salary = g.Where(e => e.Category == "Salary").Sum(e => e.Amount), toll = g.Where(e => e.Category == "Toll").Sum(e => e.Amount), maintenance = g.Where(e => e.Category == "Maintenance").Sum(e => e.Amount), total = g.Sum(e => e.Amount) })
            .ToListAsync();
        return Ok(data.Select(d => new { month = months[d.month - 1], d.fuel, d.salary, d.toll, d.maintenance, d.total }));
    }

    [HttpGet("vehicles")]
    public async Task<ActionResult<PagedResult<object>>> Vehicles(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true)
    {
        var q = tenants.Filter(branches.Filter(db.Vehicles.AsNoTracking()));
        q = SearchHelper.Filter(q, search);
        q = q.OrderBy(v => v.Number);
        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize, QueryExtensions.ReportMaxPageSize);
        var (items, total, hasMore, approx) = await q.ToPagedListAsync(p, size, includeTotal);
        var rows = items.Select(v => (object)new
        {
            number = v.Number,
            type = v.Type,
            status = v.Status,
            trips = v.Trips,
            revenue = v.Revenue,
            insurance = v.Insurance,
        }).ToList();
        return Ok(new PagedResult<object>(rows, total, p, size, hasMore, approx));
    }

    [HttpGet("drivers")]
    public async Task<ActionResult<PagedResult<object>>> Drivers(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true)
    {
        var q = tenants.Filter(branches.Filter(db.Drivers.AsNoTracking()));
        q = SearchHelper.Filter(q, search);
        q = q.OrderBy(d => d.Name);
        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize, QueryExtensions.ReportMaxPageSize);
        var (items, total, hasMore, approx) = await q.ToPagedListAsync(p, size, includeTotal);
        var rows = items.Select(d => (object)new
        {
            name = d.Name,
            phone = d.Phone,
            status = d.Status,
            trips = d.Trips,
            rating = d.Rating,
            salary = d.Salary,
        }).ToList();
        return Ok(new PagedResult<object>(rows, total, p, size, hasMore, approx));
    }

    [HttpGet("customers")]
    public async Task<ActionResult<PagedResult<object>>> Customers(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true)
    {
        var q = tenants.Filter(branches.Filter(db.Customers.AsNoTracking()));
        q = SearchHelper.Filter(q, search);
        q = q.OrderBy(c => c.Name);
        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize, QueryExtensions.ReportMaxPageSize);
        var (items, total, hasMore, approx) = await q.ToPagedListAsync(p, size, includeTotal);
        var rows = items.Select(c => (object)new
        {
            name = c.Name,
            contact = c.Contact,
            outstanding = c.Outstanding,
            trips = c.TotalTrips,
            creditLimit = c.CreditLimit,
        }).ToList();
        return Ok(new PagedResult<object>(rows, total, p, size, hasMore, approx));
    }

    [HttpGet("vendors")]
    public async Task<ActionResult<PagedResult<object>>> Vendors(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true)
    {
        var q = tenants.Filter(db.Vendors.AsNoTracking());
        q = SearchHelper.Filter(q, search);
        q = q.OrderBy(v => v.Name);
        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize, QueryExtensions.ReportMaxPageSize);
        var (items, total, hasMore, approx) = await q.ToPagedListAsync(p, size, includeTotal);
        var rows = items.Select(v => (object)new
        {
            name = v.Name,
            category = v.Category,
            outstanding = v.Outstanding,
            bills = v.TotalBills,
        }).ToList();
        return Ok(new PagedResult<object>(rows, total, p, size, hasMore, approx));
    }

    [HttpGet("cash-flow")]
    public async Task<ActionResult<object>> CashFlow() =>
        Ok(await AccountingReportService.BuildCashFlowAsync(db, tenants));

    [HttpGet("cash-flow/details")]
    public async Task<ActionResult<object>> CashFlowDetails([FromQuery] int month, [FromQuery] int? year)
    {
        if (month is < 1 or > 12) return BadRequest(new { message = "Month must be 1–12." });
        return Ok(await AccountingReportService.BuildCashFlowDetailsAsync(db, tenants, month, year ?? DateTime.UtcNow.Year));
    }
}
