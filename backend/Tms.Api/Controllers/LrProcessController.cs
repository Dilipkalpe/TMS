using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Nodes;
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
[Route("api/lr")]
public class LrProcessController(
    TmsDbContext db,
    ITenantContext tenants,
    IBranchContext branches,
    DocumentNumberService documentNumbers,
    IWebHostEnvironment env) : ControllerBase
{
    static readonly HashSet<string> AllowedUploadExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];
    const long MaxUploadBytes = 5 * 1024 * 1024;

    string? CurrentUser() => User.Identity?.Name;
    string? CurrentRole() => User.FindFirstValue(ClaimTypes.Role) ?? User.FindFirstValue("role");
    bool CanApproveExpenses() => TenantRoles.CanManageUsers(CurrentRole());

    async Task<LorryReceipt?> LoadLr(string lrNumber) =>
        await LrProcessService.FindLrAsync(db, tenants, branches, lrNumber);

    ActionResult? GuardStatus(LorryReceipt lr, params string[] allowedPriorStatuses)
    {
        try
        {
            LrProcessService.EnsureStatusAtLeast(lr, allowedPriorStatuses);
            return null;
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiError(ex.Message));
        }
    }

    static bool IsStatusDowngrade(string currentStatus, string newStatus)
    {
        var order = LrStatuses.All.ToList();
        var cur = order.IndexOf(currentStatus);
        var next = order.IndexOf(newStatus);
        if (cur < 0 || next < 0) return false;
        return next < cur;
    }

    [HttpGet("{lrNumber}/process")]
    public async Task<ActionResult<object>> GetProcess(string lrNumber)
    {
        var lr = await LoadLr(lrNumber);
        if (lr == null) return NotFound();

        var loading = await db.LrLoadingSheets.AsNoTracking()
            .Include(s => s.Items)
            .Where(s => s.CompanyId == lr.CompanyId &&
                (s.LrNumber == lr.LrNumber || s.Items.Any(i => i.LrNumber == lr.LrNumber)))
            .OrderByDescending(s => s.UpdatedAt)
            .FirstOrDefaultAsync();
        var transit = await db.LrTransitPasses.AsNoTracking()
            .FirstOrDefaultAsync(x => x.LrNumber == lr.LrNumber && x.CompanyId == lr.CompanyId);
        var delivery = await db.LrDeliverySheets.AsNoTracking()
            .FirstOrDefaultAsync(x => x.LrNumber == lr.LrNumber && x.CompanyId == lr.CompanyId);
        var docs = await TenantScope.Documents(db, tenants)
            .Where(d => d.EntityType == "LorryReceipt" && d.EntityId == lr.LrNumber)
            .OrderByDescending(d => d.CreatedAt)
            .Select(d => new { d.Id, d.DocType, d.Title, d.FileUrl, createdAt = d.CreatedAt })
            .ToListAsync();
        var expenseRows = await db.LrExpenses.AsNoTracking()
            .Where(e => e.LrNumber == lr.LrNumber && e.CompanyId == lr.CompanyId)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync();
        var expenses = expenseRows.Select(MapExpense).ToList();
        var statusHistory = await db.LrStatusHistories.AsNoTracking()
            .Where(h => h.LrNumber == lr.LrNumber && h.CompanyId == lr.CompanyId)
            .OrderByDescending(h => h.ChangedAt)
            .Select(h => new
            {
                at = h.ChangedAt.ToString("yyyy-MM-dd HH:mm"),
                status = h.NewStatus,
                location = lr.ToCity,
                by = h.ChangedBy,
                remarks = h.Remarks,
            })
            .Take(20)
            .ToListAsync();

        FreightInvoice? invoice = null;
        if (!string.IsNullOrEmpty(lr.BookingId))
            invoice = await db.FreightInvoices.AsNoTracking()
                .Where(i => i.BookingId == lr.BookingId && i.Status != "Cancelled")
                .OrderByDescending(i => i.CreatedAt)
                .FirstOrDefaultAsync();
        else
            invoice = await db.FreightInvoices.AsNoTracking()
                .Where(i => i.LrNumber == lr.LrNumber && i.Status != "Cancelled")
                .OrderByDescending(i => i.CreatedAt)
                .FirstOrDefaultAsync();

        return Ok(new
        {
            lrNumber = lr.LrNumber,
            status = lr.Status,
            businessType = lr.BusinessType,
            customerId = lr.CustomerId,
            customerName = lr.CustomerName,
            businessTypes = LrBusinessTypes.All,
            bookingId = lr.BookingId,
            statuses = LrStatuses.All,
            expenseCategories = LrExpenseCategories.All,
            loadingSheet = loading == null ? null : MapLoading(loading),
            transitPass = transit == null ? null : MapTransit(transit, loading?.Items),
            deliverySheet = delivery == null ? null : MapDelivery(delivery),
            deliveryDocuments = docs,
            statusHistory,
            expenses,
            invoice = invoice == null ? null : new
            {
                invoice.Id,
                invoice.InvoiceNo,
                invoiceDate = invoice.InvoiceDate.ToString("yyyy-MM-dd"),
                invoice.TotalAmount,
                invoice.Balance,
                invoice.Status,
            },
        });
    }

    [HttpPost("{lrNumber}/loading-sheet")]
    public async Task<ActionResult<object>> SaveLoadingSheet(string lrNumber, [FromBody] Dictionary<string, object?> body)
    {
        var anchor = await LoadLr(lrNumber);
        if (anchor == null) return NotFound();
        var loadGuard = GuardStatus(anchor, LrStatuses.LRCreated, LrStatuses.Draft);
        if (loadGuard != null) return loadGuard;

        var location = ApiParseHelper.BodyString(body, "loadingLocation");
        if (string.IsNullOrWhiteSpace(location))
            return BadRequest(new ApiError("Loading location is required."));

        var lrNumbers = ApiParseHelper.BodyStringList(body, "lrNumbers");
        if (lrNumbers.Count == 0)
            lrNumbers = [anchor.LrNumber];
        if (!lrNumbers.Contains(anchor.LrNumber))
            lrNumbers.Insert(0, anchor.LrNumber);

        var lrs = new List<LorryReceipt>();
        foreach (var num in lrNumbers.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            var row = await LrProcessService.FindLrAsync(db, tenants, branches, num);
            if (row == null) return BadRequest(new ApiError($"LR not found: {num}"));
            lrs.Add(row);
        }

        var businessType = LrBusinessTypes.Normalize(
            ApiParseHelper.BodyString(body, "businessType") ?? anchor.BusinessType);
        var vehicleNum = ApiParseHelper.BodyString(body, "vehicleNumber") ?? anchor.VehicleNumber;
        var vehicleId = ApiParseHelper.BodyString(body, "vehicleId") ?? anchor.VehicleId;
        var vehicle = !string.IsNullOrEmpty(vehicleNum) || !string.IsNullOrEmpty(vehicleId)
            ? await TenantScope.FindVehicleByRefAsync(db, tenants, branches, vehicleId ?? vehicleNum!)
            : null;

        var validation = await LrBusinessTypeService.ValidateLoadingSheetAsync(
            db, tenants, branches, businessType, lrs, vehicle?.Id ?? vehicleId, vehicle?.Number ?? vehicleNum);
        if (!validation.Ok)
            return BadRequest(new ApiError(validation.Error ?? "Loading sheet validation failed."));

        var existing = await db.LrLoadingSheets
            .Include(s => s.Items)
            .FirstOrDefaultAsync(s => s.CompanyId == anchor.CompanyId &&
                (s.LrNumber == anchor.LrNumber || s.Items.Any(i => i.LrNumber == anchor.LrNumber)));

        Guid branchId;
        string sheetNumber;
        try
        {
            branchId = await documentNumbers.ResolveBranchIdForNumberingAsync(tenants, branches, anchor.BranchId);
            sheetNumber = existing?.SheetNumber ?? await documentNumbers.NextAsync(
                DocumentNumberTypes.LoadingSheet, anchor.CompanyId, branchId,
                DateOnly.FromDateTime(DateTime.UtcNow));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiError(ex.Message));
        }

        var loadingAt = body.ContainsKey("loadingAt")
            ? ApiParseHelper.BodyUtcDateTime(body, "loadingAt")
            : DateTime.UtcNow;

        if (existing == null)
        {
            existing = new LrLoadingSheet
            {
                Id = Guid.NewGuid(),
                CompanyId = anchor.CompanyId,
                LrNumber = anchor.LrNumber,
                SheetNumber = sheetNumber,
                BusinessType = businessType,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = CurrentUser(),
            };
            db.LrLoadingSheets.Add(existing);
        }

        existing.BusinessType = businessType;
        existing.VehicleId = vehicle?.Id ?? vehicleId;
        existing.VehicleNumber = vehicle?.Number ?? vehicleNum;
        existing.LoadingLocation = location;
        existing.LoadingAt = loadingAt;
        existing.LoadingStatus = ApiParseHelper.BodyString(body, "loadingStatus") ?? "Completed";
        existing.Remarks = ApiParseHelper.BodyString(body, "remarks");
        existing.TotalQuantity = validation.TotalQuantityTons;
        existing.CapacityLimit = validation.CapacityLimitTons;
        existing.CapacityUsed = validation.TotalQuantityTons;
        existing.MaterialQuantity = validation.TotalQuantityTons > 0
            ? $"{validation.TotalQuantityTons:N2} MT"
            : ApiParseHelper.BodyString(body, "materialQuantity") ?? anchor.Quantity;
        existing.LoaderName = ApiParseHelper.BodyString(body, "loaderName") ?? existing.LoaderName;
        existing.SupervisorName = ApiParseHelper.BodyString(body, "supervisorName") ?? existing.SupervisorName;
        existing.SealNumber = ApiParseHelper.BodyString(body, "sealNumber") ?? existing.SealNumber;
        existing.TripNo = ApiParseHelper.BodyString(body, "tripNo") ?? existing.TripNo;
        var incomingLoadingExt = ApiParseHelper.BodyJsonRaw(body, "extendedData");
        if (incomingLoadingExt != null)
            existing.ExtendedDataJson = MergeExtendedJson(existing.ExtendedDataJson, incomingLoadingExt);
        existing.UpdatedAt = DateTime.UtcNow;

        var oldItems = await db.LrLoadingSheetItems.Where(i => i.LoadingSheetId == existing.Id).ToListAsync();
        if (oldItems.Count > 0)
            db.LrLoadingSheetItems.RemoveRange(oldItems);

        var sort = 0;
        foreach (var row in lrs)
        {
            var (cid, cname) = await LrBusinessTypeService.ResolveLrCustomerAsync(db, row);
            db.LrLoadingSheetItems.Add(new LrLoadingSheetItem
            {
                Id = Guid.NewGuid(),
                LoadingSheetId = existing.Id,
                LrNumber = row.LrNumber,
                CustomerId = cid,
                CustomerName = cname,
                QuantityText = row.Quantity,
                QuantityTons = LrBusinessTypeService.ParseQuantityToTons(row.Quantity),
                SortOrder = sort++,
                CreatedAt = DateTime.UtcNow,
            });
        }

        if (existing.LoadingStatus.Equals("Completed", StringComparison.OrdinalIgnoreCase))
        {
            foreach (var row in lrs)
            {
                row.Status = LrStatuses.LoadingCompleted;
                row.UpdatedAt = DateTime.UtcNow;
            }
        }

        await db.SaveChangesAsync();
        await db.Entry(existing).Collection(s => s.Items).LoadAsync();
        return Ok(MapLoading(existing));
    }

    [HttpPost("{lrNumber}/loading-sheet/validate")]
    public async Task<ActionResult<object>> ValidateLoadingSheet(string lrNumber, [FromBody] Dictionary<string, object?> body)
    {
        var anchor = await LoadLr(lrNumber);
        if (anchor == null) return NotFound();

        var lrNumbers = ApiParseHelper.BodyStringList(body, "lrNumbers");
        if (lrNumbers.Count == 0) lrNumbers = [anchor.LrNumber];

        var lrs = new List<LorryReceipt>();
        foreach (var num in lrNumbers.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            var row = await LrProcessService.FindLrAsync(db, tenants, branches, num);
            if (row == null) return BadRequest(new ApiError($"LR not found: {num}"));
            lrs.Add(row);
        }

        var businessType = LrBusinessTypes.Normalize(
            ApiParseHelper.BodyString(body, "businessType") ?? anchor.BusinessType);
        var vehicleId = ApiParseHelper.BodyString(body, "vehicleId") ?? anchor.VehicleId;
        var vehicleNum = ApiParseHelper.BodyString(body, "vehicleNumber") ?? anchor.VehicleNumber;

        var validation = await LrBusinessTypeService.ValidateLoadingSheetAsync(
            db, tenants, branches, businessType, lrs, vehicleId, vehicleNum);

        return Ok(new
        {
            ok = validation.Ok,
            error = validation.Error,
            totalQuantityTons = validation.TotalQuantityTons,
            capacityLimitTons = validation.CapacityLimitTons,
            lrNumbers = validation.LrNumbers,
            businessType,
        });
    }

    [HttpGet("{lrNumber}/loading-sheet")]
    public async Task<ActionResult<object>> GetLoadingSheet(string lrNumber)
    {
        var lr = await LoadLr(lrNumber);
        if (lr == null) return NotFound();
        var sheet = await db.LrLoadingSheets.AsNoTracking()
            .Include(s => s.Items)
            .Where(s => s.CompanyId == lr.CompanyId &&
                (s.LrNumber == lr.LrNumber || s.Items.Any(i => i.LrNumber == lr.LrNumber)))
            .OrderByDescending(s => s.UpdatedAt)
            .FirstOrDefaultAsync();
        return sheet == null ? NotFound() : Ok(MapLoading(sheet));
    }

    [HttpPost("{lrNumber}/transit-pass")]
    public async Task<ActionResult<object>> CreateTransitPass(string lrNumber, [FromBody] Dictionary<string, object?> body)
    {
        var lr = await LoadLr(lrNumber);
        if (lr == null) return NotFound();
        var tpGuard = GuardStatus(lr, LrStatuses.LoadingCompleted);
        if (tpGuard != null) return tpGuard;

        var hasLoading = await db.LrLoadingSheets.AsNoTracking()
            .AnyAsync(s => s.CompanyId == lr.CompanyId && s.LrNumber == lr.LrNumber && s.LoadingStatus == "Completed")
            || await db.LrLoadingSheetItems.AsNoTracking()
            .Where(i => i.LrNumber == lr.LrNumber)
            .Join(db.LrLoadingSheets.AsNoTracking(),
                i => i.LoadingSheetId,
                s => s.Id,
                (i, s) => s)
            .AnyAsync(s => s.LoadingStatus == "Completed");
        if (!hasLoading)
            return BadRequest(new ApiError("Complete loading sheet before generating transit pass."));

        var existing = await db.LrTransitPasses
            .FirstOrDefaultAsync(x => x.LrNumber == lr.LrNumber && x.CompanyId == lr.CompanyId);

        var loadingSheet = await db.LrLoadingSheets.AsNoTracking()
            .Include(s => s.Items)
            .Where(s => s.CompanyId == lr.CompanyId &&
                (s.LrNumber == lr.LrNumber || s.Items.Any(i => i.LrNumber == lr.LrNumber)))
            .OrderByDescending(s => s.UpdatedAt)
            .FirstOrDefaultAsync();

        var linkedLrs = loadingSheet?.Items.Select(i => i.LrNumber).ToList() ?? [lr.LrNumber];

        if (existing != null)
        {
            var passExtUpdate = ParseExt(existing.ExtendedDataJson);
            var wasCancelled = passExtUpdate["passStatus"]?.GetValue<string>() == "Cancelled";

            existing.ViaPoints = ApiParseHelper.BodyString(body, "viaPoints") ?? existing.ViaPoints;
            existing.SealNumber = ApiParseHelper.BodyString(body, "sealNumber") ?? existing.SealNumber;
            existing.SealCondition = ApiParseHelper.BodyString(body, "sealCondition") ?? existing.SealCondition;
            existing.TransitType = ApiParseHelper.BodyString(body, "transitType") ?? existing.TransitType;
            existing.ExpectedDelivery = body.ContainsKey("expectedDelivery")
                ? ApiParseHelper.BodyDate(body, "expectedDelivery", existing.ExpectedDelivery ?? DateOnly.FromDateTime(DateTime.UtcNow))
                : existing.ExpectedDelivery;
            existing.Remarks = ApiParseHelper.BodyString(body, "remarks") ?? existing.Remarks;
            var incomingPassExt = ApiParseHelper.BodyJsonRaw(body, "extendedData");
            if (incomingPassExt != null)
                existing.ExtendedDataJson = MergeExtendedJson(existing.ExtendedDataJson, incomingPassExt);
            existing.UpdatedAt = DateTime.UtcNow;

            if (wasCancelled)
            {
                passExtUpdate = ParseExt(existing.ExtendedDataJson);
                passExtUpdate["passStatus"] = "Draft";
                passExtUpdate.Remove("cancelledAt");
                passExtUpdate.Remove("cancelledBy");
                passExtUpdate.Remove("cancelReason");
                existing.ExtendedDataJson = passExtUpdate.ToJsonString();

                foreach (var num in linkedLrs.Distinct())
                {
                    var row = await db.LorryReceipts.FirstOrDefaultAsync(l => l.LrNumber == num && l.CompanyId == lr.CompanyId);
                    if (row == null) continue;
                    RecordStatusChange(db, row, LrStatuses.TransitPassGenerated, CurrentUser(), "Transit pass re-issued");
                }
            }

            await db.SaveChangesAsync();
            return Ok(MapTransit(existing, loadingSheet?.Items));
        }

        Guid branchId;
        string passNumber;
        try
        {
            branchId = await documentNumbers.ResolveBranchIdForNumberingAsync(tenants, branches, lr.BranchId);
            passNumber = await documentNumbers.NextAsync(
                DocumentNumberTypes.TransitPass, lr.CompanyId, branchId,
                ApiParseHelper.BodyDate(body, "issueDate", DateOnly.FromDateTime(DateTime.UtcNow)));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiError(ex.Message));
        }

        var pass = new LrTransitPass
        {
            Id = Guid.NewGuid(),
            CompanyId = lr.CompanyId,
            LrNumber = lr.LrNumber,
            LoadingSheetId = loadingSheet?.Id,
            PassNumber = passNumber,
            VehicleNumber = ApiParseHelper.BodyString(body, "vehicleNumber") ?? lr.VehicleNumber,
            DriverName = ApiParseHelper.BodyString(body, "driverName") ?? lr.DriverName,
            RouteFrom = ApiParseHelper.BodyString(body, "routeFrom") ?? lr.FromCity,
            RouteTo = ApiParseHelper.BodyString(body, "routeTo") ?? lr.ToCity,
            ViaPoints = ApiParseHelper.BodyString(body, "viaPoints"),
            SealNumber = ApiParseHelper.BodyString(body, "sealNumber"),
            SealCondition = ApiParseHelper.BodyString(body, "sealCondition") ?? "Intact",
            TransitType = ApiParseHelper.BodyString(body, "transitType") ?? "By Road",
            ExpectedDelivery = body.ContainsKey("expectedDelivery")
                ? ApiParseHelper.BodyDate(body, "expectedDelivery", DateOnly.FromDateTime(DateTime.UtcNow))
                : null,
            IssueDate = ApiParseHelper.BodyDate(body, "issueDate", DateOnly.FromDateTime(DateTime.UtcNow)),
            Remarks = ApiParseHelper.BodyString(body, "remarks"),
            ExtendedDataJson = ApiParseHelper.BodyJsonRaw(body, "extendedData") ?? "{}",
            CreatedBy = CurrentUser(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.LrTransitPasses.Add(pass);

        foreach (var num in linkedLrs.Distinct())
        {
            var row = await db.LorryReceipts.FirstOrDefaultAsync(l => l.LrNumber == num && l.CompanyId == lr.CompanyId);
            if (row == null) continue;
            RecordStatusChange(db, row, LrStatuses.TransitPassGenerated, CurrentUser(), "Transit pass generated");
        }

        var passExt = ParseExt(pass.ExtendedDataJson);
        if (passExt["passStatus"] == null)
            passExt["passStatus"] = "Draft";
        pass.ExtendedDataJson = passExt.ToJsonString();

        await db.SaveChangesAsync();
        return Ok(MapTransit(pass, loadingSheet?.Items));
    }

    [HttpPost("{lrNumber}/transit-pass/ready")]
    public async Task<ActionResult<object>> MarkTransitPassReady(string lrNumber)
    {
        var lr = await LoadLr(lrNumber);
        if (lr == null) return NotFound();

        var pass = await db.LrTransitPasses
            .FirstOrDefaultAsync(x => x.LrNumber == lr.LrNumber && x.CompanyId == lr.CompanyId);
        if (pass == null) return BadRequest(new ApiError("Transit pass not found."));

        var ext = ParseExt(pass.ExtendedDataJson);
        if (ext["passStatus"]?.GetValue<string>() == "Cancelled")
            return BadRequest(new ApiError("Transit pass is cancelled."));

        ext["passStatus"] = "Ready for Dispatch";
        ext["readyAt"] = DateTime.UtcNow.ToString("O");
        ext["readyBy"] = CurrentUser();
        pass.ExtendedDataJson = ext.ToJsonString();
        pass.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var items = pass.LoadingSheetId.HasValue
            ? await db.LrLoadingSheetItems.AsNoTracking()
                .Where(i => i.LoadingSheetId == pass.LoadingSheetId.Value)
                .OrderBy(i => i.SortOrder)
                .ToListAsync()
            : null;
        return Ok(MapTransit(pass, items));
    }

    [HttpPatch("{lrNumber}/transit-pass/cancel")]
    public async Task<ActionResult<object>> CancelTransitPass(string lrNumber, [FromBody] Dictionary<string, object?> body)
    {
        var lr = await LoadLr(lrNumber);
        if (lr == null) return NotFound();

        if (lr.Status != LrStatuses.TransitPassGenerated)
            return BadRequest(new ApiError("Cannot cancel transit pass after dispatch or delivery."));

        var pass = await db.LrTransitPasses
            .FirstOrDefaultAsync(x => x.LrNumber == lr.LrNumber && x.CompanyId == lr.CompanyId);
        if (pass == null) return NotFound();

        var delivery = await db.LrDeliverySheets
            .FirstOrDefaultAsync(x => x.LrNumber == lr.LrNumber && x.CompanyId == lr.CompanyId);
        if (delivery != null && delivery.ShipmentStatus == "In Transit")
            return BadRequest(new ApiError("Cannot cancel — vehicle already dispatched."));

        var ext = ParseExt(pass.ExtendedDataJson);
        ext["passStatus"] = "Cancelled";
        ext["cancelledAt"] = DateTime.UtcNow.ToString("O");
        ext["cancelledBy"] = CurrentUser();
        ext["cancelReason"] = ApiParseHelper.BodyString(body, "reason");
        pass.ExtendedDataJson = ext.ToJsonString();
        pass.UpdatedAt = DateTime.UtcNow;

        RecordStatusChange(db, lr, LrStatuses.LoadingCompleted, CurrentUser(),
            ApiParseHelper.BodyString(body, "reason") ?? "Transit pass cancelled");

        await db.SaveChangesAsync();
        return Ok(MapTransit(pass, null));
    }

    [HttpPost("{lrNumber}/dispatch/confirm")]
    public async Task<ActionResult<object>> ConfirmDispatch(string lrNumber, [FromBody] Dictionary<string, object?> body)
    {
        var lr = await LoadLr(lrNumber);
        if (lr == null) return NotFound();
        var dispatchGuard = GuardStatus(lr, LrStatuses.TransitPassGenerated);
        if (dispatchGuard != null) return dispatchGuard;

        if (lr.Status == LrStatuses.InTransit)
        {
            var already = await db.LrDeliverySheets
                .FirstOrDefaultAsync(x => x.LrNumber == lr.LrNumber && x.CompanyId == lr.CompanyId);
            if (already != null && already.ShipmentStatus == "In Transit")
                return Ok(MapDelivery(already));
        }

        if (lr.Status != LrStatuses.TransitPassGenerated)
            return BadRequest(new ApiError($"Cannot dispatch — LR status is {lr.Status}."));

        var pass = await db.LrTransitPasses
            .FirstOrDefaultAsync(x => x.LrNumber == lr.LrNumber && x.CompanyId == lr.CompanyId);
        if (pass == null) return BadRequest(new ApiError("Transit pass is required before dispatch."));

        var passExt = ParseExt(pass.ExtendedDataJson);
        if (passExt["passStatus"]?.GetValue<string>() == "Cancelled")
            return BadRequest(new ApiError("Transit pass is cancelled."));

        var startingKm = ApiParseHelper.BodyDecimal(body, "startingKm");
        if (startingKm < 0)
            return BadRequest(new ApiError("Starting KM must be zero or greater."));

        var existing = await db.LrDeliverySheets
            .FirstOrDefaultAsync(x => x.LrNumber == lr.LrNumber && x.CompanyId == lr.CompanyId);

        Guid branchId;
        string sheetNumber;
        string dispatchNo;
        try
        {
            branchId = await documentNumbers.ResolveBranchIdForNumberingAsync(tenants, branches, lr.BranchId);
            sheetNumber = existing?.SheetNumber ?? await documentNumbers.NextAsync(
                DocumentNumberTypes.DeliverySheet, lr.CompanyId, branchId,
                DateOnly.FromDateTime(DateTime.UtcNow));
            dispatchNo = await documentNumbers.NextAsync(
                DocumentNumberTypes.Trip, lr.CompanyId, branchId,
                DateOnly.FromDateTime(DateTime.UtcNow));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiError(ex.Message));
        }

        if (existing == null)
        {
            existing = new LrDeliverySheet
            {
                Id = Guid.NewGuid(),
                CompanyId = lr.CompanyId,
                LrNumber = lr.LrNumber,
                SheetNumber = sheetNumber,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = CurrentUser(),
            };
            db.LrDeliverySheets.Add(existing);
        }

        var dispatchDate = ApiParseHelper.BodyDate(body, "dispatchDate", DateOnly.FromDateTime(DateTime.UtcNow));
        var dispatchTime = ApiParseHelper.BodyTime(body, "dispatchTime") ?? TimeOnly.FromDateTime(DateTime.UtcNow);

        var delExt = ParseExt(existing.ExtendedDataJson);
        delExt["dispatch"] = new JsonObject
        {
            ["dispatchNo"] = dispatchNo,
            ["dispatchDate"] = dispatchDate.ToString("yyyy-MM-dd"),
            ["dispatchTime"] = dispatchTime.ToString("HH:mm"),
            ["startingKm"] = startingKm,
            ["fuelLevel"] = ApiParseHelper.BodyString(body, "fuelLevel"),
            ["odometerReading"] = ApiParseHelper.BodyDecimal(body, "odometerReading"),
            ["confirmedAt"] = DateTime.UtcNow.ToString("O"),
            ["confirmedBy"] = CurrentUser(),
            ["remarks"] = ApiParseHelper.BodyString(body, "remarks"),
            ["latitude"] = ApiParseHelper.BodyString(body, "latitude"),
            ["longitude"] = ApiParseHelper.BodyString(body, "longitude"),
        };
        delExt["inTransitStatus"] = "Dispatched";
        delExt["checkpoints"] = delExt["checkpoints"] ?? new JsonArray();

        existing.ShipmentStatus = "In Transit";
        existing.TripNo = dispatchNo;
        existing.DeliveryLocation = lr.ToCity;
        existing.ReceiverName = lr.Consignee;
        existing.Remarks = ApiParseHelper.BodyString(body, "remarks") ?? existing.Remarks;
        existing.ExtendedDataJson = delExt.ToJsonString();
        existing.UpdatedAt = DateTime.UtcNow;

        passExt["passStatus"] = "Dispatched";
        pass.ExtendedDataJson = passExt.ToJsonString();
        pass.UpdatedAt = DateTime.UtcNow;

        RecordStatusChange(db, lr, LrStatuses.InTransit, CurrentUser(), $"Dispatch {dispatchNo} confirmed");

        if (!string.IsNullOrEmpty(lr.BookingId))
        {
            var booking = await db.Bookings.FindAsync(lr.BookingId);
            if (booking != null)
            {
                booking.Status = "In Transit";
                booking.UpdatedAt = DateTime.UtcNow;
            }
        }

        await db.SaveChangesAsync();
        return Ok(MapDelivery(existing));
    }

    [HttpPost("{lrNumber}/checkpoints")]
    public async Task<ActionResult<object>> AddCheckpoint(string lrNumber, [FromBody] Dictionary<string, object?> body)
    {
        var lr = await LoadLr(lrNumber);
        if (lr == null) return NotFound();
        var cpGuard = GuardStatus(lr, LrStatuses.InTransit);
        if (cpGuard != null) return cpGuard;

        var location = ApiParseHelper.BodyString(body, "location");
        if (string.IsNullOrWhiteSpace(location))
            return BadRequest(new ApiError("Checkpoint location is required."));

        var sheet = await db.LrDeliverySheets
            .FirstOrDefaultAsync(x => x.LrNumber == lr.LrNumber && x.CompanyId == lr.CompanyId);
        if (sheet == null) return BadRequest(new ApiError("Dispatch record not found. Confirm dispatch first."));

        var ext = ParseExt(sheet.ExtendedDataJson);
        var checkpoints = ext["checkpoints"] as JsonArray ?? new JsonArray();
        checkpoints.Add(new JsonObject
        {
            ["id"] = Guid.NewGuid().ToString(),
            ["location"] = location,
            ["date"] = ApiParseHelper.BodyDate(body, "date", DateOnly.FromDateTime(DateTime.UtcNow)).ToString("yyyy-MM-dd"),
            ["time"] = (ApiParseHelper.BodyTime(body, "time") ?? TimeOnly.FromDateTime(DateTime.UtcNow)).ToString("HH:mm"),
            ["km"] = ApiParseHelper.BodyDecimal(body, "km"),
            ["status"] = ApiParseHelper.BodyString(body, "status") ?? "Passed",
            ["remarks"] = ApiParseHelper.BodyString(body, "remarks"),
            ["createdAt"] = DateTime.UtcNow.ToString("O"),
            ["createdBy"] = CurrentUser(),
        });
        ext["checkpoints"] = checkpoints;
        ext["inTransitStatus"] = ApiParseHelper.BodyString(body, "inTransitStatus") ?? "At Checkpoint";
        ext["currentLocation"] = location;
        ext["lastUpdate"] = DateTime.UtcNow.ToString("O");
        sheet.ExtendedDataJson = ext.ToJsonString();
        sheet.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(MapDelivery(sheet));
    }

    [HttpPatch("{lrNumber}/in-transit/status")]
    public async Task<ActionResult<object>> UpdateInTransitStatus(string lrNumber, [FromBody] Dictionary<string, object?> body)
    {
        var lr = await LoadLr(lrNumber);
        if (lr == null) return NotFound();
        if (lr.Status != LrStatuses.InTransit)
            return BadRequest(new ApiError("LR is not in transit."));

        var status = ApiParseHelper.BodyString(body, "status");
        var valid = new[] { "Dispatched", "In Transit", "Delayed", "At Checkpoint", "Reached Destination" };
        if (string.IsNullOrWhiteSpace(status) || !valid.Contains(status))
            return BadRequest(new ApiError("Invalid in-transit status."));

        var sheet = await db.LrDeliverySheets
            .FirstOrDefaultAsync(x => x.LrNumber == lr.LrNumber && x.CompanyId == lr.CompanyId);
        if (sheet == null) return NotFound();

        var ext = ParseExt(sheet.ExtendedDataJson);
        ext["inTransitStatus"] = status;
        ext["lastUpdate"] = DateTime.UtcNow.ToString("O");
        if (body.ContainsKey("currentLocation"))
            ext["currentLocation"] = ApiParseHelper.BodyString(body, "currentLocation");
        if (status == "Reached Destination")
            ext["reachedDestinationAt"] = DateTime.UtcNow.ToString("O");
        sheet.ExtendedDataJson = ext.ToJsonString();
        sheet.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(MapDelivery(sheet));
    }

    [HttpPatch("{lrNumber}/pod/verify")]
    public async Task<ActionResult<object>> VerifyPod(string lrNumber)
    {
        var lr = await LoadLr(lrNumber);
        if (lr == null) return NotFound();
        if (lr.Status != LrStatuses.DeliveryCompleted && lr.Status != LrStatuses.PodUploaded)
            return BadRequest(new ApiError("Complete delivery before verifying POD."));

        var sheet = await db.LrDeliverySheets
            .FirstOrDefaultAsync(x => x.LrNumber == lr.LrNumber && x.CompanyId == lr.CompanyId);
        if (sheet == null) return NotFound();

        var ext = ParseExt(sheet.ExtendedDataJson);
        ext["podVerification"] = new JsonObject
        {
            ["status"] = "Verified",
            ["verifiedAt"] = DateTime.UtcNow.ToString("O"),
            ["verifiedBy"] = CurrentUser(),
        };
        sheet.ExtendedDataJson = ext.ToJsonString();
        sheet.ShipmentStatus = "POD Received";
        sheet.UpdatedAt = DateTime.UtcNow;

        RecordStatusChange(db, lr, LrStatuses.PodUploaded, CurrentUser(), "POD verified");
        await db.SaveChangesAsync();
        return Ok(MapDelivery(sheet));
    }

    [HttpPatch("{lrNumber}/pod/reject")]
    public async Task<ActionResult<object>> RejectPod(string lrNumber, [FromBody] Dictionary<string, object?> body)
    {
        var lr = await LoadLr(lrNumber);
        if (lr == null) return NotFound();

        var reason = ApiParseHelper.BodyString(body, "reason");
        if (string.IsNullOrWhiteSpace(reason))
            return BadRequest(new ApiError("Rejection reason is required."));

        var sheet = await db.LrDeliverySheets
            .FirstOrDefaultAsync(x => x.LrNumber == lr.LrNumber && x.CompanyId == lr.CompanyId);
        if (sheet == null) return NotFound();

        var ext = ParseExt(sheet.ExtendedDataJson);
        ext["podVerification"] = new JsonObject
        {
            ["status"] = "Rejected",
            ["rejectedAt"] = DateTime.UtcNow.ToString("O"),
            ["rejectedBy"] = CurrentUser(),
            ["reason"] = reason,
        };
        sheet.ExtendedDataJson = ext.ToJsonString();
        sheet.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(MapDelivery(sheet));
    }

    [HttpGet("{lrNumber}/transit-pass")]
    public async Task<ActionResult<object>> GetTransitPass(string lrNumber)
    {
        var lr = await LoadLr(lrNumber);
        if (lr == null) return NotFound();
        var pass = await db.LrTransitPasses.AsNoTracking()
            .FirstOrDefaultAsync(x => x.LrNumber == lr.LrNumber && x.CompanyId == lr.CompanyId);
        if (pass == null) return NotFound();

        IEnumerable<LrLoadingSheetItem>? items = null;
        if (pass.LoadingSheetId.HasValue)
        {
            items = await db.LrLoadingSheetItems.AsNoTracking()
                .Where(i => i.LoadingSheetId == pass.LoadingSheetId.Value)
                .OrderBy(i => i.SortOrder)
                .ToListAsync();
        }

        return Ok(MapTransit(pass, items));
    }

    [HttpGet("{lrNumber}/delivery-documents")]
    public async Task<ActionResult<object>> ListDeliveryDocuments(string lrNumber)
    {
        var lr = await LoadLr(lrNumber);
        if (lr == null) return NotFound();
        var docs = await TenantScope.Documents(db, tenants)
            .Where(d => d.EntityType == "LorryReceipt" && d.EntityId == lr.LrNumber)
            .OrderByDescending(d => d.CreatedAt)
            .Select(d => new { d.Id, d.DocType, d.Title, d.FileUrl, createdAt = d.CreatedAt })
            .ToListAsync();
        return Ok(docs);
    }

    [HttpPost("{lrNumber}/delivery-documents")]
    public async Task<ActionResult<object>> SaveDeliveryDocument(string lrNumber, [FromBody] Dictionary<string, object?> body)
    {
        var lr = await LoadLr(lrNumber);
        if (lr == null) return NotFound();
        var docGuard = GuardStatus(lr, LrStatuses.TransitPassGenerated);
        if (docGuard != null) return docGuard;

        var docType = ApiParseHelper.BodyString(body, "docType");
        var title = ApiParseHelper.BodyString(body, "title");
        var fileUrl = ApiParseHelper.BodyString(body, "fileUrl");
        if (string.IsNullOrWhiteSpace(docType) || string.IsNullOrWhiteSpace(title))
            return BadRequest(new ApiError("docType and title are required."));

        var doc = new Document
        {
            Id = Guid.NewGuid(),
            CompanyId = lr.CompanyId,
            EntityType = "LorryReceipt",
            EntityId = lr.LrNumber,
            DocType = docType,
            Title = title,
            FileUrl = fileUrl,
            CreatedAt = DateTime.UtcNow,
        };
        db.Documents.Add(doc);

        if (docType.Equals("POD", StringComparison.OrdinalIgnoreCase)
            && lr.Status is LrStatuses.TransitPassGenerated or LrStatuses.InTransit or LrStatuses.DeliveryCompleted)
            lr.Status = LrStatuses.PodUploaded;

        lr.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { doc.Id, doc.DocType, doc.Title, doc.FileUrl, createdAt = doc.CreatedAt });
    }

    [HttpPost("{lrNumber}/delivery-documents/upload")]
    [RequestSizeLimit(MaxUploadBytes)]
    public async Task<ActionResult<object>> UploadDeliveryDocument(string lrNumber, IFormFile? file, [FromForm] string docType, [FromForm] string title)
    {
        var lr = await LoadLr(lrNumber);
        if (lr == null) return NotFound();
        if (file == null || file.Length == 0)
            return BadRequest(new ApiError("No file uploaded."));
        if (file.Length > MaxUploadBytes)
            return BadRequest(new ApiError("File must be 5 MB or smaller."));
        if (string.IsNullOrWhiteSpace(docType) || string.IsNullOrWhiteSpace(title))
            return BadRequest(new ApiError("docType and title are required."));

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedUploadExtensions.Contains(ext))
            return BadRequest(new ApiError("Use PDF, JPG, PNG, or WebP format."));

        var webRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        var dir = Path.Combine(webRoot, "uploads", "lr", lr.LrNumber);
        Directory.CreateDirectory(dir);
        var fileName = $"{Guid.NewGuid():N}{ext}";
        var fullPath = Path.Combine(dir, fileName);
        await using (var stream = System.IO.File.Create(fullPath))
            await file.CopyToAsync(stream);

        return await SaveDeliveryDocument(lrNumber, new Dictionary<string, object?>
        {
            ["docType"] = docType,
            ["title"] = title,
            ["fileUrl"] = $"/uploads/lr/{Uri.EscapeDataString(lr.LrNumber)}/{fileName}",
        });
    }

    [HttpPost("{lrNumber}/delivery-sheet")]
    public async Task<ActionResult<object>> SaveDeliverySheet(string lrNumber, [FromBody] Dictionary<string, object?> body)
    {
        var lr = await LoadLr(lrNumber);
        if (lr == null) return NotFound();
        var sheetGuard = GuardStatus(lr, LrStatuses.TransitPassGenerated);
        if (sheetGuard != null) return sheetGuard;

        var shipmentStatus = ApiParseHelper.BodyString(body, "shipmentStatus") ?? "In Transit";
        var validStatuses = new[] { "In Transit", "Delivered", "POD Received", "Closed" };
        if (!validStatuses.Contains(shipmentStatus))
            return BadRequest(new ApiError("Invalid shipment status."));

        var newLrStatus = shipmentStatus switch
        {
            "Delivered" => LrStatuses.DeliveryCompleted,
            "POD Received" => LrStatuses.PodUploaded,
            "In Transit" => LrStatuses.InTransit,
            _ => lr.Status,
        };
        if (newLrStatus != lr.Status && IsStatusDowngrade(lr.Status, newLrStatus))
            return BadRequest(new ApiError($"Cannot change shipment status to {shipmentStatus} from current LR status {lr.Status}."));

        var existing = await db.LrDeliverySheets
            .FirstOrDefaultAsync(x => x.LrNumber == lr.LrNumber && x.CompanyId == lr.CompanyId);

        Guid branchId;
        string sheetNumber;
        try
        {
            branchId = await documentNumbers.ResolveBranchIdForNumberingAsync(tenants, branches, lr.BranchId);
            sheetNumber = existing?.SheetNumber ?? await documentNumbers.NextAsync(
                DocumentNumberTypes.DeliverySheet, lr.CompanyId, branchId,
                DateOnly.FromDateTime(DateTime.UtcNow));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiError(ex.Message));
        }

        if (existing == null)
        {
            existing = new LrDeliverySheet
            {
                Id = Guid.NewGuid(),
                CompanyId = lr.CompanyId,
                LrNumber = lr.LrNumber,
                SheetNumber = sheetNumber,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = CurrentUser(),
            };
            db.LrDeliverySheets.Add(existing);
        }

        existing.ShipmentStatus = shipmentStatus;
        existing.DeliveryDate = body.ContainsKey("deliveryDate")
            ? ApiParseHelper.BodyDate(body, "deliveryDate", DateOnly.FromDateTime(DateTime.UtcNow))
            : existing.DeliveryDate;
        existing.DeliveryLocation = ApiParseHelper.BodyString(body, "deliveryLocation") ?? lr.ToCity;
        existing.ReceiverName = ApiParseHelper.BodyString(body, "receiverName") ?? lr.Consignee;
        existing.TripNo = ApiParseHelper.BodyString(body, "tripNo") ?? existing.TripNo;
        existing.DeliveryTime = ApiParseHelper.BodyTime(body, "deliveryTime") ?? existing.DeliveryTime;
        existing.PackagesTotal = ApiParseHelper.BodyInt(body, "packagesTotal") ?? existing.PackagesTotal;
        existing.PackagesReceived = ApiParseHelper.BodyInt(body, "packagesReceived") ?? existing.PackagesReceived;
        existing.PackagesDamaged = ApiParseHelper.BodyInt(body, "packagesDamaged") ?? existing.PackagesDamaged;
        existing.ActualWeight = body.ContainsKey("actualWeight")
            ? ApiParseHelper.BodyDecimal(body, "actualWeight")
            : existing.ActualWeight;
        existing.ChargedWeight = body.ContainsKey("chargedWeight")
            ? ApiParseHelper.BodyDecimal(body, "chargedWeight")
            : existing.ChargedWeight;
        existing.Condition = ApiParseHelper.BodyString(body, "condition") ?? existing.Condition;
        existing.ReceiverDesignation = ApiParseHelper.BodyString(body, "receiverDesignation") ?? existing.ReceiverDesignation;
        existing.ReceiverMobile = ApiParseHelper.BodyString(body, "receiverMobile") ?? existing.ReceiverMobile;
        existing.PodNo = ApiParseHelper.BodyString(body, "podNo") ?? existing.PodNo;
        existing.DeliveryNoteNo = ApiParseHelper.BodyString(body, "deliveryNoteNo") ?? existing.DeliveryNoteNo;
        if (body.ContainsKey("remarks"))
            existing.Remarks = ApiParseHelper.BodyString(body, "remarks");
        var incomingExt = ApiParseHelper.BodyJsonRaw(body, "extendedData");
        if (incomingExt != null)
            existing.ExtendedDataJson = MergeExtendedJson(existing.ExtendedDataJson, incomingExt);
        existing.UpdatedAt = DateTime.UtcNow;

        if (newLrStatus != lr.Status)
            RecordStatusChange(db, lr, newLrStatus, CurrentUser(), $"Delivery sheet: {shipmentStatus}");

        if (!string.IsNullOrEmpty(lr.BookingId))
        {
            var booking = await db.Bookings.FindAsync(lr.BookingId);
            if (booking != null)
            {
                booking.Status = shipmentStatus switch
                {
                    "In Transit" => "In Transit",
                    "Delivered" or "POD Received" => "Delivered",
                    _ => booking.Status,
                };
                booking.UpdatedAt = DateTime.UtcNow;
            }
        }

        await db.SaveChangesAsync();
        return Ok(MapDelivery(existing));
    }

    [HttpGet("{lrNumber}/delivery-sheet")]
    public async Task<ActionResult<object>> GetDeliverySheet(string lrNumber)
    {
        var lr = await LoadLr(lrNumber);
        if (lr == null) return NotFound();
        var sheet = await db.LrDeliverySheets.AsNoTracking()
            .FirstOrDefaultAsync(x => x.LrNumber == lr.LrNumber && x.CompanyId == lr.CompanyId);
        return sheet == null ? NotFound() : Ok(MapDelivery(sheet));
    }

    [HttpPost("{lrNumber}/expenses")]
    public async Task<ActionResult<object>> AddExpense(string lrNumber, [FromBody] Dictionary<string, object?> body)
    {
        var lr = await LoadLr(lrNumber);
        if (lr == null) return NotFound();

        var amount = ApiParseHelper.BodyDecimal(body, "amount");
        var category = ApiParseHelper.BodyString(body, "category");
        if (amount <= 0) return BadRequest(new ApiError("Expense amount must be greater than zero."));
        if (string.IsNullOrWhiteSpace(category))
            return BadRequest(new ApiError("Category is required."));

        var expense = new LrExpense
        {
            Id = Guid.NewGuid(),
            CompanyId = lr.CompanyId,
            LrNumber = lr.LrNumber,
            ExpenseDate = ApiParseHelper.BodyDate(body, "expenseDate", DateOnly.FromDateTime(DateTime.UtcNow)),
            Category = category,
            Description = ApiParseHelper.BodyString(body, "description"),
            Amount = amount,
            BillNo = ApiParseHelper.BodyString(body, "billNo"),
            PaymentMode = ApiParseHelper.BodyString(body, "paymentMode"),
            AdvanceTaken = body.ContainsKey("advanceTaken") ? ApiParseHelper.BodyDecimal(body, "advanceTaken") : null,
            Reimbursed = body.ContainsKey("reimbursed") ? ApiParseHelper.BodyDecimal(body, "reimbursed") : null,
            AttachmentUrl = ApiParseHelper.BodyString(body, "attachmentUrl"),
            ExtendedDataJson = ApiParseHelper.BodyJsonRaw(body, "extendedData") ?? "{}",
            Status = "Pending",
            AddedBy = CurrentUser(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.LrExpenses.Add(expense);
        lr.Status = LrStatuses.ExpenseAdded;
        lr.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(MapExpense(expense));
    }

    [HttpPost("{lrNumber}/expenses/{expenseId:guid}/upload")]
    [RequestSizeLimit(MaxUploadBytes)]
    public async Task<ActionResult<object>> UploadExpenseAttachment(string lrNumber, Guid expenseId, IFormFile? file)
    {
        var lr = await LoadLr(lrNumber);
        if (lr == null) return NotFound();
        var expense = await db.LrExpenses.FirstOrDefaultAsync(e =>
            e.Id == expenseId && e.LrNumber == lr.LrNumber && e.CompanyId == lr.CompanyId);
        if (expense == null) return NotFound();
        if (file == null || file.Length == 0)
            return BadRequest(new ApiError("No file uploaded."));

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedUploadExtensions.Contains(ext))
            return BadRequest(new ApiError("Use PDF, JPG, PNG, or WebP format."));

        var webRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        var dir = Path.Combine(webRoot, "uploads", "lr-expenses", expenseId.ToString("N"));
        Directory.CreateDirectory(dir);
        var fileName = $"attachment{ext}";
        var fullPath = Path.Combine(dir, fileName);
        await using (var stream = System.IO.File.Create(fullPath))
            await file.CopyToAsync(stream);

        expense.AttachmentUrl = $"/uploads/lr-expenses/{expenseId:N}/{fileName}";
        await db.SaveChangesAsync();
        return Ok(MapExpense(expense));
    }

    [HttpGet("{lrNumber}/expenses")]
    public async Task<ActionResult<object>> ListExpenses(string lrNumber)
    {
        var lr = await LoadLr(lrNumber);
        if (lr == null) return NotFound();
        var rows = await db.LrExpenses.AsNoTracking()
            .Where(e => e.LrNumber == lr.LrNumber && e.CompanyId == lr.CompanyId)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync();
        return Ok(rows.Select(MapExpense));
    }

    [HttpGet("expenses/pending")]
    public async Task<ActionResult<object>> PendingExpenses()
    {
        var q = tenants.Filter(db.LrExpenses.AsNoTracking().Where(e => e.Status == "Pending"));
        var rows = await q.OrderBy(e => e.ExpenseDate).ThenBy(e => e.CreatedAt)
            .ToListAsync();
        return Ok(rows.Select(MapExpense));
    }

    [HttpPatch("{lrNumber}/expenses/{expenseId:guid}/approve")]
    public async Task<ActionResult<object>> ApproveExpense(string lrNumber, Guid expenseId)
    {
        if (!CanApproveExpenses())
            return Forbid();

        var lr = await LoadLr(lrNumber);
        if (lr == null) return NotFound();
        var expense = await db.LrExpenses.FirstOrDefaultAsync(e =>
            e.Id == expenseId && e.LrNumber == lr.LrNumber && e.CompanyId == lr.CompanyId);
        if (expense == null) return NotFound();
        if (expense.Status != "Pending")
            return BadRequest(new ApiError("Only pending expenses can be approved."));

        expense.Status = "Approved";
        expense.ApprovedBy = CurrentUser();
        expense.ApprovedAt = DateTime.UtcNow;
        expense.RejectionRemarks = null;
        await db.SaveChangesAsync();
        await LrProcessService.SyncExpenseStatusAsync(db, lr);
        return Ok(MapExpense(expense));
    }

    [HttpPatch("{lrNumber}/expenses/{expenseId:guid}/reject")]
    public async Task<ActionResult<object>> RejectExpense(string lrNumber, Guid expenseId, [FromBody] Dictionary<string, object?> body)
    {
        if (!CanApproveExpenses())
            return Forbid();

        var lr = await LoadLr(lrNumber);
        if (lr == null) return NotFound();
        var expense = await db.LrExpenses.FirstOrDefaultAsync(e =>
            e.Id == expenseId && e.LrNumber == lr.LrNumber && e.CompanyId == lr.CompanyId);
        if (expense == null) return NotFound();
        if (expense.Status != "Pending")
            return BadRequest(new ApiError("Only pending expenses can be rejected."));

        var remarks = ApiParseHelper.BodyString(body, "remarks");
        if (string.IsNullOrWhiteSpace(remarks))
            return BadRequest(new ApiError("Rejection remarks are required."));

        expense.Status = "Rejected";
        expense.ApprovedBy = CurrentUser();
        expense.ApprovedAt = DateTime.UtcNow;
        expense.RejectionRemarks = remarks;
        await db.SaveChangesAsync();
        return Ok(MapExpense(expense));
    }

    [HttpPost("{lrNumber}/invoice")]
    public async Task<ActionResult<object>> CreateInvoice(string lrNumber, [FromBody] Dictionary<string, object?> body)
    {
        var lr = await LoadLr(lrNumber);
        if (lr == null) return NotFound();
        var invGuard = GuardStatus(lr, LrStatuses.DeliveryCompleted, LrStatuses.PodUploaded);
        if (invGuard != null) return invGuard;

        var billType = (ApiParseHelper.BodyString(body, "billType") ?? "FC").ToUpperInvariant();
        if (billType is not ("RCM" or "FC" or "STANDARD"))
            return BadRequest(new ApiError("billType must be RCM, FC, or STANDARD."));

        string bookingId = lr.BookingId ?? "";
        Booking? booking = null;
        if (!string.IsNullOrEmpty(bookingId))
        {
            booking = await TenantScope.FindBookingAsync(db, tenants, branches, bookingId);
            if (booking == null) return BadRequest(new ApiError("Linked booking not found."));
        }

        var existingQuery = !string.IsNullOrEmpty(bookingId)
            ? db.FreightInvoices.Where(i => i.BookingId == bookingId && i.Status != "Cancelled")
            : db.FreightInvoices.Where(i => i.LrNumber == lr.LrNumber && i.Status != "Cancelled");
        if (await existingQuery.AnyAsync())
            return BadRequest(new ApiError("An active freight invoice already exists for this LR."));

        decimal taxable;
        decimal gst;
        decimal advanceAdjusted;
        object invoiceData;

        if (booking != null)
        {
            var built = await BookingFinanceService.BuildTransportBillDataAsync(db, booking, billType == "STANDARD" ? "FC" : billType);
            var gstRate = billType == "RCM" ? 0.05m : 0.18m;
            taxable = built.TaxableAmount;
            gst = billType == "RCM"
                ? Math.Round(taxable * 0.05m, 2)
                : Math.Round(taxable * gstRate, 2);
            advanceAdjusted = built.Advance;
            invoiceData = new
            {
                bookingId,
                lrNumber = lr.LrNumber,
                route = $"{booking.FromCity} → {booking.ToCity}",
                material = booking.Material,
                quantity = booking.Quantity,
                billType,
                freight = built.Freight,
                taxableAmount = taxable,
                gstAmount = gst,
                lineItems = ApiParseHelper.BodyJsonRaw(body, "lineItems"),
                amountInWords = ApiParseHelper.BodyString(body, "amountInWords"),
                paymentDetails = ApiParseHelper.BodyJsonRaw(body, "paymentDetails"),
            };
        }
        else
        {
            taxable = lr.Freight + (lr.Hamali ?? 0) + (lr.LoadingCharges ?? 0) + (lr.UnloadingCharges ?? 0);
            gst = lr.Gst;
            advanceAdjusted = lr.Advance ?? 0;
            invoiceData = new
            {
                lrNumber = lr.LrNumber,
                route = $"{lr.FromCity} → {lr.ToCity}",
                material = lr.Material,
                quantity = lr.Quantity,
                billType,
                freight = lr.Freight,
                taxableAmount = taxable,
                gstAmount = gst,
                lineItems = ApiParseHelper.BodyJsonRaw(body, "lineItems"),
                amountInWords = ApiParseHelper.BodyString(body, "amountInWords"),
                paymentDetails = ApiParseHelper.BodyJsonRaw(body, "paymentDetails"),
            };
        }

        var isRcm = billType == "RCM";
        var grossTotal = isRcm ? taxable : taxable + gst;
        var netTotal = Math.Max(0, grossTotal - advanceAdjusted);

        Guid invBranchId;
        string invoiceNo;
        DateOnly invoiceDate;
        try
        {
            invBranchId = await documentNumbers.ResolveBranchIdForNumberingAsync(tenants, branches, lr.BranchId ?? booking?.BranchId);
            invoiceDate = ApiParseHelper.BodyDate(body, "invoiceDate", DateOnly.FromDateTime(DateTime.UtcNow));
            invoiceNo = await documentNumbers.NextAsync(
                DocumentNumberTypes.Invoice, lr.CompanyId, invBranchId, invoiceDate);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiError(ex.Message));
        }

        var inv = new FreightInvoice
        {
            Id = Guid.NewGuid(),
            CompanyId = lr.CompanyId,
            BranchId = invBranchId,
            InvoiceNo = invoiceNo,
            // Empty for Direct LR (no booking); never invent a fake booking PK.
            BookingId = booking?.Id ?? "",
            LrNumber = lr.LrNumber,
            CustomerId = lr.CustomerId ?? booking?.CustomerId,
            CustomerName = ApiParseHelper.BodyString(body, "customerName")
                ?? lr.CustomerName
                ?? booking?.CustomerName
                ?? lr.Consignor,
            Gstin = ApiParseHelper.BodyString(body, "gstin"),
            PlaceOfSupply = ApiParseHelper.BodyString(body, "placeOfSupply") ?? lr.ToCity,
            BillType = billType,
            InvoiceDate = invoiceDate,
            TaxableAmount = taxable,
            GstAmount = gst,
            TotalAmount = netTotal,
            AdvanceAdjusted = advanceAdjusted,
            Balance = netTotal,
            Status = netTotal <= 0 ? "Paid" : "Issued",
            InvoiceDataJson = JsonSerializer.Serialize(invoiceData),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.FreightInvoices.Add(inv);
        lr.Status = LrStatuses.InvoiceGenerated;
        lr.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await BookingFinanceService.SyncCustomerOutstandingAsync(db, lr.CompanyId, inv.CustomerId);
        await db.SaveChangesAsync();

        return Ok(new
        {
            inv.Id,
            inv.InvoiceNo,
            invoiceDate = inv.InvoiceDate.ToString("yyyy-MM-dd"),
            inv.TotalAmount,
            inv.Balance,
            inv.Status,
        });
    }

    [HttpPost("{lrNumber}/close")]
    public async Task<ActionResult<object>> CloseLr(string lrNumber)
    {
        var lr = await LoadLr(lrNumber);
        if (lr == null) return NotFound();

        var pendingExpenses = await db.LrExpenses.AnyAsync(e =>
            e.LrNumber == lr.LrNumber && e.CompanyId == lr.CompanyId && e.Status == "Pending");
        if (pendingExpenses)
            return BadRequest(new ApiError("Approve or reject all pending expenses before closing."));

        var hasExpenses = await db.LrExpenses.AnyAsync(e =>
            e.LrNumber == lr.LrNumber && e.CompanyId == lr.CompanyId);
        if (hasExpenses && lr.Status != LrStatuses.ExpenseApproved)
            return BadRequest(new ApiError("All expenses must be approved before closing."));

        if (lr.Status != LrStatuses.InvoiceGenerated && lr.Status != LrStatuses.ExpenseApproved)
            return BadRequest(new ApiError("Generate invoice (and approve expenses if any) before closing LR."));

        lr.Status = LrStatuses.Closed;
        lr.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { lrNumber = lr.LrNumber, status = lr.Status });
    }

    static object? ParseExtendedJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json) || json == "{}") return null;
        try { return JsonSerializer.Deserialize<JsonElement>(json); }
        catch { return null; }
    }

    static JsonObject ParseExt(string? json)
    {
        if (string.IsNullOrWhiteSpace(json) || json == "{}") return new JsonObject();
        try { return JsonNode.Parse(json)?.AsObject() ?? new JsonObject(); }
        catch { return new JsonObject(); }
    }

    static string MergeExtendedJson(string? existingJson, string incomingJson)
    {
        var existing = ParseExt(existingJson);
        var incoming = ParseExt(incomingJson);
        foreach (var prop in incoming)
        {
            if (prop.Value is JsonObject incomingObj &&
                existing[prop.Key] is JsonObject existingObj)
            {
                foreach (var nested in incomingObj)
                    existingObj[nested.Key] = nested.Value?.DeepClone();
                existing[prop.Key] = existingObj;
            }
            else
            {
                existing[prop.Key] = prop.Value?.DeepClone();
            }
        }
        return existing.ToJsonString();
    }

    static void RecordStatusChange(
        TmsDbContext db, LorryReceipt lr, string newStatus, string? changedBy, string? remarks)
    {
        if (lr.Status == newStatus) return;
        var oldStatus = lr.Status;
        lr.Status = newStatus;
        lr.UpdatedAt = DateTime.UtcNow;
        db.LrStatusHistories.Add(new LrStatusHistory
        {
            Id = Guid.NewGuid(),
            CompanyId = lr.CompanyId,
            LrNumber = lr.LrNumber,
            OldStatus = oldStatus,
            NewStatus = newStatus,
            ChangedBy = changedBy,
            ChangedAt = DateTime.UtcNow,
            Remarks = remarks,
        });
    }

    static object MapLoading(LrLoadingSheet s) => new
    {
        s.Id,
        sheetNumber = s.SheetNumber,
        s.BusinessType,
        s.VehicleId,
        s.VehicleNumber,
        s.LoadingLocation,
        s.MaterialQuantity,
        totalQuantityTons = s.TotalQuantity,
        capacityLimitTons = s.CapacityLimit,
        capacityUsedTons = s.CapacityUsed,
        loadingAt = s.LoadingAt.ToString("O"),
        s.LoadingStatus,
        s.Remarks,
        loaderName = s.LoaderName,
        supervisorName = s.SupervisorName,
        sealNumber = s.SealNumber,
        tripNo = s.TripNo,
        extendedData = ParseExtendedJson(s.ExtendedDataJson),
        s.CreatedBy,
        items = s.Items.OrderBy(i => i.SortOrder).Select(i => new
        {
            i.LrNumber,
            i.CustomerId,
            i.CustomerName,
            i.QuantityText,
            i.QuantityTons,
        }).ToList(),
    };

    static object MapTransit(LrTransitPass p, IEnumerable<LrLoadingSheetItem>? items = null)
    {
        var ext = ParseExt(p.ExtendedDataJson);
        var passStatus = ext["passStatus"]?.GetValue<string>() ?? "Draft";
        return new
        {
            p.Id,
            passNumber = p.PassNumber,
            p.VehicleNumber,
            p.DriverName,
            routeFrom = p.RouteFrom,
            routeTo = p.RouteTo,
            p.ViaPoints,
            sealNumber = p.SealNumber,
            sealCondition = p.SealCondition,
            transitType = p.TransitType,
            expectedDelivery = p.ExpectedDelivery?.ToString("yyyy-MM-dd"),
            issueDate = p.IssueDate.ToString("yyyy-MM-dd"),
            p.Remarks,
            p.CreatedBy,
            p.LoadingSheetId,
            passStatus,
            extendedData = ParseExtendedJson(p.ExtendedDataJson),
            lrNumbers = items?.Select(i => i.LrNumber).ToList() ?? [p.LrNumber],
        };
    }

    static object MapDelivery(LrDeliverySheet s)
    {
        var ext = ParseExt(s.ExtendedDataJson);
        var dispatch = ext["dispatch"];
        var dispatchNo = dispatch?["dispatchNo"]?.GetValue<string>() ?? s.TripNo;
        var inTransitStatus = ext["inTransitStatus"]?.GetValue<string>();
        var podVerification = ext["podVerification"]?["status"]?.GetValue<string>();
        return new
        {
            s.Id,
            sheetNumber = s.SheetNumber,
            s.ShipmentStatus,
            deliveryDate = s.DeliveryDate?.ToString("yyyy-MM-dd"),
            s.DeliveryLocation,
            s.ReceiverName,
            tripNo = s.TripNo,
            dispatchNo,
            deliveryTime = s.DeliveryTime?.ToString("HH:mm"),
            packagesTotal = s.PackagesTotal,
            packagesReceived = s.PackagesReceived,
            packagesDamaged = s.PackagesDamaged,
            actualWeight = s.ActualWeight,
            chargedWeight = s.ChargedWeight,
            condition = s.Condition,
            receiverDesignation = s.ReceiverDesignation,
            receiverMobile = s.ReceiverMobile,
            podNo = s.PodNo,
            deliveryNoteNo = s.DeliveryNoteNo,
            s.Remarks,
            inTransitStatus,
            podVerificationStatus = podVerification,
            currentLocation = ext["currentLocation"]?.GetValue<string>(),
            lastUpdate = ext["lastUpdate"]?.GetValue<string>(),
            checkpoints = ext["checkpoints"],
            dispatch,
            extendedData = ParseExtendedJson(s.ExtendedDataJson),
            s.CreatedBy,
        };
    }

    static object MapExpense(LrExpense e) => new
    {
        e.Id,
        e.LrNumber,
        expenseDate = e.ExpenseDate.ToString("yyyy-MM-dd"),
        e.Category,
        e.Description,
        e.Amount,
        billNo = e.BillNo,
        paymentMode = e.PaymentMode,
        advanceTaken = e.AdvanceTaken,
        reimbursed = e.Reimbursed,
        e.AttachmentUrl,
        extendedData = ParseExtendedJson(e.ExtendedDataJson),
        e.Status,
        e.AddedBy,
        e.ApprovedBy,
        approvedAt = e.ApprovedAt?.ToString("O"),
        e.RejectionRemarks,
    };
}
