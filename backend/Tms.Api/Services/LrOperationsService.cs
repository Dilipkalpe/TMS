using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public static class LrOperationStages
{
    public const string LrList = "lr-list";
    public const string LoadingPending = "loading-pending";
    public const string LoadingSheet = "loading-sheet";
    public const string TransitPass = "transit-pass";
    public const string Dispatch = "dispatch";
    public const string Delivery = "delivery";
    public const string PodPending = "pod-pending";
    public const string InvoicePending = "invoice-pending";
    public const string ExpensePending = "expense-pending";
    public const string Closed = "closed";

    // Legacy operation desk routes (redirected from /operations/*)
    public const string LrManagement = "lr-management";
    public const string Loading = "loading";
    public const string Invoice = "invoice";
    public const string Expense = "expense";
    public const string ExpenseApproval = "expense-approval";
    public const string Closing = "closing";

    public static readonly IReadOnlyList<string> WorkflowTabs =
    [
        LrList, LoadingPending, LoadingSheet, TransitPass, Dispatch, Delivery,
        PodPending, InvoicePending, ExpensePending, Closed,
    ];

    public static readonly IReadOnlyList<string> All =
    [
        ..WorkflowTabs,
        LrManagement, Loading, Invoice, Expense, ExpenseApproval, Closing,
    ];

    public static string Normalize(string stage) => stage switch
    {
        LrManagement or Loading => LoadingPending,
        "delivery-management" or "delivery" => Delivery,
        "invoice" => InvoicePending,
        "expense" or "lr-expenses" => ExpensePending,
        "lr-closing" or Closing => Closed,
        _ => stage,
    };
}

public static class LrOperationsService
{
    public static (string Label, string? ProcessStep) ResolveNextAction(string? status)
    {
        return status switch
        {
            LrStatuses.Draft => ("Edit LR", null),
            LrStatuses.LRCreated => ("Create Loading", "loading"),
            LrStatuses.LoadingCompleted => ("Generate Transit Pass", "transit"),
            LrStatuses.TransitPassGenerated => ("Dispatch Vehicle", "delivery"),
            LrStatuses.InTransit => ("Confirm Delivery", "delivery"),
            LrStatuses.DeliveryCompleted => ("Upload POD", "delivery"),
            LrStatuses.PodUploaded => ("Generate Invoice", "invoice"),
            LrStatuses.InvoiceGenerated => ("Add Expense", "expense"),
            LrStatuses.ExpenseAdded => ("Add Expense", "expense"),
            LrStatuses.ExpenseApproved => ("Close LR", "close"),
            LrStatuses.Closed => ("View LR", null),
            _ => ("Continue", null),
        };
    }

    public static string? ResolveProcessStep(string stage) => NormalizeStage(stage) switch
    {
        LrOperationStages.LoadingPending or LrOperationStages.LoadingSheet => "loading",
        LrOperationStages.TransitPass => "transit",
        LrOperationStages.Dispatch or LrOperationStages.Delivery or LrOperationStages.PodPending => "delivery",
        LrOperationStages.InvoicePending => "invoice",
        LrOperationStages.ExpensePending => "expense",
        _ => null,
    };

    public static string NextActionLabel(string stage) => NormalizeStage(stage) switch
    {
        LrOperationStages.LrList => "Create Loading",
        LrOperationStages.LoadingPending => "Create Loading",
        LrOperationStages.LoadingSheet => "Create Loading Sheet",
        LrOperationStages.TransitPass => "Generate Transit Pass",
        LrOperationStages.Dispatch => "Dispatch Vehicle",
        LrOperationStages.Delivery => "Confirm Delivery",
        LrOperationStages.PodPending => "Upload POD",
        LrOperationStages.InvoicePending => "Generate Invoice",
        LrOperationStages.ExpensePending => "Add Expense",
        LrOperationStages.Closed => "View",
        _ => "Continue",
    };

    static string NormalizeStage(string stage) => LrOperationStages.Normalize(stage);

    public static IQueryable<LorryReceipt> ApplyStageFilter(
        IQueryable<LorryReceipt> q,
        TmsDbContext db,
        string stage)
    {
        stage = NormalizeStage(stage);
        return stage switch
        {
            LrOperationStages.LrList => q.Where(l => l.Status != LrStatuses.Closed),
            LrOperationStages.LoadingPending => q.Where(l => l.Status == LrStatuses.LRCreated),
            LrOperationStages.LoadingSheet => q.Where(l => l.Status == LrStatuses.LRCreated),
            LrOperationStages.TransitPass => q.Where(l => l.Status == LrStatuses.LoadingCompleted),
            LrOperationStages.Dispatch => q.Where(l => l.Status == LrStatuses.TransitPassGenerated),
            LrOperationStages.Delivery => q.Where(l => l.Status == LrStatuses.InTransit),
            LrOperationStages.PodPending => q.Where(l => l.Status == LrStatuses.DeliveryCompleted),
            LrOperationStages.InvoicePending => q.Where(l => l.Status == LrStatuses.PodUploaded),
            LrOperationStages.ExpensePending => q.Where(l =>
                l.Status == LrStatuses.InvoiceGenerated ||
                l.Status == LrStatuses.ExpenseAdded),
            LrOperationStages.Closed => q.Where(l => l.Status == LrStatuses.Closed),
            _ => q.Where(_ => false),
        };
    }

    public static async Task<Dictionary<string, int>> CountByStageAsync(
        IQueryable<LorryReceipt> baseLrs,
        TmsDbContext db,
        CancellationToken ct = default)
    {
        var counts = new Dictionary<string, int>();
        foreach (var stage in LrOperationStages.WorkflowTabs)
            counts[stage] = await ApplyStageFilter(baseLrs, db, stage).CountAsync(ct);

        return counts;
    }
}
