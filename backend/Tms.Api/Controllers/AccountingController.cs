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
[Route("api/accounting")]
public class AccountingController(
    TmsDbContext db,
    ITenantContext tenants,
    IBranchContext branches,
    AccountingRegisterJobService registers,
    AccountingReadService accountingRead,
    DocumentNumberService documentNumbers) : ControllerBase
{
    [HttpGet("chart-of-accounts")]
    public async Task<ActionResult<object>> ChartOfAccounts()
    {
        // Always use live operational balances (seed ledger_accounts.balance is demo-only).
        var live = await AccountingReportService.BuildLiveAccountBalancesAsync(db, tenants, branches);
        var list = await tenants.Filter(db.LedgerAccounts.AsQueryable())
            .Where(l => l.IsActive)
            .OrderBy(l => l.Code)
            .ToListAsync();

        if (list.Count == 0)
            return Ok(await BuildChartFromOperations(live));

        return Ok(list
            .GroupBy(l => l.GroupName ?? "Other")
            .ToDictionary(
                g => g.Key,
                g => g.Select(l =>
                {
                    var bal = AccountingReportService.ResolveLiveBalance(live, l.Code, l.Name);
                    return (object)new { code = l.Code, name = l.Name, balance = Math.Abs(bal) };
                }).ToList()));
    }

    [HttpGet("ledger-master")]
    public async Task<ActionResult<object>> LedgerMaster(
        [FromQuery] string? search,
        [FromQuery] string? type,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true)
    {
        var q = tenants.Filter(db.LedgerAccounts.AsNoTracking()).AsQueryable();
        if (!string.IsNullOrWhiteSpace(type))
            q = q.Where(l => l.AccountType == type);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLowerInvariant();
            q = q.Where(l => l.Code.ToLower().Contains(s) || l.Name.ToLower().Contains(s));
        }
        q = q.OrderBy(l => l.Code);
        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize);
        var (items, total, hasMore, approx) = await q.ToPagedListAsync(p, size, includeTotal);
        var live = await AccountingReportService.BuildLiveAccountBalancesAsync(db, tenants, branches);
        var rows = items.Select(l => (object)new
        {
            code = l.Code,
            name = l.Name,
            type = l.AccountType,
            balance = Math.Abs(AccountingReportService.ResolveLiveBalance(live, l.Code, l.Name)),
        }).ToList();
        return Ok(new PagedResult<object>(rows, total, p, size, hasMore, approx));
    }

    [HttpPost("ledger-master")]
    public async Task<ActionResult<object>> CreateLedger([FromBody] Dictionary<string, object?> body)
    {
        var companyId = TenantScope.ResolveCompanyId(tenants);
        var code = body.GetValueOrDefault("code")?.ToString() ?? $"LED-{Guid.NewGuid().ToString()[..8]}";
        var acc = new LedgerAccount
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            Code = code,
            Name = body.GetValueOrDefault("name")?.ToString() ?? "",
            AccountType = body.GetValueOrDefault("type")?.ToString() ?? "Asset",
            GroupName = body.GetValueOrDefault("group")?.ToString() ?? "Assets",
            Balance = decimal.TryParse(body.GetValueOrDefault("balance")?.ToString(), out var b) ? b : 0,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        db.LedgerAccounts.Add(acc);
        await db.SaveChangesAsync();
        return Ok(new { code = acc.Code, name = acc.Name, type = acc.AccountType, balance = acc.Balance });
    }

    [HttpGet("voucher-types")]
    public ActionResult<string[]> VoucherTypes() =>
        Ok(new[] { "Payment Voucher", "Receipt Voucher", "Journal Voucher", "Contra Voucher" });

    [HttpPost("vouchers")]
    public async Task<ActionResult<object>> CreateVoucher([FromBody] Dictionary<string, object?> body)
    {
        var companyId = TenantScope.ResolveCompanyId(tenants);
        var type = body.GetValueOrDefault("voucherType")?.ToString()?.Replace(" Voucher", "") ?? "Payment";
        var count = await tenants.Filter(db.Vouchers.AsQueryable()).CountAsync(v => v.VoucherType == type) + 1;
        var prefix = type[..3].ToUpper();
        var voucherNo = body.GetValueOrDefault("voucherNo")?.ToString() ?? $"{prefix}-2026-{count:D4}";
        var amount = decimal.TryParse(body.GetValueOrDefault("amount")?.ToString(), out var a) ? a : 0;

        var v = new Voucher
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            VoucherNo = voucherNo,
            VoucherDate = DateOnly.TryParse(body.GetValueOrDefault("date")?.ToString(), out var d) ? d : DateOnly.FromDateTime(DateTime.UtcNow),
            VoucherType = type,
            PartyName = body.GetValueOrDefault("partyName")?.ToString(),
            Mode = body.GetValueOrDefault("mode")?.ToString(),
            Narration = body.GetValueOrDefault("narration")?.ToString(),
            TotalAmount = amount,
            CreatedAt = DateTime.UtcNow
        };
        db.Vouchers.Add(v);
        if (!string.IsNullOrEmpty(body.GetValueOrDefault("debitLedger")?.ToString()))
        {
            db.VoucherLines.Add(new VoucherLine
            {
                Id = Guid.NewGuid(),
                CompanyId = companyId,
                VoucherId = v.Id,
                LedgerName = body["debitLedger"]?.ToString(),
                Debit = amount, Credit = 0,
                LineNarration = v.Narration
            });
        }
        if (!string.IsNullOrEmpty(body.GetValueOrDefault("creditLedger")?.ToString()))
        {
            db.VoucherLines.Add(new VoucherLine
            {
                Id = Guid.NewGuid(),
                CompanyId = companyId,
                VoucherId = v.Id,
                LedgerName = body["creditLedger"]?.ToString(),
                Debit = 0, Credit = amount,
                LineNarration = v.Narration
            });
        }
        await db.SaveChangesAsync();
        return Ok(new { voucherNo = v.VoucherNo, message = "Voucher saved." });
    }

    [HttpGet("cash-book")]
    public async Task<ActionResult<object>> CashBook(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true) =>
        Ok(PagingHelper.PageRows(
            PagingHelper.AsObjectList(await AccountingBalanceService.BuildCashBookAsync(db, tenants, branches)),
            page, pageSize, search, includeTotal));

    [HttpGet("bank-book")]
    public async Task<ActionResult<object>> BankBook(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true) =>
        Ok(PagingHelper.PageRows(
            PagingHelper.AsObjectList(await AccountingBalanceService.BuildBankBookAsync(db, tenants, branches)),
            page, pageSize, search, includeTotal));

    [HttpGet("day-book")]
    public async Task<ActionResult<object>> DayBook(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true)
    {
        var q = tenants.Filter(db.Vouchers.AsNoTracking()).AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLowerInvariant();
            q = q.Where(v =>
                v.VoucherNo.ToLower().Contains(s) ||
                (v.PartyName != null && v.PartyName.ToLower().Contains(s)) ||
                (v.Narration != null && v.Narration.ToLower().Contains(s)));
        }
        q = q.OrderByDescending(v => v.VoucherDate).ThenByDescending(v => v.CreatedAt);
        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize);
        var (items, total, hasMore, approx) = await q.ToPagedListAsync(p, size, includeTotal);
        var rows = items.Select(v => (object)new
        {
            date = v.VoucherDate.ToString("yyyy-MM-dd"),
            voucherNo = v.VoucherNo,
            type = v.VoucherType,
            ledger = v.PartyName ?? "",
            debit = v.VoucherType == "Payment" ? v.TotalAmount : 0m,
            credit = v.VoucherType == "Receipt" ? v.TotalAmount : (v.VoucherType == "Payment" ? 0m : v.TotalAmount),
        }).ToList();
        return Ok(new PagedResult<object>(rows, total, p, size, hasMore, approx));
    }

    async Task<ActionResult<object>> PagedRegister(
        string type,
        string? search,
        int page,
        int pageSize,
        bool includeTotal) =>
        Ok(await registers.GetRegisterPagedAsync(type, page, pageSize, search, includeTotal));

    [HttpGet("journal-register")]
    public Task<ActionResult<object>> JournalRegister(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true) =>
        PagedRegister("journal", search, page, pageSize, includeTotal);

    [HttpGet("receipt-register")]
    public Task<ActionResult<object>> ReceiptRegister(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true) =>
        PagedRegister("receipt", search, page, pageSize, includeTotal);

    [HttpGet("payment-register")]
    public Task<ActionResult<object>> PaymentRegister(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true) =>
        PagedRegister("payment", search, page, pageSize, includeTotal);

    [HttpGet("purchase-register")]
    public Task<ActionResult<object>> PurchaseRegister(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true) =>
        PagedRegister("purchase", search, page, pageSize, includeTotal);

    [HttpGet("sales-register")]
    public Task<ActionResult<object>> SalesRegister(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true) =>
        PagedRegister("sales", search, page, pageSize, includeTotal);

    [HttpGet("register-jobs/{id:guid}")]
    public async Task<ActionResult<object>> RegisterJobStatus(Guid id)
    {
        var status = await registers.GetJobStatusAsync(id);
        return status == null ? NotFound() : Ok(status);
    }

    [HttpGet("ledger-report")]
    public async Task<ActionResult<object>> LedgerReport(
        [FromQuery] string? fromDate,
        [FromQuery] string? toDate)
    {
        var from = AccountingReportService.ParseDate(fromDate);
        var to = AccountingReportService.ParseDate(toDate);
        var companyId = TenantScope.ResolveCompanyId(tenants);

        var spRows = await accountingRead.TryGetLedgerReportAsync(companyId, from, to);
        if (spRows != null)
            return Ok(spRows);

        return Ok(await AccountingReportService.BuildLedgerReportAsync(db, tenants, branches, from, to));
    }

    [HttpGet("customer-ledger")]
    public async Task<ActionResult<object>> CustomerLedger(
        [FromQuery] string? customerId,
        [FromQuery] string? fromDate,
        [FromQuery] string? toDate)
    {
        var from = AccountingReportService.ParseDate(fromDate);
        var to = AccountingReportService.ParseDate(toDate);
        var companyId = TenantScope.ResolveCompanyId(tenants);

        var spRows = await accountingRead.TryGetCustomerLedgerAsync(companyId, customerId, from, to);
        if (spRows != null)
            return Ok(spRows);

        return Ok(await AccountingReportService.BuildCustomerLedgerAsync(
            db, tenants, branches, customerId, from, to));
    }

    [HttpGet("vendor-ledger")]
    public async Task<ActionResult<object>> VendorLedger()
    {
        var exps = await TenantScope.Expenses(db, tenants, branches).AsNoTracking()
            .Where(e => e.VendorName != null)
            .OrderByDescending(e => e.ExpenseDate)
            .Take(500)
            .ToListAsync();
        decimal balance = 0;
        return Ok(exps.Select(e => { balance += e.Amount; return new { date = e.ExpenseDate.ToString("yyyy-MM-dd"), voucher = e.Id, particular = e.Description, debit = e.Amount, credit = 0m, balance }; }));
    }

    [HttpGet("driver-ledger")]
    public async Task<ActionResult<object>> DriverLedger()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var midMonth = new DateOnly(today.Year, today.Month, 15);
        var drivers = await TenantScope.Drivers(db, tenants, branches).AsNoTracking().OrderBy(d => d.Name).Take(200).ToListAsync();
        return Ok(drivers.SelectMany(d => new[]
        {
            new { date = new DateOnly(today.Year, today.Month, 1).ToString("yyyy-MM-dd"), type = "Opening", salary = 0m, advance = d.Advance, deduction = 0m, balance = d.Advance },
            new { date = midMonth.ToString("yyyy-MM-dd"), type = "Salary", salary = d.Salary, advance = 0m, deduction = 0m, balance = d.Advance - d.Salary }
        }));
    }

    [HttpGet("vehicle-ledger")]
    public async Task<ActionResult<object>> VehicleLedger() =>
        Ok(await AccountingReportService.BuildVehicleLedgerAsync(db, tenants, branches));

    [HttpGet("trial-balance")]
    public async Task<ActionResult<object>> TrialBalance() =>
        Ok(await AccountingReportService.BuildTrialBalanceAsync(db, tenants, branches));

    [HttpGet("profit-loss")]
    public async Task<ActionResult<object>> ProfitLoss() =>
        Ok(await AccountingReportService.BuildProfitLossAsync(db, tenants, branches));

    [HttpGet("balance-sheet")]
    public async Task<ActionResult<object>> BalanceSheet([FromQuery] int? month, [FromQuery] int? year)
    {
        var refDate = DateOnly.FromDateTime(DateTime.UtcNow);
        if (month is >= 1 and <= 12 && year is >= 2000)
            refDate = new DateOnly(year.Value, month.Value, DateTime.DaysInMonth(year.Value, month.Value));

        var periodStart = new DateOnly(refDate.Year, refDate.Month, 1);
        var bookings = TenantScope.Bookings(db, tenants, branches);
        var bookingsInPeriod = bookings.Where(b => b.BookingDate >= periodStart && b.BookingDate <= refDate);
        var income = await bookingsInPeriod.SumAsync(b => b.Freight);
        var recv = await bookings.SumAsync(b => b.Balance);
        var pay = await TenantScope.Vendors(db, tenants, branches).SumAsync(v => v.Outstanding);
        var scopedBookingIds = bookings.Select(b => b.Id);
        var brokerPay = await tenants.Filter(db.BookingBrokerCharges.AsQueryable()).Where(c => scopedBookingIds.Contains(c.BookingId)).SumAsync(c => c.Amount - c.PaidAmount);
        var gst = await TenantScope.LorryReceipts(db, tenants, branches).Where(l => l.LrDate >= periodStart && l.LrDate <= refDate).SumAsync(l => l.Gst);
        var cashBal = await AccountingBalanceService.GetCashBalanceAsync(db, tenants, branches);
        var bankBal = await AccountingBalanceService.GetBankBalanceAsync(db, tenants, branches);
        var expenses = await tenants.Filter(db.BookingExpenses.AsQueryable()).Where(e => e.ExpenseDate >= periodStart && e.ExpenseDate <= refDate && scopedBookingIds.Contains(e.BookingId)).SumAsync(e => e.Amount)
            + await TenantScope.Expenses(db, tenants, branches).Where(e => e.ExpenseDate >= periodStart && e.ExpenseDate <= refDate).SumAsync(e => e.Amount);
        var periodProfit = income - expenses - brokerPay;

        return Ok(new
        {
            month = refDate.Month,
            year = refDate.Year,
            periodLabel = refDate.ToString("MMMM yyyy"),
            assets = new[]
            {
                new { name = "Cash in Hand", amount = cashBal },
                new { name = "Bank", amount = bankBal },
                new { name = "Accounts Receivable", amount = recv }
            },
            liabilities = new[]
            {
                new { name = "Creditors (Vendors)", amount = pay },
                new { name = "Broker Payable", amount = brokerPay },
                new { name = "GST Payable", amount = gst }
            },
            capital = new[]
            {
                new { name = "Period Profit", amount = periodProfit }
            }
        });
    }

    [HttpGet("outstanding")]
    public async Task<ActionResult<object>> Outstanding(
        [FromQuery] string? fromDate,
        [FromQuery] string? toDate,
        [FromQuery] string? customerId,
        [FromQuery] string? vendorId)
    {
        var from = AccountingReportService.ParseDate(fromDate);
        var to = AccountingReportService.ParseDate(toDate);

        static string ClassifyBucket(DateOnly docDate, DateOnly? fromDateVal, DateOnly? toDateVal)
        {
            if (fromDateVal.HasValue && docDate < fromDateVal.Value) return "balance";
            if ((!fromDateVal.HasValue || docDate >= fromDateVal.Value)
                && (!toDateVal.HasValue || docDate <= toDateVal.Value))
                return "outstanding";
            if (!fromDateVal.HasValue && !toDateVal.HasValue) return "outstanding";
            return "outstanding";
        }

        // ---- Customers: bookings + direct LRs + freight invoices ----
        var bookings = TenantScope.Bookings(db, tenants, branches).AsNoTracking().Where(b => b.Balance > 0);
        if (!string.IsNullOrWhiteSpace(customerId))
            bookings = bookings.Where(b => b.CustomerId == customerId);

        var bookingRows = await bookings
            .Select(b => new { b.Id, partyId = b.CustomerId ?? "", name = b.CustomerName, date = b.BookingDate, amount = b.Balance })
            .ToListAsync();
        var bookingIds = bookingRows.Select(b => b.Id).ToList();
        var lrByBooking = bookingIds.Count == 0
            ? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            : (await TenantScope.LorryReceipts(db, tenants, branches).AsNoTracking()
                .Where(l => l.BookingId != null && bookingIds.Contains(l.BookingId))
                .Select(l => new { l.BookingId, l.LrNumber })
                .ToListAsync())
                .GroupBy(x => x.BookingId!, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.OrderBy(x => x.LrNumber).First().LrNumber, StringComparer.OrdinalIgnoreCase);

        var customerDetailLines = new List<(string PartyKey, string PartyId, string Name, string LrNo, DateOnly Date, decimal Amount, string Bucket, string SourceType, string SourceId)>();

        foreach (var b in bookingRows)
        {
            var partyKey = string.IsNullOrEmpty(b.partyId) ? b.name : b.partyId;
            lrByBooking.TryGetValue(b.Id, out var linkedLr);
            customerDetailLines.Add((
                partyKey,
                b.partyId,
                b.name,
                linkedLr ?? b.Id,
                b.date,
                b.amount,
                ClassifyBucket(b.date, from, to),
                "booking",
                b.Id));
        }

        var invoicedLrNos = TenantScope.FreightInvoices(db, tenants, branches).AsNoTracking()
            .Where(i => i.Status != "Cancelled" && i.LrNumber != null && i.LrNumber != "")
            .Select(i => i.LrNumber!);
        var directLrs = TenantScope.LorryReceipts(db, tenants, branches).AsNoTracking()
            .Where(l => (l.BookingId == null || l.BookingId == "")
                && l.Status != LrStatuses.Draft
                && l.Status != LrStatuses.Closed
                && l.Balance > 0
                && !invoicedLrNos.Contains(l.LrNumber));
        if (!string.IsNullOrWhiteSpace(customerId))
            directLrs = directLrs.Where(l => l.CustomerId == customerId);

        foreach (var l in await directLrs.Select(x => new { partyId = x.CustomerId ?? "", name = x.CustomerName ?? "Unknown", x.LrNumber, date = x.LrDate, amount = x.Balance }).ToListAsync())
        {
            var partyKey = string.IsNullOrEmpty(l.partyId) ? l.name : l.partyId;
            customerDetailLines.Add((partyKey, l.partyId, l.name, l.LrNumber, l.date, l.amount, ClassifyBucket(l.date, from, to), "lr", l.LrNumber));
        }

        var invoices = TenantScope.FreightInvoices(db, tenants, branches).AsNoTracking()
            .Where(i => i.Status != "Cancelled" && i.Balance > 0);
        if (!string.IsNullOrWhiteSpace(customerId))
            invoices = invoices.Where(i => i.CustomerId == customerId);

        foreach (var i in await invoices.Select(x => new { x.Id, partyId = x.CustomerId ?? "", name = x.CustomerName ?? "Unknown", lrNo = x.LrNumber ?? x.InvoiceNo, date = x.InvoiceDate, amount = x.Balance }).ToListAsync())
        {
            var partyKey = string.IsNullOrEmpty(i.partyId) ? i.name : i.partyId;
            customerDetailLines.Add((partyKey, i.partyId, i.name, i.lrNo, i.date, i.amount, ClassifyBucket(i.date, from, to), "invoice", i.Id.ToString()));
        }

        var customers = customerDetailLines
            .GroupBy(r => r.PartyKey, StringComparer.OrdinalIgnoreCase)
            .Select(g =>
            {
                var balance = g.Where(x => x.Bucket == "balance").Sum(x => x.Amount);
                var outstanding = g.Where(x => x.Bucket == "outstanding").Sum(x => x.Amount);
                var totalPending = balance + outstanding;
                return new
                {
                    name = g.Select(x => x.Name).FirstOrDefault(n => !string.IsNullOrWhiteSpace(n)) ?? g.Key,
                    partyId = g.Select(x => x.PartyId).FirstOrDefault(id => !string.IsNullOrEmpty(id)) ?? "",
                    balance,
                    outstanding,
                    totalPending,
                    amount = totalPending,
                    lines = g.OrderByDescending(x => x.Date).ThenBy(x => x.LrNo)
                        .Select(x => (object)new
                        {
                            lrNo = x.LrNo,
                            lrDate = x.Date.ToString("yyyy-MM-dd"),
                            amount = x.Amount,
                            bucket = x.Bucket,
                            sourceType = x.SourceType,
                            sourceId = x.SourceId,
                        }).ToList(),
                };
            })
            .Where(r => r.totalPending > 0)
            .OrderByDescending(r => r.totalPending)
            .Cast<object>()
            .ToList();

        // ---- Vendors: booking expenses + vendor provisions ----
        var vendorExpenseQ = tenants.Filter(db.BookingExpenses.AsNoTracking())
            .Where(e => e.Amount > 0 && e.VendorId != null && e.VendorId != "");
        if (!string.IsNullOrWhiteSpace(vendorId))
            vendorExpenseQ = vendorExpenseQ.Where(e => e.VendorId == vendorId);

        var vendorExpenseRaw = await vendorExpenseQ
            .Select(e => new { partyId = e.VendorId!, name = e.VendorName ?? e.VendorId!, e.BookingId, date = e.ExpenseDate, amount = e.Amount })
            .ToListAsync();
        var vendorBookingIds = vendorExpenseRaw.Select(e => e.BookingId).Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList();
        var vendorLrByBooking = vendorBookingIds.Count == 0
            ? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            : (await TenantScope.LorryReceipts(db, tenants, branches).AsNoTracking()
                .Where(l => l.BookingId != null && vendorBookingIds.Contains(l.BookingId))
                .Select(l => new { l.BookingId, l.LrNumber })
                .ToListAsync())
                .GroupBy(x => x.BookingId!, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.OrderBy(x => x.LrNumber).First().LrNumber, StringComparer.OrdinalIgnoreCase);

        var vendorExpenseLines = vendorExpenseRaw.Select(e =>
        {
            vendorLrByBooking.TryGetValue(e.BookingId, out var linkedLr);
            var lrNo = !string.IsNullOrWhiteSpace(linkedLr) ? linkedLr! : e.BookingId;
            return new { e.partyId, e.name, lrNo, e.date, e.amount };
        }).ToList();

        var vendorProvQ = tenants.Filter(db.Provisions.AsNoTracking())
            .Where(p => p.ProvisionType == "Vendor" && !p.IsReversed && p.Amount > 0);
        if (!string.IsNullOrWhiteSpace(vendorId))
            vendorProvQ = vendorProvQ.Where(p => p.PartyId == vendorId);

        var vendorProvLines = await vendorProvQ
            .Select(p => new
            {
                partyId = p.PartyId ?? p.PartyName,
                name = p.PartyName,
                lrNo = p.ReferenceNo ?? p.Id.ToString(),
                date = p.ProvisionDate,
                amount = p.Amount,
            })
            .ToListAsync();

        var vendorDetailLines = vendorExpenseLines
            .Select(e => (PartyKey: e.partyId, PartyId: e.partyId, Name: e.name, LrNo: e.lrNo, Date: e.date, Amount: e.amount, Bucket: ClassifyBucket(e.date, from, to)))
            .Concat(vendorProvLines.Select(p => (PartyKey: string.IsNullOrEmpty(p.partyId) ? p.name : p.partyId, PartyId: p.partyId ?? "", Name: p.name, LrNo: p.lrNo, Date: p.date, Amount: p.amount, Bucket: ClassifyBucket(p.date, from, to))))
            .ToList();

        // Ensure vendors with Outstanding master balance but no detail rows still appear via master.
        var vendorsMaster = await TenantScope.Vendors(db, tenants, branches).AsNoTracking()
            .Where(v => v.Outstanding > 0)
            .Select(v => new { v.Id, v.Name, v.Outstanding })
            .ToListAsync();
        if (!string.IsNullOrWhiteSpace(vendorId))
            vendorsMaster = vendorsMaster.Where(v => v.Id == vendorId).ToList();

        var vendors = vendorsMaster
            .Select(v =>
            {
                var lines = vendorDetailLines
                    .Where(l => string.Equals(l.PartyId, v.Id, StringComparison.OrdinalIgnoreCase)
                        || string.Equals(l.Name, v.Name, StringComparison.OrdinalIgnoreCase))
                    .ToList();
                var balance = lines.Where(x => x.Bucket == "balance").Sum(x => x.Amount);
                var outstanding = lines.Where(x => x.Bucket == "outstanding").Sum(x => x.Amount);
                if (lines.Count == 0)
                {
                    // Fall back to master outstanding in Outstanding column when no dated lines.
                    outstanding = v.Outstanding;
                    balance = 0m;
                }
                var totalPending = balance + outstanding;
                if (totalPending <= 0 && v.Outstanding > 0)
                {
                    outstanding = v.Outstanding;
                    totalPending = v.Outstanding;
                }
                return (object)new
                {
                    name = v.Name,
                    partyId = v.Id,
                    balance,
                    outstanding,
                    totalPending,
                    amount = totalPending,
                    lines = lines.OrderByDescending(x => x.Date).ThenBy(x => x.LrNo)
                        .Select(x => (object)new
                        {
                            lrNo = x.LrNo,
                            lrDate = x.Date.ToString("yyyy-MM-dd"),
                            amount = x.Amount,
                            bucket = x.Bucket,
                        }).ToList(),
                };
            })
            .ToList();

        // ---- Party provisions ----
        var partiesQ = tenants.Filter(db.Provisions.AsNoTracking())
            .Where(p => p.ProvisionType == "Party" && !p.IsReversed && p.Amount > 0);
        var partyProvRows = await partiesQ
            .Select(p => new
            {
                partyId = p.PartyId ?? "",
                name = p.PartyName,
                lrNo = p.ReferenceNo ?? p.Id.ToString(),
                date = p.ProvisionDate,
                amount = p.Amount,
            })
            .ToListAsync();

        var parties = partyProvRows
            .GroupBy(r => string.IsNullOrEmpty(r.partyId) ? r.name : r.partyId, StringComparer.OrdinalIgnoreCase)
            .Select(g =>
            {
                decimal balance = 0m;
                decimal outstanding = 0m;
                var lines = new List<object>();
                foreach (var line in g.OrderByDescending(x => x.date).ThenBy(x => x.lrNo))
                {
                    var bucket = ClassifyBucket(line.date, from, to);
                    if (bucket == "balance") balance += line.amount;
                    else outstanding += line.amount;
                    lines.Add(new
                    {
                        lrNo = line.lrNo,
                        lrDate = line.date.ToString("yyyy-MM-dd"),
                        amount = line.amount,
                        bucket,
                    });
                }
                var totalPending = balance + outstanding;
                return new
                {
                    name = g.Select(x => x.name).FirstOrDefault(n => !string.IsNullOrWhiteSpace(n)) ?? g.Key,
                    partyId = g.Select(x => x.partyId).FirstOrDefault(id => !string.IsNullOrEmpty(id)) ?? "",
                    balance,
                    outstanding,
                    totalPending,
                    amount = totalPending,
                    lines,
                };
            })
            .Where(r => r.totalPending > 0)
            .Cast<object>()
            .ToList();

        return Ok(new
        {
            customers,
            vendors,
            parties,
            asOf = new { fromDate, toDate },
        });
    }

    /// <summary>
    /// Record a customer payment against one outstanding line (booking, freight invoice, or direct LR).
    /// </summary>
    [HttpPost("outstanding/customer-payment")]
    public async Task<ActionResult<object>> RecordCustomerOutstandingPayment([FromBody] Dictionary<string, object?> body)
    {
        var sourceType = (ApiParseHelper.BodyString(body, "sourceType") ?? "").Trim().ToLowerInvariant();
        var sourceId = (ApiParseHelper.BodyString(body, "sourceId") ?? "").Trim();
        if (string.IsNullOrWhiteSpace(sourceType) || string.IsNullOrWhiteSpace(sourceId))
            return BadRequest(new ApiError("sourceType and sourceId are required."));

        var amount = ApiParseHelper.BodyDecimal(body, "amount");
        if (amount <= 0)
            return BadRequest(new ApiError("Payment amount must be greater than zero."));

        var paymentDate = ApiParseHelper.BodyDate(body, "paymentDate", DateOnly.FromDateTime(DateTime.UtcNow));
        var paymentMode = ApiParseHelper.BodyString(body, "paymentMode") ?? "Cash";
        var referenceNo = ApiParseHelper.BodyString(body, "referenceNo");
        var remarks = ApiParseHelper.BodyString(body, "remarks");

        if (sourceType is "booking")
        {
            var booking = await TenantScope.FindBookingAsync(db, tenants, branches, sourceId);
            if (booking == null) return NotFound(new ApiError("Booking not found."));
            if (amount > booking.Balance)
                return BadRequest(new ApiError($"Payment exceeds outstanding balance ({booking.Balance:N2})."));

            Guid? freightInvoiceId = null;
            FreightInvoice? invoice = null;
            if (Guid.TryParse(ApiParseHelper.BodyString(body, "freightInvoiceId"), out var fid))
            {
                invoice = await db.FreightInvoices.FindAsync(fid);
                if (invoice == null || invoice.BookingId != booking.Id || !TenantAccess.CanAccess(tenants, invoice))
                    return BadRequest(new ApiError("Freight invoice not found for this booking."));
                if (invoice.Status == "Cancelled")
                    return BadRequest(new ApiError("Cannot pay a cancelled freight invoice."));
                if (amount > invoice.Balance)
                    return BadRequest(new ApiError($"Payment exceeds invoice balance ({invoice.Balance:N2})."));
                freightInvoiceId = invoice.Id;
            }
            else
            {
                invoice = await db.FreightInvoices
                    .Where(i => i.BookingId == booking.Id && i.Status != "Cancelled" && i.Balance > 0)
                    .OrderByDescending(i => i.CreatedAt)
                    .FirstOrDefaultAsync();
                if (invoice != null)
                    freightInvoiceId = invoice.Id;
            }

            string receiptNo;
            try
            {
                var branchId = await documentNumbers.ResolveBranchIdForNumberingAsync(tenants, branches, booking.BranchId);
                receiptNo = await documentNumbers.NextAsync(DocumentNumberTypes.Receipt, booking.CompanyId, branchId, paymentDate);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new ApiError(ex.Message));
            }

            var payment = new BookingPayment
            {
                Id = Guid.NewGuid(),
                CompanyId = booking.CompanyId,
                BookingId = booking.Id,
                FreightInvoiceId = freightInvoiceId,
                ReceiptNo = receiptNo,
                PaymentDate = paymentDate,
                Amount = amount,
                PaymentMode = paymentMode,
                ReferenceNo = referenceNo,
                Remarks = remarks,
                CreatedAt = DateTime.UtcNow,
            };
            db.BookingPayments.Add(payment);
            await BookingFinanceService.RecalculateBookingPaymentStatusAsync(db, booking);
            if (invoice != null)
                await BookingFinanceService.RecalculateFreightInvoiceStatusAsync(db, invoice);
            await BookingFinanceService.SyncCustomerOutstandingAsync(db, booking.CompanyId, booking.CustomerId);
            await db.SaveChangesAsync();

            return Ok(new
            {
                message = "Payment recorded.",
                receiptNo,
                sourceType,
                sourceId = booking.Id,
                outstanding = booking.Balance,
                paymentStatus = booking.Payment,
            });
        }

        if (sourceType is "invoice")
        {
            if (!Guid.TryParse(sourceId, out var invoiceId))
                return BadRequest(new ApiError("Invalid invoice id."));
            var inv = await db.FreightInvoices.FindAsync(invoiceId);
            if (inv == null || !TenantScope.CanAccessBranchEntity(tenants, branches, inv))
                return NotFound(new ApiError("Freight invoice not found."));
            if (inv.Status == "Cancelled")
                return BadRequest(new ApiError("Cannot pay a cancelled invoice."));
            if (inv.Balance <= 0)
                return BadRequest(new ApiError("Invoice is already fully paid."));
            if (amount > inv.Balance)
                return BadRequest(new ApiError($"Payment exceeds invoice balance ({inv.Balance:N2})."));

            string receiptNo;
            try
            {
                var branchId = await documentNumbers.ResolveBranchIdForNumberingAsync(tenants, branches, inv.BranchId);
                receiptNo = await documentNumbers.NextAsync(DocumentNumberTypes.Receipt, inv.CompanyId, branchId, paymentDate);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new ApiError(ex.Message));
            }

            string bookingKey;
            Booking? booking = null;
            if (!string.IsNullOrWhiteSpace(inv.BookingId)
                && !inv.BookingId.StartsWith("LR:", StringComparison.OrdinalIgnoreCase)
                && !inv.BookingId.StartsWith("INV:", StringComparison.OrdinalIgnoreCase))
            {
                booking = await TenantScope.FindBookingAsync(db, tenants, branches, inv.BookingId);
                bookingKey = booking?.Id ?? (!string.IsNullOrWhiteSpace(inv.LrNumber) ? $"LR:{inv.LrNumber}" : $"INV:{inv.InvoiceNo}");
            }
            else if (!string.IsNullOrWhiteSpace(inv.LrNumber))
            {
                bookingKey = $"LR:{inv.LrNumber}";
            }
            else
            {
                bookingKey = $"INV:{inv.InvoiceNo}";
            }

            var payment = new BookingPayment
            {
                Id = Guid.NewGuid(),
                CompanyId = inv.CompanyId,
                BookingId = bookingKey,
                FreightInvoiceId = inv.Id,
                ReceiptNo = receiptNo,
                PaymentDate = paymentDate,
                Amount = amount,
                PaymentMode = paymentMode,
                ReferenceNo = referenceNo,
                Remarks = remarks,
                CreatedAt = DateTime.UtcNow,
            };
            db.BookingPayments.Add(payment);
            await BookingFinanceService.RecalculateFreightInvoiceStatusAsync(db, inv);
            if (booking != null)
            {
                await BookingFinanceService.RecalculateBookingPaymentStatusAsync(db, booking);
                await BookingFinanceService.SyncCustomerOutstandingAsync(db, booking.CompanyId, booking.CustomerId);
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
                sourceType,
                sourceId = inv.Id,
                outstanding = inv.Balance,
                invoiceStatus = inv.Status,
            });
        }

        if (sourceType is "lr")
        {
            var lr = await db.LorryReceipts.FirstOrDefaultAsync(x => x.LrNumber == sourceId);
            if (lr == null || !TenantScope.CanAccessBranchEntity(tenants, branches, lr))
                return NotFound(new ApiError("LR not found."));
            if (lr.Balance <= 0)
                return BadRequest(new ApiError("LR is already fully paid."));
            if (amount > lr.Balance)
                return BadRequest(new ApiError($"Payment exceeds outstanding balance ({lr.Balance:N2})."));

            string receiptNo;
            try
            {
                var branchId = await documentNumbers.ResolveBranchIdForNumberingAsync(tenants, branches, lr.BranchId);
                receiptNo = await documentNumbers.NextAsync(DocumentNumberTypes.Receipt, lr.CompanyId, branchId, paymentDate);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new ApiError(ex.Message));
            }

            var bookingKey = $"LR:{lr.LrNumber}";
            var payment = new BookingPayment
            {
                Id = Guid.NewGuid(),
                CompanyId = lr.CompanyId,
                BookingId = bookingKey,
                ReceiptNo = receiptNo,
                PaymentDate = paymentDate,
                Amount = amount,
                PaymentMode = paymentMode,
                ReferenceNo = referenceNo,
                Remarks = remarks,
                CreatedAt = DateTime.UtcNow,
            };
            db.BookingPayments.Add(payment);

            var charges = lr.Freight + lr.Gst
                + (lr.Hamali ?? 0) + (lr.LoadingCharges ?? 0) + (lr.UnloadingCharges ?? 0) + (lr.Insurance ?? 0);
            var advance = lr.Advance ?? 0m;
            var paidDb = await db.BookingPayments
                .Where(p => p.BookingId == bookingKey)
                .SumAsync(p => p.Amount);
            var pendingAdded = db.ChangeTracker.Entries<BookingPayment>()
                .Where(e => e.State == EntityState.Added && e.Entity.BookingId == bookingKey)
                .Sum(e => e.Entity.Amount);
            lr.Balance = Math.Max(0, charges - advance - paidDb - pendingAdded);
            if (lr.Balance <= 0)
                lr.PaymentType = "Paid";
            lr.UpdatedAt = DateTime.UtcNow;

            await BookingFinanceService.SyncCustomerOutstandingAsync(db, lr.CompanyId, lr.CustomerId);
            await db.SaveChangesAsync();

            return Ok(new
            {
                message = "Payment recorded.",
                receiptNo,
                sourceType,
                sourceId = lr.LrNumber,
                outstanding = lr.Balance,
            });
        }

        return BadRequest(new ApiError("sourceType must be booking, invoice, or lr."));
    }

    static object ToAgingDto(string name, string partyId, decimal amount) => new
    {
        name,
        partyId,
        amount,
        days0_30 = amount,
        days30_60 = 0m,
        days60_90 = 0m,
        days90plus = 0m
    };

    [HttpGet("gst")]
    public async Task<ActionResult<object>> Gst() =>
        Ok(await AccountingReportService.BuildGstAsync(db, tenants, branches));

    private async Task<object> BuildChartFromOperations(IReadOnlyDictionary<string, decimal>? live = null)
    {
        live ??= await AccountingReportService.BuildLiveAccountBalancesAsync(db, tenants, branches);
        return new Dictionary<string, object>
        {
            ["Assets"] = new[]
            {
                new { code = "1001", name = "Cash in Hand", balance = live.GetValueOrDefault("1001") },
                new { code = "1002", name = "Bank", balance = live.GetValueOrDefault("1002") },
                new { code = "1101", name = "Accounts Receivable", balance = live.GetValueOrDefault("1101") },
            },
            ["Liabilities"] = new[]
            {
                new { code = "2001", name = "Accounts Payable", balance = live.GetValueOrDefault("2001") },
                new { code = "2201", name = "GST Payable", balance = live.GetValueOrDefault("2201") },
                new { code = "2101", name = "Broker Payable", balance = live.GetValueOrDefault("2101") },
            },
            ["Capital"] = new[]
            {
                new { code = "3001", name = "Period Profit / Capital", balance = live.GetValueOrDefault("3001") },
            },
            ["Income"] = new[] { new { code = "4001", name = "Freight Income", balance = live.GetValueOrDefault("4001") } },
            ["Expenses"] = new[] { new { code = "5001", name = "Operating Expenses", balance = live.GetValueOrDefault("5001") } },
        };
    }
}
