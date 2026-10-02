using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services.Accounting;

public static class AccountingGlSchemaMigrator
{
    public static async Task EnsureAsync(TmsDbContext db, CancellationToken ct = default)
    {
        await PsqlFileRunner.RunSqlFileAsync(db, "database/accounting/gl_schema.sql", ct);
        await PsqlFileRunner.RunSqlFileAsync(db, "database/accounting/fix_voucher_no_unique_per_company.sql", ct);
        await SeedCompaniesAsync(db, ct);
    }

    static async Task SeedCompaniesAsync(TmsDbContext db, CancellationToken ct)
    {
        var companyIds = await db.Companies.AsNoTracking().Select(c => c.Id).ToListAsync(ct);
        if (companyIds.Count == 0)
        {
            companyIds = await db.Vendors.AsNoTracking().Select(v => v.CompanyId).Distinct().ToListAsync(ct);
            companyIds = companyIds.Concat(await db.Customers.AsNoTracking().Select(c => c.CompanyId).Distinct().ToListAsync(ct)).Distinct().ToList();
        }
        foreach (var companyId in companyIds.Distinct())
            await SeedCompanyAsync(db, companyId, ct);
    }

    public static async Task SeedCompanyAsync(TmsDbContext db, Guid companyId, CancellationToken ct = default)
    {
        if (!await db.AccountingSettings.AnyAsync(s => s.CompanyId == companyId, ct))
        {
            db.AccountingSettings.Add(new AccountingSettings
            {
                CompanyId = companyId,
                GlReportsEnabled = true,
                AutoPostOps = true,
                UpdatedAt = DateTime.UtcNow,
            });
        }

        await EnsureFinancialYearAsync(db, companyId, ct);
        await db.SaveChangesAsync(ct);
        await EnsureGroupsAndLedgersAsync(db, companyId, ct);
        await db.SaveChangesAsync(ct);
        await EnsurePostingMapsAsync(db, companyId, ct);
        await db.SaveChangesAsync(ct);
    }

    static async Task EnsureFinancialYearAsync(TmsDbContext db, Guid companyId, CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var startYear = today.Month >= 4 ? today.Year : today.Year - 1;
        var code = $"{startYear % 100:D2}-{(startYear + 1) % 100:D2}";
        var start = new DateOnly(startYear, 4, 1);
        var end = new DateOnly(startYear + 1, 3, 31);

        var fy = await db.FinancialYears.FirstOrDefaultAsync(f => f.CompanyId == companyId && f.Code == code, ct);
        if (fy == null)
        {
            fy = new FinancialYear
            {
                Id = Guid.NewGuid(),
                CompanyId = companyId,
                Code = code,
                StartDate = start,
                EndDate = end,
                CreatedAt = DateTime.UtcNow,
            };
            db.FinancialYears.Add(fy);
            for (var m = 0; m < 12; m++)
            {
                var pStart = start.AddMonths(m);
                var pEnd = pStart.AddMonths(1).AddDays(-1);
                if (pEnd > end) pEnd = end;
                db.AccountingPeriods.Add(new AccountingPeriod
                {
                    Id = Guid.NewGuid(),
                    CompanyId = companyId,
                    FinancialYearId = fy.Id,
                    PeriodNo = m + 1,
                    Name = pStart.ToString("MMM-yyyy"),
                    StartDate = pStart,
                    EndDate = pEnd,
                    CreatedAt = DateTime.UtcNow,
                });
            }
        }
    }

