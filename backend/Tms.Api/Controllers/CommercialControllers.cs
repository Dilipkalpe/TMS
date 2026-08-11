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
[Route("api/freight-rates")]
public class FreightRatesController(TmsDbContext db, ITenantContext tenants, IBranchContext branches) : ControllerBase
{
    static object Map(FreightRate r) => new
    {
        id = r.Id,
        branchId = r.BranchId,
        branchName = r.Branch?.Name,
        customerId = r.CustomerId,
        fromCity = r.FromCity,
        toCity = r.ToCity,
        vehicleType = r.VehicleType,
        rateAmount = r.RateAmount,
        rateUnit = r.RateUnit,
        validFrom = r.ValidFrom?.ToString("yyyy-MM-dd"),
        validTo = r.ValidTo?.ToString("yyyy-MM-dd"),
        isActive = r.IsActive,
        notes = r.Notes,
        createdAt = r.CreatedAt,
        updatedAt = r.UpdatedAt,
        createdBy = r.CreatedBy,
        updatedBy = r.UpdatedBy,
    };

    [HttpGet]
    public async Task<ActionResult<object>> List(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true)
    {
        var q = tenants.Filter(branches.Filter(db.FreightRates.AsNoTracking().Include(r => r.Branch)));
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLowerInvariant();
            q = q.Where(r =>
                r.FromCity.ToLower().Contains(s) ||
                r.ToCity.ToLower().Contains(s) ||
                (r.VehicleType != null && r.VehicleType.ToLower().Contains(s)) ||
                (r.CustomerId != null && r.CustomerId.ToLower().Contains(s)));
        }
        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize);
        var total = includeTotal ? await q.CountAsync() : 0;
        var rows = await q.OrderByDescending(r => r.UpdatedAt)
            .Skip((p - 1) * size).Take(size + 1).ToListAsync();
        var hasMore = rows.Count > size;
        if (hasMore) rows.RemoveAt(rows.Count - 1);
        return Ok(new PagedResult<object>(rows.Select(Map).ToList(), total, p, size, hasMore, !includeTotal));
    }

    [HttpGet("lookup")]
    public async Task<ActionResult<object>> Lookup(
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] string? customerId,
        [FromQuery] string? vehicleType)
    {
        if (string.IsNullOrWhiteSpace(from) || string.IsNullOrWhiteSpace(to))
            return BadRequest(new ApiError("from and to are required."));

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var fromCity = from.Trim();
        var toCity = to.Trim();

        var q = tenants.Filter(branches.Filter(db.FreightRates.AsQueryable()))
            .Where(r => r.IsActive
                && r.FromCity.ToLower() == fromCity.ToLower()
                && r.ToCity.ToLower() == toCity.ToLower()
                && (r.ValidFrom == null || r.ValidFrom <= today)
                && (r.ValidTo == null || r.ValidTo >= today));

        if (!string.IsNullOrWhiteSpace(vehicleType))
            q = q.Where(r => r.VehicleType == null || r.VehicleType == "" || r.VehicleType == vehicleType);

        // Prefer customer-specific rate, then general (null customer)
        var candidates = await q.OrderByDescending(r => r.UpdatedAt).ToListAsync();
        FreightRate? match = null;
        if (!string.IsNullOrWhiteSpace(customerId))
            match = candidates.FirstOrDefault(r => r.CustomerId == customerId);
        match ??= candidates.FirstOrDefault(r => string.IsNullOrEmpty(r.CustomerId));
        match ??= candidates.FirstOrDefault();

        if (match == null) return Ok(new { found = false });
        return Ok(new { found = true, rate = Map(match) });
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<object>> Get(Guid id)
    {
        var r = await db.FreightRates.FindAsync(id);
        if (r == null || !TenantAccess.CanAccess(tenants, r)) return NotFound();
        return Ok(Map(r));
    }

    [HttpPost]
    public async Task<ActionResult<object>> Create([FromBody] Dictionary<string, object?> body)
    {
        var fromCity = ApiParseHelper.BodyString(body, "fromCity") ?? ApiParseHelper.BodyString(body, "from");
        var toCity = ApiParseHelper.BodyString(body, "toCity") ?? ApiParseHelper.BodyString(body, "to");
        if (string.IsNullOrWhiteSpace(fromCity) || string.IsNullOrWhiteSpace(toCity))
            return BadRequest(new ApiError("From and To cities are required."));

        var r = new FreightRate
        {
            Id = Guid.NewGuid(),
            CompanyId = TenantScope.ResolveCompanyId(tenants),
            BranchId = branches.AssignBranchId,
            CustomerId = ApiParseHelper.BodyString(body, "customerId"),
            FromCity = fromCity.Trim(),
            ToCity = toCity.Trim(),
            VehicleType = ApiParseHelper.BodyString(body, "vehicleType"),
            RateAmount = ApiParseHelper.BodyDecimal(body, "rateAmount"),
            RateUnit = ApiParseHelper.BodyString(body, "rateUnit") ?? "PerTrip",
            ValidFrom = ParseOptionalDate(body, "validFrom"),
            ValidTo = ParseOptionalDate(body, "validTo"),
            IsActive = !body.ContainsKey("isActive")
                || string.Equals(body["isActive"]?.ToString(), "true", StringComparison.OrdinalIgnoreCase)
                || body["isActive"] is true,
            Notes = ApiParseHelper.BodyString(body, "notes"),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.FreightRates.Add(r);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = r.Id }, Map(r));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<object>> Update(Guid id, [FromBody] Dictionary<string, object?> body)
    {
        var r = await db.FreightRates.FindAsync(id);
        if (r == null || !TenantAccess.CanAccess(tenants, r)) return NotFound();

        if (body.ContainsKey("fromCity") || body.ContainsKey("from"))
            r.FromCity = (ApiParseHelper.BodyString(body, "fromCity") ?? ApiParseHelper.BodyString(body, "from") ?? r.FromCity).Trim();
        if (body.ContainsKey("toCity") || body.ContainsKey("to"))
            r.ToCity = (ApiParseHelper.BodyString(body, "toCity") ?? ApiParseHelper.BodyString(body, "to") ?? r.ToCity).Trim();
        if (body.ContainsKey("customerId")) r.CustomerId = ApiParseHelper.BodyString(body, "customerId");
        if (body.ContainsKey("vehicleType")) r.VehicleType = ApiParseHelper.BodyString(body, "vehicleType");
        if (body.ContainsKey("rateAmount")) r.RateAmount = ApiParseHelper.BodyDecimal(body, "rateAmount");
        if (body.ContainsKey("rateUnit")) r.RateUnit = ApiParseHelper.BodyString(body, "rateUnit") ?? r.RateUnit;
        if (body.ContainsKey("validFrom")) r.ValidFrom = ParseOptionalDate(body, "validFrom");
        if (body.ContainsKey("validTo")) r.ValidTo = ParseOptionalDate(body, "validTo");
        if (body.ContainsKey("isActive"))
            r.IsActive = string.Equals(body["isActive"]?.ToString(), "true", StringComparison.OrdinalIgnoreCase)
                         || body["isActive"] is true;
        if (body.ContainsKey("notes")) r.Notes = ApiParseHelper.BodyString(body, "notes");
        r.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(Map(r));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var r = await db.FreightRates.FindAsync(id);
        if (r == null || !TenantAccess.CanAccess(tenants, r)) return NotFound();
        db.FreightRates.Remove(r);
        await db.SaveChangesAsync();
        return NoContent();
    }

    static DateOnly? ParseOptionalDate(Dictionary<string, object?> body, string key)
    {
        var s = ApiParseHelper.BodyString(body, key);
        if (string.IsNullOrWhiteSpace(s)) return null;
        return DateOnly.TryParse(s, out var d) ? d : null;
    }
}

