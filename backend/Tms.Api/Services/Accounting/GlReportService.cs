using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services.Accounting;

public class GlReportService(TmsDbContext db, ITenantContext tenants, AccountingPostingEngine engine)
{
    Guid CompanyId => TenantScope.ResolveCompanyId(tenants);

    public async Task<bool> UseGlReportsAsync(CancellationToken ct = default)
    {
        var s = await engine.GetOrCreateSettingsAsync(ct);
        return s.GlReportsEnabled;
    }

    public async Task<object> TrialBalanceAsync(DateOnly? asOf = null, CancellationToken ct = default)
    {
        var asOfDate = asOf ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var ledgers = await db.LedgerAccounts.AsNoTracking()
            .Where(l => l.CompanyId == CompanyId && l.IsActive)
            .OrderBy(l => l.Code)
            .ToListAsync(ct);

        var movements = await (
            from line in db.VoucherLines.AsNoTracking()
            join v in db.Vouchers.AsNoTracking() on line.VoucherId equals v.Id
            where line.CompanyId == CompanyId && v.Status == VoucherStatuses.Posted
                && (v.PostingDate ?? v.VoucherDate) <= asOfDate
            group line by line.LedgerAccountId into g
            select new { LedgerId = g.Key, Debit = g.Sum(x => x.Debit), Credit = g.Sum(x => x.Credit) }
        ).ToListAsync(ct);

        var map = movements.Where(m => m.LedgerId != null).ToDictionary(m => m.LedgerId!.Value, m => m);
        var rows = ledgers.Select(l =>
        {
            map.TryGetValue(l.Id, out var m);
            var dr = (m?.Debit ?? 0) + (l.OpeningBalance > 0 ? l.OpeningBalance : 0);
            var cr = (m?.Credit ?? 0) + (l.OpeningBalance < 0 ? Math.Abs(l.OpeningBalance) : 0);
            // Net presentation: show closing on Dr or Cr side
            var closing = l.OpeningBalance + (m?.Debit ?? 0) - (m?.Credit ?? 0);
            return new
            {
                code = l.Code,
                name = l.Name,
                type = l.AccountType,
                debit = closing >= 0 ? closing : 0m,
                credit = closing < 0 ? Math.Abs(closing) : 0m,
                balance = closing,
            };
        }).Where(r => r.debit != 0 || r.credit != 0 || true).ToList();

        return new
        {
            asOf = asOfDate.ToString("yyyy-MM-dd"),
            source = "GL",
            totalDebit = rows.Sum(r => r.debit),
            totalCredit = rows.Sum(r => r.credit),
            rows,
        };
    }

