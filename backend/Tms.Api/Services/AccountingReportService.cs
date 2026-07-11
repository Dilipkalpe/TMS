using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public sealed class AllBranchesContext : IBranchContext
{
    public Guid? EffectiveBranchId => null;
    public bool CanAccessAllBranches => true;
    public Guid? AssignBranchId => null;

    public IQueryable<T> Filter<T>(IQueryable<T> query) where T : class, IBranchScoped => query;
}

public static class AccountingReportService
{
    record LedgerLine(DateOnly Date, string Voucher, string Particular, decimal Debit, decimal Credit, string? RefNo = null, int SortKey = 0);

    public static async Task<List<object>> BuildCustomerLedgerAsync(
        TmsDbContext db,
        ITenantContext tenants,
        string? customerId = null,
        DateOnly? fromDate = null,
        DateOnly? toDate = null,
        CancellationToken ct = default)
    {
        var bookingsQ = tenants.Filter(db.Bookings.AsQueryable());
        if (!string.IsNullOrWhiteSpace(customerId))
            bookingsQ = bookingsQ.Where(b => b.CustomerId == customerId);
        if (fromDate.HasValue)
            bookingsQ = bookingsQ.Where(b => b.BookingDate >= fromDate.Value);
        if (toDate.HasValue)
            bookingsQ = bookingsQ.Where(b => b.BookingDate <= toDate.Value);

        var bookings = await bookingsQ.OrderBy(b => b.BookingDate).ThenBy(b => b.Id).ToListAsync(ct);
        if (bookings.Count == 0) return [];

        var bookingIds = bookings.Select(b => b.Id).ToList();
        var payments = await tenants.Filter(db.BookingPayments.AsQueryable())
            .Where(p => bookingIds.Contains(p.BookingId))
            .ToListAsync(ct);

        var lines = new List<LedgerLine>();
        foreach (var b in bookings)
        {
            lines.Add(new LedgerLine(
                b.BookingDate, b.Id,
                $"Freight · {b.FromCity} → {b.ToCity}",
                b.Freight, b.Advance, null, 0));

            foreach (var p in payments.Where(x => x.BookingId == b.Id).OrderBy(x => x.PaymentDate))
            {
                var mode = string.IsNullOrWhiteSpace(p.PaymentMode) ? "Cash" : p.PaymentMode;
                lines.Add(new LedgerLine(
                    p.PaymentDate,
                    p.Id.ToString()[..8].ToUpperInvariant(),
                    $"Payment · {mode}",
                    0,
                    p.Amount,
                    p.ReferenceNo,
                    1));
            }
        }

        return ToRunningBalance(
            lines.OrderBy(l => l.Date).ThenBy(l => l.SortKey).ThenBy(l => l.Voucher).ToList(),
            receivableStyle: true);
    }

