using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public static class LrProcessService
{
    public static async Task<LorryReceipt?> FindLrAsync(
        TmsDbContext db, ITenantContext tenants, IBranchContext branches, string lrNumber, CancellationToken ct = default)
    {
        lrNumber = DocumentCodeRules.DecodePathId(lrNumber);
        var lr = await db.LorryReceipts.FirstOrDefaultAsync(l => l.LrNumber == lrNumber, ct);
        if (lr == null || !TenantScope.CanAccessBranchEntity(tenants, branches, lr)) return null;
        return lr;
    }

    public static async Task SetStatusAsync(TmsDbContext db, LorryReceipt lr, string status, CancellationToken ct = default)
    {
        lr.Status = status;
        lr.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    public static async Task SyncExpenseStatusAsync(TmsDbContext db, LorryReceipt lr, CancellationToken ct = default)
    {
        var expenses = await db.LrExpenses
            .Where(e => e.LrNumber == lr.LrNumber && e.CompanyId == lr.CompanyId)
            .ToListAsync(ct);
        if (expenses.Count == 0) return;

        if (expenses.Any(e => e.Status == "Pending"))
        {
            if (lr.Status != LrStatuses.ExpenseAdded && lr.Status != LrStatuses.ExpenseApproved)
                await SetStatusAsync(db, lr, LrStatuses.ExpenseAdded, ct);
            return;
        }

        if (expenses.All(e => e.Status == "Approved"))
            await SetStatusAsync(db, lr, LrStatuses.ExpenseApproved, ct);
    }

    public static void EnsureStatusAtLeast(LorryReceipt lr, params string[] allowedPriorStatuses)
    {
        if (lr.Status == LrStatuses.Closed)
            throw new InvalidOperationException("LR is closed and cannot be modified.");

        if (allowedPriorStatuses.Length == 0) return;

        var order = LrStatuses.All.ToList();
        var currentIdx = order.IndexOf(lr.Status);
        if (currentIdx < 0) currentIdx = order.IndexOf(LrStatuses.LRCreated);

        var minRequired = allowedPriorStatuses
            .Select(s => order.IndexOf(s))
            .Where(i => i >= 0)
            .DefaultIfEmpty(0)
            .Max();

        if (currentIdx < minRequired)
        {
            var required = allowedPriorStatuses.FirstOrDefault(s => order.IndexOf(s) == minRequired) ?? allowedPriorStatuses[0];
            throw new InvalidOperationException($"Complete prior step first. Required status: {required}. Current: {lr.Status}.");
        }
    }
}
