using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services.Accounting;

/// <summary>
/// Builds balanced posting requests for operational documents and posts via AccountingPostingEngine.
/// </summary>
public class GlOpsPostingService(TmsDbContext db, AccountingPostingEngine engine, ITenantContext tenants)
{
    Guid CompanyId => TenantScope.ResolveCompanyId(tenants);

    public async Task<Guid?> TryPostCustomerInvoiceAsync(FreightInvoice inv, string? user, CancellationToken ct = default)
    {
        var settings = await engine.GetOrCreateSettingsAsync(ct);
        if (!settings.AutoPostOps) return null;

        var map = await engine.GetMapAsync(AccountingTxnTypes.CustomerInvoice, ct)
            ?? throw new InvalidOperationException("Posting map CUSTOMER_INVOICE not configured.");
        var ar = map.DebitLedgerId ?? settings.ArControlLedgerId
            ?? throw new InvalidOperationException("AR control ledger not configured.");
        var income = map.CreditLedgerId ?? settings.FreightIncomeLedgerId
            ?? throw new InvalidOperationException("Freight income ledger not configured.");

        var taxable = inv.TaxableAmount > 0 ? inv.TaxableAmount : Math.Max(0, inv.TotalAmount - inv.GstAmount);
        var gst = inv.GstAmount;
        var total = inv.TotalAmount > 0 ? inv.TotalAmount : taxable + gst;

        var arLed = await db.LedgerAccounts.FindAsync([ar], ct);
        var incomeLed = await db.LedgerAccounts.FindAsync([income], ct);
        var lines = new List<PostingLine>
        {
            new(ar, arLed?.Name ?? "Accounts Receivable", total, 0, $"Invoice {inv.InvoiceNo}", null, "CUSTOMER", inv.CustomerId),
            new(income, incomeLed?.Name ?? "Freight Income", 0, taxable, $"Invoice {inv.InvoiceNo}"),
        };
        if (gst > 0 && map.TaxLedgerId is Guid taxId)
        {
            var taxLed = await db.LedgerAccounts.FindAsync([taxId], ct);
            lines.Add(new(taxId, taxLed?.Name ?? "Output GST", 0, gst, $"GST on {inv.InvoiceNo}"));
        }
        else if (gst > 0)
        {
            // Fold GST into income credit so voucher stays balanced when tax ledger missing
            lines[1] = lines[1] with { Credit = taxable + gst };
        }

        var v = await engine.PostAsync(new PostingRequest(
            "Journal", inv.InvoiceDate, inv.InvoiceDate, inv.CustomerName, null,
            $"Freight invoice {inv.InvoiceNo}", inv.InvoiceNo,
            AccountingSourceTypes.CustomerInvoice, inv.Id.ToString("N"),
            inv.BranchId, null, lines, user), ct);
        return v.Id;
    }

    public async Task<Guid?> TryPostCustomerReceiptAsync(
        BookingPayment payment, string? customerId, string? customerName, string? user, CancellationToken ct = default)
    {
        var settings = await engine.GetOrCreateSettingsAsync(ct);
        if (!settings.AutoPostOps) return null;

        var map = await engine.GetMapAsync(AccountingTxnTypes.CustomerReceipt, ct)
            ?? throw new InvalidOperationException("Posting map CUSTOMER_RECEIPT not configured.");
        var cashBank = IsBankMode(payment.PaymentMode)
            ? (map.SecondaryLedgerId ?? map.DebitLedgerId ?? settings.DefaultBankLedgerId)
            : (map.DebitLedgerId ?? settings.DefaultCashLedgerId);
        var ar = map.CreditLedgerId ?? settings.ArControlLedgerId;
        if (cashBank == null || ar == null)
            throw new InvalidOperationException("Cash/Bank or AR ledger not configured for receipts.");

        var net = payment.Amount;
        var tds = payment.TdsAmount;
        var gross = payment.GrossAmount ?? (net + tds);

        var cashLed = await db.LedgerAccounts.FindAsync([cashBank.Value], ct);
        var arLed = await db.LedgerAccounts.FindAsync([ar.Value], ct);
        var lines = new List<PostingLine>
        {
            new(cashBank.Value, cashLed?.Name ?? "Cash/Bank", net, 0, $"Receipt {payment.ReceiptNo}"),
            new(ar.Value, arLed?.Name ?? "Accounts Receivable", 0, gross, $"Receipt {payment.ReceiptNo}", null, "CUSTOMER", customerId),
        };
        if (tds > 0)
        {
            var tdsId = map.TdsLedgerId
                ?? (await db.LedgerAccounts.Where(l => l.CompanyId == CompanyId && l.Name == "TDS Receivable").Select(l => (Guid?)l.Id).FirstOrDefaultAsync(ct));
            if (tdsId == null) throw new InvalidOperationException("TDS Receivable ledger missing.");
            var tdsLed = await db.LedgerAccounts.FindAsync([tdsId.Value], ct);
            lines.Insert(1, new(tdsId.Value, tdsLed?.Name ?? "TDS Receivable", tds, 0, $"TDS on {payment.ReceiptNo}"));
        }

        var v = await engine.PostAsync(new PostingRequest(
            "Receipt", payment.PaymentDate, payment.PaymentDate, customerName, payment.PaymentMode,
            payment.Remarks ?? $"Customer receipt {payment.ReceiptNo}", payment.ReferenceNo,
            AccountingSourceTypes.CustomerReceipt, payment.Id.ToString("N"),
            null, null, lines, user), ct);
        return v.Id;
    }

