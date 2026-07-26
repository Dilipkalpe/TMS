using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.DTOs;

namespace Tms.Api.Services;

public record DashboardOverviewDto(
    DashboardKpisDto Kpis,
    IReadOnlyList<BranchSummaryRowDto> BranchSummary,
    IReadOnlyList<NamedCountDto> TopCustomers,
    IReadOnlyList<NamedCountDto> TopRoutes,
    IReadOnlyList<RecentBookingDto> RecentBookings,
    IReadOnlyList<RecentDeliveryDto> RecentDeliveries,
    IReadOnlyList<PendingInvoiceDto> PendingInvoices,
    IReadOnlyList<DashboardAlertDto> Alerts);

public record DashboardKpisDto(
    int TotalBookings,
    int PendingBookings,
    int ActiveTrips,
    int VehiclesInTransit,
    int DeliveredShipments,
    int PendingDeliveries,
    decimal FreightRevenue,
    decimal OutstandingPayments,
    decimal CollectionSummary,
    decimal VehicleUtilisation,
    int DriversAvailable,
    int DriversTotal,
    int PendingInvoices);

public record BranchSummaryRowDto(
    Guid BranchId,
    string BranchCode,
    string BranchName,
    int Bookings,
    decimal Revenue,
    int Delivered,
    int PendingDelivery,
    decimal DeliveryPerformancePct);

public record NamedCountDto(string Name, int Count, decimal Amount = 0);
public record RecentDeliveryDto(string Id, string Customer, string Route, string Date, string Status);
public record PendingInvoiceDto(string InvoiceNo, string? CustomerName, decimal Balance, string Status, string InvoiceDate);
public record DashboardAlertDto(string Type, string Title, string Message, string Severity);

/// <summary>Server-side aggregated dashboard KPIs scoped by company + branch.</summary>
public class DashboardOverviewService(TmsDbContext db, ITenantContext tenants, IBranchContext branches)
{
    public async Task<DashboardOverviewDto> BuildAsync(CancellationToken ct = default)
    {
        var bookings = TenantScope.Bookings(db, tenants, branches).AsNoTracking();
        var vehicles = TenantScope.Vehicles(db, tenants, branches).AsNoTracking();
        var drivers = TenantScope.Drivers(db, tenants, branches).AsNoTracking();
        var trips = TenantScope.Trips(db, tenants, branches).AsNoTracking();
        var invoices = tenants.Filter(branches.Filter(db.FreightInvoices.AsNoTracking()));

        var totalBookings = await bookings.CountAsync(ct);
        var pendingBookings = await bookings.CountAsync(b => b.Status == "Pending" || b.Status == "Confirmed", ct);
        var activeTrips = await trips.CountAsync(t => t.Status == "IN_TRANSIT" || t.Status == "ASSIGNED" || t.Status == "PLANNED", ct);
        var vehiclesInTransit = await vehicles.CountAsync(v => v.Status == "On Trip" || v.Status == "In Transit", ct);
        var deliveredShipments = await bookings.CountAsync(b => b.Status == "Delivered", ct);
        var pendingDeliveries = await bookings.CountAsync(b => b.Status != "Delivered" && b.Status != "Cancelled", ct);
        var freightRevenue = await bookings.SumAsync(b => (decimal?)b.Freight, ct) ?? 0;
        var outstandingPayments = await bookings
            .Where(b => b.Balance > 0 && b.Status != "Cancelled")
            .SumAsync(b => (decimal?)b.Balance, ct) ?? 0;
        var collectionSummary = await bookings
            .Where(b => b.Status != "Cancelled")
            .SumAsync(b => (decimal?)b.Advance, ct) ?? 0;
        var driversTotal = await drivers.CountAsync(ct);
        var driversAvailable = await drivers.CountAsync(d => d.Status == "Active", ct);
        var vehicleCount = await vehicles.CountAsync(ct);
        var vehiclesBusy = await vehicles.CountAsync(v => v.Status == "On Trip" || v.Status == "In Transit" || v.Status == "Active", ct);
        var vehicleUtilisation = vehicleCount == 0 ? 0 : Math.Round(100m * vehiclesBusy / vehicleCount, 1);
        var pendingInvoicesCount = await invoices.CountAsync(i => i.Balance > 0 && i.Status != "Cancelled" && i.Status != "Paid", ct);

        var kpis = new DashboardKpisDto(
            totalBookings,
            pendingBookings,
            activeTrips,
            vehiclesInTransit,
            deliveredShipments,
            pendingDeliveries,
            freightRevenue,
            outstandingPayments,
            collectionSummary,
            vehicleUtilisation,
            driversAvailable,
            driversTotal,
            pendingInvoicesCount);

        var branchSummary = await BuildBranchSummaryAsync(ct);
        var topCustomers = (await bookings
            .GroupBy(b => b.CustomerName)
            .Select(g => new { Name = g.Key, Count = g.Count(), Amount = g.Sum(x => x.Freight) })
            .OrderByDescending(x => x.Amount)
            .Take(5)
            .ToListAsync(ct))
            .Select(x => new NamedCountDto(x.Name, x.Count, x.Amount))
            .ToList();

        var topRoutes = (await bookings
            .GroupBy(b => b.FromCity + " → " + b.ToCity)
            .Select(g => new { Name = g.Key, Count = g.Count(), Amount = g.Sum(x => x.Freight) })
            .OrderByDescending(x => x.Count)
            .Take(5)
            .ToListAsync(ct))
            .Select(x => new NamedCountDto(x.Name, x.Count, x.Amount))
            .ToList();

        var recentBookings = (await bookings
            .OrderByDescending(b => b.BookingDate).ThenByDescending(b => b.Id)
            .Take(8)
            .ToListAsync(ct))
            .Select(b => new RecentBookingDto(
                b.Id, b.CustomerName, $"{b.FromCity} → {b.ToCity}",
                b.BookingDate.ToString("yyyy-MM-dd"), b.Status, b.Payment))
            .ToList();

        var recentDeliveries = (await bookings
            .Where(b => b.Status == "Delivered")
            .OrderByDescending(b => b.UpdatedAt)
            .Take(8)
            .ToListAsync(ct))
            .Select(b => new RecentDeliveryDto(
                b.Id, b.CustomerName, $"{b.FromCity} → {b.ToCity}",
                b.UpdatedAt.ToString("yyyy-MM-dd"), b.Status))
            .ToList();

        var pendingInvoices = (await invoices
            .Where(i => i.Balance > 0 && i.Status != "Cancelled" && i.Status != "Paid")
            .OrderByDescending(i => i.InvoiceDate)
            .Take(8)
            .ToListAsync(ct))
            .Select(i => new PendingInvoiceDto(
                i.InvoiceNo, i.CustomerName, i.Balance, i.Status,
                i.InvoiceDate.ToString("yyyy-MM-dd")))
            .ToList();

        var alerts = new List<DashboardAlertDto>();
        if (outstandingPayments > 100000)
            alerts.Add(new DashboardAlertDto("finance", "High receivable", $"Outstanding payments ₹{outstandingPayments:N0}", "warning"));
        if (pendingDeliveries > 0)
            alerts.Add(new DashboardAlertDto("ops", "Pending deliveries", $"{pendingDeliveries} shipment(s) awaiting delivery", "info"));
        if (pendingInvoicesCount > 0)
            alerts.Add(new DashboardAlertDto("finance", "Pending invoices", $"{pendingInvoicesCount} invoice(s) with balance due", "warning"));
        if (driversAvailable == 0 && driversTotal > 0)
            alerts.Add(new DashboardAlertDto("fleet", "No drivers available", "All drivers are unavailable", "danger"));

        return new DashboardOverviewDto(
            kpis, branchSummary, topCustomers, topRoutes,
            recentBookings, recentDeliveries, pendingInvoices, alerts);
    }