[Authorize]
[ApiController]
[Route("api/quotations")]
public class QuotationsController(TmsDbContext db, ITenantContext tenants, IBranchContext branches, DocumentNumberService documentNumbers) : ControllerBase
{
    static object Map(Quotation q) => new
    {
        id = q.Id,
        branchId = q.BranchId,
        branchName = q.Branch?.Name,
        quoteNo = q.QuoteNo,
        customerId = q.CustomerId,
        customerName = q.CustomerName,
        fromCity = q.FromCity,
        toCity = q.ToCity,
        vehicleType = q.VehicleType,
        freight = q.Freight,
        validUntil = q.ValidUntil?.ToString("yyyy-MM-dd"),
        status = q.Status,
        notes = q.Notes,
        bookingId = q.BookingId,
        freightRateId = q.FreightRateId,
        createdAt = q.CreatedAt,
        updatedAt = q.UpdatedAt,
        createdBy = q.CreatedBy,
        updatedBy = q.UpdatedBy,
    };

    [HttpGet]
    public async Task<ActionResult<object>> List(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true)
    {
        var q = tenants.Filter(branches.Filter(db.Quotations.AsNoTracking().Include(x => x.Branch)));
        if (!string.IsNullOrWhiteSpace(status))
            q = q.Where(x => x.Status == status);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLowerInvariant();
            q = q.Where(x =>
                x.QuoteNo.ToLower().Contains(s) ||
                x.CustomerName.ToLower().Contains(s) ||
                x.FromCity.ToLower().Contains(s) ||
                x.ToCity.ToLower().Contains(s));
        }
        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize);
        var total = includeTotal ? await q.CountAsync() : 0;
        var rows = await q.OrderByDescending(x => x.CreatedAt)
            .Skip((p - 1) * size).Take(size + 1).ToListAsync();
        var hasMore = rows.Count > size;
        if (hasMore) rows.RemoveAt(rows.Count - 1);
        return Ok(new PagedResult<object>(rows.Select(Map).ToList(), total, p, size, hasMore, !includeTotal));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<object>> Get(Guid id)
    {
        var q = await db.Quotations.FindAsync(id);
        if (q == null || !TenantAccess.CanAccess(tenants, q)) return NotFound();
        var lines = await db.QuotationLines.Where(l => l.QuotationId == id).OrderBy(l => l.SortOrder).ToListAsync();
        return Ok(new
        {
            quotation = Map(q),
            lines = lines.Select(l => new { l.Id, l.Description, l.Qty, l.Rate, l.Amount, l.SortOrder })
        });
    }

    [HttpPost]
    public async Task<ActionResult<object>> Create([FromBody] Dictionary<string, object?> body)
    {
        var customerName = ApiParseHelper.BodyString(body, "customerName") ?? ApiParseHelper.BodyString(body, "customer");
        var fromCity = ApiParseHelper.BodyString(body, "fromCity") ?? ApiParseHelper.BodyString(body, "from");
        var toCity = ApiParseHelper.BodyString(body, "toCity") ?? ApiParseHelper.BodyString(body, "to");
        if (string.IsNullOrWhiteSpace(customerName) || string.IsNullOrWhiteSpace(fromCity) || string.IsNullOrWhiteSpace(toCity))
            return BadRequest(new ApiError("Customer, From and To are required."));

        var companyId = TenantScope.ResolveCompanyId(tenants);
        var freight = ApiParseHelper.BodyDecimal(body, "freight");
        Guid? rateId = null;
        if (Guid.TryParse(ApiParseHelper.BodyString(body, "freightRateId"), out var rid))
            rateId = rid;

        Guid branchId;
        string quoteNo;
        try
        {
            branchId = await documentNumbers.ResolveBranchIdForNumberingAsync(tenants, branches);
            quoteNo = await documentNumbers.NextAsync(DocumentNumberTypes.Quotation, companyId, branchId);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiError(ex.Message));
        }

        var q = new Quotation
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            BranchId = branchId,
            QuoteNo = quoteNo,
            CustomerId = ApiParseHelper.BodyString(body, "customerId"),
            CustomerName = customerName.Trim(),
            FromCity = fromCity.Trim(),
            ToCity = toCity.Trim(),
            VehicleType = ApiParseHelper.BodyString(body, "vehicleType"),
            Freight = freight,
            ValidUntil = DateOnly.TryParse(ApiParseHelper.BodyString(body, "validUntil"), out var vu) ? vu : null,
            Status = "Draft",
            Notes = ApiParseHelper.BodyString(body, "notes"),
            FreightRateId = rateId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Quotations.Add(q);
        await db.SaveChangesAsync();
        db.QuotationLines.Add(new QuotationLine
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            QuotationId = q.Id,
            Description = "Transport freight",
            Qty = 1,
            Rate = freight,
            Amount = freight,
            SortOrder = 0,
        });
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = q.Id }, Map(q));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<object>> Update(Guid id, [FromBody] Dictionary<string, object?> body)
    {
        var q = await db.Quotations.FindAsync(id);
        if (q == null || !TenantAccess.CanAccess(tenants, q)) return NotFound();
        if (q.Status is "Accepted" or "Rejected")
            return BadRequest(new ApiError($"Cannot edit quotation in status '{q.Status}'."));

        if (body.ContainsKey("customerName") || body.ContainsKey("customer"))
            q.CustomerName = (ApiParseHelper.BodyString(body, "customerName") ?? ApiParseHelper.BodyString(body, "customer") ?? q.CustomerName).Trim();
        if (body.ContainsKey("customerId")) q.CustomerId = ApiParseHelper.BodyString(body, "customerId");
        if (body.ContainsKey("fromCity") || body.ContainsKey("from"))
            q.FromCity = (ApiParseHelper.BodyString(body, "fromCity") ?? ApiParseHelper.BodyString(body, "from") ?? q.FromCity).Trim();
        if (body.ContainsKey("toCity") || body.ContainsKey("to"))
            q.ToCity = (ApiParseHelper.BodyString(body, "toCity") ?? ApiParseHelper.BodyString(body, "to") ?? q.ToCity).Trim();
        if (body.ContainsKey("vehicleType")) q.VehicleType = ApiParseHelper.BodyString(body, "vehicleType");
        if (body.ContainsKey("freight"))
        {
            q.Freight = ApiParseHelper.BodyDecimal(body, "freight");
            var line = await db.QuotationLines.FirstOrDefaultAsync(l => l.QuotationId == id && l.SortOrder == 0);
            if (line != null)
            {
                line.Rate = q.Freight;
                line.Amount = q.Freight;
            }
        }
        if (body.ContainsKey("validUntil"))
            q.ValidUntil = DateOnly.TryParse(ApiParseHelper.BodyString(body, "validUntil"), out var vu) ? vu : null;
        if (body.ContainsKey("notes")) q.Notes = ApiParseHelper.BodyString(body, "notes");
        q.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(Map(q));
    }

    [HttpPost("{id:guid}/send")]
    public async Task<ActionResult<object>> Send(Guid id)
    {
        var q = await db.Quotations.FindAsync(id);
        if (q == null || !TenantAccess.CanAccess(tenants, q)) return NotFound();
        if (q.Status is not "Draft" and not "Sent")
            return BadRequest(new ApiError($"Cannot send quotation in status '{q.Status}'."));
        q.Status = "Sent";
        q.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(Map(q));
    }

    [HttpPost("{id:guid}/accept")]
    public async Task<ActionResult<object>> Accept(Guid id)
    {
        var q = await db.Quotations.FindAsync(id);
        if (q == null || !TenantAccess.CanAccess(tenants, q)) return NotFound();
        if (q.Status is not "Draft" and not "Sent")
            return BadRequest(new ApiError($"Cannot accept quotation in status '{q.Status}'."));
        q.Status = "Accepted";
        q.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(Map(q));
    }

    [HttpPost("{id:guid}/reject")]
    public async Task<ActionResult<object>> Reject(Guid id)
    {
        var q = await db.Quotations.FindAsync(id);
        if (q == null || !TenantAccess.CanAccess(tenants, q)) return NotFound();
        if (q.Status is "Accepted" or "Rejected")
            return BadRequest(new ApiError($"Cannot reject quotation in status '{q.Status}'."));
        q.Status = "Rejected";
        q.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(Map(q));
    }

    [HttpPost("{id:guid}/convert-to-booking")]
    public async Task<ActionResult<object>> ConvertToBooking(Guid id)
    {
        var q = await db.Quotations.FindAsync(id);
        if (q == null || !TenantAccess.CanAccess(tenants, q)) return NotFound();
        if (q.Status != "Accepted")
            return BadRequest(new ApiError("Only Accepted quotations can be converted to a booking."));
        if (!string.IsNullOrEmpty(q.BookingId))
            return BadRequest(new ApiError($"Already converted to booking {q.BookingId}."));

        var companyId = tenants.AssignCompanyId ?? q.CompanyId;
        string? customerId = q.CustomerId;
        if (string.IsNullOrEmpty(customerId))
        {
            var cust = await tenants.Filter(db.Customers.AsQueryable())
                .FirstOrDefaultAsync(c => c.Name == q.CustomerName);
            customerId = cust?.Id;
        }

        Guid branchId;
        string bookingId;
        try
        {
            branchId = await documentNumbers.ResolveBranchIdForNumberingAsync(tenants, branches, q.BranchId);
            bookingId = await documentNumbers.NextAsync(DocumentNumberTypes.Booking, companyId, branchId);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiError(ex.Message));
        }

        var booking = new Booking
        {
            Id = bookingId,
            BookingDate = DateOnly.FromDateTime(DateTime.UtcNow),
            CustomerId = customerId,
            CustomerName = q.CustomerName,
            FromCity = q.FromCity,
            ToCity = q.ToCity,
            Freight = q.Freight,
            Advance = 0,
            Balance = q.Freight,
            Status = "Booked",
            Payment = "Unpaid",
            Remarks = $"From quotation {q.QuoteNo}",
            CompanyId = companyId,
            BranchId = branchId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Bookings.Add(booking);
        q.BookingId = booking.Id;
        q.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Ok(new
        {
            message = "Quotation converted to booking.",
            quotation = Map(q),
            booking = EntityMappers.ToDto(booking),
        });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var q = await db.Quotations.FindAsync(id);
        if (q == null || !TenantAccess.CanAccess(tenants, q)) return NotFound(new ApiError("Quotation not found."));
        if (!string.IsNullOrEmpty(q.BookingId))
            return BadRequest(new ApiError($"Cannot delete — already converted to booking {q.BookingId}. Open the booking instead."));

        // Remove lines first (covers DBs without ON DELETE CASCADE).
        await db.QuotationLines.Where(l => l.QuotationId == id).ExecuteDeleteAsync();
        await db.Quotations.Where(x => x.Id == id).ExecuteDeleteAsync();
        return Ok(new { message = "Quotation deleted", id });
    }
}