    public async Task<Guid?> TryPostExpenseAsync(Expense expense, string? user, CancellationToken ct = default)
    {
        var settings = await engine.GetOrCreateSettingsAsync(ct);
        if (!settings.AutoPostOps) return null;

        var creditParty = !string.IsNullOrWhiteSpace(expense.VendorName);
        var txnType = creditParty ? AccountingTxnTypes.ExpenseCredit : AccountingTxnTypes.ExpenseCash;
        var map = await engine.GetMapAsync(txnType, ct)
            ?? throw new InvalidOperationException($"Posting map {txnType} not configured.");

        var expId = map.DebitLedgerId
            ?? await db.LedgerAccounts.Where(l => l.CompanyId == CompanyId && l.Name == "Operating Expenses").Select(l => (Guid?)l.Id).FirstOrDefaultAsync(ct);
        Guid? creditId = creditParty
            ? (map.CreditLedgerId ?? settings.ApControlLedgerId)
            : (IsBankMode(expense.PaymentMode)
                ? (map.SecondaryLedgerId ?? settings.DefaultBankLedgerId ?? map.CreditLedgerId)
                : (map.CreditLedgerId ?? settings.DefaultCashLedgerId));
        if (expId == null || creditId == null)
            throw new InvalidOperationException("Expense posting ledgers not configured.");

        var expLed = await db.LedgerAccounts.FindAsync([expId.Value], ct);
        var crLed = await db.LedgerAccounts.FindAsync([creditId.Value], ct);
        var amount = expense.Amount;
        var lines = new List<PostingLine>
        {
            new(expId.Value, expLed?.Name ?? "Operating Expenses", amount, 0, expense.Description ?? expense.Category),
            new(creditId.Value, crLed?.Name ?? "Cash/Payable", 0, amount, expense.Description ?? expense.Category, null,
                creditParty ? "VENDOR" : null, null),
        };

        var v = await engine.PostAsync(new PostingRequest(
            creditParty ? "Journal" : "Payment",
            expense.ExpenseDate, expense.ExpenseDate, expense.VendorName, expense.PaymentMode,
            expense.Description ?? expense.Category, expense.Id,
            creditParty ? AccountingSourceTypes.ExpenseCredit : AccountingSourceTypes.ExpenseCash,
            expense.Id, expense.BranchId, null, lines, user), ct);
        return v.Id;
    }