    public async Task<object> ProfitAndLossAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default)
    {
        var fromDate = from ?? new DateOnly(DateTime.UtcNow.Year, 4, 1);
        var toDate = to ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var lines = await PostedLinesAsync(fromDate, toDate, ct);
        var ledgers = await db.LedgerAccounts.AsNoTracking().Where(l => l.CompanyId == CompanyId).ToDictionaryAsync(l => l.Id, ct);

        decimal income = 0, expense = 0;
        var incomeRows = new List<object>();
        var expenseRows = new List<object>();
        foreach (var g in lines.GroupBy(l => l.LedgerAccountId))
        {
            if (g.Key == null || !ledgers.TryGetValue(g.Key.Value, out var led)) continue;
            var net = g.Sum(x => x.Credit - x.Debit); // income credit-nature
            if (led.AccountType.Equals("Income", StringComparison.OrdinalIgnoreCase))
            {
                income += net;
                incomeRows.Add(new { code = led.Code, name = led.Name, amount = net });
            }
            else if (led.AccountType.Equals("Expense", StringComparison.OrdinalIgnoreCase))
            {
                var expNet = g.Sum(x => x.Debit - x.Credit);
                expense += expNet;
                expenseRows.Add(new { code = led.Code, name = led.Name, amount = expNet });
            }
        }
        return new
        {
            from = fromDate.ToString("yyyy-MM-dd"),
            to = toDate.ToString("yyyy-MM-dd"),
            source = "GL",
            income,
            expenses = expense,
            netProfit = income - expense,
            incomeRows,
            expenseRows,
        };
    }

    public async Task<object> BalanceSheetAsync(DateOnly? asOf, CancellationToken ct = default)
    {
        var asOfDate = asOf ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var ledgers = await db.LedgerAccounts.AsNoTracking()
            .Where(l => l.CompanyId == CompanyId && l.IsActive).ToListAsync(ct);
        var assets = new List<object>();
        var liabilities = new List<object>();
        var capital = new List<object>();
        decimal totalAssets = 0, totalLiab = 0, totalCap = 0;
        foreach (var led in ledgers)
        {
            var bal = await engine.GetLedgerBalanceAsync(led.Id, asOfDate, ct);
            if (Math.Abs(bal) < 0.005m) continue;
            // GetLedgerBalanceAsync returns debit-credit. Present BS credit-side amounts as positive.
            if (led.AccountType.Equals("Asset", StringComparison.OrdinalIgnoreCase))
            {
                assets.Add(new { code = led.Code, name = led.Name, balance = bal });
                totalAssets += bal;
            }
            else if (led.AccountType.Equals("Liability", StringComparison.OrdinalIgnoreCase))
            {
                var creditBal = -bal;
                liabilities.Add(new { code = led.Code, name = led.Name, balance = creditBal });
                totalLiab += creditBal;
            }
            else if (led.AccountType.Equals("Capital", StringComparison.OrdinalIgnoreCase))
            {
                var creditBal = -bal;
                capital.Add(new { code = led.Code, name = led.Name, balance = creditBal });
                totalCap += creditBal;
            }
        }
        var fyStart = asOfDate.Month >= 4 ? new DateOnly(asOfDate.Year, 4, 1) : new DateOnly(asOfDate.Year - 1, 4, 1);
        var pl = (dynamic)await ProfitAndLossAsync(fyStart, asOfDate, ct);
        decimal net = pl.netProfit;
        capital.Add(new { code = "PL", name = "Current Year Profit / Loss", balance = net });
        totalCap += net;

        return new
        {
            asOf = asOfDate.ToString("yyyy-MM-dd"),
            source = "GL",
            assets,
            liabilities,
            capital,
            totalAssets,
            totalLiabilities = totalLiab,
            totalCapital = totalCap,
            totalLiabilitiesCapital = totalLiab + totalCap,
        };
    }

    public async Task<object> LedgerAsync(Guid ledgerId, DateOnly? from, DateOnly? to, CancellationToken ct = default)
    {
        var led = await db.LedgerAccounts.AsNoTracking().FirstOrDefaultAsync(l => l.Id == ledgerId && l.CompanyId == CompanyId, ct)
            ?? throw new InvalidOperationException("Ledger not found.");
        var fromDate = from ?? new DateOnly(2000, 1, 1);
        var toDate = to ?? DateOnly.FromDateTime(DateTime.UtcNow);

        var openingMovements = await (
            from line in db.VoucherLines.AsNoTracking()
            join v in db.Vouchers.AsNoTracking() on line.VoucherId equals v.Id
            where line.CompanyId == CompanyId && line.LedgerAccountId == ledgerId
                && v.Status == VoucherStatuses.Posted
                && (v.PostingDate ?? v.VoucherDate) < fromDate
            select new { line.Debit, line.Credit }
        ).ToListAsync(ct);
        var running = led.OpeningBalance + openingMovements.Sum(x => x.Debit - x.Credit);

        var rowsRaw = await (
            from line in db.VoucherLines.AsNoTracking()
            join v in db.Vouchers.AsNoTracking() on line.VoucherId equals v.Id
            where line.CompanyId == CompanyId && line.LedgerAccountId == ledgerId
                && v.Status == VoucherStatuses.Posted
                && (v.PostingDate ?? v.VoucherDate) >= fromDate
                && (v.PostingDate ?? v.VoucherDate) <= toDate
            orderby v.PostingDate ?? v.VoucherDate, v.CreatedAt, line.LineNo
            select new
            {
                date = (v.PostingDate ?? v.VoucherDate).ToString("yyyy-MM-dd"),
                voucherNo = v.VoucherNo,
                voucherType = v.VoucherType,
                particular = line.LineNarration ?? v.Narration ?? v.PartyName,
                reference = v.ReferenceNo,
                debit = line.Debit,
                credit = line.Credit,
                costCentreId = line.CostCentreId,
                branchId = v.BranchId,
            }
        ).ToListAsync(ct);

        var rows = new List<object>();
        foreach (var r in rowsRaw)
        {
            running += r.debit - r.credit;
            rows.Add(new
            {
                r.date, r.voucherNo, r.voucherType, r.particular, r.reference,
                r.debit, r.credit, balance = running, r.costCentreId, r.branchId,
            });
        }

        return new
        {
            ledger = new { led.Id, led.Code, led.Name, led.AccountType },
            from = fromDate.ToString("yyyy-MM-dd"),
            to = toDate.ToString("yyyy-MM-dd"),
            openingBalance = led.OpeningBalance + openingMovements.Sum(x => x.Debit - x.Credit),
            closingBalance = running,
            source = "GL",
            rows,
        };
    }

    public async Task<object> DayBookAsync(DateOnly? date, CancellationToken ct = default)
    {
        var d = date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var vouchers = await db.Vouchers.AsNoTracking().Include(v => v.Lines)
            .Where(v => v.CompanyId == CompanyId && v.Status == VoucherStatuses.Posted
                && (v.PostingDate ?? v.VoucherDate) == d)
            .OrderBy(v => v.VoucherNo)
            .ToListAsync(ct);
        return vouchers.Select(v => new
        {
            voucherNo = v.VoucherNo,
            voucherType = v.VoucherType,
            party = v.PartyName,
            narration = v.Narration,
            reference = v.ReferenceNo,
            total = v.TotalAmount,
            lines = v.Lines.OrderBy(l => l.LineNo).Select(l => new
            {
                ledger = l.LedgerName,
                debit = l.Debit,
                credit = l.Credit,
            }),
        }).ToList();
    }

    public async Task<object> GstSummaryAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default)
    {
        var fromDate = from ?? new DateOnly(DateTime.UtcNow.Year, 4, 1);
        var toDate = to ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var taxNames = new[] { "Output CGST", "Output SGST", "Output IGST", "Input CGST", "Input SGST", "Input IGST" };
        var taxLedgers = await db.LedgerAccounts.AsNoTracking()
            .Where(l => l.CompanyId == CompanyId && taxNames.Contains(l.Name))
            .ToListAsync(ct);
        var result = new Dictionary<string, decimal>();
        foreach (var led in taxLedgers)
        {
            var bal = await engine.GetLedgerBalanceAsync(led.Id, toDate, ct);
            // period movement
            var mov = await (
                from line in db.VoucherLines.AsNoTracking()
                join v in db.Vouchers.AsNoTracking() on line.VoucherId equals v.Id
                where line.LedgerAccountId == led.Id && v.Status == VoucherStatuses.Posted
                    && (v.PostingDate ?? v.VoucherDate) >= fromDate
                    && (v.PostingDate ?? v.VoucherDate) <= toDate
                select line.Credit - line.Debit
            ).SumAsync(ct);
            result[led.Name] = mov;
        }
        return new { from = fromDate.ToString("yyyy-MM-dd"), to = toDate.ToString("yyyy-MM-dd"), source = "GL", taxes = result, note = "GSTR filing / e-Invoice IRN are PENDING and not included." };
    }

    public async Task<object> PartyLedgerAsync(string partyType, string partyId, DateOnly? from, DateOnly? to, CancellationToken ct = default)
    {
        var fromDate = from ?? new DateOnly(2000, 1, 1);
        var toDate = to ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var rowsRaw = await (
            from line in db.VoucherLines.AsNoTracking()
            join v in db.Vouchers.AsNoTracking() on line.VoucherId equals v.Id
            where line.CompanyId == CompanyId && v.Status == VoucherStatuses.Posted
                && line.PartyType == partyType && line.PartyId == partyId
                && (v.PostingDate ?? v.VoucherDate) >= fromDate
                && (v.PostingDate ?? v.VoucherDate) <= toDate
            orderby v.PostingDate ?? v.VoucherDate, v.CreatedAt
            select new
            {
                date = (v.PostingDate ?? v.VoucherDate).ToString("yyyy-MM-dd"),
                voucherNo = v.VoucherNo,
                voucherType = v.VoucherType,
                particular = line.LineNarration ?? v.Narration,
                debit = line.Debit,
                credit = line.Credit,
                reference = v.ReferenceNo,
            }
        ).ToListAsync(ct);

        decimal running = 0;
        var rows = rowsRaw.Select(r =>
        {
            running += r.debit - r.credit;
            return new { r.date, r.voucherNo, r.voucherType, r.particular, r.debit, r.credit, balance = running, r.reference };
        }).ToList();

        return new { partyType, partyId, from = fromDate.ToString("yyyy-MM-dd"), to = toDate.ToString("yyyy-MM-dd"), source = "GL", rows, closingBalance = running };
    }

    public async Task<object> AgeingAsync(string partyType, CancellationToken ct = default)
    {
        // Simplified: outstanding from last posted party lines net balance, all in 0-30 bucket when no due dates
        var partyIds = await db.VoucherLines.AsNoTracking()
            .Where(l => l.CompanyId == CompanyId && l.PartyType == partyType && l.PartyId != null)
            .Select(l => l.PartyId!)
            .Distinct()
            .ToListAsync(ct);

        var list = new List<object>();
        foreach (var pid in partyIds)
        {
            var net = await (
                from line in db.VoucherLines.AsNoTracking()
                join v in db.Vouchers.AsNoTracking() on line.VoucherId equals v.Id
                where line.CompanyId == CompanyId && v.Status == VoucherStatuses.Posted
                    && line.PartyType == partyType && line.PartyId == pid
                select line.Debit - line.Credit
            ).SumAsync(ct);
            if (Math.Abs(net) < 0.01m) continue;
            list.Add(new
            {
                partyId = pid,
                amount = Math.Abs(net),
                days0_30 = Math.Abs(net),
                days30_60 = 0m,
                days60_90 = 0m,
                days90plus = 0m,
            });
        }
        return new { partyType, source = "GL", rows = list };
    }

    async Task<List<VoucherLine>> PostedLinesAsync(DateOnly fromDate, DateOnly toDate, CancellationToken ct)
    {
        return await (
            from line in db.VoucherLines.AsNoTracking()
            join v in db.Vouchers.AsNoTracking() on line.VoucherId equals v.Id
            where line.CompanyId == CompanyId && v.Status == VoucherStatuses.Posted
                && ((v.PostingDate ?? v.VoucherDate) >= fromDate)
                && ((v.PostingDate ?? v.VoucherDate) <= toDate)
            select line
        ).ToListAsync(ct);
    }
}