    public static async Task<List<object>> BuildLedgerReportAsync(
        TmsDbContext db,
        ITenantContext tenants,
        DateOnly? fromDate = null,
        DateOnly? toDate = null,
        CancellationToken ct = default)
    {
        var lines = new List<LedgerLine>();

        var paymentsQ = tenants.Filter(db.BookingPayments.AsQueryable());
        if (fromDate.HasValue) paymentsQ = paymentsQ.Where(p => p.PaymentDate >= fromDate.Value);
        if (toDate.HasValue) paymentsQ = paymentsQ.Where(p => p.PaymentDate <= toDate.Value);
        foreach (var p in await paymentsQ.ToListAsync(ct))
            lines.Add(new LedgerLine(p.PaymentDate, p.BookingId, $"Receipt · {p.PaymentMode} · {p.BookingId}", 0, p.Amount));

        var expensesQ = tenants.Filter(db.Expenses.AsQueryable());
        if (fromDate.HasValue) expensesQ = expensesQ.Where(e => e.ExpenseDate >= fromDate.Value);
        if (toDate.HasValue) expensesQ = expensesQ.Where(e => e.ExpenseDate <= toDate.Value);
        foreach (var e in await expensesQ.ToListAsync(ct))
            lines.Add(new LedgerLine(e.ExpenseDate, e.Id, e.Description ?? e.Category, e.Amount, 0));

        var bookingExpQ = tenants.Filter(db.BookingExpenses.AsQueryable());
        if (fromDate.HasValue) bookingExpQ = bookingExpQ.Where(e => e.ExpenseDate >= fromDate.Value);
        if (toDate.HasValue) bookingExpQ = bookingExpQ.Where(e => e.ExpenseDate <= toDate.Value);
        foreach (var e in await bookingExpQ.ToListAsync(ct))
            lines.Add(new LedgerLine(e.ExpenseDate, e.BookingId, $"Booking expense · {e.Category}", e.Amount, 0));

        foreach (var c in await tenants.Filter(db.BookingBrokerCharges.AsQueryable()).ToListAsync(ct))
        {
            var date = DateOnly.FromDateTime(c.CreatedAt.Kind == DateTimeKind.Utc ? c.CreatedAt : c.CreatedAt.ToUniversalTime());
            if (fromDate.HasValue && date < fromDate.Value) continue;
            if (toDate.HasValue && date > toDate.Value) continue;
            lines.Add(new LedgerLine(date, c.BookingId, $"Broker · {c.BrokerName}", c.Amount, 0));
        }

        var vouchersQ = tenants.Filter(db.Vouchers.AsQueryable());
        if (fromDate.HasValue) vouchersQ = vouchersQ.Where(v => v.VoucherDate >= fromDate.Value);
        if (toDate.HasValue) vouchersQ = vouchersQ.Where(v => v.VoucherDate <= toDate.Value);
        foreach (var v in await vouchersQ.OrderBy(x => x.VoucherDate).ToListAsync(ct))
        {
            if (v.VoucherType == "Receipt")
                lines.Add(new LedgerLine(v.VoucherDate, v.VoucherNo, v.Narration ?? v.PartyName ?? "Receipt", 0, v.TotalAmount));
            else if (v.VoucherType == "Payment")
                lines.Add(new LedgerLine(v.VoucherDate, v.VoucherNo, v.Narration ?? v.PartyName ?? "Payment", v.TotalAmount, 0));
        }

        return ToRunningBalance(lines.OrderBy(l => l.Date).ThenBy(l => l.Voucher).ToList(), receivableStyle: false);
    }

    public static async Task<List<object>> BuildTrialBalanceAsync(TmsDbContext db, ITenantContext tenants, CancellationToken ct = default)
    {
        var ledger = await tenants.Filter(db.LedgerAccounts.AsQueryable()).Where(l => l.IsActive).ToListAsync(ct);
        if (ledger.Count > 0)
        {
            return ledger
                .Where(l => l.Balance != 0)
                .Select(l => (object)new
                {
                    account = l.Name,
                    debit = l.Balance > 0 ? l.Balance : 0m,
                    credit = l.Balance < 0 ? -l.Balance : 0m
                })
                .ToList();
        }

        var bookings = tenants.Filter(db.Bookings.AsQueryable());
        var cash = await AccountingBalanceService.GetCashBalanceAsync(db, tenants, ct);
        var bank = await AccountingBalanceService.GetBankBalanceAsync(db, tenants, ct);
        var receivable = await bookings.SumAsync(b => b.Balance, ct);
        var scopedBookingIds = bookings.Select(b => b.Id);
        var brokerPayable = await tenants.Filter(db.BookingBrokerCharges.AsQueryable()).Where(c => scopedBookingIds.Contains(c.BookingId)).SumAsync(c => c.Amount - c.PaidAmount, ct);
        var vendorPayable = await tenants.Filter(db.Vendors.AsQueryable()).SumAsync(v => v.Outstanding, ct);
        var totalExpenses = await DashboardMetricsService.TotalExpensesAsync(db, tenants, new AllBranchesContext(), ct);

        var rows = new List<object>();
        void Add(string account, decimal debit, decimal credit)
        {
            if (debit == 0 && credit == 0) return;
            rows.Add(new { account, debit, credit });
        }

        Add("Cash in Hand", Math.Max(0, cash), 0);
        Add("Bank", Math.Max(0, bank), 0);
        Add("Accounts Receivable", receivable, 0);
        Add("Broker Payable", 0, brokerPayable);
        Add("Vendor Payable", 0, vendorPayable);
        Add("Operating Expenses", totalExpenses, 0);

        return rows;
    }

