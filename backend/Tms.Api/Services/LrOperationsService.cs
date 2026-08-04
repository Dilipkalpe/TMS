using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public static class LrOperationStages
{
    public const string LrManagement = "lr-management";
    public const string Loading = "loading";
    public const string TransitPass = "transit-pass";
    public const string Delivery = "delivery";
    public const string Invoice = "invoice";
    public const string Expense = "expense";
    public const string ExpenseApproval = "expense-approval";
    public const string Closing = "closing";

    public static readonly IReadOnlyList<string> All =
    [
        LrManagement, Loading, TransitPass, Delivery, Invoice, Expense, ExpenseApproval, Closing,
    ];
}

public static class LrOperationsService
{
    public static string? ResolveProcessStep(string stage) => stage switch
    {
        LrOperationStages.Loading => "loading",
        LrOperationStages.TransitPass => "transit",
        LrOperationStages.Delivery => "delivery",
        LrOperationStages.Invoice => "invoice",
        LrOperationStages.Expense => "expense",
        LrOperationStages.Closing => "close",
        _ => null,
    };

    public static string NextActionLabel(string stage) => stage switch
    {
        LrOperationStages.LrManagement => "Review / edit LR",
        LrOperationStages.Loading => "Create loading sheet",
        LrOperationStages.TransitPass => "Generate transit pass",
        LrOperationStages.Delivery => "Update delivery / upload POD",
        LrOperationStages.Invoice => "Generate invoice",
        LrOperationStages.Expense => "Add LR expenses",
        LrOperationStages.ExpenseApproval => "Approve / reject expense",
        LrOperationStages.Closing => "Close LR",
        _ => "Continue",
    };

    public static IQueryable<LorryReceipt> ApplyStageFilter(
        IQueryable<LorryReceipt> q,
        TmsDbContext db,
        string stage)
    {
        return stage switch
        {
            LrOperationStages.LrManagement => q.Where(l =>
                l.Status == LrStatuses.Draft || l.Status == LrStatuses.LRCreated),
            LrOperationStages.Loading => q.Where(l => l.Status == LrStatuses.LRCreated),
            LrOperationStages.TransitPass => q.Where(l => l.Status == LrStatuses.LoadingCompleted),
            LrOperationStages.Delivery => q.Where(l =>
                l.Status == LrStatuses.TransitPassGenerated ||
                l.Status == LrStatuses.InTransit ||
                l.Status == LrStatuses.DeliveryCompleted),
            LrOperationStages.Invoice => q.Where(l =>
                l.Status == LrStatuses.DeliveryCompleted ||
                l.Status == LrStatuses.PodUploaded),
            LrOperationStages.Expense => q.Where(l =>
                l.Status == LrStatuses.InvoiceGenerated ||
                l.Status == LrStatuses.ExpenseAdded),
            LrOperationStages.Closing => q.Where(l =>
                l.Status == LrStatuses.ExpenseApproved ||
                (l.Status == LrStatuses.InvoiceGenerated &&
                 !db.LrExpenses.Any(e => e.LrNumber == l.LrNumber && e.CompanyId == l.CompanyId))),
            _ => q.Where(_ => false),
        };
    }

    public static async Task<Dictionary<string, int>> CountByStageAsync(
        IQueryable<LorryReceipt> baseLrs,
        TmsDbContext db,
        ITenantContext tenants,
        CancellationToken ct = default)
    {
        var counts = new Dictionary<string, int>();
        foreach (var stage in LrOperationStages.All)
        {
            if (stage == LrOperationStages.ExpenseApproval)
            {
                counts[stage] = await tenants.Filter(db.LrExpenses.AsNoTracking()
                    .Where(e => e.Status == "Pending")).CountAsync(ct);
                continue;
            }

            counts[stage] = await ApplyStageFilter(baseLrs, db, stage).CountAsync(ct);
        }

        return counts;
    }
}
