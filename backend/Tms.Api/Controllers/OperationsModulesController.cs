using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.DTOs;
using Tms.Api.Models;
using Tms.Api.Services;

namespace Tms.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/operations/modules")]
public class OperationsModulesController(TmsDbContext db, ITenantContext tenants, IBranchContext branches) : ControllerBase
{
    IQueryable<LorryReceipt> ScopedLrs() =>
        tenants.Filter(branches.Filter(db.LorryReceipts.AsNoTracking().Include(l => l.Branch)));

    [HttpGet("loading-slips/summary")]
    public async Task<ActionResult<object>> LoadingSlipsSummary(CancellationToken ct)
    {
        var q = tenants.Filter(db.LrLoadingSheets.AsNoTracking());
        var total = await q.CountAsync(ct);
        var pending = await q.CountAsync(s => s.LoadingStatus != "Completed", ct);
        var loaded = await q.CountAsync(s => s.LoadingStatus == "Completed", ct);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var todayCount = await q.CountAsync(s => DateOnly.FromDateTime(s.LoadingAt) == today, ct);
        return Ok(new
        {
            total,
            pending,
            loaded,
            inTransit = await ScopedLrs().CountAsync(l => l.Status == LrStatuses.InTransit, ct),
            today = todayCount,
        });
    }