    public static async Task<object> BuildProfitLossAsync(TmsDbContext db, ITenantContext tenants, CancellationToken ct = default)
    {
        var income = await tenants.Filter(db.Bookings.AsQueryable()).SumAsync(b => b.Freight, ct);
        var expenses = (await DashboardMetricsService.ExpenseBreakdownAsync(db, tenants, new AllBranchesContext(), ct))
            .Where(e => e.Amount > 0)
            .Select(e => new { name = e.Label, amount = e.Amount })
            .Cast<object>()
            .ToList();

        return new
        {
            income = new[] { new { name = "Freight Income", amount = income } },
            expenses
        };
    }

    public static async Task<object> BuildGstAsync(TmsDbContext db, ITenantContext tenants, CancellationToken ct = default)
    {
        var lrs = tenants.Filter(db.LorryReceipts.AsQueryable());
        var hasGst = await lrs.AnyAsync(l => l.Gst > 0, ct);
        if (!hasGst)
        {
            return new
            {
                inputGST = 0m,
                outputGST = 0m,
                netGST = 0m,
                inputBreakdown = Array.Empty<object>(),
                outputBreakdown = Array.Empty<object>()
            };
        }

        var output = await lrs.SumAsync(l => l.Gst, ct);
        var months = new[] { "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" };
        var outputBreakdown = await lrs
            .Where(l => l.Gst > 0)
            .GroupBy(l => new { l.LrDate.Year, l.LrDate.Month })
            .Select(g => new { month = g.Key.Month, amount = g.Sum(l => l.Gst) })
            .OrderBy(x => x.month)
            .ToListAsync(ct);

        return new
        {
            inputGST = 0m,
            outputGST = output,
            netGST = output,
            inputBreakdown = Array.Empty<object>(),
            outputBreakdown = outputBreakdown
                .Select(r => (object)new { month = months[r.month - 1], amount = r.amount })
                .ToList()
        };
    }

    public static async Task<List<object>> BuildCashFlowAsync(TmsDbContext db, ITenantContext tenants, CancellationToken ct = default)
    {
        var months = new[] { "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" };

        var paymentIn = await tenants.Filter(db.BookingPayments.AsQueryable())
            .GroupBy(p => p.PaymentDate.Month)
            .Select(g => new { month = g.Key, amount = g.Sum(p => p.Amount) })
            .ToListAsync(ct);

        var advanceIn = await tenants.Filter(db.Bookings.AsQueryable())
            .Where(b => b.Advance > 0)
            .GroupBy(b => b.BookingDate.Month)
            .Select(g => new { month = g.Key, amount = g.Sum(b => b.Advance) })
            .ToListAsync(ct);

        var globalExp = await tenants.Filter(db.Expenses.AsQueryable())
            .GroupBy(e => e.ExpenseDate.Month)
            .Select(g => new { month = g.Key, amount = g.Sum(e => e.Amount) })
            .ToListAsync(ct);

        var bookingExp = await tenants.Filter(db.BookingExpenses.AsQueryable())
            .GroupBy(e => e.ExpenseDate.Month)
            .Select(g => new { month = g.Key, amount = g.Sum(e => e.Amount) })
            .ToListAsync(ct);

        var brokerExp = await tenants.Filter(db.BookingBrokerCharges.AsQueryable())
            .GroupBy(c => c.CreatedAt.Month)
            .Select(g => new { month = g.Key, amount = g.Sum(c => c.Amount) })
            .ToListAsync(ct);

        return months.Select((label, i) =>
        {
            var month = i + 1;
            var inflow = (paymentIn.FirstOrDefault(x => x.month == month)?.amount ?? 0)
                + (advanceIn.FirstOrDefault(x => x.month == month)?.amount ?? 0);
            var outflow = (globalExp.FirstOrDefault(x => x.month == month)?.amount ?? 0)
                + (bookingExp.FirstOrDefault(x => x.month == month)?.amount ?? 0)
                + (brokerExp.FirstOrDefault(x => x.month == month)?.amount ?? 0);
            if (inflow == 0 && outflow == 0) return null;
            var year = DateTime.UtcNow.Year;
            return (object)new { month = label, monthNo = month, year, inflow, outflow, net = inflow - outflow };
        }).Where(x => x != null).Cast<object>().ToList();
    }

