using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public static class LrOperationStages
{
    public const string LrCreated = "lr-created";
    public const string LoadingPending = "loading-pending";
    public const string LoadingCompleted = "loading-completed";
    public const string VehicleAssigned = "vehicle-assigned";
    public const string TransitPassGenerated = "transit-pass-generated";
    public const string Dispatched = "dispatched";
    public const string Delivered = "delivered";
    public const string PodUploaded = "pod-uploaded";
    public const string InvoiceGenerated = "invoice-generated";
    public const string ExpensePending = "expense-pending";
    public const string ExpenseApproved = "expense-approved";
    public const string Closed = "closed";

    // Legacy aliases
    public const string LrList = "lr-list";
    public const string LoadingSheet = "loading-sheet";
    public const string TransitPass = "transit-pass";
    public const string Dispatch = "dispatch";
    public const string Delivery = "delivery";
    public const string PodPending = "pod-pending";
    public const string InvoicePending = "invoice-pending";
    public const string LrManagement = "lr-management";
    public const string Loading = "loading";
    public const string Invoice = "invoice";
    public const string Expense = "expense";
    public const string ExpenseApproval = "expense-approval";
    public const string Closing = "closing";

    public static readonly IReadOnlyList<string> WorkflowFlow =
    [
        LrCreated, LoadingPending, LoadingCompleted, VehicleAssigned, TransitPassGenerated,
        Dispatched, Delivered, PodUploaded, InvoiceGenerated, ExpensePending, ExpenseApproved, Closed,
    ];

    public static readonly IReadOnlyList<string> All =
    [
        ..WorkflowFlow,
        LrList, LoadingSheet, TransitPass, Dispatch, Delivery, PodPending, InvoicePending,
        LrManagement, Loading, Invoice, Expense, ExpenseApproval, Closing,
    ];

    public static string Normalize(string stage) => stage switch
    {
        LrList or LrManagement => LrCreated,
        LoadingSheet or Loading => LoadingPending,
        TransitPass or "transit-pass" => TransitPassGenerated,
        Dispatch => Dispatched,
        Delivery or PodPending or "pod-pending" => Delivered,
        InvoicePending or Invoice or "invoice-pending" => PodUploaded,
        Expense or "lr-expenses" => ExpensePending,
        Closing or "lr-closing" => Closed,
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
            LrStatuses.ExpenseAdded => ("Approve Expense", "expense"),
            LrStatuses.ExpenseApproved => ("Close LR", "close"),
            LrStatuses.Closed => ("View LR", null),
            _ => ("Continue", null),
        };
    }

    public static string NextActionLabel(string stage) => NormalizeStage(stage) switch
    {
        LrOperationStages.LrCreated => "Create Loading",
        LrOperationStages.LoadingPending => "Create Loading Sheet",
        LrOperationStages.LoadingCompleted => "Assign Vehicle",
        LrOperationStages.VehicleAssigned => "Generate Transit Pass",
        LrOperationStages.TransitPassGenerated => "Dispatch Vehicle",
        LrOperationStages.Dispatched => "Confirm Delivery",
        LrOperationStages.Delivered => "Upload POD",
        LrOperationStages.PodUploaded => "Generate Invoice",
        LrOperationStages.InvoiceGenerated => "Add Expense",
        LrOperationStages.ExpensePending => "Approve Expense",
        LrOperationStages.ExpenseApproved => "Close LR",
        LrOperationStages.Closed => "View LR",
        _ => "Continue",
    };

    public static string? ResolveProcessStep(string stage) => NormalizeStage(stage) switch
    {
        LrOperationStages.LrCreated or LrOperationStages.LoadingPending
            or LrOperationStages.LoadingCompleted or LrOperationStages.VehicleAssigned => "loading",
        LrOperationStages.TransitPassGenerated => "transit",
        LrOperationStages.Dispatched or LrOperationStages.Delivered => "delivery",
        LrOperationStages.PodUploaded => "invoice",
        LrOperationStages.InvoiceGenerated or LrOperationStages.ExpensePending => "expense",
        LrOperationStages.ExpenseApproved => "close",
        _ => null,
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
            LrOperationStages.LrCreated => q.Where(l =>
                l.Status == LrStatuses.Draft || l.Status == LrStatuses.LRCreated),
            LrOperationStages.LoadingPending => q.Where(l => l.Status == LrStatuses.LRCreated),
            LrOperationStages.LoadingCompleted => q.Where(l => l.Status == LrStatuses.LoadingCompleted),
            LrOperationStages.VehicleAssigned => q.Where(l =>
                l.Status == LrStatuses.LoadingCompleted &&
                !db.LrTransitPasses.Any(t => t.LrNumber == l.LrNumber && t.CompanyId == l.CompanyId)),
            LrOperationStages.TransitPassGenerated => q.Where(l => l.Status == LrStatuses.TransitPassGenerated),
            LrOperationStages.Dispatched => q.Where(l => l.Status == LrStatuses.InTransit),
            LrOperationStages.Delivered => q.Where(l => l.Status == LrStatuses.DeliveryCompleted),
            LrOperationStages.PodUploaded => q.Where(l => l.Status == LrStatuses.PodUploaded),
            LrOperationStages.InvoiceGenerated => q.Where(l => l.Status == LrStatuses.InvoiceGenerated),
            LrOperationStages.ExpensePending => q.Where(l =>
                l.Status == LrStatuses.InvoiceGenerated ||
                l.Status == LrStatuses.ExpenseAdded),
            LrOperationStages.ExpenseApproved => q.Where(l => l.Status == LrStatuses.ExpenseApproved),
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
        foreach (var stage in LrOperationStages.WorkflowFlow)
            counts[stage] = await ApplyStageFilter(baseLrs, db, stage).CountAsync(ct);
        return counts;
    }
}
