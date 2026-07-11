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
[Route("api")]
public class BookingFinanceController(TmsDbContext db, IBranchContext branches, ITenantContext tenants) : ControllerBase
{
    [HttpGet("bookings/{bookingId}/finance")]
    public async Task<ActionResult<object>> GetFinanceSummary(string bookingId)
    {
        var booking = await TenantScope.FindBookingAsync(db, tenants, branches, bookingId);
        if (booking == null) return NotFound();

        var payments = await db.BookingPayments.Where(p => p.BookingId == bookingId)
            .OrderByDescending(p => p.PaymentDate).ToListAsync();
        var brokerCharges = await db.BookingBrokerCharges.Where(c => c.BookingId == bookingId)
            .OrderByDescending(c => c.CreatedAt).ToListAsync();
        var expenses = await db.BookingExpenses.Where(e => e.BookingId == bookingId)
            .OrderByDescending(e => e.ExpenseDate).ToListAsync();
        var bills = await db.TransportBills.Where(b => b.BookingId == bookingId)
            .OrderByDescending(b => b.BillDate).ToListAsync();
        var pl = await BookingFinanceService.BuildBookingProfitLossAsync(db, booking);

        return Ok(new
        {
            booking = EntityMappers.ToDto(booking),
            payments = payments.Select(MapPayment),
            brokerCharges = brokerCharges.Select(MapBrokerCharge),
            expenses = expenses.Select(MapExpense),
            bills = bills.Select(MapBill),
            profitLoss = pl
        });
    }

    [HttpGet("bookings/{bookingId}/payments")]
    public async Task<ActionResult<object>> ListPayments(string bookingId)
    {
        var booking = await TenantScope.FindBookingAsync(db, tenants, branches, bookingId);
        if (booking == null) return NotFound();
        var rows = await db.BookingPayments.Where(p => p.BookingId == bookingId)
            .OrderByDescending(p => p.PaymentDate).ToListAsync();
        return Ok(new { bookingId, outstanding = booking.Balance, freight = booking.Freight, advance = booking.Advance, payments = rows.Select(MapPayment) });
    }

    [HttpPost("bookings/{bookingId}/payments")]
    public async Task<ActionResult<object>> RecordPayment(string bookingId, [FromBody] Dictionary<string, object?> body)
    {
        var booking = await TenantScope.FindBookingAsync(db, tenants, branches, bookingId);
        if (booking == null) return NotFound();

        var amount = ApiParseHelper.BodyDecimal(body, "amount");
        if (amount <= 0) return BadRequest(new ApiError("Payment amount must be greater than zero."));
        if (amount > booking.Balance)
            return BadRequest(new ApiError($"Payment exceeds outstanding balance ({booking.Balance:N2})."));

        var payment = new BookingPayment
        {
            Id = Guid.NewGuid(),
            CompanyId = booking.CompanyId,
            BookingId = bookingId,
            PaymentDate = ApiParseHelper.BodyDate(body, "paymentDate", DateOnly.FromDateTime(DateTime.UtcNow)),
            Amount = amount,
            PaymentMode = ApiParseHelper.BodyString(body, "paymentMode") ?? "Cash",
            ReferenceNo = ApiParseHelper.BodyString(body, "referenceNo"),
            Remarks = ApiParseHelper.BodyString(body, "remarks"),
            CreatedAt = DateTime.UtcNow
        };
        db.BookingPayments.Add(payment);
        await BookingFinanceService.RecalculateBookingPaymentStatusAsync(db, booking);
        await BookingFinanceService.SyncCustomerOutstandingAsync(db, booking.CompanyId, booking.CustomerId);
        await db.SaveChangesAsync();

        return Ok(new { message = "Payment recorded.", payment = MapPayment(payment), outstanding = booking.Balance, paymentStatus = booking.Payment });
    }

