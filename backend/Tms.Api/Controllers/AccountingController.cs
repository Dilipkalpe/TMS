using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;
using Tms.Api.Services;

namespace Tms.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/accounting")]
public class AccountingController(TmsDbContext db, ITenantContext tenants, AccountingRegisterJobService registers, AccountingReadService accountingRead) : ControllerBase
{
    [HttpGet("chart-of-accounts")]
    public async Task<ActionResult<object>> ChartOfAccounts()
    {
        var list = await tenants.Filter(db.LedgerAccounts.AsQueryable()).Where(l => l.IsActive).OrderBy(l => l.Code).ToListAsync();
        if (!list.Any()) return Ok(await BuildChartFromOperations());
        return Ok(list.GroupBy(l => l.GroupName ?? "Other").ToDictionary(
            g => g.Key,
            g => g.Select(l => new { code = l.Code, name = l.Name, balance = Math.Abs(l.Balance) })));
    }

    [HttpGet("ledger-master")]
    public async Task<ActionResult<object>> LedgerMaster()
    {
        var list = await tenants.Filter(db.LedgerAccounts.AsQueryable()).OrderBy(l => l.Code).ToListAsync();
        return Ok(list.Select(l => new { code = l.Code, name = l.Name, type = l.AccountType, balance = Math.Abs(l.Balance) }));
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
    public async Task<ActionResult<object>> CashBook() =>
        Ok(await AccountingBalanceService.BuildCashBookAsync(db, tenants));

    [HttpGet("bank-book")]
    public async Task<ActionResult<object>> BankBook() =>
        Ok(await AccountingBalanceService.BuildBankBookAsync(db, tenants));

    [HttpGet("day-book")]
    public async Task<ActionResult<object>> DayBook() =>
        Ok((await tenants.Filter(db.Vouchers.AsQueryable()).OrderByDescending(v => v.VoucherDate).Take(50).ToListAsync())
            .Select(v => new { date = v.VoucherDate.ToString("yyyy-MM-dd"), voucherNo = v.VoucherNo, type = v.VoucherType, ledger = v.PartyName ?? "", debit = v.VoucherType == "Payment" ? v.TotalAmount : 0m, credit = v.VoucherType == "Receipt" ? v.TotalAmount : v.TotalAmount }));

    [HttpGet("journal-register")]
    public async Task<ActionResult<object>> JournalRegister() =>
        Ok(await registers.GetRegisterAsync("journal"));

    [HttpGet("receipt-register")]
    public async Task<ActionResult<object>> ReceiptRegister() =>
        Ok(await registers.GetRegisterAsync("receipt"));

    [HttpGet("payment-register")]
    public async Task<ActionResult<object>> PaymentRegister() =>
        Ok(await registers.GetRegisterAsync("payment"));

    [HttpGet("purchase-register")]
    public async Task<ActionResult<object>> PurchaseRegister() =>
        Ok(await registers.GetRegisterAsync("purchase"));

    [HttpGet("sales-register")]
    public async Task<ActionResult<object>> SalesRegister() =>
        Ok(await registers.GetRegisterAsync("sales"));

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

        return Ok(await AccountingReportService.BuildLedgerReportAsync(db, tenants, from, to));
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
            db, tenants, customerId, from, to));
    }

    [HttpGet("vendor-ledger")]
    public async Task<ActionResult<object>> VendorLedger()
    {
        var exps = await tenants.Filter(db.Expenses.AsNoTracking())
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
        var drivers = await tenants.Filter(db.Drivers.AsNoTracking()).OrderBy(d => d.Name).Take(200).ToListAsync();
        return Ok(drivers.SelectMany(d => new[]
        {
            new { date = new DateOnly(today.Year, today.Month, 1).ToString("yyyy-MM-dd"), type = "Opening", salary = 0m, advance = d.Advance, deduction = 0m, balance = d.Advance },
            new { date = midMonth.ToString("yyyy-MM-dd"), type = "Salary", salary = d.Salary, advance = 0m, deduction = 0m, balance = d.Advance - d.Salary }
        }));
    }

    [HttpGet("vehicle-ledger")]
    public async Task<ActionResult<object>> VehicleLedger() =>
        Ok(await AccountingReportService.BuildVehicleLedgerAsync(db, tenants));

    [HttpGet("trial-balance")]
    public async Task<ActionResult<object>> TrialBalance() =>
        Ok(await AccountingReportService.BuildTrialBalanceAsync(db, tenants));

    [HttpGet("profit-loss")]
    public async Task<ActionResult<object>> ProfitLoss() =>
        Ok(await AccountingReportService.BuildProfitLossAsync(db, tenants));

    [HttpGet("balance-sheet")]
    public async Task<ActionResult<object>> BalanceSheet([FromQuery] int? month, [FromQuery] int? year)
    {
        var refDate = DateOnly.FromDateTime(DateTime.UtcNow);
        if (month is >= 1 and <= 12 && year is >= 2000)
            refDate = new DateOnly(year.Value, month.Value, DateTime.DaysInMonth(year.Value, month.Value));

        var periodStart = new DateOnly(refDate.Year, refDate.Month, 1);
        var bookings = tenants.Filter(db.Bookings.AsQueryable());
        var bookingsInPeriod = bookings.Where(b => b.BookingDate >= periodStart && b.BookingDate <= refDate);
        var income = await bookingsInPeriod.SumAsync(b => b.Freight);
        var recv = await bookings.SumAsync(b => b.Balance);
        var pay = await tenants.Filter(db.Vendors.AsQueryable()).SumAsync(v => v.Outstanding);
        var scopedBookingIds = bookings.Select(b => b.Id);
        var brokerPay = await tenants.Filter(db.BookingBrokerCharges.AsQueryable()).Where(c => scopedBookingIds.Contains(c.BookingId)).SumAsync(c => c.Amount - c.PaidAmount);
        var gst = await tenants.Filter(db.LorryReceipts.AsQueryable()).Where(l => l.LrDate >= periodStart && l.LrDate <= refDate).SumAsync(l => l.Gst);
        var cashBal = await AccountingBalanceService.GetCashBalanceAsync(db, tenants);
        var bankBal = await AccountingBalanceService.GetBankBalanceAsync(db, tenants);
        var expenses = await tenants.Filter(db.BookingExpenses.AsQueryable()).Where(e => e.ExpenseDate >= periodStart && e.ExpenseDate <= refDate).SumAsync(e => e.Amount)
            + await tenants.Filter(db.Expenses.AsQueryable()).Where(e => e.ExpenseDate >= periodStart && e.ExpenseDate <= refDate).SumAsync(e => e.Amount);
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

        var bookingsQ = tenants.Filter(db.Bookings.AsQueryable()).Where(b => b.Balance > 0);
        if (from.HasValue) bookingsQ = bookingsQ.Where(b => b.BookingDate >= from.Value);
        if (to.HasValue) bookingsQ = bookingsQ.Where(b => b.BookingDate <= to.Value);
        if (!string.IsNullOrWhiteSpace(customerId)) bookingsQ = bookingsQ.Where(b => b.CustomerId == customerId);

        var customers = await bookingsQ
            .GroupBy(b => new { b.CustomerId, b.CustomerName })
            .Select(g => new
            {
                name = g.Key.CustomerName,
                partyId = g.Key.CustomerId ?? "",
                amount = g.Sum(b => b.Balance)
            })
            .Where(r => r.amount > 0)
            .OrderByDescending(r => r.amount)
            .ToListAsync();

        var vendorsQ = tenants.Filter(db.Vendors.AsQueryable()).Where(v => v.Outstanding > 0);
        if (!string.IsNullOrWhiteSpace(vendorId)) vendorsQ = vendorsQ.Where(v => v.Id == vendorId);

        var vendors = await vendorsQ
            .Select(v => new { name = v.Name, partyId = v.Id, amount = v.Outstanding })
            .ToListAsync();

        var partiesQ = tenants.Filter(db.Provisions.AsQueryable()).Where(p => p.ProvisionType == "Party" && !p.IsReversed && p.Amount > 0);
        if (from.HasValue) partiesQ = partiesQ.Where(p => p.ProvisionDate >= from.Value);
        if (to.HasValue) partiesQ = partiesQ.Where(p => p.ProvisionDate <= to.Value);

        var parties = await partiesQ
            .GroupBy(p => p.PartyName)
            .Select(g => new { name = g.Key, partyId = g.Max(p => p.PartyId) ?? "", amount = g.Sum(p => p.Amount) })
            .ToListAsync();

        return Ok(new
        {
            customers = customers.Select(r => ToAgingDto(r.name, r.partyId, r.amount)),
            vendors = vendors.Select(r => ToAgingDto(r.name, r.partyId, r.amount)),
            parties = parties.Select(r => ToAgingDto(r.name, r.partyId, r.amount))
        });
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
        Ok(await AccountingReportService.BuildGstAsync(db, tenants));

    private async Task<object> BuildChartFromOperations()
    {
        var income = await tenants.Filter(db.Bookings.AsQueryable()).SumAsync(b => b.Freight);
        var recv = await tenants.Filter(db.Bookings.AsQueryable()).SumAsync(b => b.Balance);
        var cash = await AccountingBalanceService.GetCashBalanceAsync(db, tenants);
        var bank = await AccountingBalanceService.GetBankBalanceAsync(db, tenants);
        var operatingExpenses = await DashboardMetricsService.TotalExpensesAsync(db, tenants, new AllBranchesContext());
        return new Dictionary<string, object>
        {
            ["Assets"] = new[]
            {
                new { code = "1101", name = "Accounts Receivable", balance = recv },
                new { code = "1001", name = "Cash in Hand", balance = cash },
                new { code = "1002", name = "Bank", balance = bank }
            },
            ["Income"] = new[] { new { code = "4001", name = "Freight Income", balance = income } },
            ["Expenses"] = new[] { new { code = "5001", name = "Operating Expenses", balance = operatingExpenses } }
        };
    }
}