    public async Task<Guid?> TryPostVendorBillAsync(VendorBill bill, string? user, CancellationToken ct = default)
    {
        var settings = await engine.GetOrCreateSettingsAsync(ct);
        if (!settings.AutoPostOps) return null;
        var map = await engine.GetMapAsync(AccountingTxnTypes.VendorBill, ct)
            ?? throw new InvalidOperationException("Posting map VENDOR_BILL not configured.");
        var expId = bill.ExpenseAccountId ?? map.DebitLedgerId
            ?? throw new InvalidOperationException("Expense account required for vendor bill.");
        var apId = map.CreditLedgerId ?? settings.ApControlLedgerId
            ?? throw new InvalidOperationException("AP control ledger not configured.");

        var expLed = await db.LedgerAccounts.FindAsync([expId], ct);
        var apLed = await db.LedgerAccounts.FindAsync([apId], ct);
        var tax = bill.CgstAmount + bill.SgstAmount + bill.IgstAmount;
        var lines = new List<PostingLine>
        {
            new(expId, expLed?.Name ?? "Expense", bill.TaxableAmount, 0, bill.Narration ?? bill.BillNo),
            new(apId, apLed?.Name ?? "Accounts Payable", 0, bill.TotalAmount, bill.Narration ?? bill.BillNo, null, "VENDOR", bill.VendorId),
        };
        if (tax > 0 && map.TaxLedgerId is Guid taxId)
        {
            var taxLed = await db.LedgerAccounts.FindAsync([taxId], ct);
            lines.Insert(1, new(taxId, taxLed?.Name ?? "Input GST", tax, 0, $"GST on {bill.BillNo}"));
        }
        else if (tax > 0)
        {
            lines[0] = lines[0] with { Debit = bill.TaxableAmount + tax };
        }

        if (bill.TdsAmount > 0 && map.TdsLedgerId is Guid tdsId)
        {
            var tdsLed = await db.LedgerAccounts.FindAsync([tdsId], ct);
            // Reduce AP credit and credit TDS Payable: Dr AP already = total; adjust: Cr AP = total - tds, Cr TDS = tds
            lines[lines.Count - 1] = lines[^1] with { Credit = bill.TotalAmount - bill.TdsAmount };
            lines.Add(new(tdsId, tdsLed?.Name ?? "TDS Payable", 0, bill.TdsAmount, $"TDS on {bill.BillNo}"));
        }

        var v = await engine.PostAsync(new PostingRequest(
            "Journal", bill.BillDate, bill.BillDate, bill.VendorName, null,
            bill.Narration ?? $"Vendor bill {bill.BillNo}", bill.ReferenceNo,
            AccountingSourceTypes.VendorBill, bill.Id.ToString("N"),
            bill.BranchId, bill.CostCentreId, lines, user), ct);
        return v.Id;
    }

    public async Task<Guid?> TryPostVendorPaymentAsync(VendorPayment payment, string vendorName, string? user, CancellationToken ct = default)
    {
        var settings = await engine.GetOrCreateSettingsAsync(ct);
        if (!settings.AutoPostOps) return null;
        var map = await engine.GetMapAsync(AccountingTxnTypes.VendorPayment, ct)
            ?? throw new InvalidOperationException("Posting map VENDOR_PAYMENT not configured.");
        var ap = map.DebitLedgerId ?? settings.ApControlLedgerId
            ?? throw new InvalidOperationException("AP ledger not configured.");
        var bank = IsBankMode(payment.PaymentMode)
            ? (map.CreditLedgerId ?? settings.DefaultBankLedgerId)
            : (map.SecondaryLedgerId ?? settings.DefaultCashLedgerId ?? map.CreditLedgerId);
        if (bank == null) throw new InvalidOperationException("Bank/Cash ledger not configured.");

        var apLed = await db.LedgerAccounts.FindAsync([ap], ct);
        var bankLed = await db.LedgerAccounts.FindAsync([bank.Value], ct);
        var lines = new List<PostingLine>
        {
            new(ap, apLed?.Name ?? "Accounts Payable", payment.GrossAmount, 0, payment.Narration ?? payment.PaymentNo, null, "VENDOR", payment.VendorId),
            new(bank.Value, bankLed?.Name ?? "Bank", 0, payment.NetAmount, payment.Narration ?? payment.PaymentNo),
        };
        if (payment.TdsAmount > 0)
        {
            var tdsId = map.TdsLedgerId
                ?? await db.LedgerAccounts.Where(l => l.CompanyId == CompanyId && l.Name == "TDS Payable").Select(l => (Guid?)l.Id).FirstOrDefaultAsync(ct);
            if (tdsId == null) throw new InvalidOperationException("TDS Payable ledger missing.");
            var tdsLed = await db.LedgerAccounts.FindAsync([tdsId.Value], ct);
            lines.Add(new(tdsId.Value, tdsLed?.Name ?? "TDS Payable", 0, payment.TdsAmount, $"TDS on {payment.PaymentNo}"));
        }

        var v = await engine.PostAsync(new PostingRequest(
            "Payment", payment.PaymentDate, payment.PaymentDate, vendorName, payment.PaymentMode,
            payment.Narration ?? $"Vendor payment {payment.PaymentNo}", payment.ReferenceNo,
            AccountingSourceTypes.VendorPayment, payment.Id.ToString("N"),
            payment.BranchId, null, lines, user), ct);
        return v.Id;
    }

