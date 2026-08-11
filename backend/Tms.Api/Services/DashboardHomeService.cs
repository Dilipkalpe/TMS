using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public record DashboardHomeKpiDto(string Label, string Key, decimal Value, decimal? TrendPct, bool TrendUp);

public record DashboardHomeTrendPointDto(string Label, int Created, int Delivered, int Pending);

public record DashboardHomeStatusSliceDto(string Label, int Value, decimal Percent);

public record DashboardHomeDestinationDto(string Name, int Count);

public record DashboardHomeRecentLrDto(
    string LrNumber, string Date, string Customer, string From, string To, string Status);

public record DashboardHomePendingDeliveryDto(
    string LrNumber, string Destination, string Customer, string DueDate);

public record DashboardHomeNotificationDto(
    string Id, string Type, string Title, string Message, string? Time, string? Path);

public record DashboardHomeDto(
    IReadOnlyList<DashboardHomeKpiDto> Kpis,
    IReadOnlyList<DashboardHomeTrendPointDto> LrTrend,
    IReadOnlyList<DashboardHomeStatusSliceDto> LrStatusSummary,
    int LrStatusTotal,
    IReadOnlyList<DashboardHomeDestinationDto> TopDestinations,
    IReadOnlyList<DashboardHomeRecentLrDto> RecentLrs,
    IReadOnlyList<DashboardHomePendingDeliveryDto> PendingDeliveries,
    IReadOnlyList<DashboardHomeNotificationDto> Notifications,
    DateOnly DateFrom,
    DateOnly DateTo,
    DateTime ServerTime);

