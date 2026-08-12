using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.DTOs;
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

    public static async Task SetStatusAsync(
        TmsDbContext db,
        LorryReceipt lr,
        string status,
        string? changedBy = null,
        string? remarks = null,
        CancellationToken ct = default)
    {
        var oldStatus = lr.Status;
        if (oldStatus == status) return;

        lr.Status = status;
        lr.UpdatedAt = DateTime.UtcNow;

        db.LrStatusHistories.Add(new LrStatusHistory
        {
            Id = Guid.NewGuid(),
            CompanyId = lr.CompanyId,
            LrNumber = lr.LrNumber,
            OldStatus = oldStatus,
            NewStatus = status,
            ChangedBy = changedBy,
            ChangedAt = DateTime.UtcNow,
            Remarks = remarks,
        });

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
                await SetStatusAsync(db, lr, LrStatuses.ExpenseAdded, ct: ct);
            return;
        }

        if (expenses.All(e => e.Status == "Approved"))
            await SetStatusAsync(db, lr, LrStatuses.ExpenseApproved, ct: ct);
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

    /// <summary>
    /// For LRs that have a loading sheet vehicle but blank LR.VehicleNumber (legacy saves),
    /// fill the DTO vehicle from the loading sheet so LR List shows the assigned vehicle.
    /// </summary>
    public static async Task FillVehicleFromLoadingSheetAsync(
        TmsDbContext db, List<LrDto> dtos, CancellationToken ct = default)
    {
        var missing = dtos
            .Where(d => string.IsNullOrWhiteSpace(d.Vehicle))
            .Select(d => d.LrNumber)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        if (missing.Count == 0) return;

        var map = await LoadVehicleByLrAsync(db, missing, ct);
        if (map.Count == 0) return;

        for (var i = 0; i < dtos.Count; i++)
        {
            if (!string.IsNullOrWhiteSpace(dtos[i].Vehicle)) continue;
            if (map.TryGetValue(dtos[i].LrNumber, out var vehicle))
                dtos[i] = dtos[i] with { Vehicle = vehicle };
        }
    }

    public static async Task<Dictionary<string, string>> LoadVehicleByLrAsync(
        TmsDbContext db, IReadOnlyList<string> lrNumbers, CancellationToken ct = default)
    {
        if (lrNumbers.Count == 0)
            return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        var rows = await (
            from i in db.LrLoadingSheetItems.AsNoTracking()
            join s in db.LrLoadingSheets.AsNoTracking() on i.LoadingSheetId equals s.Id
            where lrNumbers.Contains(i.LrNumber)
                  && s.VehicleNumber != null && s.VehicleNumber != ""
            orderby s.UpdatedAt descending
            select new { i.LrNumber, s.VehicleNumber }
        ).ToListAsync(ct);

        var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var row in rows)
        {
            if (!map.ContainsKey(row.LrNumber))
                map[row.LrNumber] = row.VehicleNumber!;
        }
        return map;
    }
}