    public async Task<Guid?> TryPostCreditDebitNoteAsync(CreditDebitNote note, string? user, CancellationToken ct = default)
    {
        var settings = await engine.GetOrCreateSettingsAsync(ct);
        if (!settings.AutoPostOps) return null;
        var isCredit = note.NoteType.Equals("CREDIT", StringComparison.OrdinalIgnoreCase);
        var map = await engine.GetMapAsync(isCredit ? AccountingTxnTypes.CreditNote : AccountingTxnTypes.DebitNote, ct)
            ?? throw new InvalidOperationException("Credit/Debit note posting map missing.");

        var dr = map.DebitLedgerId ?? throw new InvalidOperationException("Debit ledger missing for note.");
        var cr = map.CreditLedgerId ?? throw new InvalidOperationException("Credit ledger missing for note.");
        var drLed = await db.LedgerAccounts.FindAsync([dr], ct);
        var crLed = await db.LedgerAccounts.FindAsync([cr], ct);
        var lines = new List<PostingLine>
        {
            new(dr, drLed?.Name ?? "Debit", note.TaxableAmount + (map.TaxLedgerId == null ? note.TaxAmount : 0), 0, note.Narration ?? note.NoteNo, null, note.PartyType, note.PartyId),
            new(cr, crLed?.Name ?? "Credit", 0, note.TotalAmount, note.Narration ?? note.NoteNo, null, note.PartyType, note.PartyId),
        };
        if (note.TaxAmount > 0 && map.TaxLedgerId is Guid taxId)
        {
            var taxLed = await db.LedgerAccounts.FindAsync([taxId], ct);
            lines.Insert(1, new(taxId, taxLed?.Name ?? "Tax", note.TaxAmount, 0, $"Tax on {note.NoteNo}"));
            // For credit note: Dr Income, Dr Tax (reduce liability via debit? Actually reversing output GST is Debit Output GST)
            // Keep simple balanced: Dr income+tax / Cr AR for credit note already handled by map directions.
        }

        // Rebalance if tax line inserted incorrectly
        var drSum = lines.Sum(l => l.Debit);
        var crSum = lines.Sum(l => l.Credit);
        if (drSum != crSum && lines.Count >= 2)
            lines[^1] = lines[^1] with { Credit = drSum };

        var v = await engine.PostAsync(new PostingRequest(
            "Journal", note.NoteDate, note.NoteDate, note.PartyName, null,
            note.Narration ?? $"{note.NoteType} note {note.NoteNo}", note.NoteNo,
            isCredit ? AccountingSourceTypes.CreditNote : AccountingSourceTypes.DebitNote,
            note.Id.ToString("N"), note.BranchId, null, lines, user), ct);
        return v.Id;
    }

    /// <summary>Booking expense: Dr expense / Cr AP (vendor) or Cash.</summary>
    public async Task<Guid?> TryPostBookingExpenseAsync(BookingExpense expense, string? user, CancellationToken ct = default)
    {
        var settings = await engine.GetOrCreateSettingsAsync(ct);
        if (!settings.AutoPostOps || expense.Amount <= 0) return null;
        if (await engine.FindBySourceAsync(AccountingSourceTypes.BookingExpense, expense.Id.ToString("N"), ct) != null)
            return null;

        var hasVendor = !string.IsNullOrWhiteSpace(expense.VendorId) || !string.IsNullOrWhiteSpace(expense.VendorName);
        var map = await engine.GetMapAsync(AccountingTxnTypes.BookingExpense, ct)
                  ?? await engine.GetMapAsync(hasVendor ? AccountingTxnTypes.ExpenseCredit : AccountingTxnTypes.ExpenseCash, ct);
        if (map == null) return null;

        var expId = map.DebitLedgerId ?? settings.ApControlLedgerId;
        var creditId = hasVendor
            ? (map.CreditLedgerId ?? settings.ApControlLedgerId)
            : (map.SecondaryLedgerId ?? map.CreditLedgerId ?? settings.DefaultCashLedgerId);
        if (expId == null || creditId == null) return null;

        var expLed = await db.LedgerAccounts.FindAsync([expId.Value], ct);
        var crLed = await db.LedgerAccounts.FindAsync([creditId.Value], ct);
        var lines = new List<PostingLine>
        {
            new(expId.Value, expLed?.Name ?? "Operating Expenses", expense.Amount, 0, expense.Category),
            new(creditId.Value, crLed?.Name ?? "Payable/Cash", 0, expense.Amount, expense.VendorName ?? expense.Category,
                null, hasVendor ? "VENDOR" : null, expense.VendorId),
        };
        var v = await engine.PostAsync(new PostingRequest(
            "Journal", expense.ExpenseDate, expense.ExpenseDate, expense.VendorName, null,
            $"Booking expense {expense.Category} · {expense.BookingId}", null,
            AccountingSourceTypes.BookingExpense, expense.Id.ToString("N"), null, null, lines, user), ct);
        return v.Id;
    }