    public static async Task<object> BuildCashFlowDetailsAsync(TmsDbContext db, ITenantContext tenants, int month, int year, CancellationToken ct = default)
    {
        var inflows = new List<object>();
        var outflows = new List<object>();

        foreach (var p in await tenants.Filter(db.BookingPayments.AsQueryable())
            .Where(x => x.PaymentDate.Month == month && x.PaymentDate.Year == year)
            .OrderBy(x => x.PaymentDate)
            .ToListAsync(ct))
        {
            inflows.Add(new
            {
                date = p.PaymentDate.ToString("yyyy-MM-dd"),
                type = "Inflow",
                refNo = p.ReferenceNo ?? "",
                mode = p.PaymentMode ?? "Cash",
                bookingId = p.BookingId,
                particular = $"Booking payment · {p.BookingId}",
                amount = p.Amount
            });
        }

        foreach (var b in await tenants.Filter(db.Bookings.AsQueryable())
            .Where(x => x.BookingDate.Month == month && x.BookingDate.Year == year && x.Advance > 0)
            .OrderBy(x => x.BookingDate)
            .ToListAsync(ct))
        {
            inflows.Add(new
            {
                date = b.BookingDate.ToString("yyyy-MM-dd"),
                type = "Inflow",
                refNo = b.Id,
                mode = "Advance",
                bookingId = b.Id,
                particular = $"Booking advance · {b.CustomerName}",
                amount = b.Advance
            });
        }

        foreach (var e in await tenants.Filter(db.Expenses.AsQueryable())
            .Where(x => x.ExpenseDate.Month == month && x.ExpenseDate.Year == year)
            .OrderBy(x => x.ExpenseDate)
            .ToListAsync(ct))
        {
            outflows.Add(new
            {
                date = e.ExpenseDate.ToString("yyyy-MM-dd"),
                type = "Outflow",
                refNo = e.Id,
                mode = e.PaymentMode ?? "",
                bookingId = "",
                particular = e.Description ?? e.Category,
                amount = e.Amount
            });
        }

        foreach (var e in await tenants.Filter(db.BookingExpenses.AsQueryable())
            .Where(x => x.ExpenseDate.Month == month && x.ExpenseDate.Year == year)
            .OrderBy(x => x.ExpenseDate)
            .ToListAsync(ct))
        {
            outflows.Add(new
            {
                date = e.ExpenseDate.ToString("yyyy-MM-dd"),
                type = "Outflow",
                refNo = e.Id.ToString()[..8],
                mode = e.Category,
                bookingId = e.BookingId,
                particular = $"Booking expense · {e.Category} · {e.BookingId}",
                amount = e.Amount
            });
        }

        foreach (var c in await tenants.Filter(db.BookingBrokerCharges.AsQueryable()).ToListAsync(ct))
        {
            var date = DateOnly.FromDateTime(c.CreatedAt.Kind == DateTimeKind.Utc ? c.CreatedAt : c.CreatedAt.ToUniversalTime());
            if (date.Month != month || date.Year != year) continue;
            outflows.Add(new
            {
                date = date.ToString("yyyy-MM-dd"),
                type = "Outflow",
                refNo = c.Id.ToString()[..8],
                mode = c.ChargeType,
                bookingId = c.BookingId,
                particular = $"Broker · {c.BrokerName} · {c.BookingId}",
                amount = c.Amount
            });
        }

        var entries = inflows.Concat(outflows)
            .Select(x => x)
            .OrderBy(x => x.GetType().GetProperty("date")!.GetValue(x)!.ToString())
            .ToList();

        decimal SumAmount(IEnumerable<object> rows) => rows.Sum(r => (decimal)r.GetType().GetProperty("amount")!.GetValue(r)!);

        return new
        {
            month,
            year,
            entries,
            totalInflow = SumAmount(inflows),
            totalOutflow = SumAmount(outflows)
        };
    }