    static async Task EnsureGroupsAndLedgersAsync(TmsDbContext db, Guid companyId, CancellationToken ct)
    {
        async Task<Guid> Group(string code, string name, string type, int sort)
        {
            var g = await db.AccountGroups.FirstOrDefaultAsync(x => x.CompanyId == companyId && x.Code == code, ct);
            if (g != null) return g.Id;
            g = new AccountGroup
            {
                Id = Guid.NewGuid(), CompanyId = companyId, Code = code, Name = name,
                AccountType = type, SortOrder = sort, CreatedAt = DateTime.UtcNow,
            };
            db.AccountGroups.Add(g);
            return g.Id;
        }

        var gAssets = await Group("ASSETS", "Assets", "Asset", 1);
        var gLiab = await Group("LIAB", "Liabilities", "Liability", 2);
        var gCap = await Group("CAPITAL", "Capital", "Capital", 3);
        var gInc = await Group("INCOME", "Income", "Income", 4);
        var gExp = await Group("EXPENSE", "Expenses", "Expense", 5);

        async Task<Guid> Led(string code, string name, string type, Guid groupId, string? groupName, bool control = false)
        {
            var existing = await db.LedgerAccounts.FirstOrDefaultAsync(l => l.CompanyId == companyId && l.Name == name, ct);
            if (existing != null)
            {
                if (existing.GroupId == null) existing.GroupId = groupId;
                if (string.IsNullOrWhiteSpace(existing.GroupName)) existing.GroupName = groupName;
                existing.IsControl = control || existing.IsControl;
                return existing.Id;
            }
            // Avoid global unique code collision across companies
            var uniqueCode = code.Length <= 10 ? $"{code}{companyId.ToString("N")[..4]}" : code;
            while (await db.LedgerAccounts.AnyAsync(l => l.Code == uniqueCode, ct))
                uniqueCode = $"{code}{Guid.NewGuid().ToString("N")[..4]}";

            var led = new LedgerAccount
            {
                Id = Guid.NewGuid(),
                CompanyId = companyId,
                Code = uniqueCode,
                Name = name,
                AccountType = type,
                GroupName = groupName,
                GroupId = groupId,
                IsControl = control,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
            };
            db.LedgerAccounts.Add(led);
            return led.Id;
        }

        var cashId = await Led("1001", "Cash in Hand", "Asset", gAssets, "Current Assets");
        var bankId = await Led("1002", "Bank Account - HDFC", "Asset", gAssets, "Current Assets");
        var arId = await Led("1101", "Accounts Receivable", "Asset", gAssets, "Current Assets", control: true);
        var tdsRecv = await Led("1205", "TDS Receivable", "Asset", gAssets, "Current Assets");
        var custAdv = await Led("1301", "Customer Advance", "Liability", gLiab, "Current Liabilities");
        var apId = await Led("2001", "Accounts Payable", "Liability", gLiab, "Current Liabilities", control: true);
        var tdsPay = await Led("2105", "TDS Payable", "Liability", gLiab, "Current Liabilities");
        var vendAdv = await Led("2106", "Vendor Advance", "Asset", gAssets, "Current Assets");
        var cgstOut = await Led("2203", "Output CGST", "Liability", gLiab, "Duties & Taxes");
        var sgstOut = await Led("2204", "Output SGST", "Liability", gLiab, "Duties & Taxes");
        var igstOut = await Led("2205", "Output IGST", "Liability", gLiab, "Duties & Taxes");
        var cgstIn = await Led("1206", "Input CGST", "Asset", gAssets, "Duties & Taxes");
        var sgstIn = await Led("1207", "Input SGST", "Asset", gAssets, "Duties & Taxes");
        var igstIn = await Led("1208", "Input IGST", "Asset", gAssets, "Duties & Taxes");
        await Led("3001", "Owner Capital", "Capital", gCap, "Capital");
        var freightId = await Led("4001", "Freight Income", "Income", gInc, "Direct Income");
        var expId = await Led("5001", "Operating Expenses", "Expense", gExp, "Direct Expenses");
        await Led("5002", "Fuel Expense", "Expense", gExp, "Direct Expenses");
        await Led("5003", "Salary Expense", "Expense", gExp, "Indirect Expenses");

        var settings = await db.AccountingSettings.FirstAsync(s => s.CompanyId == companyId, ct);
        settings.DefaultCashLedgerId ??= cashId;
        settings.DefaultBankLedgerId ??= bankId;
        settings.ArControlLedgerId ??= arId;
        settings.ApControlLedgerId ??= apId;
        settings.FreightIncomeLedgerId ??= freightId;
        settings.UpdatedAt = DateTime.UtcNow;

        // Ensure cost centre default
        if (!await db.CostCentres.AnyAsync(c => c.CompanyId == companyId, ct))
        {
            db.CostCentres.Add(new CostCentre
            {
                Id = Guid.NewGuid(), CompanyId = companyId, Code = "DEFAULT", Name = "General", CreatedAt = DateTime.UtcNow,
            });
        }

        _ = tdsRecv; _ = tdsPay; _ = custAdv; _ = vendAdv;
        _ = cgstOut; _ = sgstOut; _ = igstOut; _ = cgstIn; _ = sgstIn; _ = igstIn; _ = expId;
    }