    /// <summary>LR trip expense on approval: Dr expense / Cr cash or bank.</summary>
    public async Task<Guid?> TryPostLrExpenseAsync(LrExpense expense, string? user, CancellationToken ct = default)
    {
        var settings = await engine.GetOrCreateSettingsAsync(ct);
        if (!settings.AutoPostOps || expense.Amount <= 0 || expense.Status != "Approved") return null;
        if (await engine.FindBySourceAsync(AccountingSourceTypes.LrExpense, expense.Id.ToString("N"), ct) != null)
            return null;

        var map = await engine.GetMapAsync(AccountingTxnTypes.LrExpense, ct)
                  ?? await engine.GetMapAsync(AccountingTxnTypes.ExpenseCash, ct);
        if (map == null) return null;

        var expId = map.DebitLedgerId;
        var cashId = IsBankMode(expense.PaymentMode)
            ? (map.SecondaryLedgerId ?? settings.DefaultBankLedgerId ?? map.CreditLedgerId)
            : (map.CreditLedgerId ?? settings.DefaultCashLedgerId);
        if (expId == null || cashId == null) return null;

        var expLed = await db.LedgerAccounts.FindAsync([expId.Value], ct);
        var crLed = await db.LedgerAccounts.FindAsync([cashId.Value], ct);
        var lines = new List<PostingLine>
        {
            new(expId.Value, expLed?.Name ?? "Operating Expenses", expense.Amount, 0, expense.Category),
            new(cashId.Value, crLed?.Name ?? "Cash/Bank", 0, expense.Amount, expense.PaymentMode ?? "Cash"),
        };
        var v = await engine.PostAsync(new PostingRequest(
            "Payment", expense.ExpenseDate, expense.ExpenseDate, null, expense.PaymentMode,
            $"LR expense {expense.Category} · {expense.LrNumber}", expense.BillNo,
            AccountingSourceTypes.LrExpense, expense.Id.ToString("N"), null, null, lines, user), ct);
        return v.Id;
    }

    /// <summary>Provision: Dr expense / Cr AP.</summary>
    public async Task<Guid?> TryPostProvisionAsync(Provision provision, string? user, CancellationToken ct = default)
    {
        var settings = await engine.GetOrCreateSettingsAsync(ct);
        if (!settings.AutoPostOps || provision.Amount <= 0 || provision.IsReversed) return null;
        if (await engine.FindBySourceAsync(AccountingSourceTypes.Provision, provision.Id.ToString("N"), ct) != null)
            return null;

        var map = await engine.GetMapAsync(AccountingTxnTypes.Provision, ct)
                  ?? await engine.GetMapAsync(AccountingTxnTypes.ExpenseCredit, ct);
        if (map == null) return null;

        var expId = map.DebitLedgerId;
        var apId = map.CreditLedgerId ?? settings.ApControlLedgerId;
        if (expId == null || apId == null) return null;

        var expLed = await db.LedgerAccounts.FindAsync([expId.Value], ct);
        var apLed = await db.LedgerAccounts.FindAsync([apId.Value], ct);
        var partyType = provision.ProvisionType.Equals("Vendor", StringComparison.OrdinalIgnoreCase) ? "VENDOR" : "CUSTOMER";
        var lines = new List<PostingLine>
        {
            new(expId.Value, expLed?.Name ?? "Operating Expenses", provision.Amount, 0, provision.ProvisionType),
            new(apId.Value, apLed?.Name ?? "Accounts Payable", 0, provision.Amount, provision.PartyName, null, partyType, provision.PartyId),
        };
        var v = await engine.PostAsync(new PostingRequest(
            "Journal", provision.ProvisionDate, provision.ProvisionDate, provision.PartyName, null,
            provision.Remarks ?? $"Provision {provision.ProvisionType}", provision.ReferenceNo,
            AccountingSourceTypes.Provision, provision.Id.ToString("N"), null, null, lines, user), ct);
        return v.Id;
    }