    [HttpPost("bookings/{bookingId}/broker-charges")]
    public async Task<ActionResult<object>> AddBrokerCharge(string bookingId, [FromBody] Dictionary<string, object?> body)
    {
        var booking = await TenantScope.FindBookingAsync(db, tenants, branches, bookingId);
        if (booking == null) return NotFound();

        var brokerName = ApiParseHelper.BodyString(body, "brokerName");
        if (string.IsNullOrWhiteSpace(brokerName))
            return BadRequest(new ApiError("Broker name is required."));

        var amount = ApiParseHelper.BodyDecimal(body, "amount");
        if (amount <= 0) return BadRequest(new ApiError("Broker charge amount must be greater than zero."));

        try
        {
            var brokerId = ApiParseHelper.BodyString(body, "brokerId");
            if (string.IsNullOrEmpty(brokerId))
            {
                var broker = await tenants.Filter(db.Brokers.AsQueryable()).FirstOrDefaultAsync(b => b.Name == brokerName);
                if (broker == null)
                {
                    broker = new Broker
                    {
                        Id = await IdGenerator.NextBrokerId(db),
                        CompanyId = TenantScope.ResolveCompanyId(tenants),
                        Name = brokerName,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    db.Brokers.Add(broker);
                    await db.SaveChangesAsync();
                }
                brokerId = broker.Id;
            }
            else if (!await tenants.Filter(db.Brokers.AsQueryable()).AnyAsync(b => b.Id == brokerId))
                return BadRequest(new ApiError($"Broker '{brokerId}' not found."));

            var charge = new BookingBrokerCharge
            {
                Id = Guid.NewGuid(),
                CompanyId = booking.CompanyId,
                BookingId = bookingId,
                BrokerId = brokerId,
                BrokerName = brokerName,
                ChargeType = ApiParseHelper.BodyString(body, "chargeType") ?? "Commission",
                Amount = amount,
                PaidAmount = ApiParseHelper.BodyDecimal(body, "paidAmount"),
                Remarks = ApiParseHelper.BodyString(body, "remarks"),
                CreatedAt = DateTime.UtcNow
            };
            db.BookingBrokerCharges.Add(charge);
            await BookingFinanceService.SyncBrokerOutstandingAsync(db, booking.CompanyId, brokerName);
            await db.SaveChangesAsync();
            return Ok(MapBrokerCharge(charge));
        }
        catch (DbUpdateException ex)
        {
            var inner = ex.InnerException?.Message ?? ex.Message;
            return StatusCode(500, new ApiError($"Could not save broker charge: {inner}"));
        }
    }

    [HttpPost("bookings/{bookingId}/expenses")]
    public async Task<ActionResult<object>> AddBookingExpense(string bookingId, [FromBody] Dictionary<string, object?> body)
    {
        var booking = await TenantScope.FindBookingAsync(db, tenants, branches, bookingId);
        if (booking == null) return NotFound();

        var amount = ApiParseHelper.BodyDecimal(body, "amount");
        var category = ApiParseHelper.BodyString(body, "category");
        if (amount <= 0) return BadRequest(new ApiError("Expense amount must be greater than zero."));
        if (string.IsNullOrWhiteSpace(category))
            return BadRequest(new ApiError("Category is required."));

        var vendorName = ApiParseHelper.BodyString(body, "vendorName");
        var vendor = !string.IsNullOrEmpty(vendorName)
            ? await TenantScope.FindVendorByRefAsync(db, tenants, vendorName)
            : null;

        var expense = new BookingExpense
        {
            Id = Guid.NewGuid(),
            CompanyId = booking.CompanyId,
            BookingId = bookingId,
            ExpenseDate = ApiParseHelper.BodyDate(body, "expenseDate", DateOnly.FromDateTime(DateTime.UtcNow)),
            Category = category,
            Description = ApiParseHelper.BodyString(body, "description"),
            Amount = amount,
            VendorId = vendor?.Id ?? ApiParseHelper.BodyString(body, "vendorId"),
            VendorName = vendor?.Name ?? vendorName,
            CreatedAt = DateTime.UtcNow
        };
        db.BookingExpenses.Add(expense);
        await BookingFinanceService.SyncVendorOutstandingAsync(db, booking.CompanyId, expense.VendorId);
        await db.SaveChangesAsync();
        return Ok(MapExpense(expense));
    }

    [HttpPost("bookings/{bookingId}/bills")]
    public async Task<ActionResult<object>> CreateBill(string bookingId, [FromBody] Dictionary<string, object?> body)
    {
        var booking = await TenantScope.FindBookingAsync(db, tenants, branches, bookingId);
        if (booking == null) return NotFound();

        var billType = (ApiParseHelper.BodyString(body, "billType") ?? "FC").ToUpperInvariant();
        if (billType is not ("RCM" or "FC"))
            return BadRequest(new ApiError("Bill type must be RCM or FC."));

        var built = await BookingFinanceService.BuildTransportBillDataAsync(db, booking, billType);
        var taxable = body.ContainsKey("taxableAmount")
            ? ApiParseHelper.BodyDecimal(body, "taxableAmount")
            : built.TaxableAmount;
        var gstRate = billType == "RCM" ? 0.05m : 0.18m;
        var gst = body.ContainsKey("gstAmount")
            ? ApiParseHelper.BodyDecimal(body, "gstAmount")
            : Math.Round(taxable * gstRate, 2);
        var grossTotal = billType == "RCM" ? taxable : taxable + gst;
        var netPayable = Math.Max(0, grossTotal - built.Advance);

        var billDataJson = System.Text.Json.JsonSerializer.Serialize(new
        {
            bookingId,
            route = $"{booking.FromCity} → {booking.ToCity}",
            material = booking.Material,
            quantity = booking.Quantity,
            billType,
            reverseCharge = billType == "RCM",
            freight = built.Freight,
            otherCharges = built.OtherCharges,
            taxableAmount = taxable,
            gstAmount = gst,
            grossTotal,
            advance = built.Advance,
            bookingAdvance = built.BookingAdvance,
            paymentsTotal = built.PaymentsTotal,
            netPayable,
            lines = built.Lines.Select(l => new { description = l.Description, amount = l.Amount, detail = l.Detail })
        });

        var bill = new TransportBill
        {
            Id = Guid.NewGuid(),
            CompanyId = booking.CompanyId,
            BillNo = await BookingFinanceService.NextBillNoAsync(db, billType),
            BillType = billType,
            BookingId = bookingId,
            BillDate = ApiParseHelper.BodyDate(body, "billDate", DateOnly.FromDateTime(DateTime.UtcNow)),
            CustomerName = ApiParseHelper.BodyString(body, "customerName") ?? booking.CustomerName,
            Gstin = ApiParseHelper.BodyString(body, "gstin"),
            PlaceOfSupply = ApiParseHelper.BodyString(body, "placeOfSupply") ?? booking.ToCity,
            TaxableAmount = taxable,
            GstAmount = gst,
            TotalAmount = netPayable,
            BillDataJson = billDataJson,
            CreatedAt = DateTime.UtcNow
        };
        db.TransportBills.Add(bill);
        await db.SaveChangesAsync();
        return Ok(MapBill(bill));
    }

    [HttpDelete("bookings/{bookingId}/bills/{billId:guid}")]
    public async Task<IActionResult> DeleteBill(string bookingId, Guid billId)
    {
        var booking = await TenantScope.FindBookingAsync(db, tenants, branches, bookingId);
        if (booking == null) return NotFound();

        var bill = await db.TransportBills.FirstOrDefaultAsync(b => b.Id == billId && b.BookingId == bookingId);
        if (bill == null) return NotFound();

        db.TransportBills.Remove(bill);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("bookings/{bookingId}/profit-loss")]
    public async Task<ActionResult<object>> BookingProfitLoss(string bookingId)
    {
        var booking = await TenantScope.FindBookingAsync(db, tenants, branches, bookingId);
        if (booking == null) return NotFound();
        return Ok(await BookingFinanceService.BuildBookingProfitLossAsync(db, booking));
    }

    [HttpGet("reports/booking-profit-loss")]
    public async Task<ActionResult<object>> BookingProfitLossReport(
        [FromQuery] string? bookingId,
        [FromQuery] string? fromDate,
        [FromQuery] string? toDate)
    {
        var q = tenants.Filter(branches.Filter(db.Bookings.AsQueryable()));
        if (!string.IsNullOrWhiteSpace(bookingId))
            q = q.Where(b => b.Id == bookingId);

        var from = AccountingReportService.ParseDate(fromDate);
        var to = AccountingReportService.ParseDate(toDate);
        if (!string.IsNullOrWhiteSpace(fromDate) && !from.HasValue)
            return BadRequest(new ApiError("Invalid fromDate. Use YYYY-MM-DD."));
        if (!string.IsNullOrWhiteSpace(toDate) && !to.HasValue)
            return BadRequest(new ApiError("Invalid toDate. Use YYYY-MM-DD."));
        if (from.HasValue)
            q = q.Where(b => b.BookingDate >= from.Value);
        if (to.HasValue)
            q = q.Where(b => b.BookingDate <= to.Value);

        var bookings = await q.AsNoTracking().OrderByDescending(b => b.BookingDate).Take(5000).ToListAsync();
        return Ok(await BookingFinanceService.BuildBookingProfitLossBatchAsync(db, bookings));
    }

    [HttpGet("reports/broker-outstanding")]
    public async Task<ActionResult<object>> BrokerOutstandingReport()
    {
        var rows = await tenants.Filter(db.BookingBrokerCharges.AsQueryable())
            .GroupBy(c => c.BrokerName)
            .Select(g => new
            {
                brokerName = g.Key,
                bookings = g.Select(c => c.BookingId).Distinct().Count(),
                payable = g.Sum(c => c.Amount - c.PaidAmount),
            })
            .Where(r => r.payable > 0)
            .OrderByDescending(r => r.payable)
            .ToListAsync();
        return Ok(rows);
    }

    [HttpGet("provisions")]
    public async Task<ActionResult<object>> ListProvisions([FromQuery] string? type)
    {
        var q = tenants.Filter(db.Provisions.AsQueryable());
        if (!string.IsNullOrWhiteSpace(type))
            q = q.Where(p => p.ProvisionType == type);
        var rows = await q.OrderByDescending(p => p.ProvisionDate).Take(500).ToListAsync();
        return Ok(rows.Select(MapProvision));
    }

    [HttpPost("provisions")]
    public async Task<ActionResult<object>> CreateProvision([FromBody] Dictionary<string, object?> body)
    {
        var type = ApiParseHelper.BodyString(body, "provisionType") ?? ApiParseHelper.BodyString(body, "type");
        if (type is not ("Vendor" or "Party"))
            return BadRequest(new ApiError("Provision type must be Vendor or Party."));

        var partyName = ApiParseHelper.BodyString(body, "partyName");
        if (string.IsNullOrWhiteSpace(partyName))
            return BadRequest(new ApiError("Party name is required."));

        var amount = ApiParseHelper.BodyDecimal(body, "amount");
        if (amount <= 0) return BadRequest(new ApiError("Amount must be greater than zero."));

        var partyId = ApiParseHelper.BodyString(body, "partyId");
        var prov = new Provision
        {
            Id = Guid.NewGuid(),
            CompanyId = TenantScope.ResolveCompanyId(tenants),
            ProvisionType = type,
            PartyId = partyId,
            PartyName = partyName,
            ProvisionDate = ApiParseHelper.BodyDate(body, "provisionDate", DateOnly.FromDateTime(DateTime.UtcNow)),
            Amount = amount,
            ReferenceNo = ApiParseHelper.BodyString(body, "referenceNo"),
            Remarks = ApiParseHelper.BodyString(body, "remarks"),
            CreatedAt = DateTime.UtcNow
        };
        db.Provisions.Add(prov);
        if (type == "Vendor")
            await BookingFinanceService.SyncVendorOutstandingAsync(db, prov.CompanyId, partyId);
        else
            await BookingFinanceService.SyncCustomerOutstandingAsync(db, prov.CompanyId, partyId);
        await db.SaveChangesAsync();
        return Ok(MapProvision(prov));
    }

    [HttpPost("provisions/{id:guid}/reverse")]
    public async Task<ActionResult<object>> ReverseProvision(Guid id)
    {
        var prov = await db.Provisions.FindAsync(id);
        if (prov == null || !TenantScope.CanAccessTenantEntity(tenants, prov)) return NotFound();
        prov.IsReversed = true;
        if (prov.ProvisionType == "Vendor")
            await BookingFinanceService.SyncVendorOutstandingAsync(db, prov.CompanyId, prov.PartyId);
        else
            await BookingFinanceService.SyncCustomerOutstandingAsync(db, prov.CompanyId, prov.PartyId);
        await db.SaveChangesAsync();
        return Ok(MapProvision(prov));
    }

    [HttpGet("brokers")]
    public async Task<ActionResult<object>> ListBrokers()
    {
        var rows = await tenants.Filter(db.Brokers.AsQueryable()).OrderBy(b => b.Name).ToListAsync();
        return Ok(rows.Select(b => new { id = b.Id, name = b.Name, phone = b.Phone, gst = b.Gst, outstanding = b.Outstanding }));
    }

    static object MapPayment(BookingPayment p) => new
    {
        id = p.Id,
        bookingId = p.BookingId,
        paymentDate = p.PaymentDate.ToString("yyyy-MM-dd"),
        amount = p.Amount,
        paymentMode = p.PaymentMode,
        referenceNo = p.ReferenceNo,
        remarks = p.Remarks
    };

    static object MapBrokerCharge(BookingBrokerCharge c) => new
    {
        id = c.Id,
        bookingId = c.BookingId,
        brokerId = c.BrokerId,
        brokerName = c.BrokerName,
        chargeType = c.ChargeType,
        amount = c.Amount,
        paidAmount = c.PaidAmount,
        outstanding = c.Amount - c.PaidAmount,
        remarks = c.Remarks
    };

    static object MapExpense(BookingExpense e) => new
    {
        id = e.Id,
        bookingId = e.BookingId,
        expenseDate = e.ExpenseDate.ToString("yyyy-MM-dd"),
        category = e.Category,
        description = e.Description,
        amount = e.Amount,
        vendorId = e.VendorId,
        vendorName = e.VendorName
    };

    static object MapBill(TransportBill b)
    {
        decimal advance = 0, otherCharges = 0, grossTotal = 0, netPayable = b.TotalAmount;
        object? lines = null;
        if (!string.IsNullOrWhiteSpace(b.BillDataJson))
        {
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(b.BillDataJson);
                var root = doc.RootElement;
                advance = root.TryGetProperty("advance", out var adv) ? adv.GetDecimal() : 0;
                otherCharges = root.TryGetProperty("otherCharges", out var oc) ? oc.GetDecimal() : 0;
                grossTotal = root.TryGetProperty("grossTotal", out var gt) ? gt.GetDecimal() : b.TaxableAmount + b.GstAmount;
                netPayable = root.TryGetProperty("netPayable", out var np) ? np.GetDecimal() : b.TotalAmount;
                if (root.TryGetProperty("lines", out var ln)) lines = System.Text.Json.JsonSerializer.Deserialize<object>(ln.GetRawText());
            }
            catch { /* legacy bills */ }
        }

        return new
        {
            id = b.Id,
            billNo = b.BillNo,
            billType = b.BillType,
            bookingId = b.BookingId,
            billDate = b.BillDate.ToString("yyyy-MM-dd"),
            customerName = b.CustomerName,
            gstin = b.Gstin,
            placeOfSupply = b.PlaceOfSupply,
            taxableAmount = b.TaxableAmount,
            gstAmount = b.GstAmount,
            totalAmount = b.TotalAmount,
            advance,
            otherCharges,
            grossTotal,
            netPayable,
            lines,
            billData = b.BillDataJson
        };
    }

    static object MapProvision(Provision p) => new
    {
        id = p.Id,
        provisionType = p.ProvisionType,
        partyId = p.PartyId,
        partyName = p.PartyName,
        provisionDate = p.ProvisionDate.ToString("yyyy-MM-dd"),
        amount = p.Amount,
        referenceNo = p.ReferenceNo,
        remarks = p.Remarks,
        isReversed = p.IsReversed
    };
}