public class DashboardHomeService(
    DashboardReadService dashboardRead,
    TmsDbContext db,
    ITenantContext tenants,
    IBranchContext branches,
    ILogger<DashboardHomeService> logger)
{
    public async Task<DashboardHomeDto> BuildAsync(DateOnly fromDate, DateOnly toDate, CancellationToken ct = default)
    {
        var companyId = TenantScope.ResolveCompanyId(tenants);
        var branchId = branches.EffectiveBranchId;

        var fromSp = await dashboardRead.TryGetHomeAsync(companyId, branchId, fromDate, toDate, ct);
        if (fromSp != null) return fromSp;

        logger.LogDebug("Building dashboard home via EF fallback");
        return await BuildViaEfAsync(fromDate, toDate, ct);
    }

    async Task<DashboardHomeDto> BuildViaEfAsync(DateOnly fromDate, DateOnly toDate, CancellationToken ct)
    {
        var allLrs = TenantScope.LorryReceipts(db, tenants, branches).AsNoTracking();
        var lrs = allLrs.Where(l => l.LrDate >= fromDate && l.LrDate <= toDate);
        var bookings = TenantScope.Bookings(db, tenants, branches).AsNoTracking()
            .Where(b => b.BookingDate >= fromDate && b.BookingDate <= toDate);

        var spanDays = toDate.DayNumber - fromDate.DayNumber + 1;
        var prevTo = fromDate.AddDays(-1);
        var prevFrom = prevTo.AddDays(-(spanDays - 1));

        // Trend comparison needs the previous window; pass unfiltered LR set (date filters applied inside).
        var counts = await LoadCountsAsync(lrs, ct);
        var revenue = await LoadRevenueAsync(lrs, bookings, ct);
        var trends = await LoadTrendWindowsAsync(allLrs, bookings, fromDate, toDate, prevFrom, prevTo, ct);
        var trendFrom = spanDays > 31 ? toDate.AddDays(-30) : fromDate;
        var lrTrend = await BuildLrTrendAsync(lrs, trendFrom, toDate, ct);
        var (slices, statusTotal) = await BuildStatusSummaryAsync(lrs, ct);
        var destinations = await BuildTopDestinationsAsync(lrs, bookings, ct);
        var recentLrs = await LoadRecentLrsAsync(allLrs, ct);
        var pendingDeliveries = await LoadPendingDeliveriesAsync(allLrs, ct);
        var notifications = await BuildNotificationsAsync(allLrs, ct);

        var kpis = new List<DashboardHomeKpiDto>
        {
            MakeKpi("Total LR", "totalLr", counts.TotalLr, TrendPct(trends.TotalCur, trends.TotalPrev)),
            MakeKpi("In Transit", "inTransit", counts.InTransit, TrendPct(trends.InTransitCur, trends.InTransitPrev)),
            MakeKpi("Delivered", "delivered", counts.Delivered, TrendPct(trends.DeliveredCur, trends.DeliveredPrev)),
            MakeKpi("Pending Delivery", "pendingDelivery", counts.PendingDelivery, TrendPct(trends.PendingCur, trends.PendingPrev), invertTrend: true),
            MakeKpi("LR Revenue", "todaysRevenue", revenue.LrRevenue, TrendPctRevenue(trends.LrRevenueCur, trends.LrRevenuePrev)),
            MakeKpi("Booking Revenue", "monthlyRevenue", revenue.BookingRevenue, TrendPctRevenue(trends.BookingRevenueCur, trends.BookingRevenuePrev)),
        };

        return new DashboardHomeDto(
            kpis,
            lrTrend,
            slices,
            statusTotal,
            destinations,
            recentLrs,
            pendingDeliveries,
            notifications,
            fromDate,
            toDate,
            DateTime.UtcNow);
    }

    sealed record CountSnapshot(int TotalLr, int InTransit, int Delivered, int PendingDelivery);

    sealed record RevenueSnapshot(decimal LrRevenue, decimal BookingRevenue);

    sealed record TrendSnapshot(
        int TotalCur, int TotalPrev,
        int InTransitCur, int InTransitPrev,
        int DeliveredCur, int DeliveredPrev,
        int PendingCur, int PendingPrev,
        decimal LrRevenueCur, decimal LrRevenuePrev,
        decimal BookingRevenueCur, decimal BookingRevenuePrev);

    static async Task<CountSnapshot> LoadCountsAsync(IQueryable<LorryReceipt> lrs, CancellationToken ct)
    {
        var totalLr = await lrs.CountAsync(ct);
        var inTransit = await lrs.CountAsync(l => l.Status == LrStatuses.InTransit, ct);
        var delivered = await lrs.CountAsync(l =>
            l.Status == LrStatuses.DeliveryCompleted ||
            l.Status == LrStatuses.PodUploaded ||
            l.Status == LrStatuses.InvoiceGenerated ||
            l.Status == LrStatuses.ExpenseAdded ||
            l.Status == LrStatuses.ExpenseApproved ||
            l.Status == LrStatuses.Closed, ct);
        var pendingDelivery = await lrs.CountAsync(l =>
            l.Status != LrStatuses.Closed &&
            l.Status != LrStatuses.DeliveryCompleted &&
            l.Status != LrStatuses.PodUploaded &&
            l.Status != LrStatuses.Draft, ct);

        return new CountSnapshot(totalLr, inTransit, delivered, pendingDelivery);
    }

    static async Task<RevenueSnapshot> LoadRevenueAsync(
        IQueryable<LorryReceipt> lrs,
        IQueryable<Booking> bookings,
        CancellationToken ct)
    {
        var lrRev = await lrs.SumAsync(l => (decimal?)l.Freight, ct) ?? 0;
        var bookingRev = await bookings.SumAsync(b => (decimal?)b.Freight, ct) ?? 0;
        return new RevenueSnapshot(lrRev, bookingRev);
    }

    static async Task<TrendSnapshot> LoadTrendWindowsAsync(
        IQueryable<LorryReceipt> lrs,
        IQueryable<Booking> bookings,
        DateOnly curFrom,
        DateOnly curTo,
        DateOnly prevFrom,
        DateOnly prevTo,
        CancellationToken ct)
    {
        var fetchFrom = prevFrom < curFrom ? prevFrom : curFrom;
        var fetchTo = curTo;

        var windowRows = await lrs
            .Where(l => l.LrDate >= fetchFrom && l.LrDate <= fetchTo)
            .Select(l => new { l.LrDate, l.Status, l.Freight })
            .ToListAsync(ct);

        int CountRange(DateOnly from, DateOnly to, Func<string, bool>? statusMatch = null) =>
            windowRows.Count(l =>
                l.LrDate >= from && l.LrDate <= to &&
                (statusMatch == null || statusMatch(l.Status)));

        static bool IsDelivered(string s) =>
            s is LrStatuses.DeliveryCompleted or LrStatuses.PodUploaded or LrStatuses.Closed;

        static bool IsPending(string s) =>
            s != LrStatuses.Closed && s != LrStatuses.DeliveryCompleted &&
            s != LrStatuses.PodUploaded && s != LrStatuses.Draft;

        decimal SumLrRange(DateOnly from, DateOnly to) =>
            windowRows.Where(l => l.LrDate >= from && l.LrDate <= to).Sum(l => l.Freight);

        var lrRevenueCur = SumLrRange(curFrom, curTo);
        var lrRevenuePrev = SumLrRange(prevFrom, prevTo);

        var bookingRows = await bookings
            .Where(b => b.BookingDate >= prevFrom && b.BookingDate <= curTo)
            .Select(b => new { b.BookingDate, b.Freight })
            .ToListAsync(ct);

        decimal SumBookingRange(DateOnly from, DateOnly to) =>
            bookingRows.Where(b => b.BookingDate >= from && b.BookingDate <= to).Sum(b => b.Freight);

        return new TrendSnapshot(
            CountRange(curFrom, curTo),
            CountRange(prevFrom, prevTo),
            CountRange(curFrom, curTo, s => s == LrStatuses.InTransit),
            CountRange(prevFrom, prevTo, s => s == LrStatuses.InTransit),
            CountRange(curFrom, curTo, IsDelivered),
            CountRange(prevFrom, prevTo, IsDelivered),
            CountRange(curFrom, curTo, IsPending),
            CountRange(prevFrom, prevTo, IsPending),
            lrRevenueCur, lrRevenuePrev,
            SumBookingRange(curFrom, curTo), SumBookingRange(prevFrom, prevTo));
    }

    static DashboardHomeKpiDto MakeKpi(string label, string key, decimal value, decimal? trendPct, bool invertTrend = false)
    {
        var up = trendPct >= 0;
        if (invertTrend) up = !up;
        return new DashboardHomeKpiDto(label, key, value, trendPct.HasValue ? Math.Abs(Math.Round(trendPct.Value, 1)) : null, up);
    }

    static decimal? TrendPct(int cur, int prev)
    {
        if (prev == 0) return cur > 0 ? 100 : 0;
        return Math.Round(100m * (cur - prev) / prev, 1);
    }

    static decimal? TrendPctRevenue(decimal cur, decimal prev)
    {
        if (prev == 0) return cur > 0 ? 100 : 0;
        return Math.Round(100m * (cur - prev) / prev, 1);
    }

    static async Task<IReadOnlyList<DashboardHomeTrendPointDto>> BuildLrTrendAsync(
        IQueryable<LorryReceipt> lrs, DateOnly fromDate, DateOnly toDate, CancellationToken ct)
    {
        var rows = await lrs
            .Select(l => new { l.LrDate, l.Status })
            .ToListAsync(ct);

        var grouped = rows
            .GroupBy(l => l.LrDate)
            .ToDictionary(
                g => g.Key,
                g => new
                {
                    Created = g.Count(),
                    Delivered = g.Count(l =>
                        l.Status is LrStatuses.DeliveryCompleted or LrStatuses.PodUploaded or LrStatuses.Closed),
                    Pending = g.Count(l =>
                        l.Status is LrStatuses.LRCreated or LrStatuses.LoadingCompleted or LrStatuses.InTransit),
                });

        var points = new List<DashboardHomeTrendPointDto>();
        for (var d = fromDate; d <= toDate; d = d.AddDays(1))
        {
            grouped.TryGetValue(d, out var row);
            points.Add(new DashboardHomeTrendPointDto(
                d.ToString("dd MMM"),
                row?.Created ?? 0,
                row?.Delivered ?? 0,
                row?.Pending ?? 0));
        }
        return points;
    }

    static async Task<(IReadOnlyList<DashboardHomeStatusSliceDto>, int)> BuildStatusSummaryAsync(
        IQueryable<LorryReceipt> lrs, CancellationToken ct)
    {
        var statusCounts = await lrs
            .GroupBy(l => l.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var total = statusCounts.Sum(x => x.Count);
        if (total == 0) return ([], 0);

        int CountWhere(Func<string, bool> match) =>
            statusCounts.Where(x => match(x.Status)).Sum(x => x.Count);

        var delivered = CountWhere(s =>
            s is LrStatuses.DeliveryCompleted or LrStatuses.PodUploaded or LrStatuses.Closed
                or LrStatuses.InvoiceGenerated or LrStatuses.ExpenseAdded or LrStatuses.ExpenseApproved);
        var inTransit = CountWhere(s => s == LrStatuses.InTransit);
        var pending = CountWhere(s =>
            s is LrStatuses.LRCreated or LrStatuses.LoadingCompleted
                or LrStatuses.TransitPassGenerated or LrStatuses.Draft);
        var cancelled = CountWhere(s => s == "Cancelled");

        decimal Pct(int n) => Math.Round(100m * n / total, 1);

        var slices = new List<DashboardHomeStatusSliceDto>
        {
            new("Delivered", delivered, Pct(delivered)),
            new("In Transit", inTransit, Pct(inTransit)),
            new("Pending", pending, Pct(pending)),
        };
        if (cancelled > 0)
            slices.Add(new("Cancelled", cancelled, Pct(cancelled)));

        return (slices, total);
    }

    static async Task<IReadOnlyList<DashboardHomeDestinationDto>> BuildTopDestinationsAsync(
        IQueryable<LorryReceipt> lrs,
        IQueryable<Booking> bookings,
        CancellationToken ct)
    {
        var fromLr = await lrs
            .GroupBy(l => l.ToCity)
            .Select(g => new { Name = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(5)
            .ToListAsync(ct);

        if (fromLr.Count >= 3)
            return fromLr.Select(x => new DashboardHomeDestinationDto(x.Name, x.Count)).ToList();

        var fromBookings = await bookings
            .GroupBy(b => b.ToCity)
            .Select(g => new { Name = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(5)
            .ToListAsync(ct);

        return fromBookings.Select(x => new DashboardHomeDestinationDto(x.Name, x.Count)).ToList();
    }

    static async Task<IReadOnlyList<DashboardHomeRecentLrDto>> LoadRecentLrsAsync(
        IQueryable<LorryReceipt> lrs, CancellationToken ct)
    {
        var rows = await lrs
            .OrderByDescending(l => l.LrDate).ThenByDescending(l => l.LrNumber)
            .Take(8)
            .Select(l => new
            {
                l.LrNumber,
                l.LrDate,
                l.CustomerName,
                l.Consignor,
                l.FromCity,
                l.ToCity,
                l.Status,
            })
            .ToListAsync(ct);

        return rows.Select(l => new DashboardHomeRecentLrDto(
            l.LrNumber,
            l.LrDate.ToString("dd/MM/yyyy"),
            l.CustomerName ?? l.Consignor ?? "—",
            l.FromCity,
            l.ToCity,
            l.Status)).ToList();
    }

    static async Task<IReadOnlyList<DashboardHomePendingDeliveryDto>> LoadPendingDeliveriesAsync(
        IQueryable<LorryReceipt> lrs, CancellationToken ct)
    {
        var rows = await lrs
            .Where(l => l.Status == LrStatuses.InTransit ||
                        l.Status == LrStatuses.TransitPassGenerated ||
                        l.Status == LrStatuses.LoadingCompleted)
            .OrderBy(l => l.LrDate)
            .Take(8)
            .Select(l => new
            {
                l.LrNumber,
                l.ToCity,
                l.CustomerName,
                l.Consignor,
                l.LrDate,
            })
            .ToListAsync(ct);

        return rows.Select(l => new DashboardHomePendingDeliveryDto(
            l.LrNumber,
            l.ToCity,
            l.CustomerName ?? l.Consignor ?? "—",
            l.LrDate.AddDays(3).ToString("dd/MM/yyyy"))).ToList();
    }

    static async Task<IReadOnlyList<DashboardHomeNotificationDto>> BuildNotificationsAsync(
        IQueryable<LorryReceipt> lrs, CancellationToken ct)
    {
        // Never COUNT the full LR history — on demo seeds (~500k rows) that alone blocks the dashboard.
        var cutoff = DateTime.UtcNow.AddDays(-60);
        var recentScope = lrs.Where(l => l.UpdatedAt >= cutoff);

        var pendingVehicle = await recentScope
            .Where(l => l.Status == LrStatuses.LoadingCompleted && (l.VehicleNumber == null || l.VehicleNumber == ""))
            .OrderByDescending(l => l.UpdatedAt)
            .Take(100)
            .CountAsync(ct);
        var pendingExpense = await recentScope
            .Where(l => l.Status == LrStatuses.ExpenseAdded || l.Status == LrStatuses.InvoiceGenerated)
            .OrderByDescending(l => l.UpdatedAt)
            .Take(100)
            .CountAsync(ct);
        var recent = await recentScope
            .OrderByDescending(l => l.UpdatedAt)
            .Take(3)
            .Select(l => new { l.LrNumber, l.Status, l.FromCity, l.ToCity, l.UpdatedAt })
            .ToListAsync(ct);

        var list = new List<DashboardHomeNotificationDto>();
        if (pendingVehicle > 0)
            list.Add(new("n-vehicle", "warning", "Vehicle assignment pending",
                $"{pendingVehicle}{(pendingVehicle >= 100 ? "+" : "")} LR waiting for vehicle assignment", null, "/lr?status=vehicle-assigned"));
        if (pendingExpense > 0)
            list.Add(new("n-expense", "info", "Expense approval pending",
                $"{pendingExpense}{(pendingExpense >= 100 ? "+" : "")} LR pending expense approval", null, "/lr?status=expense-pending"));

        foreach (var lr in recent)
        {
            list.Add(new(
                $"n-{lr.LrNumber}",
                lr.Status.Contains("Deliver") ? "success" : "info",
                $"LR {lr.LrNumber}",
                $"{lr.Status} · {lr.FromCity} → {lr.ToCity}",
                lr.UpdatedAt.ToString("dd/MM/yyyy HH:mm"),
                $"/lr/{lr.LrNumber.Replace("/", "~")}"));
        }

        return list.Take(6).ToList();
    }
}