    async Task<IReadOnlyList<BranchSummaryRowDto>> BuildBranchSummaryAsync(CancellationToken ct)
    {
        var branchQ = tenants.Filter(db.Branches.AsNoTracking().Where(b => b.IsActive));
        if (branches.EffectiveBranchId != null)
            branchQ = branchQ.Where(b => b.Id == branches.EffectiveBranchId);

        var branchList = await branchQ.OrderBy(b => b.IsHeadOffice ? 0 : 1).ThenBy(b => b.Name).ToListAsync(ct);
        if (branchList.Count == 0) return [];

        var companyBookings = tenants.Filter(db.Bookings.AsNoTracking());
        if (branches.EffectiveBranchId != null)
            companyBookings = companyBookings.Where(b => b.BranchId == branches.EffectiveBranchId);

        var aggregates = await companyBookings
            .Where(b => b.BranchId != null)
            .GroupBy(b => b.BranchId!.Value)
            .Select(g => new
            {
                BranchId = g.Key,
                Bookings = g.Count(),
                Revenue = g.Sum(x => x.Freight),
                Delivered = g.Count(x => x.Status == "Delivered"),
                PendingDelivery = g.Count(x => x.Status != "Delivered" && x.Status != "Cancelled"),
            })
            .ToListAsync(ct);

        var byId = aggregates.ToDictionary(a => a.BranchId);
        return branchList.Select(b =>
        {
            byId.TryGetValue(b.Id, out var a);
            var delivered = a?.Delivered ?? 0;
            var pending = a?.PendingDelivery ?? 0;
            var denom = delivered + pending;
            var pct = denom == 0 ? 0 : Math.Round(100m * delivered / denom, 1);
            return new BranchSummaryRowDto(
                b.Id, b.Code, b.Name,
                a?.Bookings ?? 0,
                a?.Revenue ?? 0,
                delivered,
                pending,
                pct);
        }).ToList();
    }
}
