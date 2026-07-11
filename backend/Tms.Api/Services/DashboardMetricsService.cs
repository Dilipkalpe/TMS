using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public static class DashboardMetricsService
{
    public static async Task<decimal> TotalExpensesAsync(TmsDbContext db, ITenantContext tenants, IBranchContext branches, CancellationToken ct = default)
    {
        var general = await tenants.Filter(branches.Filter(db.Expenses.AsQueryable())).SumAsync(e => e.Amount, ct);
        var booking = await FilterBookingExpenses(db, tenants, branches).SumAsync(e => e.Amount, ct);
        var broker = await FilterBrokerCharges(db, tenants, branches).SumAsync(c => c.Amount, ct);
        return general + booking + broker;
    }

    public static async Task<List<(int Month, decimal Amount)>> MonthlyExpenseTotalsAsync(
        TmsDbContext db, ITenantContext tenants, IBranchContext branches, CancellationToken ct = default)
    {
        var general = await tenants.Filter(branches.Filter(db.Expenses.AsQueryable()))
            .GroupBy(e => new { e.ExpenseDate.Year, e.ExpenseDate.Month })
            .Select(g => new { g.Key.Month, amount = g.Sum(e => e.Amount) })
            .ToListAsync(ct);

        var booking = await FilterBookingExpenses(db, tenants, branches)
            .GroupBy(e => new { e.ExpenseDate.Year, e.ExpenseDate.Month })
            .Select(g => new { g.Key.Month, amount = g.Sum(e => e.Amount) })
            .ToListAsync(ct);

        var broker = await FilterBrokerCharges(db, tenants, branches)
            .GroupBy(c => new { c.CreatedAt.Year, c.CreatedAt.Month })
            .Select(g => new { g.Key.Month, amount = g.Sum(c => c.Amount) })
            .ToListAsync(ct);

        return general.Concat(booking).Concat(broker)
            .GroupBy(x => x.Month)
            .Select(g => (g.Key, g.Sum(x => x.amount)))
            .OrderBy(x => x.Key)
            .ToList();
    }

    public static async Task<List<(string Label, decimal Amount)>> ExpenseBreakdownAsync(
        TmsDbContext db, ITenantContext tenants, IBranchContext branches, CancellationToken ct = default)
    {
        var general = await tenants.Filter(branches.Filter(db.Expenses.AsQueryable()))
            .GroupBy(e => e.Category)
            .Select(g => new { label = g.Key, amount = g.Sum(e => e.Amount) })
            .ToListAsync(ct);

        var booking = await FilterBookingExpenses(db, tenants, branches)
            .GroupBy(e => e.Category)
            .Select(g => new { label = g.Key, amount = g.Sum(e => e.Amount) })
            .ToListAsync(ct);

        var brokerTotal = await FilterBrokerCharges(db, tenants, branches).SumAsync(c => c.Amount, ct);

        var merged = general.Concat(booking)
            .GroupBy(x => x.label)
            .Select(g => (Label: g.Key, Amount: g.Sum(x => x.amount)))
            .ToList();

        if (brokerTotal > 0)
            merged.Add(("Broker Charges", brokerTotal));

        return merged.OrderByDescending(x => x.Amount).ToList();
    }

    static IQueryable<BookingExpense> FilterBookingExpenses(TmsDbContext db, ITenantContext tenants, IBranchContext branches)
    {
        var scopedBookings = tenants.Filter(branches.Filter(db.Bookings.AsQueryable())).Select(b => b.Id);
        return db.BookingExpenses.Where(e => scopedBookings.Contains(e.BookingId));
    }

    static IQueryable<BookingBrokerCharge> FilterBrokerCharges(TmsDbContext db, ITenantContext tenants, IBranchContext branches)
    {
        var scopedBookings = tenants.Filter(branches.Filter(db.Bookings.AsQueryable())).Select(b => b.Id);
        return db.BookingBrokerCharges.Where(c => scopedBookings.Contains(c.BookingId));
    }
}