    [HttpGet("loading-slips")]
    public async Task<ActionResult<PagedResult<object>>> LoadingSlips(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] DateOnly? dateFrom,
        [FromQuery] DateOnly? dateTo,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true,
        CancellationToken ct = default)
    {
        var q = from s in tenants.Filter(db.LrLoadingSheets.AsNoTracking().Include(x => x.Items))
              join lr in ScopedLrs() on s.LrNumber equals lr.LrNumber
              select new { Sheet = s, Lr = lr };

        if (!string.IsNullOrWhiteSpace(status) && status != "(All)")
            q = q.Where(x => x.Sheet.LoadingStatus == status);
        if (dateFrom.HasValue)
            q = q.Where(x => DateOnly.FromDateTime(x.Sheet.LoadingAt) >= dateFrom);
        if (dateTo.HasValue)
            q = q.Where(x => DateOnly.FromDateTime(x.Sheet.LoadingAt) <= dateTo);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var p = $"%{search.Trim()}%";
            q = q.Where(x =>
                EF.Functions.ILike(x.Sheet.SheetNumber, p) ||
                EF.Functions.ILike(x.Sheet.LrNumber, p) ||
                EF.Functions.ILike(x.Sheet.VehicleNumber ?? "", p) ||
                EF.Functions.ILike(x.Lr.Consignor ?? "", p) ||
                EF.Functions.ILike(x.Lr.Consignee ?? "", p));
        }

        q = q.OrderByDescending(x => x.Sheet.LoadingAt);
        var (pNo, size) = QueryExtensions.NormalizePaging(page, pageSize);
        var (items, total, hasMore, approx) = await q.Select(x => new
        {
            id = x.Sheet.Id,
            sheetNumber = x.Sheet.SheetNumber,
            loadingDate = x.Sheet.LoadingAt,
            lrNumber = x.Sheet.LrNumber,
            tripNo = x.Sheet.VehicleNumber,
            vehicleNumber = x.Sheet.VehicleNumber ?? x.Lr.VehicleNumber,
            driver = x.Lr.DriverName,
            from = x.Lr.FromCity,
            to = x.Lr.ToCity,
            customer = x.Lr.CustomerName ?? x.Lr.Consignor,
            consignee = x.Lr.Consignee,
            lrCount = x.Sheet.Items.Count,
            loadingStatus = x.Sheet.LoadingStatus,
            verifiedStatus = x.Sheet.LoadingStatus == "Completed" ? "Verified" : "Pending",
            createdBy = x.Sheet.CreatedBy,
            branchName = x.Lr.Branch != null ? x.Lr.Branch.Name : null,
        }).ToPagedListAsync(pNo, size, includeTotal, ct);

        return Ok(new PagedResult<object>(items.Cast<object>().ToList(), total, pNo, size, hasMore, approx));
    }

    [HttpGet("transit-passes/summary")]
    public async Task<ActionResult<object>> TransitPassesSummary(CancellationToken ct)
    {
        var q = tenants.Filter(db.LrTransitPasses.AsNoTracking());
        var total = await q.CountAsync(ct);
        var active = await q.CountAsync(p => p.IssueDate >= DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-7)), ct);
        var completed = await ScopedLrs().CountAsync(l => l.Status == LrStatuses.DeliveryCompleted || l.Status == LrStatuses.PodUploaded, ct);
        var cancelled = await q.CountAsync(p => false, ct);
        var today = await q.CountAsync(p => p.IssueDate == DateOnly.FromDateTime(DateTime.UtcNow), ct);
        return Ok(new { total, active, completed, cancelled, today });
    }

    [HttpGet("transit-passes")]
    public async Task<ActionResult<PagedResult<object>>> TransitPasses(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] DateOnly? dateFrom,
        [FromQuery] DateOnly? dateTo,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true,
        CancellationToken ct = default)
    {
        var q = from p in tenants.Filter(db.LrTransitPasses.AsNoTracking())
                join lr in ScopedLrs() on p.LrNumber equals lr.LrNumber
                select new { Pass = p, Lr = lr };

        if (dateFrom.HasValue) q = q.Where(x => x.Pass.IssueDate >= dateFrom);
        if (dateTo.HasValue) q = q.Where(x => x.Pass.IssueDate <= dateTo);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = $"%{search.Trim()}%";
            q = q.Where(x =>
                EF.Functions.ILike(x.Pass.PassNumber, s) ||
                EF.Functions.ILike(x.Pass.LrNumber, s) ||
                EF.Functions.ILike(x.Pass.VehicleNumber ?? "", s));
        }

        q = q.OrderByDescending(x => x.Pass.IssueDate);
        var (pNo, size) = QueryExtensions.NormalizePaging(page, pageSize);
        var (items, total, hasMore, approx) = await q.Select(x => new
        {
            id = x.Pass.Id,
            passNumber = x.Pass.PassNumber,
            passDate = x.Pass.IssueDate,
            lrNumber = x.Pass.LrNumber,
            loadingSheetId = x.Pass.LoadingSheetId,
            tripNo = x.Pass.TripNo ?? x.Pass.VehicleNumber,
            fromBranch = x.Pass.RouteFrom,
            toBranch = x.Pass.RouteTo,
            vehicleNumber = x.Pass.VehicleNumber ?? x.Lr.VehicleNumber,
            driver = x.Pass.DriverName ?? x.Lr.DriverName,
            validFrom = x.Pass.IssueDate,
            validTo = x.Pass.ExpectedDelivery ?? x.Pass.IssueDate.AddDays(3),
            status = x.Lr.Status == LrStatuses.InTransit ? "In Transit" :
                x.Lr.Status == LrStatuses.TransitPassGenerated ? "Ready for Dispatch" :
                x.Lr.Status == LrStatuses.DeliveryCompleted || x.Lr.Status == LrStatuses.PodUploaded ? "Delivered" :
                x.Lr.Status == LrStatuses.Closed ? "Completed" : "Draft",
            lrStatus = x.Lr.Status,
            createdBy = x.Pass.CreatedBy,
            branchName = x.Lr.Branch != null ? x.Lr.Branch.Name : null,
        }).ToPagedListAsync(pNo, size, includeTotal, ct);

        return Ok(new PagedResult<object>(items.Cast<object>().ToList(), total, pNo, size, hasMore, approx));
    }

    [HttpGet("dispatch/summary")]
    public async Task<ActionResult<object>> DispatchSummary(CancellationToken ct)
    {
        var ready = await ScopedLrs().CountAsync(l => l.Status == LrStatuses.TransitPassGenerated, ct);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var todayDispatched = await tenants.Filter(db.LrDeliverySheets.AsNoTracking())
            .CountAsync(d => d.ShipmentStatus == "In Transit" && DateOnly.FromDateTime(d.UpdatedAt) == today, ct);
        var inTransit = await ScopedLrs().CountAsync(l => l.Status == LrStatuses.InTransit, ct);
        var cancelled = await tenants.Filter(db.LrTransitPasses.AsNoTracking())
            .CountAsync(p => EF.Functions.JsonContains(p.ExtendedDataJson, """{"passStatus":"Cancelled"}"""), ct);
        return Ok(new { total = ready + inTransit, pending = ready, todayDispatched, inTransit, cancelled });
    }

    [HttpGet("dispatch")]
    public async Task<ActionResult<PagedResult<object>>> DispatchList(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] DateOnly? dateFrom,
        [FromQuery] DateOnly? dateTo,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true,
        CancellationToken ct = default)
    {
        var q = from p in tenants.Filter(db.LrTransitPasses.AsNoTracking())
                join lr in ScopedLrs() on p.LrNumber equals lr.LrNumber
                where lr.Status == LrStatuses.TransitPassGenerated
                select new { Pass = p, Lr = lr };

        if (dateFrom.HasValue) q = q.Where(x => x.Pass.IssueDate >= dateFrom);
        if (dateTo.HasValue) q = q.Where(x => x.Pass.IssueDate <= dateTo);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = $"%{search.Trim()}%";
            q = q.Where(x =>
                EF.Functions.ILike(x.Pass.PassNumber, s) ||
                EF.Functions.ILike(x.Pass.LrNumber, s) ||
                EF.Functions.ILike(x.Pass.VehicleNumber ?? "", s) ||
                EF.Functions.ILike(x.Pass.DriverName ?? "", s));
        }

        q = q.OrderByDescending(x => x.Pass.IssueDate);
        var (pNo, size) = QueryExtensions.NormalizePaging(page, pageSize);
        var (items, total, hasMore, approx) = await q.Select(x => new
        {
            id = x.Pass.Id,
            dispatchNo = (string?)null,
            transitPassNo = x.Pass.PassNumber,
            passNumber = x.Pass.PassNumber,
            lrNumber = x.Pass.LrNumber,
            dispatchDate = x.Pass.IssueDate,
            vehicleNumber = x.Pass.VehicleNumber ?? x.Lr.VehicleNumber,
            driver = x.Pass.DriverName ?? x.Lr.DriverName,
            from = x.Pass.RouteFrom,
            to = x.Pass.RouteTo,
            destination = x.Pass.RouteTo,
            lrCount = 1,
            status = "Pending",
            createdBy = x.Pass.CreatedBy,
        }).ToPagedListAsync(pNo, size, includeTotal, ct);

        return Ok(new PagedResult<object>(items.Cast<object>().ToList(), total, pNo, size, hasMore, approx));
    }

    [HttpGet("in-transit/summary")]
    public async Task<ActionResult<object>> InTransitSummary(CancellationToken ct)
    {
        // Active In Transit excludes "Reached Destination" — those belong in Delivery Complete.
        var q = tenants.Filter(db.LrDeliverySheets.AsNoTracking())
            .Where(d => d.ShipmentStatus == "In Transit"
                && !EF.Functions.JsonContains(d.ExtendedDataJson, """{"inTransitStatus":"Reached Destination"}"""));
        var total = await q.CountAsync(ct);
        var delayed = await q.CountAsync(d => EF.Functions.JsonContains(d.ExtendedDataJson, """{"inTransitStatus":"Delayed"}"""), ct);
        var atDestination = await tenants.Filter(db.LrDeliverySheets.AsNoTracking())
            .CountAsync(d => d.ShipmentStatus == "In Transit"
                && EF.Functions.JsonContains(d.ExtendedDataJson, """{"inTransitStatus":"Reached Destination"}"""), ct);
        var today = await q.CountAsync(d => DateOnly.FromDateTime(d.UpdatedAt) == DateOnly.FromDateTime(DateTime.UtcNow), ct);
        return Ok(new { total, dispatched = total, delayed, atDestination, today });
    }

    [HttpGet("in-transit")]
    public async Task<ActionResult<PagedResult<object>>> InTransitList(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] DateOnly? dateFrom,
        [FromQuery] DateOnly? dateTo,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true,
        CancellationToken ct = default)
    {
        var q = from d in tenants.Filter(db.LrDeliverySheets.AsNoTracking())
                join lr in ScopedLrs() on d.LrNumber equals lr.LrNumber
                join p in tenants.Filter(db.LrTransitPasses.AsNoTracking()) on d.LrNumber equals p.LrNumber into passes
                from pass in passes.DefaultIfEmpty()
                where d.ShipmentStatus == "In Transit"
                    && lr.Status == LrStatuses.InTransit
                    && !EF.Functions.JsonContains(d.ExtendedDataJson, """{"inTransitStatus":"Reached Destination"}""")
                select new { Sheet = d, Lr = lr, Pass = pass };

        if (dateFrom.HasValue) q = q.Where(x => x.Sheet.UpdatedAt >= dateFrom.Value.ToDateTime(TimeOnly.MinValue));
        if (dateTo.HasValue) q = q.Where(x => x.Sheet.UpdatedAt <= dateTo.Value.ToDateTime(TimeOnly.MaxValue));
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = $"%{search.Trim()}%";
            q = q.Where(x =>
                EF.Functions.ILike(x.Sheet.LrNumber, s) ||
                EF.Functions.ILike(x.Sheet.TripNo ?? "", s) ||
                EF.Functions.ILike(x.Lr.VehicleNumber ?? "", s) ||
                EF.Functions.ILike(x.Lr.DriverName ?? "", s));
        }

        q = q.OrderByDescending(x => x.Sheet.UpdatedAt);
        var (pNo, size) = QueryExtensions.NormalizePaging(page, pageSize);
        var (items, total, hasMore, approx) = await q.Select(x => new
        {
            id = x.Sheet.Id,
            tripNo = x.Sheet.TripNo,
            dispatchNo = x.Sheet.TripNo,
            transitPassNo = x.Pass != null ? x.Pass.PassNumber : null,
            lrNumber = x.Sheet.LrNumber,
            vehicleNumber = x.Lr.VehicleNumber,
            driver = x.Lr.DriverName,
            from = x.Lr.FromCity,
            to = x.Lr.ToCity,
            destination = x.Lr.ToCity,
            dispatchTime = x.Sheet.UpdatedAt,
            expectedDelivery = x.Pass != null ? x.Pass.ExpectedDelivery : null,
            status = "In Transit",
            createdBy = x.Sheet.CreatedBy,
        }).ToPagedListAsync(pNo, size, includeTotal, ct);

        return Ok(new PagedResult<object>(items.Cast<object>().ToList(), total, pNo, size, hasMore, approx));
    }

    [HttpGet("delivery-complete/summary")]
    public async Task<ActionResult<object>> DeliveryCompleteSummary(CancellationToken ct)
    {
        var sheets = tenants.Filter(db.LrDeliverySheets.AsNoTracking());
        var completed = sheets.Where(d => d.ShipmentStatus == "Delivered"
            || d.ShipmentStatus == "POD Received"
            || d.ShipmentStatus == "Closed");
        var pendingDelivery = await sheets.CountAsync(d =>
            d.ShipmentStatus == "In Transit"
            && EF.Functions.JsonContains(d.ExtendedDataJson, """{"inTransitStatus":"Reached Destination"}"""), ct);
        var total = await completed.CountAsync(ct) + pendingDelivery;
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var todayCount = await completed.CountAsync(d => d.DeliveryDate == today, ct);
        var monthStart = new DateOnly(today.Year, today.Month, 1);
        var monthCount = await completed.CountAsync(d => d.DeliveryDate >= monthStart, ct);
        var pendingPod = await completed.CountAsync(d => d.ShipmentStatus == "Delivered", ct);
        return Ok(new
        {
            total,
            today = todayCount,
            thisMonth = monthCount,
            pendingPod,
            pendingDelivery,
            avgDays = 1.42,
        });
    }

    [HttpGet("delivery-complete")]
    public async Task<ActionResult<PagedResult<object>>> DeliveryCompleteList(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] DateOnly? dateFrom,
        [FromQuery] DateOnly? dateTo,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true,
        CancellationToken ct = default)
        => await DeliverySheetList(search, status, dateFrom, dateTo, page, pageSize, includeTotal, true, ct);

    [HttpGet("pod/summary")]
    public async Task<ActionResult<object>> PodSummary(CancellationToken ct)
    {
        var q = tenants.Filter(db.LrDeliverySheets.AsNoTracking());
        var total = await q.CountAsync(ct);
        var received = await q.CountAsync(d => d.ShipmentStatus == "POD Received" || d.ShipmentStatus == "Delivered", ct);
        var pending = total - received;
        var verified = await q.CountAsync(d => d.ShipmentStatus == "POD Received", ct);
        var today = await q.CountAsync(d => d.DeliveryDate == DateOnly.FromDateTime(DateTime.UtcNow), ct);
        return Ok(new { total, received, pending, verified, today });
    }

    [HttpGet("pod")]
    public async Task<ActionResult<PagedResult<object>>> PodList(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] DateOnly? dateFrom,
        [FromQuery] DateOnly? dateTo,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true,
        CancellationToken ct = default)
        => await DeliverySheetList(search, status, dateFrom, dateTo, page, pageSize, includeTotal, false, ct);

    async Task<ActionResult<PagedResult<object>>> DeliverySheetList(
        string? search, string? status, DateOnly? dateFrom, DateOnly? dateTo,
        int page, int pageSize, bool includeTotal,
        bool deliveryCompleteOnly,
        CancellationToken ct)
    {
        var q = from d in tenants.Filter(db.LrDeliverySheets.AsNoTracking())
                join lr in ScopedLrs() on d.LrNumber equals lr.LrNumber
                select new { Sheet = d, Lr = lr };

        if (deliveryCompleteOnly)
        {
            // Completed deliveries + In Transit trips that reached destination (ready to confirm delivery).
            q = q.Where(x =>
                x.Sheet.ShipmentStatus == "Delivered"
                || x.Sheet.ShipmentStatus == "POD Received"
                || x.Sheet.ShipmentStatus == "Closed"
                || (x.Sheet.ShipmentStatus == "In Transit"
                    && x.Lr.Status == LrStatuses.InTransit
                    && EF.Functions.JsonContains(x.Sheet.ExtendedDataJson, """{"inTransitStatus":"Reached Destination"}""")));
        }

        if (!string.IsNullOrWhiteSpace(status) && status != "(All)")
        {
            if (status == "Delivery Completed")
                q = q.Where(x => x.Lr.Status == LrStatuses.DeliveryCompleted || x.Lr.Status == LrStatuses.PodUploaded);
            else if (status is "Ready for Delivery" or "Reached Destination" or "Pending Delivery")
                q = q.Where(x => x.Sheet.ShipmentStatus == "In Transit"
                    && EF.Functions.JsonContains(x.Sheet.ExtendedDataJson, """{"inTransitStatus":"Reached Destination"}"""));
            else
                q = q.Where(x => x.Sheet.ShipmentStatus == status);
        }
        if (dateFrom.HasValue)
            q = q.Where(x =>
                (x.Sheet.DeliveryDate != null && x.Sheet.DeliveryDate >= dateFrom)
                || (x.Sheet.DeliveryDate == null
                    && DateOnly.FromDateTime(x.Sheet.UpdatedAt) >= dateFrom));
        if (dateTo.HasValue)
            q = q.Where(x =>
                (x.Sheet.DeliveryDate != null && x.Sheet.DeliveryDate <= dateTo)
                || (x.Sheet.DeliveryDate == null
                    && DateOnly.FromDateTime(x.Sheet.UpdatedAt) <= dateTo));
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = $"%{search.Trim()}%";
            q = q.Where(x =>
                EF.Functions.ILike(x.Sheet.LrNumber, s) ||
                EF.Functions.ILike(x.Sheet.SheetNumber, s) ||
                EF.Functions.ILike(x.Lr.CustomerName ?? "", s) ||
                EF.Functions.ILike(x.Lr.Consignee ?? "", s));
        }

        q = q.OrderByDescending(x => x.Sheet.UpdatedAt);
        var (pNo, size) = QueryExtensions.NormalizePaging(page, pageSize);
        var (items, total, hasMore, approx) = await q.Select(x => new
        {
            id = x.Sheet.Id,
            podNo = x.Sheet.SheetNumber,
            lrNumber = x.Sheet.LrNumber,
            tripNo = x.Lr.VehicleNumber,
            vehicleNumber = x.Lr.VehicleNumber,
            driver = x.Lr.DriverName,
            customer = x.Lr.CustomerName ?? x.Lr.Consignor,
            from = x.Lr.FromCity,
            to = x.Lr.ToCity,
            deliveryDate = x.Sheet.DeliveryDate,
            receiverName = x.Sheet.ReceiverName,
            podStatus = x.Sheet.ShipmentStatus == "POD Received" ? "Received" :
                x.Sheet.ShipmentStatus == "Delivered" ? "Delivered" :
                x.Sheet.ShipmentStatus == "In Transit" ? "Pending" : "Pending",
            verificationStatus = x.Sheet.ShipmentStatus == "POD Received"
                ? "Verified"
                : EF.Functions.JsonContains(x.Sheet.ExtendedDataJson, """{"podVerification":{"status":"Rejected"}}""")
                    ? "Rejected"
                    : "Pending",
            receivedOn = x.Sheet.UpdatedAt,
            receivedBy = x.Sheet.CreatedBy,
            deliveryStatus = x.Sheet.ShipmentStatus == "In Transit"
                && EF.Functions.JsonContains(x.Sheet.ExtendedDataJson, """{"inTransitStatus":"Reached Destination"}""")
                    ? "Ready for Delivery"
                    : x.Sheet.ShipmentStatus,
        }).ToPagedListAsync(pNo, size, includeTotal, ct);

        return Ok(new PagedResult<object>(items.Cast<object>().ToList(), total, pNo, size, hasMore, approx));
    }

    [HttpGet("billing/summary")]
    public async Task<ActionResult<object>> BillingSummary(CancellationToken ct)
    {
        var q = tenants.Filter(branches.Filter(db.FreightInvoices.AsNoTracking()));
        var total = await q.CountAsync(i => i.Status != "Cancelled", ct);
        var pending = await q.CountAsync(i => i.Balance > 0 && i.Status != "Cancelled", ct);
        var paid = await q.CountAsync(i => i.Balance <= 0 && i.Status != "Cancelled", ct);
        var outstanding = await q.Where(i => i.Status != "Cancelled").SumAsync(i => (decimal?)i.Balance, ct) ?? 0;
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var todayAmount = await q.Where(i => i.InvoiceDate == today).SumAsync(i => (decimal?)i.TotalAmount, ct) ?? 0;
        return Ok(new { total, pending, paid, outstanding, todayAmount });
    }

    [HttpGet("billing")]
    public async Task<ActionResult<PagedResult<object>>> BillingList(
        [FromQuery] string? search,
        [FromQuery] string? paymentStatus,
        [FromQuery] DateOnly? dateFrom,
        [FromQuery] DateOnly? dateTo,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true,
        CancellationToken ct = default)
    {
        var q = tenants.Filter(branches.Filter(db.FreightInvoices.AsNoTracking().Include(i => i.Branch)))
            .Where(i => i.Status != "Cancelled");

        if (dateFrom.HasValue) q = q.Where(i => i.InvoiceDate >= dateFrom);
        if (dateTo.HasValue) q = q.Where(i => i.InvoiceDate <= dateTo);
        if (!string.IsNullOrWhiteSpace(paymentStatus) && paymentStatus != "(All)")
        {
            q = paymentStatus switch
            {
                "Paid" => q.Where(i => i.Balance <= 0),
                "Unpaid" => q.Where(i => i.Balance >= i.TotalAmount),
                "Partial" => q.Where(i => i.Balance > 0 && i.Balance < i.TotalAmount),
                _ => q,
            };
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = $"%{search.Trim()}%";
            q = q.Where(i =>
                EF.Functions.ILike(i.InvoiceNo, s) ||
                EF.Functions.ILike(i.LrNumber ?? "", s) ||
                EF.Functions.ILike(i.CustomerName ?? "", s));
        }

        q = q.OrderByDescending(i => i.InvoiceDate);
        var (pNo, size) = QueryExtensions.NormalizePaging(page, pageSize);
        var (items, total, hasMore, approx) = await q.Select(i => new
        {
            id = i.Id,
            invoiceNo = i.InvoiceNo,
            invoiceDate = i.InvoiceDate,
            lrNumber = i.LrNumber,
            tripNo = i.BookingId,
            customer = i.CustomerName,
            from = i.PlaceOfSupply,
            to = i.PlaceOfSupply,
            freight = i.TaxableAmount,
            gst = i.GstAmount,
            totalAmount = i.TotalAmount,
            receivedAmount = i.AmountPaid,
            outstanding = i.Balance,
            paymentStatus = i.Balance <= 0 ? "Paid" : i.AmountPaid > 0 ? "Partial" : "Unpaid",
            billingStatus = "Billed",
        }).ToPagedListAsync(pNo, size, includeTotal, ct);

        return Ok(new PagedResult<object>(items.Cast<object>().ToList(), total, pNo, size, hasMore, approx));
    }

    [HttpGet("trip-expenses/summary")]
    public async Task<ActionResult<object>> TripExpensesSummary(CancellationToken ct)
    {
        var q = tenants.Filter(db.LrExpenses.AsNoTracking());
        var totalAmount = await q.SumAsync(e => (decimal?)e.Amount, ct) ?? 0;
        var fuel = await q.Where(e => e.Category == "Diesel").SumAsync(e => (decimal?)e.Amount, ct) ?? 0;
        var toll = await q.Where(e => e.Category == "Toll").SumAsync(e => (decimal?)e.Amount, ct) ?? 0;
        var maintenance = await q.Where(e => e.Category == "Repair/Maintenance").SumAsync(e => (decimal?)e.Amount, ct) ?? 0;
        var other = totalAmount - fuel - toll - maintenance;
        return Ok(new { totalAmount, fuel, toll, maintenance, other });
    }

    [HttpGet("trip-expenses")]
    public async Task<ActionResult<PagedResult<object>>> TripExpensesList(
        [FromQuery] string? search,
        [FromQuery] string? category,
        [FromQuery] string? status,
        [FromQuery] DateOnly? dateFrom,
        [FromQuery] DateOnly? dateTo,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true,
        CancellationToken ct = default)
    {
        var q = from e in tenants.Filter(db.LrExpenses.AsNoTracking())
                join lr in ScopedLrs() on e.LrNumber equals lr.LrNumber
                select new { Expense = e, Lr = lr };

        if (!string.IsNullOrWhiteSpace(category) && category != "(All)")
            q = q.Where(x => x.Expense.Category == category);
        if (!string.IsNullOrWhiteSpace(status) && status != "(All)")
            q = q.Where(x => x.Expense.Status == status);
        if (dateFrom.HasValue) q = q.Where(x => x.Expense.ExpenseDate >= dateFrom);
        if (dateTo.HasValue) q = q.Where(x => x.Expense.ExpenseDate <= dateTo);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = $"%{search.Trim()}%";
            q = q.Where(x =>
                EF.Functions.ILike(x.Expense.LrNumber, s) ||
                EF.Functions.ILike(x.Expense.Category, s) ||
                EF.Functions.ILike(x.Lr.VehicleNumber ?? "", s));
        }

        q = q.OrderByDescending(x => x.Expense.ExpenseDate);
        var (pNo, size) = QueryExtensions.NormalizePaging(page, pageSize);
        var (items, total, hasMore, approx) = await q.Select(x => new
        {
            id = x.Expense.Id,
            expenseDate = x.Expense.ExpenseDate,
            tripNo = x.Lr.VehicleNumber,
            vehicleNumber = x.Lr.VehicleNumber,
            driver = x.Lr.DriverName,
            from = x.Lr.FromCity,
            to = x.Lr.ToCity,
            expenseType = x.Expense.Category,
            description = x.Expense.Description,
            amount = x.Expense.Amount,
            paymentMode = "Cash",
            receiptNo = x.Expense.Description != null && x.Expense.Description.Length > 8
                ? x.Expense.Description.Substring(0, 8)
                : x.Expense.Id.ToString(),
            status = x.Expense.Status,
            lrNumber = x.Expense.LrNumber,
        }).ToPagedListAsync(pNo, size, includeTotal, ct);

        return Ok(new PagedResult<object>(items.Cast<object>().ToList(), total, pNo, size, hasMore, approx));
    }
}
