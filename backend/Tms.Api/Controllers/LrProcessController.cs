using System.Security.Claims;
using System.Text.Json;
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
        var expenses = await db.LrExpenses.AsNoTracking()
            .Where(e => e.LrNumber == lr.LrNumber && e.CompanyId == lr.CompanyId)
            .OrderByDescending(e => e.CreatedAt)
            .Select(e => MapExpense(e))
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
        LrProcessService.EnsureStatusAtLeast(anchor, LrStatuses.LRCreated, LrStatuses.Draft);

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
        LrProcessService.EnsureStatusAtLeast(lr, LrStatuses.LoadingCompleted);

        var hasLoading = await db.LrLoadingSheetItems.AsNoTracking()
            .Where(i => i.LrNumber == lr.LrNumber)
            .Join(db.LrLoadingSheets.AsNoTracking(),
                i => i.LoadingSheetId,
                s => s.Id,
                (i, s) => s)
            .AnyAsync(s => s.LoadingStatus == "Completed");
        if (!hasLoading)
            return BadRequest(new ApiError("Complete loading sheet before generating transit pass."));

        var loadingSheet = await db.LrLoadingSheets.AsNoTracking()
            .Include(s => s.Items)
            .Where(s => s.CompanyId == lr.CompanyId &&
                (s.LrNumber == lr.LrNumber || s.Items.Any(i => i.LrNumber == lr.LrNumber)))
            .OrderByDescending(s => s.UpdatedAt)
            .FirstOrDefaultAsync();

        var existing = await db.LrTransitPasses
            .FirstOrDefaultAsync(x => x.LrNumber == lr.LrNumber && x.CompanyId == lr.CompanyId);
        if (existing != null) return Ok(MapTransit(existing));

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
            IssueDate = ApiParseHelper.BodyDate(body, "issueDate", DateOnly.FromDateTime(DateTime.UtcNow)),
            Remarks = ApiParseHelper.BodyString(body, "remarks"),
            CreatedBy = CurrentUser(),
            CreatedAt = DateTime.UtcNow,
        };
        db.LrTransitPasses.Add(pass);

        var linkedLrs = loadingSheet?.Items.Select(i => i.LrNumber).ToList() ?? [lr.LrNumber];
        foreach (var num in linkedLrs.Distinct())
        {
            var row = await db.LorryReceipts.FirstOrDefaultAsync(l => l.LrNumber == num && l.CompanyId == lr.CompanyId);
            if (row == null) continue;
            row.Status = LrStatuses.TransitPassGenerated;
            row.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();
        return Ok(MapTransit(pass, loadingSheet?.Items));
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
        LrProcessService.EnsureStatusAtLeast(lr, LrStatuses.TransitPassGenerated);

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
        LrProcessService.EnsureStatusAtLeast(lr, LrStatuses.TransitPassGenerated);

        var shipmentStatus = ApiParseHelper.BodyString(body, "shipmentStatus") ?? "In Transit";
        var validStatuses = new[] { "In Transit", "Delivered", "POD Received", "Closed" };
        if (!validStatuses.Contains(shipmentStatus))
            return BadRequest(new ApiError("Invalid shipment status."));

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
        existing.Remarks = ApiParseHelper.BodyString(body, "remarks");
        existing.UpdatedAt = DateTime.UtcNow;

        lr.Status = shipmentStatus switch
        {
            "Delivered" => LrStatuses.DeliveryCompleted,
            "POD Received" => LrStatuses.PodUploaded,
            "In Transit" => LrStatuses.InTransit,
            _ => lr.Status,
        };
        lr.UpdatedAt = DateTime.UtcNow;

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
            AttachmentUrl = ApiParseHelper.BodyString(body, "attachmentUrl"),
            Status = "Pending",
            AddedBy = CurrentUser(),
            CreatedAt = DateTime.UtcNow,
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
            .Select(e => MapExpense(e))
            .ToListAsync();
        return Ok(rows);
    }

    [HttpGet("expenses/pending")]
    public async Task<ActionResult<object>> PendingExpenses()
    {
        var q = tenants.Filter(db.LrExpenses.AsNoTracking().Where(e => e.Status == "Pending"));
        var rows = await q.OrderBy(e => e.ExpenseDate).ThenBy(e => e.CreatedAt)
            .Select(e => MapExpense(e))
            .ToListAsync();
        return Ok(rows);
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
        LrProcessService.EnsureStatusAtLeast(lr, LrStatuses.DeliveryCompleted, LrStatuses.PodUploaded);

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
            BookingId = bookingId,
            LrNumber = lr.LrNumber,
            CustomerId = booking?.CustomerId,
            CustomerName = ApiParseHelper.BodyString(body, "customerName") ?? booking?.CustomerName ?? lr.Consignor,
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

    static object MapLoading(LrLoadingSheet s) => new
    {
        s.Id,
        s.SheetNumber,
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

    static object MapTransit(LrTransitPass p, IEnumerable<LrLoadingSheetItem>? items = null) => new
    {
        p.Id,
        p.PassNumber,
        p.VehicleNumber,
        p.DriverName,
        routeFrom = p.RouteFrom,
        routeTo = p.RouteTo,
        p.ViaPoints,
        issueDate = p.IssueDate.ToString("yyyy-MM-dd"),
        p.Remarks,
        p.CreatedBy,
        p.LoadingSheetId,
        lrNumbers = items?.Select(i => i.LrNumber).ToList() ?? [p.LrNumber],
    };

    static object MapDelivery(LrDeliverySheet s) => new
    {
        s.Id,
        s.SheetNumber,
        s.ShipmentStatus,
        deliveryDate = s.DeliveryDate?.ToString("yyyy-MM-dd"),
        s.DeliveryLocation,
        s.ReceiverName,
        s.Remarks,
        s.CreatedBy,
    };

    static object MapExpense(LrExpense e) => new
    {
        e.Id,
        e.LrNumber,
        expenseDate = e.ExpenseDate.ToString("yyyy-MM-dd"),
        e.Category,
        e.Description,
        e.Amount,
        e.AttachmentUrl,
        e.Status,
        e.AddedBy,
        e.ApprovedBy,
        approvedAt = e.ApprovedAt?.ToString("O"),
        e.RejectionRemarks,
    };
}