[Authorize]
[ApiController]
[Route("api/freight-invoices")]
public class FreightInvoicesController(TmsDbContext db, ITenantContext tenants, IBranchContext branches, DocumentNumberService documentNumbers) : ControllerBase
{
    static object Map(FreightInvoice inv) => new
    {
        id = inv.Id,
        branchId = inv.BranchId,
        branchName = inv.Branch?.Name,
        invoiceNo = inv.InvoiceNo,
        bookingId = inv.BookingId,
        lrNumber = inv.LrNumber,
        customerId = inv.CustomerId,
        customerName = inv.CustomerName,
        gstin = inv.Gstin,
        placeOfSupply = inv.PlaceOfSupply,
        billType = inv.BillType,
        invoiceDate = inv.InvoiceDate.ToString("yyyy-MM-dd"),
        dueDate = inv.DueDate?.ToString("yyyy-MM-dd"),
        taxableAmount = inv.TaxableAmount,
        gstAmount = inv.GstAmount,
        totalAmount = inv.TotalAmount,
        advanceAdjusted = inv.AdvanceAdjusted,
        amountPaid = inv.AmountPaid,
        balance = inv.Balance,
        status = inv.Status,
        invoiceData = inv.InvoiceDataJson,
        createdAt = inv.CreatedAt,
        updatedAt = inv.UpdatedAt,
        createdBy = inv.CreatedBy,
        updatedBy = inv.UpdatedBy,
    };