    public static async Task<List<object>> BuildVehicleLedgerAsync(TmsDbContext db, ITenantContext tenants, CancellationToken ct = default)
    {
        var vehicles = await tenants.Filter(db.Vehicles.AsNoTracking()).ToListAsync(ct);
        var byNumber = vehicles.ToDictionary(v => v.Number, v => v, StringComparer.OrdinalIgnoreCase);
        var byId = vehicles.ToDictionary(v => v.Id, v => v, StringComparer.OrdinalIgnoreCase);

        string CanonicalNumber(string? num, string? id)
        {
            if (!string.IsNullOrWhiteSpace(num)) return num.Trim();
            if (!string.IsNullOrWhiteSpace(id) && byId.TryGetValue(id, out var v)) return v.Number;
            return num?.Trim() ?? "";
        }

        void AddNumber(HashSet<string> set, string? num, string? id)
        {
            var n = CanonicalNumber(num, id);
            if (!string.IsNullOrEmpty(n)) set.Add(n);
        }

        var numbers = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var v in vehicles) numbers.Add(v.Number);

        var bookingLinks = await tenants.Filter(db.Bookings.AsNoTracking())
            .Where(b => b.VehicleNumber != null || b.VehicleId != null)
            .Select(b => new { b.Id, b.VehicleNumber, b.VehicleId, b.Freight })
            .ToListAsync(ct);
        foreach (var b in bookingLinks) AddNumber(numbers, b.VehicleNumber, b.VehicleId);

        var lrLinks = await tenants.Filter(db.LorryReceipts.AsNoTracking())
            .Where(l => l.VehicleNumber != null || l.VehicleId != null)
            .Select(l => new { l.VehicleNumber, l.VehicleId, l.Freight })
            .ToListAsync(ct);
        foreach (var l in lrLinks) AddNumber(numbers, l.VehicleNumber, l.VehicleId);

        var bookingToVehicle = bookingLinks.ToDictionary(
            b => b.Id,
            b => CanonicalNumber(b.VehicleNumber, b.VehicleId));

        var fuelByVehicle = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
        var maintByVehicle = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
        foreach (var e in await tenants.Filter(db.Expenses.AsNoTracking())
            .Where(x => (x.VehicleNumber != null || x.VehicleId != null)
                && (x.Category == "Fuel" || x.Category == "Maintenance"))
            .Select(x => new { x.VehicleNumber, x.VehicleId, x.Category, x.Amount })
            .ToListAsync(ct))
        {
            var key = CanonicalNumber(e.VehicleNumber, e.VehicleId);
            if (key == "") continue;
            var dict = e.Category == "Fuel" ? fuelByVehicle : maintByVehicle;
            dict[key] = dict.GetValueOrDefault(key) + e.Amount;
        }

        var bookExpByVehicle = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
        foreach (var row in await tenants.Filter(db.BookingExpenses.AsNoTracking())
            .GroupBy(e => e.BookingId)
            .Select(g => new { BookingId = g.Key, Total = g.Sum(e => e.Amount) })
            .ToListAsync(ct))
        {
            if (!bookingToVehicle.TryGetValue(row.BookingId, out var vn) || vn == "") continue;
            bookExpByVehicle[vn] = bookExpByVehicle.GetValueOrDefault(vn) + row.Total;
        }

        var brokerByVehicle = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
        foreach (var row in await tenants.Filter(db.BookingBrokerCharges.AsNoTracking())
            .GroupBy(c => c.BookingId)
            .Select(g => new { BookingId = g.Key, Total = g.Sum(c => c.Amount) })
            .ToListAsync(ct))
        {
            if (!bookingToVehicle.TryGetValue(row.BookingId, out var vn) || vn == "") continue;
            brokerByVehicle[vn] = brokerByVehicle.GetValueOrDefault(vn) + row.Total;
        }

        var lrIncomeByVehicle = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
        foreach (var l in lrLinks)
        {
            var key = CanonicalNumber(l.VehicleNumber, l.VehicleId);
            if (key == "") continue;
            lrIncomeByVehicle[key] = lrIncomeByVehicle.GetValueOrDefault(key) + l.Freight;
        }

