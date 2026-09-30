using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services.Accounting;

public class AccountingMigrationService(
    TmsDbContext db,
    ITenantContext tenants,
    AccountingPostingEngine engine,
    GlOpsPostingService opsPosting)
{
    Guid CompanyId => TenantScope.ResolveCompanyId(tenants);

    public async Task<object> RunCurrentFyBackfillAsync(string? user, CancellationToken ct = default)
    {
        await AccountingGlSchemaMigrator.SeedCompanyAsync(db, CompanyId, ct);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var fyStart = today.Month >= 4 ? new DateOnly(today.Year, 4, 1) : new DateOnly(today.Year - 1, 4, 1);
        var fyEnd = fyStart.AddYears(1).AddDays(-1);

        var postedInvoices = 0;
        var postedReceipts = 0;
        var postedExpenses = 0;
        var postedVendorPayments = 0;
        var postedBookingExpenses = 0;
        var postedLrExpenses = 0;
        var postedProvisions = 0;
        var postedBrokerCharges = 0;
        var postedAdvances = 0;
        var skipped = 0;
        var errors = new List<string>();

        // Opening balance voucher if none
        if (!await db.Vouchers.AnyAsync(v => v.CompanyId == CompanyId && v.SourceType == AccountingSourceTypes.OpeningBalance, ct))
        {
            try
            {
                await PostOpeningBalancesAsync(fyStart, user, ct);
            }
            catch (Exception ex)
            {
                errors.Add($"Opening balance: {ex.Message}");
            }
        }

        var invoices = await db.FreightInvoices.Where(i => i.CompanyId == CompanyId
            && i.InvoiceDate >= fyStart && i.InvoiceDate <= fyEnd && i.Status != "Cancelled").ToListAsync(ct);
        foreach (var inv in invoices)
        {
            if (await AlreadyPostedAsync(AccountingSourceTypes.CustomerInvoice, inv.Id.ToString("N"), ct)) { skipped++; continue; }
            try
            {
                await opsPosting.TryPostCustomerInvoiceAsync(inv, user, ct);
                postedInvoices++;
            }
            catch (Exception ex) { errors.Add($"Invoice {inv.InvoiceNo}: {ex.Message}"); }
        }

        var payments = await db.BookingPayments.Where(p => p.CompanyId == CompanyId
            && p.PaymentDate >= fyStart && p.PaymentDate <= fyEnd).ToListAsync(ct);
        foreach (var p in payments)
        {
            if (await AlreadyPostedAsync(AccountingSourceTypes.CustomerReceipt, p.Id.ToString("N"), ct)) { skipped++; continue; }
            try
            {
                string? custId = null; string? custName = null;
                var booking = await db.Bookings.AsNoTracking().FirstOrDefaultAsync(b => b.Id == p.BookingId, ct);
                if (booking != null) { custId = booking.CustomerId; custName = booking.CustomerName; }
                await opsPosting.TryPostCustomerReceiptAsync(p, custId, custName, user, ct);
                postedReceipts++;
            }
            catch (Exception ex) { errors.Add($"Receipt {p.ReceiptNo}: {ex.Message}"); }
        }

        var expenses = await db.Expenses.Where(e => e.CompanyId == CompanyId
            && e.ExpenseDate >= fyStart && e.ExpenseDate <= fyEnd).ToListAsync(ct);
        foreach (var e in expenses)
        {
            if (await AlreadyPostedAsync(AccountingSourceTypes.ExpenseCash, e.Id, ct)
                || await AlreadyPostedAsync(AccountingSourceTypes.ExpenseCredit, e.Id, ct))
            { skipped++; continue; }
            try
            {
                await opsPosting.TryPostExpenseAsync(e, user, ct);
                postedExpenses++;
            }
            catch (Exception ex) { errors.Add($"Expense {e.Id}: {ex.Message}"); }
        }

        var vendorPays = await db.VendorPayments.Where(p => p.CompanyId == CompanyId
            && p.PaymentDate >= fyStart && p.PaymentDate <= fyEnd).ToListAsync(ct);
        foreach (var vp in vendorPays)
        {
            if (await AlreadyPostedAsync(AccountingSourceTypes.VendorPayment, vp.Id.ToString("N"), ct)) { skipped++; continue; }
            try
            {
                var vendor = await db.Vendors.AsNoTracking().FirstOrDefaultAsync(v => v.Id == vp.VendorId, ct);
                await opsPosting.TryPostVendorPaymentAsync(vp, vendor?.Name ?? vp.VendorId, user, ct);
                postedVendorPayments++;
            }
            catch (Exception ex) { errors.Add($"Vendor payment {vp.PaymentNo}: {ex.Message}"); }
        }

        var bookingExpenses = await db.BookingExpenses.Where(e => e.CompanyId == CompanyId
            && e.ExpenseDate >= fyStart && e.ExpenseDate <= fyEnd).ToListAsync(ct);
        foreach (var be in bookingExpenses)
        {
            if (await AlreadyPostedAsync(AccountingSourceTypes.BookingExpense, be.Id.ToString("N"), ct)) { skipped++; continue; }
            try
            {
                await opsPosting.TryPostBookingExpenseAsync(be, user, ct);
                postedBookingExpenses++;
            }
            catch (Exception ex) { errors.Add($"Booking expense {be.Id}: {ex.Message}"); }
        }

        var lrExpenses = await db.LrExpenses.Where(e => e.CompanyId == CompanyId
            && e.ExpenseDate >= fyStart && e.ExpenseDate <= fyEnd && e.Status == "Approved").ToListAsync(ct);
        foreach (var le in lrExpenses)
        {
            if (await AlreadyPostedAsync(AccountingSourceTypes.LrExpense, le.Id.ToString("N"), ct)) { skipped++; continue; }
            try
            {
                await opsPosting.TryPostLrExpenseAsync(le, user, ct);
                postedLrExpenses++;
            }
            catch (Exception ex) { errors.Add($"LR expense {le.Id}: {ex.Message}"); }
        }

        var provisions = await db.Provisions.Where(p => p.CompanyId == CompanyId
            && p.ProvisionDate >= fyStart && p.ProvisionDate <= fyEnd && !p.IsReversed).ToListAsync(ct);
        foreach (var prov in provisions)
        {
            if (await AlreadyPostedAsync(AccountingSourceTypes.Provision, prov.Id.ToString("N"), ct)) { skipped++; continue; }
            try
            {
                await opsPosting.TryPostProvisionAsync(prov, user, ct);
                postedProvisions++;
            }
            catch (Exception ex) { errors.Add($"Provision {prov.Id}: {ex.Message}"); }
        }

        var fyStartDt = fyStart.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var fyEndDt = fyEnd.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);
        var brokers = await db.BookingBrokerCharges.Where(c => c.CompanyId == CompanyId
            && c.CreatedAt >= fyStartDt && c.CreatedAt <= fyEndDt).ToListAsync(ct);
        foreach (var ch in brokers)
        {
            if (await AlreadyPostedAsync(AccountingSourceTypes.BrokerCharge, ch.Id.ToString("N"), ct)) { skipped++; continue; }
            try
            {
                await opsPosting.TryPostBrokerChargeAsync(ch, user, ct);
                postedBrokerCharges++;
            }
            catch (Exception ex) { errors.Add($"Broker charge {ch.Id}: {ex.Message}"); }
        }

        var advBookings = await db.Bookings.Where(b => b.CompanyId == CompanyId
            && b.BookingDate >= fyStart && b.BookingDate <= fyEnd && b.Advance > 0).ToListAsync(ct);
        foreach (var b in advBookings)
        {
            if (await AlreadyPostedAsync(AccountingSourceTypes.AdvanceReceived, $"booking-adv-{b.Id}", ct)) { skipped++; continue; }
            try
            {
                await opsPosting.TryPostBookingAdvanceAsync(b, user, ct);
                postedAdvances++;
            }
            catch (Exception ex) { errors.Add($"Advance {b.Id}: {ex.Message}"); }
        }

        var settings = await engine.GetOrCreateSettingsAsync(ct);
        settings.GlReportsEnabled = true;
        settings.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        return new
        {
            fyStart = fyStart.ToString("yyyy-MM-dd"),
            fyEnd = fyEnd.ToString("yyyy-MM-dd"),
            postedInvoices,
            postedReceipts,
            postedExpenses,
            postedVendorPayments,
            postedBookingExpenses,
            postedLrExpenses,
            postedProvisions,
            postedBrokerCharges,
            postedAdvances,
            skipped,
            errors,
        };
    }

    public async Task<object> RunReconciliationAsync(CancellationToken ct = default)
    {
        var existing = await db.AccountingReconciliationFindings
            .Where(f => f.CompanyId == CompanyId && f.Status == "OPEN").ToListAsync(ct);
        db.AccountingReconciliationFindings.RemoveRange(existing);

        var findings = 0;
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var fyStart = today.Month >= 4 ? new DateOnly(today.Year, 4, 1) : new DateOnly(today.Year - 1, 4, 1);

        var invoices = await db.FreightInvoices.AsNoTracking()
            .Where(i => i.CompanyId == CompanyId && i.InvoiceDate >= fyStart && i.Status != "Cancelled")
            .Select(i => new { i.Id, i.InvoiceNo, i.TotalAmount }).ToListAsync(ct);
        foreach (var inv in invoices)
        {
            if (!await AlreadyPostedAsync(AccountingSourceTypes.CustomerInvoice, inv.Id.ToString("N"), ct))
            {
                db.AccountingReconciliationFindings.Add(Finding("OPS_WITHOUT_GL", AccountingSourceTypes.CustomerInvoice, inv.Id.ToString("N"), inv.TotalAmount, null, $"Invoice {inv.InvoiceNo} has no GL voucher"));
                findings++;
            }
        }

        var unbalanced = await db.Vouchers.AsNoTracking().Include(v => v.Lines)
            .Where(v => v.CompanyId == CompanyId && v.Status == VoucherStatuses.Posted)
            .Take(2000).ToListAsync(ct);
        foreach (var v in unbalanced)
        {
            var dr = v.Lines.Sum(l => l.Debit);
            var cr = v.Lines.Sum(l => l.Credit);
            if (Math.Round(dr, 2) != Math.Round(cr, 2))
            {
                db.AccountingReconciliationFindings.Add(Finding("UNBALANCED_VOUCHER", v.SourceType, v.SourceId, dr, cr, $"Voucher {v.VoucherNo} Dr={dr} Cr={cr}"));
                findings++;
            }
        }

        await db.SaveChangesAsync(ct);
        return new { findings, status = "OPEN" };
    }

    async Task PostOpeningBalancesAsync(DateOnly fyStart, string? user, CancellationToken ct)
    {
        var settings = await engine.GetOrCreateSettingsAsync(ct);
        var cashId = settings.DefaultCashLedgerId;
        var bankId = settings.DefaultBankLedgerId;
        var arId = settings.ArControlLedgerId;
        var apId = settings.ApControlLedgerId;
        var capital = await db.LedgerAccounts.AsNoTracking()
            .Where(l => l.CompanyId == CompanyId && l.Name == "Owner Capital").Select(l => (Guid?)l.Id).FirstOrDefaultAsync(ct);
        if (cashId == null || bankId == null || arId == null || apId == null || capital == null)
            throw new InvalidOperationException("Opening balance ledgers not configured.");

        var ar = await db.Customers.Where(c => c.CompanyId == CompanyId).SumAsync(c => c.Outstanding, ct);
        var ap = await db.Vendors.Where(v => v.CompanyId == CompanyId).SumAsync(v => v.Outstanding, ct);
        // Minimal balanced OB: Dr AR + Cash/Bank suspense via Capital
        var lines = new List<PostingLine>();
        if (ar > 0)
        {
            var arLed = await db.LedgerAccounts.FindAsync([arId.Value], ct);
            lines.Add(new(arId.Value, arLed?.Name ?? "AR", ar, 0, "Opening AR"));
        }
        if (ap > 0)
        {
            var apLed = await db.LedgerAccounts.FindAsync([apId.Value], ct);
            lines.Add(new(apId.Value, apLed?.Name ?? "AP", 0, ap, "Opening AP"));
        }
        var net = lines.Sum(l => l.Debit) - lines.Sum(l => l.Credit);
        if (net != 0)
        {
            var capLed = await db.LedgerAccounts.FindAsync([capital.Value], ct);
            if (net > 0)
                lines.Add(new(capital.Value, capLed?.Name ?? "Capital", 0, net, "Opening balancing"));
            else
                lines.Add(new(capital.Value, capLed?.Name ?? "Capital", Math.Abs(net), 0, "Opening balancing"));
        }
        if (lines.Count < 2) return;

        await engine.PostAsync(new PostingRequest(
            "Journal", fyStart, fyStart, null, null, "Opening balances", "OB",
            AccountingSourceTypes.OpeningBalance, fyStart.ToString("yyyy-MM-dd"),
            null, null, lines, user), ct);
    }

    async Task<bool> AlreadyPostedAsync(string sourceType, string sourceId, CancellationToken ct) =>
        await db.Vouchers.AnyAsync(v => v.CompanyId == CompanyId && v.SourceType == sourceType
            && v.SourceId == sourceId && v.Status == VoucherStatuses.Posted, ct);

    AccountingReconciliationFinding Finding(string type, string? sourceType, string? sourceId, decimal? ops, decimal? gl, string msg) =>
        new()
        {
            Id = Guid.NewGuid(),
            CompanyId = CompanyId,
            FindingType = type,
            SourceType = sourceType,
            SourceId = sourceId,
            AmountOps = ops,
            AmountGl = gl,
            Message = msg,
            Status = "OPEN",
            CreatedAt = DateTime.UtcNow,
        };
}
