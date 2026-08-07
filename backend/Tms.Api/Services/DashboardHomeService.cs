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
    DateTime ServerTime);

public class DashboardHomeService(TmsDbContext db, ITenantContext tenants, IBranchContext branches)
{
    public async Task<DashboardHomeDto> BuildAsync(CancellationToken ct = default)
    {
        var lrs = TenantScope.LorryReceipts(db, tenants, branches).AsNoTracking();
        var bookings = TenantScope.Bookings(db, tenants, branches).AsNoTracking();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var monthStart = new DateOnly(today.Year, today.Month, 1);

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

        var todaysRevenue = await lrs.Where(l => l.LrDate == today).SumAsync(l => (decimal?)l.Freight, ct) ?? 0;
        if (todaysRevenue == 0)
            todaysRevenue = await bookings.Where(b => b.BookingDate == today).SumAsync(b => (decimal?)b.Freight, ct) ?? 0;

        var monthlyRevenue = await lrs.Where(l => l.LrDate >= monthStart).SumAsync(l => (decimal?)l.Freight, ct) ?? 0;
        if (monthlyRevenue == 0)
            monthlyRevenue = await bookings.Where(b => b.BookingDate >= monthStart).SumAsync(b => (decimal?)b.Freight, ct) ?? 0;

        var kpis = new List<DashboardHomeKpiDto>
        {
            MakeKpi("Total LR", "totalLr", totalLr, await TrendCountAsync(lrs, null, ct)),
            MakeKpi("In Transit", "inTransit", inTransit, await TrendCountAsync(lrs, LrStatuses.InTransit, ct)),
            MakeKpi("Delivered", "delivered", delivered, await TrendCountAsync(lrs, "delivered-group", ct)),
            MakeKpi("Pending Delivery", "pendingDelivery", pendingDelivery, await TrendCountAsync(lrs, "pending-delivery", ct), invertTrend: true),
            MakeKpi("Today's Revenue", "todaysRevenue", todaysRevenue, await TrendRevenueAsync(lrs, bookings, 1, ct)),
            MakeKpi("Monthly Revenue", "monthlyRevenue", monthlyRevenue, await TrendRevenueAsync(lrs, bookings, 30, ct)),
        };

        var lrTrend = await BuildLrTrendAsync(lrs, ct);
        var (slices, statusTotal) = await BuildStatusSummaryAsync(lrs, ct);
        var topDestinations = await BuildTopDestinationsAsync(lrs, bookings, ct);

        var recentLrs = (await lrs
            .OrderByDescending(l => l.LrDate).ThenByDescending(l => l.LrNumber)
            .Take(8)
            .ToListAsync(ct))
            .Select(l => new DashboardHomeRecentLrDto(
                l.LrNumber,
                l.LrDate.ToString("dd/MM/yyyy"),
                l.CustomerName ?? l.Consignor ?? "—",
                l.FromCity,
                l.ToCity,
                l.Status))
            .ToList();

        var pendingDeliveries = (await lrs
            .Where(l => l.Status == LrStatuses.InTransit ||
                        l.Status == LrStatuses.TransitPassGenerated ||
                        l.Status == LrStatuses.LoadingCompleted)
            .OrderBy(l => l.LrDate)
            .Take(8)
            .ToListAsync(ct))
            .Select(l => new DashboardHomePendingDeliveryDto(
                l.LrNumber,
                l.ToCity,
                l.CustomerName ?? l.Consignor ?? "—",
                l.LrDate.AddDays(3).ToString("dd/MM/yyyy")))
            .ToList();

        var notifications = await BuildNotificationsAsync(lrs, ct);

        return new DashboardHomeDto(
            kpis, lrTrend, slices, statusTotal, topDestinations,
            recentLrs, pendingDeliveries, notifications, DateTime.UtcNow);
    }

    static DashboardHomeKpiDto MakeKpi(string label, string key, decimal value, decimal? trendPct, bool invertTrend = false)
    {
        var up = trendPct >= 0;
        if (invertTrend) up = !up;
        return new DashboardHomeKpiDto(label, key, value, trendPct.HasValue ? Math.Abs(Math.Round(trendPct.Value, 1)) : null, up);
    }

    async Task<decimal?> TrendCountAsync(IQueryable<LorryReceipt> lrs, string? statusFilter, CancellationToken ct)
    {
        var end = DateOnly.FromDateTime(DateTime.UtcNow);
        var curStart = end.AddDays(-6);
        var prevStart = end.AddDays(-13);
        var prevEnd = end.AddDays(-7);

        async Task<int> CountRangeAsync(DateOnly from, DateOnly to)
        {
            var q = lrs.Where(l => l.LrDate >= from && l.LrDate <= to);
            q = statusFilter switch
            {
                LrStatuses.InTransit => q.Where(l => l.Status == LrStatuses.InTransit),
                "delivered-group" => q.Where(l =>
                    l.Status == LrStatuses.DeliveryCompleted || l.Status == LrStatuses.PodUploaded ||
                    l.Status == LrStatuses.Closed),
                "pending-delivery" => q.Where(l =>
                    l.Status != LrStatuses.Closed && l.Status != LrStatuses.DeliveryCompleted &&
                    l.Status != LrStatuses.PodUploaded && l.Status != LrStatuses.Draft),
                null => q,
                _ => q.Where(l => l.Status == statusFilter),
            };
            return await q.CountAsync(ct);
        }

        var cur = await CountRangeAsync(curStart, end);
        var prev = await CountRangeAsync(prevStart, prevEnd);
        if (prev == 0) return cur > 0 ? 100 : 0;
        return Math.Round(100m * (cur - prev) / prev, 1);
    }