    [HttpGet]
    public async Task<ActionResult<object>> List(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] string? bookingId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true)
    {
        var q = tenants.Filter(branches.Filter(db.FreightInvoices.AsNoTracking().Include(i => i.Branch)));
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(i => i.Status == status);
        if (!string.IsNullOrWhiteSpace(bookingId)) q = q.Where(i => i.BookingId == bookingId);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLowerInvariant();
            q = q.Where(i =>
                i.InvoiceNo.ToLower().Contains(s) ||
                i.BookingId.ToLower().Contains(s) ||
                (i.CustomerName != null && i.CustomerName.ToLower().Contains(s)));
        }
        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize);
        var total = includeTotal ? await q.CountAsync() : 0;
        var rows = await q.OrderByDescending(i => i.InvoiceDate).ThenByDescending(i => i.CreatedAt)
            .Skip((p - 1) * size).Take(size + 1).ToListAsync();
        var hasMore = rows.Count > size;
        if (hasMore) rows.RemoveAt(rows.Count - 1);
        return Ok(new PagedResult<object>(rows.Select(Map).ToList(), total, p, size, hasMore, !includeTotal));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<object>> Get(Guid id)
    {
        var inv = await db.FreightInvoices.FindAsync(id);
        if (inv == null || !TenantAccess.CanAccess(tenants, inv)) return NotFound();
        var lines = await db.FreightInvoiceLines.Where(l => l.FreightInvoiceId == id).OrderBy(l => l.SortOrder).ToListAsync();
        var payments = await db.BookingPayments.Where(p => p.FreightInvoiceId == id)
            .OrderByDescending(p => p.PaymentDate).ToListAsync();
        return Ok(new
        {
            invoice = Map(inv),
            lines = lines.Select(l => new { id = l.Id, description = l.Description, qty = l.Qty, rate = l.Rate, amount = l.Amount, sortOrder = l.SortOrder }),
            payments = payments.Select(p => new
            {
                id = p.Id,
                paymentDate = p.PaymentDate.ToString("yyyy-MM-dd"),
                amount = p.Amount,
                paymentMode = p.PaymentMode,
                referenceNo = p.ReferenceNo,
                remarks = p.Remarks,
            }),
        });
    }

    [HttpPost]
    public async Task<ActionResult<object>> Create([FromBody] Dictionary<string, object?> body)
    {
        var bookingId = ApiParseHelper.BodyString(body, "bookingId");
        if (string.IsNullOrWhiteSpace(bookingId))
            return BadRequest(new ApiError("bookingId is required."));

        var booking = await TenantScope.FindBookingAsync(db, tenants, branches, bookingId);
        if (booking == null) return NotFound(new ApiError("Booking not found."));

        var billType = (ApiParseHelper.BodyString(body, "billType") ?? "FC").ToUpperInvariant();
        if (billType is not ("RCM" or "FC" or "STANDARD"))
            return BadRequest(new ApiError("billType must be RCM, FC, or Standard."));

        var existingOpen = await db.FreightInvoices.AnyAsync(i =>
            i.BookingId == bookingId && i.Status != "Cancelled");
        if (existingOpen)
            return BadRequest(new ApiError("An active freight invoice already exists for this booking."));

        var built = await BookingFinanceService.BuildTransportBillDataAsync(db, booking, billType == "STANDARD" ? "FC" : billType);
        var gstRate = billType == "RCM" ? 0.05m : billType == "STANDARD" ? 0.18m : 0.18m;
        var taxable = built.TaxableAmount;
        var gst = billType == "STANDARD" || billType == "FC"
            ? Math.Round(taxable * gstRate, 2)
            : Math.Round(taxable * 0.05m, 2);
        var isRcm = billType == "RCM";
        var grossTotal = isRcm ? taxable : taxable + gst;
        var advanceAdjusted = built.Advance;
        var netTotal = Math.Max(0, grossTotal - advanceAdjusted);

        var lr = await db.LorryReceipts.FirstOrDefaultAsync(l => l.BookingId == bookingId);
        var invoiceDataJson = JsonSerializer.Serialize(new
        {
            bookingId,
            route = $"{booking.FromCity} → {booking.ToCity}",
            material = booking.Material,
            quantity = booking.Quantity,
            billType,
            reverseCharge = isRcm,
            freight = built.Freight,
            otherCharges = built.OtherCharges,
            taxableAmount = taxable,
            gstAmount = gst,
            grossTotal,
            advanceAdjusted,
            netPayable = netTotal,
            lines = built.Lines.Select(l => new { description = l.Description, amount = l.Amount, detail = l.Detail })
        });

        Guid invBranchId;
        string invoiceNo;
        DateOnly invoiceDate;
        try
        {
            invBranchId = await documentNumbers.ResolveBranchIdForNumberingAsync(tenants, branches, booking.BranchId);
            invoiceDate = ApiParseHelper.BodyDate(body, "invoiceDate", DateOnly.FromDateTime(DateTime.UtcNow));
            invoiceNo = await documentNumbers.NextAsync(
                DocumentNumberTypes.Invoice, booking.CompanyId, invBranchId, invoiceDate);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiError(ex.Message));
        }

        var inv = new FreightInvoice
        {
            Id = Guid.NewGuid(),
            CompanyId = booking.CompanyId,
            BranchId = invBranchId,
            InvoiceNo = invoiceNo,
            BookingId = bookingId,
            LrNumber = lr?.LrNumber,
            CustomerId = booking.CustomerId,
            CustomerName = ApiParseHelper.BodyString(body, "customerName") ?? booking.CustomerName,
            Gstin = ApiParseHelper.BodyString(body, "gstin"),
            PlaceOfSupply = ApiParseHelper.BodyString(body, "placeOfSupply") ?? booking.ToCity,
            BillType = billType,
            InvoiceDate = invoiceDate,
            DueDate = DateOnly.TryParse(ApiParseHelper.BodyString(body, "dueDate"), out var due) ? due : null,
            TaxableAmount = taxable,
            GstAmount = gst,
            TotalAmount = netTotal,
            AdvanceAdjusted = advanceAdjusted,
            AmountPaid = 0,
            Balance = netTotal,
            Status = netTotal <= 0 ? "Paid" : "Issued",
            InvoiceDataJson = invoiceDataJson,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.FreightInvoices.Add(inv);
        await db.SaveChangesAsync();

        var sort = 0;
        foreach (var line in built.Lines)
        {
            db.FreightInvoiceLines.Add(new FreightInvoiceLine
            {
                Id = Guid.NewGuid(),
                CompanyId = booking.CompanyId,
                FreightInvoiceId = inv.Id,
                Description = line.Description,
                Qty = 1,
                Rate = line.Amount,
                Amount = line.Amount,
                SortOrder = sort++,
            });
        }

        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = inv.Id }, Map(inv));
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<ActionResult<object>> Cancel(Guid id)
    {
        var inv = await db.FreightInvoices.FindAsync(id);
        if (inv == null || !TenantAccess.CanAccess(tenants, inv)) return NotFound();
        if (inv.Status == "Cancelled")
            return BadRequest(new ApiError("Invoice is already cancelled."));
        if (inv.AmountPaid > 0)
            return BadRequest(new ApiError("Cannot cancel an invoice with payments recorded."));

        inv.Status = "Cancelled";
        inv.Balance = 0;
        inv.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(Map(inv));
    }

    /// <summary>Record customer payment against a freight invoice (works for LR-linked bills too).</summary>
    [HttpPost("{id:guid}/payments")]
    public async Task<ActionResult<object>> RecordPayment(Guid id, [FromBody] Dictionary<string, object?> body)
    {
        var inv = await db.FreightInvoices.FindAsync(id);
        if (inv == null || !TenantAccess.CanAccess(tenants, inv)) return NotFound();
        if (inv.Status == "Cancelled")
            return BadRequest(new ApiError("Cannot pay a cancelled invoice."));
        if (inv.Balance <= 0)
            return BadRequest(new ApiError("Invoice is already fully paid."));

        var amount = ApiParseHelper.BodyDecimal(body, "amount");
        if (amount <= 0)
            return BadRequest(new ApiError("Payment amount must be greater than zero."));
        if (amount > inv.Balance)
            return BadRequest(new ApiError($"Payment exceeds invoice balance ({inv.Balance:N2})."));

        var paymentDate = ApiParseHelper.BodyDate(body, "paymentDate", DateOnly.FromDateTime(DateTime.UtcNow));
        string receiptNo;
        try
        {
            var branchId = await documentNumbers.ResolveBranchIdForNumberingAsync(tenants, branches, inv.BranchId);
            receiptNo = await documentNumbers.NextAsync(
                DocumentNumberTypes.Receipt, inv.CompanyId, branchId, paymentDate);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiError(ex.Message));
        }

        // BookingId is required on BookingPayment — use linked booking, else a stable LR/invoice key.
        var bookingKey = !string.IsNullOrWhiteSpace(inv.BookingId)
            ? inv.BookingId
            : !string.IsNullOrWhiteSpace(inv.LrNumber)
                ? $"LR:{inv.LrNumber}"
                : $"INV:{inv.InvoiceNo}";

        var payment = new BookingPayment
        {
            Id = Guid.NewGuid(),
            CompanyId = inv.CompanyId,
            BookingId = bookingKey,
            FreightInvoiceId = inv.Id,
            ReceiptNo = receiptNo,
            PaymentDate = paymentDate,
            Amount = amount,
            PaymentMode = ApiParseHelper.BodyString(body, "paymentMode") ?? "Cash",
            ReferenceNo = ApiParseHelper.BodyString(body, "referenceNo"),
            Remarks = ApiParseHelper.BodyString(body, "remarks"),
            CreatedAt = DateTime.UtcNow,
        };
        db.BookingPayments.Add(payment);

        await BookingFinanceService.RecalculateFreightInvoiceStatusAsync(db, inv);

        if (!string.IsNullOrWhiteSpace(inv.BookingId) && !inv.BookingId.StartsWith("LR:", StringComparison.Ordinal))
        {
            var booking = await TenantScope.FindBookingAsync(db, tenants, branches, inv.BookingId);
            if (booking != null)
            {
                await BookingFinanceService.RecalculateBookingPaymentStatusAsync(db, booking);
                await BookingFinanceService.SyncCustomerOutstandingAsync(db, booking.CompanyId, booking.CustomerId);
            }
        }
        else if (!string.IsNullOrWhiteSpace(inv.CustomerId))
        {
            await BookingFinanceService.SyncCustomerOutstandingAsync(db, inv.CompanyId, inv.CustomerId);
        }

        await db.SaveChangesAsync();

        return Ok(new
        {
            message = "Payment recorded.",
            receiptNo,
            payment = new
            {
                id = payment.Id,
                paymentDate = payment.PaymentDate.ToString("yyyy-MM-dd"),
                amount = payment.Amount,
                paymentMode = payment.PaymentMode,
                referenceNo = payment.ReferenceNo,
                remarks = payment.Remarks,
                receiptNo = payment.ReceiptNo,
            },
            invoice = Map(inv),
        });
    }
}