        var bookingIncomeByVehicle = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
        foreach (var b in bookingLinks)
        {
            var key = CanonicalNumber(b.VehicleNumber, b.VehicleId);
            if (key == "") continue;
            bookingIncomeByVehicle[key] = bookingIncomeByVehicle.GetValueOrDefault(key) + b.Freight;
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd");
        var rows = new List<object>();
        foreach (var num in numbers.OrderBy(n => n))
        {
            var income = lrIncomeByVehicle.GetValueOrDefault(num);
            if (income == 0) income = bookingIncomeByVehicle.GetValueOrDefault(num);

            var fuel = fuelByVehicle.GetValueOrDefault(num);
            var maint = maintByVehicle.GetValueOrDefault(num);
            var bookExp = bookExpByVehicle.GetValueOrDefault(num);
            var broker = brokerByVehicle.GetValueOrDefault(num);
            var totalExp = fuel + maint + bookExp + broker;
            if (income == 0 && totalExp == 0) continue;

            rows.Add(new
            {
                vehicle = num,
                date = today,
                fuel,
                maintenance = maint,
                bookingExpenses = bookExp,
                brokerCharges = broker,
                tripIncome = income,
                expenses = totalExp,
                netProfit = income - totalExp,
                balance = income - totalExp
            });
        }

        return rows;
    }

    static List<object> ToRunningBalance(List<LedgerLine> lines, bool receivableStyle)
    {
        decimal balance = 0;
        return lines.Select(l =>
        {
            balance += receivableStyle ? l.Debit - l.Credit : l.Credit - l.Debit;
            return (object)new
            {
                date = l.Date.ToString("yyyy-MM-dd"),
                voucher = l.Voucher,
                voucherNo = l.Voucher,
                particular = l.Particular,
                refNo = l.RefNo ?? "",
                debit = l.Debit,
                credit = l.Credit,
                balance
            };
        }).ToList();
    }

    public static DateOnly? ParseDate(string? value) =>
        DateOnly.TryParse(value, out var d) ? d : null;

    public static async Task<object> BuildJournalRegisterAsync(TmsDbContext db, ITenantContext tenants, CancellationToken ct = default) =>
        (await tenants.Filter(db.Vouchers.AsNoTracking()).Where(v => v.VoucherType == "Journal").ToListAsync(ct))
            .Select(v => new { date = v.VoucherDate.ToString("yyyy-MM-dd"), voucherNo = v.VoucherNo, debitLedger = "GST Input", creditLedger = "GST Output", amount = v.TotalAmount, narration = v.Narration })
            .ToList();

    public static async Task<object> BuildReceiptRegisterAsync(TmsDbContext db, ITenantContext tenants, CancellationToken ct = default) =>
        (await tenants.Filter(db.Vouchers.AsNoTracking()).Where(v => v.VoucherType == "Receipt").ToListAsync(ct))
            .Select(v => new { date = v.VoucherDate.ToString("yyyy-MM-dd"), voucherNo = v.VoucherNo, party = v.PartyName, mode = v.Mode, amount = v.TotalAmount, narration = v.Narration })
            .ToList();

    public static async Task<object> BuildPaymentRegisterAsync(TmsDbContext db, ITenantContext tenants, CancellationToken ct = default) =>
        (await tenants.Filter(db.Vouchers.AsNoTracking()).Where(v => v.VoucherType == "Payment").ToListAsync(ct))
            .Select(v => new { date = v.VoucherDate.ToString("yyyy-MM-dd"), voucherNo = v.VoucherNo, party = v.PartyName, mode = v.Mode, amount = v.TotalAmount, narration = v.Narration })
            .ToList();

    public static async Task<object> BuildPurchaseRegisterAsync(TmsDbContext db, ITenantContext tenants, CancellationToken ct = default)
    {
        var exps = await tenants.Filter(db.Expenses.AsNoTracking()).Where(e => e.VendorName != null).OrderByDescending(e => e.ExpenseDate).ToListAsync(ct);
        return exps.Select(e =>
        {
            var gst = Math.Round(e.Amount * 0.18m, 0);
            return new { date = e.ExpenseDate.ToString("yyyy-MM-dd"), billNo = e.Id, vendor = e.VendorName, amount = e.Amount, gst, total = e.Amount + gst };
        }).ToList();
    }

    public static async Task<object> BuildSalesRegisterAsync(TmsDbContext db, ITenantContext tenants, CancellationToken ct = default) =>
        (await tenants.Filter(db.LorryReceipts.AsNoTracking()).OrderByDescending(l => l.LrDate).ToListAsync(ct))
            .Select(l => new { date = l.LrDate.ToString("yyyy-MM-dd"), lrNo = l.LrNumber, customer = l.Consignor, route = $"{l.FromCity} → {l.ToCity}", freight = l.Freight, gst = l.Gst, total = l.Freight + l.Gst })
            .ToList();
}