    async Task<decimal?> TrendRevenueAsync(
        IQueryable<LorryReceipt> lrs,
        IQueryable<Booking> bookings,
        int days,
        CancellationToken ct)
    {
        var end = DateOnly.FromDateTime(DateTime.UtcNow);
        var curStart = end.AddDays(-(days - 1));
        var span = days;
        var prevStart = curStart.AddDays(-span);
        var prevEnd = curStart.AddDays(-1);

        async Task<decimal> SumLr(DateOnly from, DateOnly to) =>
            await lrs.Where(l => l.LrDate >= from && l.LrDate <= to).SumAsync(l => (decimal?)l.Freight, ct) ?? 0;

        var cur = await SumLr(curStart, end);
        var prev = await SumLr(prevStart, prevEnd);
        if (cur == 0)
        {
            cur = await bookings.Where(b => b.BookingDate >= curStart && b.BookingDate <= end)
                .SumAsync(b => (decimal?)b.Freight, ct) ?? 0;
            prev = await bookings.Where(b => b.BookingDate >= prevStart && b.BookingDate <= prevEnd)
                .SumAsync(b => (decimal?)b.Freight, ct) ?? 0;
        }
        if (prev == 0) return cur > 0 ? 100 : 0;
        return Math.Round(100m * (cur - prev) / prev, 1);
    }

    async Task<IReadOnlyList<DashboardHomeTrendPointDto>> BuildLrTrendAsync(
        IQueryable<LorryReceipt> lrs, CancellationToken ct)
    {
        var end = DateOnly.FromDateTime(DateTime.UtcNow);
        var start = end.AddDays(-6);
        var rows = await lrs.Where(l => l.LrDate >= start && l.LrDate <= end).ToListAsync(ct);
        var points = new List<DashboardHomeTrendPointDto>();
        for (var d = start; d <= end; d = d.AddDays(1))
        {
            var dayRows = rows.Where(l => l.LrDate == d).ToList();
            points.Add(new DashboardHomeTrendPointDto(
                d.ToString("dd MMM"),
                dayRows.Count,
                dayRows.Count(l => l.Status is LrStatuses.DeliveryCompleted or LrStatuses.PodUploaded or LrStatuses.Closed),
                dayRows.Count(l => l.Status is LrStatuses.LRCreated or LrStatuses.LoadingCompleted or LrStatuses.InTransit)));
        }
        return points;
    }

    async Task<(IReadOnlyList<DashboardHomeStatusSliceDto>, int)> BuildStatusSummaryAsync(
        IQueryable<LorryReceipt> lrs, CancellationToken ct)
    {
        var total = await lrs.CountAsync(ct);
        if (total == 0) return ([], 0);

        var delivered = await lrs.CountAsync(l =>
            l.Status == LrStatuses.DeliveryCompleted || l.Status == LrStatuses.PodUploaded ||
            l.Status == LrStatuses.Closed || l.Status == LrStatuses.InvoiceGenerated ||
            l.Status == LrStatuses.ExpenseAdded || l.Status == LrStatuses.ExpenseApproved, ct);
        var inTransit = await lrs.CountAsync(l => l.Status == LrStatuses.InTransit, ct);
        var pending = await lrs.CountAsync(l =>
            l.Status == LrStatuses.LRCreated || l.Status == LrStatuses.LoadingCompleted ||
            l.Status == LrStatuses.TransitPassGenerated || l.Status == LrStatuses.Draft, ct);
        var cancelled = await lrs.CountAsync(l => l.Status == "Cancelled", ct);

        decimal Pct(int n) => total == 0 ? 0 : Math.Round(100m * n / total, 1);

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

    async Task<IReadOnlyList<DashboardHomeDestinationDto>> BuildTopDestinationsAsync(
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

    async Task<IReadOnlyList<DashboardHomeNotificationDto>> BuildNotificationsAsync(
        IQueryable<LorryReceipt> lrs, CancellationToken ct)
    {
        var pendingVehicle = await lrs.CountAsync(l =>
            l.Status == LrStatuses.LoadingCompleted && string.IsNullOrEmpty(l.VehicleNumber), ct);
        var pendingExpense = await lrs.CountAsync(l =>
            l.Status == LrStatuses.ExpenseAdded || l.Status == LrStatuses.InvoiceGenerated, ct);

        var list = new List<DashboardHomeNotificationDto>();
        if (pendingVehicle > 0)
            list.Add(new("n-vehicle", "warning", "Vehicle assignment pending",
                $"{pendingVehicle} LR waiting for vehicle assignment", null, "/lr?status=vehicle-assigned"));
        if (pendingExpense > 0)
            list.Add(new("n-expense", "info", "Expense approval pending",
                $"{pendingExpense} LR pending expense approval", null, "/lr?status=expense-pending"));

        var recent = await lrs.OrderByDescending(l => l.UpdatedAt).Take(3).ToListAsync(ct);
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