    static async Task EnsurePostingMapsAsync(TmsDbContext db, Guid companyId, CancellationToken ct)
    {
        async Task<Guid?> IdByName(string name) =>
            await db.LedgerAccounts.Where(l => l.CompanyId == companyId && l.Name == name).Select(l => (Guid?)l.Id).FirstOrDefaultAsync(ct);

        var maps = new (string Type, string? Dr, string? Cr, string? Tax, string? Tds, string? Sec)[]
        {
            (AccountingTxnTypes.CustomerInvoice, "Accounts Receivable", "Freight Income", "Output IGST", null, null),
            (AccountingTxnTypes.CustomerReceipt, "Cash in Hand", "Accounts Receivable", null, "TDS Receivable", "Bank Account - HDFC"),
            (AccountingTxnTypes.VendorBill, "Operating Expenses", "Accounts Payable", "Input IGST", "TDS Payable", null),
            (AccountingTxnTypes.VendorPayment, "Accounts Payable", "Bank Account - HDFC", null, "TDS Payable", "Cash in Hand"),
            (AccountingTxnTypes.ExpenseCash, "Operating Expenses", "Cash in Hand", "Input IGST", "TDS Payable", "Bank Account - HDFC"),
            (AccountingTxnTypes.ExpenseCredit, "Operating Expenses", "Accounts Payable", "Input IGST", "TDS Payable", null),
            (AccountingTxnTypes.AdvanceReceived, "Bank Account - HDFC", "Customer Advance", null, null, "Cash in Hand"),
            (AccountingTxnTypes.AdvancePaid, "Vendor Advance", "Bank Account - HDFC", null, null, "Cash in Hand"),
            (AccountingTxnTypes.CreditNote, "Freight Income", "Accounts Receivable", "Output IGST", null, null),
            (AccountingTxnTypes.DebitNote, "Accounts Payable", "Operating Expenses", "Input IGST", null, null),
            (AccountingTxnTypes.BookingExpense, "Operating Expenses", "Accounts Payable", null, null, "Cash in Hand"),
            (AccountingTxnTypes.LrExpense, "Operating Expenses", "Cash in Hand", null, null, "Bank Account - HDFC"),
            (AccountingTxnTypes.Provision, "Operating Expenses", "Accounts Payable", null, null, null),
            (AccountingTxnTypes.BrokerCharge, "Operating Expenses", "Accounts Payable", null, null, null),
        };

        foreach (var m in maps)
        {
            if (await db.AccountPostingMaps.AnyAsync(x => x.CompanyId == companyId && x.TxnType == m.Type, ct))
                continue;
            db.AccountPostingMaps.Add(new AccountPostingMap
            {
                Id = Guid.NewGuid(),
                CompanyId = companyId,
                TxnType = m.Type,
                DebitLedgerId = m.Dr == null ? null : await IdByName(m.Dr),
                CreditLedgerId = m.Cr == null ? null : await IdByName(m.Cr),
                TaxLedgerId = m.Tax == null ? null : await IdByName(m.Tax),
                TdsLedgerId = m.Tds == null ? null : await IdByName(m.Tds),
                SecondaryLedgerId = m.Sec == null ? null : await IdByName(m.Sec),
                IsActive = true,
                UpdatedAt = DateTime.UtcNow,
            });
        }
    }
}