    /// <summary>Broker commission: Dr expense / Cr AP.</summary>
    public async Task<Guid?> TryPostBrokerChargeAsync(BookingBrokerCharge charge, string? user, CancellationToken ct = default)
    {
        var settings = await engine.GetOrCreateSettingsAsync(ct);
        if (!settings.AutoPostOps || charge.Amount <= 0) return null;
        if (await engine.FindBySourceAsync(AccountingSourceTypes.BrokerCharge, charge.Id.ToString("N"), ct) != null)
            return null;

        var map = await engine.GetMapAsync(AccountingTxnTypes.BrokerCharge, ct)
                  ?? await engine.GetMapAsync(AccountingTxnTypes.ExpenseCredit, ct);
        if (map == null) return null;

        var expId = map.DebitLedgerId;
        var apId = map.CreditLedgerId ?? settings.ApControlLedgerId;
        if (expId == null || apId == null) return null;

        var expLed = await db.LedgerAccounts.FindAsync([expId.Value], ct);
        var apLed = await db.LedgerAccounts.FindAsync([apId.Value], ct);
        var lines = new List<PostingLine>
        {
            new(expId.Value, expLed?.Name ?? "Operating Expenses", charge.Amount, 0, charge.ChargeType),
            new(apId.Value, apLed?.Name ?? "Accounts Payable", 0, charge.Amount, charge.BrokerName, null, "VENDOR", charge.BrokerId),
        };
        var v = await engine.PostAsync(new PostingRequest(
            "Journal", DateOnly.FromDateTime(charge.CreatedAt), DateOnly.FromDateTime(charge.CreatedAt),
            charge.BrokerName, null,
            $"Broker {charge.ChargeType} · {charge.BookingId}", null,
            AccountingSourceTypes.BrokerCharge, charge.Id.ToString("N"), null, null, lines, user), ct);
        return v.Id;
    }

    /// <summary>Customer advance on booking create when Advance &gt; 0.</summary>
    public async Task<Guid?> TryPostBookingAdvanceAsync(Booking booking, string? user, CancellationToken ct = default)
    {
        var settings = await engine.GetOrCreateSettingsAsync(ct);
        if (!settings.AutoPostOps || booking.Advance <= 0) return null;
        var sourceId = $"booking-adv-{booking.Id}";
        if (await engine.FindBySourceAsync(AccountingSourceTypes.AdvanceReceived, sourceId, ct) != null)
            return null;

        var map = await engine.GetMapAsync(AccountingTxnTypes.AdvanceReceived, ct);
        if (map == null) return null;

        var cashId = map.DebitLedgerId ?? settings.DefaultBankLedgerId ?? settings.DefaultCashLedgerId;
        var advId = map.CreditLedgerId;
        if (cashId == null || advId == null) return null;

        var cashLed = await db.LedgerAccounts.FindAsync([cashId.Value], ct);
        var advLed = await db.LedgerAccounts.FindAsync([advId.Value], ct);
        var party = booking.CustomerName ?? booking.Consignor ?? booking.Id;
        var lines = new List<PostingLine>
        {
            new(cashId.Value, cashLed?.Name ?? "Bank/Cash", booking.Advance, 0, "Advance received"),
            new(advId.Value, advLed?.Name ?? "Customer Advance", 0, booking.Advance, party, null, "CUSTOMER", booking.CustomerId),
        };
        var v = await engine.PostAsync(new PostingRequest(
            "Receipt", booking.BookingDate, booking.BookingDate, party, null,
            $"Booking advance · {booking.Id}", booking.Id,
            AccountingSourceTypes.AdvanceReceived, sourceId, booking.BranchId, null, lines, user), ct);
        return v.Id;
    }

    static bool IsBankMode(string? mode)
    {
        var m = (mode ?? "").Trim().ToUpperInvariant();
        return m is "NEFT" or "RTGS" or "UPI" or "CHEQUE" or "BANK TRANSFER" or "BANK" or "IMPS";
    }
}
