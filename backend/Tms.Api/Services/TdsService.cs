using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public class TdsService(
    TmsDbContext db,
    ITenantContext tenants,
    IBranchContext branches,
    DocumentNumberService documentNumbers,
    Accounting.GlOpsPostingService? glPosting = null)
{
    public Guid CompanyId => TenantScope.ResolveCompanyId(tenants);

    public async Task<TdsSettings> GetOrCreateSettingsAsync(CancellationToken ct = default)
    {
        var s = await db.TdsSettings.FindAsync([CompanyId], ct);
        if (s != null) return s;
        s = new TdsSettings
        {
            CompanyId = CompanyId,
            Enabled = true,
            TdsPayableLedgerName = "TDS Payable",
            TdsReceivableLedgerName = "TDS Receivable",
            RoundOff = TdsRoundOffModes.Nearest,
            AutoPostVoucher = true,
            UpdatedAt = DateTime.UtcNow,
        };
        db.TdsSettings.Add(s);
        await db.SaveChangesAsync(ct);
        return s;
    }

    public async Task<TdsCalcResult> PreviewAsync(
        Guid? sectionId, decimal baseAmount, DateOnly date, string partyType, string? partyId, string? panOverride,
        CancellationToken ct = default)
    {
        var settings = await GetOrCreateSettingsAsync(ct);
        if (!settings.Enabled)
            throw new InvalidOperationException("TDS module is disabled for this company.");

        var section = sectionId != null
            ? await db.TdsSections.AsNoTracking().FirstOrDefaultAsync(s => s.Id == sectionId && s.CompanyId == CompanyId, ct)
            : null;
        if (section == null)
            throw new InvalidOperationException("TDS section is required.");

        var rateRow = await ResolveRateAsync(section.Id, date, ct)
            ?? throw new InvalidOperationException("No active TDS rate for this section/date.");

        var (hasPan, pan) = await ResolvePanAsync(partyType, partyId, panOverride, ct);
        var exemption = await ResolveExemptionAsync(partyType, partyId, section.Id, date, ct);

        return TdsCalculationService.Calculate(new TdsCalcInput(
            baseAmount,
            rateRow.RatePercent,
            rateRow.RateWithoutPanPercent,
            hasPan,
            rateRow.ThresholdAmount,
            rateRow.ThresholdType,
            settings.RoundOff,
            exemption?.LowerRatePercent,
            exemption != null));
    }

    public async Task<object> CreateVendorPaymentAsync(Dictionary<string, object?> body, CancellationToken ct = default)
    {
        var settings = await GetOrCreateSettingsAsync(ct);
        if (!settings.Enabled)
            throw new InvalidOperationException("TDS module is disabled for this company.");

        var vendorId = body.GetValueOrDefault("vendorId")?.ToString()
            ?? throw new InvalidOperationException("Vendor is required.");
        var vendor = await db.Vendors.FirstOrDefaultAsync(v => v.Id == vendorId && v.CompanyId == CompanyId, ct)
            ?? throw new InvalidOperationException("Vendor not found.");

        var paymentDate = DateOnly.TryParse(body.GetValueOrDefault("paymentDate")?.ToString(), out var pd)
            ? pd : DateOnly.FromDateTime(DateTime.UtcNow);
        var gross = decimal.TryParse(body.GetValueOrDefault("grossAmount")?.ToString(), out var g) ? g : 0m;
        if (gross <= 0) throw new InvalidOperationException("Gross amount must be greater than zero.");

        Guid? sectionId = null;
        if (Guid.TryParse(body.GetValueOrDefault("sectionId")?.ToString(), out var sid))
            sectionId = sid;
        else if (vendor.DefaultTdsSectionId != null)
            sectionId = vendor.DefaultTdsSectionId;

        var applyTds = vendor.TdsApplicable || body.GetValueOrDefault("applyTds")?.ToString()?.Equals("true", StringComparison.OrdinalIgnoreCase) == true
            || sectionId != null;

        TdsCalcResult calc;
        TdsSection? section = null;
        if (applyTds && sectionId != null)
        {
            calc = await PreviewAsync(sectionId, gross, paymentDate, "VENDOR", vendorId, vendor.Pan, ct);
            section = await db.TdsSections.AsNoTracking().FirstAsync(s => s.Id == sectionId, ct);
        }
        else
        {
            calc = new TdsCalcResult(gross, 0, 0, gross, false, false, false, applyTds ? "Section not selected; TDS not deducted." : null);
        }

        // Allow manual override of TDS amount when provided
        if (decimal.TryParse(body.GetValueOrDefault("tdsAmount")?.ToString(), out var overrideTds) && body.ContainsKey("tdsAmount"))
        {
            overrideTds = Math.Max(0, Math.Min(overrideTds, gross));
            calc = calc with { TdsAmount = overrideTds, NetAmount = Math.Round(gross - overrideTds, 2) };
        }

        var branchId = branches.AssignBranchId
            ?? await db.Branches.AsNoTracking().Where(b => b.CompanyId == CompanyId).Select(b => (Guid?)b.Id).FirstOrDefaultAsync(ct);
        if (branchId == null || branchId == Guid.Empty)
            throw new InvalidOperationException("Branch is required for vendor payment numbering.");
        string paymentNo;
        try
        {
            paymentNo = await documentNumbers.NextAsync(DocumentNumberTypes.VendorPayment, CompanyId, branchId.Value, paymentDate, ct);
        }
        catch (InvalidOperationException)
        {
            var count = await db.VendorPayments.CountAsync(p => p.CompanyId == CompanyId, ct) + 1;
            paymentNo = $"VP-{paymentDate.Year}-{count:D4}";
        }
        var mode = body.GetValueOrDefault("paymentMode")?.ToString() ?? "Bank Transfer";

        Guid? voucherId = null;
        Guid? tdsTxnId = null;
        if (calc.TdsAmount > 0 && sectionId != null)
        {
            var txn = new TdsTransaction
            {
                Id = Guid.NewGuid(),
                CompanyId = CompanyId,
                BranchId = branchId,
                Direction = TdsDirections.Payable,
                SectionId = sectionId,
                RatePercent = calc.AppliedRatePercent,
                BaseAmount = calc.BaseAmount,
                TdsAmount = calc.TdsAmount,
                PartyType = "VENDOR",
                PartyId = vendor.Id,
                PartyName = vendor.Name,
                PartyPan = vendor.Pan,
                SourceType = TdsSourceTypes.VendorPayment,
                SourceRef = paymentNo,
                PaymentMode = mode,
                TransactionDate = paymentDate,
                FinancialYear = TdsCalculationService.FinancialYear(paymentDate),
                Status = TdsTxnStatuses.Posted,
                Narration = body.GetValueOrDefault("narration")?.ToString() ?? $"TDS on vendor payment {paymentNo}",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            db.TdsTransactions.Add(txn);
            tdsTxnId = txn.Id;
        }

        var payment = new VendorPayment
        {
            Id = Guid.NewGuid(),
            CompanyId = CompanyId,
            BranchId = branchId,
            PaymentNo = paymentNo,
            PaymentDate = paymentDate,
            VendorId = vendor.Id,
            GrossAmount = calc.BaseAmount,
            TdsAmount = calc.TdsAmount,
            NetAmount = calc.NetAmount,
            TdsSectionId = sectionId,
            TdsRatePercent = calc.AppliedRatePercent,
            TdsTransactionId = tdsTxnId,
            PaymentMode = mode,
            ReferenceNo = body.GetValueOrDefault("referenceNo")?.ToString(),
            Narration = body.GetValueOrDefault("narration")?.ToString(),
            ExpenseId = body.GetValueOrDefault("expenseId")?.ToString(),
            BookingExpenseId = Guid.TryParse(body.GetValueOrDefault("bookingExpenseId")?.ToString(), out var beid) ? beid : null,
            Status = "POSTED",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.VendorPayments.Add(payment);

        if (tdsTxnId != null)
        {
            var txn = await db.TdsTransactions.FindAsync([tdsTxnId], ct);
            if (txn != null) txn.SourceId = payment.Id.ToString("N");
        }

        await db.SaveChangesAsync(ct);

        if (glPosting != null)
        {
            try { voucherId = await glPosting.TryPostVendorPaymentAsync(payment, vendor.Name, null, ct); }
            catch { /* fall back below */ }
        }
        if (voucherId == null && settings.AutoPostVoucher)
        {
            voucherId = await PostVendorPaymentVoucherAsync(
                settings, vendor.Name, gross, calc.TdsAmount, calc.NetAmount, mode, paymentDate, paymentNo, ct);
        }
        if (voucherId != null && tdsTxnId != null)
        {
            var txn = await db.TdsTransactions.FindAsync([tdsTxnId], ct);
            if (txn != null) txn.VoucherId = voucherId;
        }

        await BookingFinanceService.SyncVendorOutstandingAsync(db, CompanyId, vendor.Id, ct);
        await db.SaveChangesAsync(ct);

        return MapVendorPayment(payment, section?.SectionCode);
    }

    public async Task<object> RecordReceivableAsync(
        string partyId, string partyName, string? pan, Guid? sectionId,
        decimal grossAmount, decimal netCashAmount, decimal tdsAmount,
        DateOnly date, string sourceType, string? sourceId, string? sourceRef,
        string? paymentMode, string? narration, CancellationToken ct = default,
        bool skipVoucher = false)
    {
        if (tdsAmount <= 0) return new { tdsTransactionId = (Guid?)null };

        var settings = await GetOrCreateSettingsAsync(ct);
        if (!settings.Enabled) return new { tdsTransactionId = (Guid?)null };

        Guid? voucherId = null;
        if (settings.AutoPostVoucher && !skipVoucher)
        {
            voucherId = await PostReceivableVoucherAsync(
                settings, partyName, grossAmount, tdsAmount, netCashAmount, paymentMode ?? "Bank Transfer", date, sourceRef ?? "", ct);
        }

        var rate = grossAmount > 0 ? Math.Round(tdsAmount * 100m / grossAmount, 4) : 0m;
        var txn = new TdsTransaction
        {
            Id = Guid.NewGuid(),
            CompanyId = CompanyId,
            BranchId = branches.AssignBranchId,
            Direction = TdsDirections.Receivable,
            SectionId = sectionId,
            RatePercent = rate,
            BaseAmount = grossAmount,
            TdsAmount = tdsAmount,
            PartyType = "CUSTOMER",
            PartyId = partyId,
            PartyName = partyName,
            PartyPan = pan,
            SourceType = sourceType,
            SourceId = sourceId,
            SourceRef = sourceRef,
            PaymentMode = paymentMode,
            TransactionDate = date,
            FinancialYear = TdsCalculationService.FinancialYear(date),
            VoucherId = voucherId,
            Status = TdsTxnStatuses.Posted,
            Narration = narration ?? $"TDS receivable on {sourceRef}",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.TdsTransactions.Add(txn);
        await db.SaveChangesAsync(ct);
        return new { tdsTransactionId = txn.Id, voucherId };
    }

    public async Task<object> ReverseAsync(Guid txnId, string? remarks, CancellationToken ct = default)
    {
        var original = await db.TdsTransactions.FirstOrDefaultAsync(t => t.Id == txnId && t.CompanyId == CompanyId, ct)
            ?? throw new InvalidOperationException("TDS transaction not found.");
        if (original.Status == TdsTxnStatuses.Reversed || original.ReversedByTxnId != null)
            throw new InvalidOperationException("Transaction already reversed.");
        if (original.ReversalOfTxnId != null)
            throw new InvalidOperationException("Cannot reverse a reversal entry.");

        var settings = await GetOrCreateSettingsAsync(ct);
        Guid? voucherId = null;
        if (settings.AutoPostVoucher && original.TdsAmount > 0)
        {
            voucherId = await PostReversalVoucherAsync(settings, original, ct);
        }

        var rev = new TdsTransaction
        {
            Id = Guid.NewGuid(),
            CompanyId = CompanyId,
            BranchId = original.BranchId,
            Direction = original.Direction,
            SectionId = original.SectionId,
            RatePercent = original.RatePercent,
            BaseAmount = -original.BaseAmount,
            TdsAmount = -original.TdsAmount,
            PartyType = original.PartyType,
            PartyId = original.PartyId,
            PartyName = original.PartyName,
            PartyPan = original.PartyPan,
            SourceType = TdsSourceTypes.Reversal,
            SourceId = original.Id.ToString("N"),
            SourceRef = original.SourceRef,
            PaymentMode = original.PaymentMode,
            TransactionDate = DateOnly.FromDateTime(DateTime.UtcNow),
            FinancialYear = TdsCalculationService.FinancialYear(DateOnly.FromDateTime(DateTime.UtcNow)),
            VoucherId = voucherId,
            Status = TdsTxnStatuses.Posted,
            ReversalOfTxnId = original.Id,
            Narration = remarks ?? $"Reversal of TDS {original.Id:N}",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.TdsTransactions.Add(rev);
        original.Status = TdsTxnStatuses.Reversed;
        original.ReversedByTxnId = rev.Id;
        original.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return MapTxn(rev);
    }

    async Task<TdsRate?> ResolveRateAsync(Guid sectionId, DateOnly date, CancellationToken ct) =>
        await db.TdsRates.AsNoTracking()
            .Where(r => r.CompanyId == CompanyId && r.SectionId == sectionId && r.IsActive
                && r.EffectiveFrom <= date && (r.EffectiveTo == null || r.EffectiveTo >= date))
            .OrderByDescending(r => r.EffectiveFrom)
            .FirstOrDefaultAsync(ct);

    async Task<(bool HasPan, string? Pan)> ResolvePanAsync(string partyType, string? partyId, string? panOverride, CancellationToken ct)
    {
        if (!string.IsNullOrWhiteSpace(panOverride))
            return (true, panOverride.Trim().ToUpperInvariant());
        if (string.IsNullOrWhiteSpace(partyId)) return (false, null);
        if (string.Equals(partyType, "VENDOR", StringComparison.OrdinalIgnoreCase))
        {
            var pan = await db.Vendors.AsNoTracking().Where(v => v.Id == partyId).Select(v => v.Pan).FirstOrDefaultAsync(ct);
            return (!string.IsNullOrWhiteSpace(pan), pan);
        }
        if (string.Equals(partyType, "CUSTOMER", StringComparison.OrdinalIgnoreCase))
        {
            var pan = await db.Customers.AsNoTracking().Where(c => c.Id == partyId).Select(c => c.Pan).FirstOrDefaultAsync(ct);
            return (!string.IsNullOrWhiteSpace(pan), pan);
        }
        return (false, null);
    }

    async Task<TdsExemption?> ResolveExemptionAsync(string partyType, string? partyId, Guid sectionId, DateOnly date, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(partyId)) return null;
        return await db.TdsExemptions.AsNoTracking()
            .Where(e => e.CompanyId == CompanyId && e.IsActive
                && e.PartyType == partyType && e.PartyId == partyId
                && e.ValidFrom <= date && (e.ValidTo == null || e.ValidTo >= date)
                && (e.SectionId == null || e.SectionId == sectionId))
            .OrderByDescending(e => e.ValidFrom)
            .FirstOrDefaultAsync(ct);
    }

    async Task<Guid> PostVendorPaymentVoucherAsync(
        TdsSettings settings, string vendorName, decimal gross, decimal tds, decimal net,
        string mode, DateOnly date, string paymentNo, CancellationToken ct)
    {
        var companyId = CompanyId;
        var count = await tenants.Filter(db.Vouchers.AsQueryable()).CountAsync(ct) + 1;
        var v = new Voucher
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            VoucherNo = $"VP-{date.Year}-{count:D4}",
            VoucherDate = date,
            VoucherType = "Payment",
            PartyName = vendorName,
            Mode = mode,
            Narration = $"Vendor payment {paymentNo} (gross {gross:0.##}, TDS {tds:0.##})",
            TotalAmount = gross,
            CreatedAt = DateTime.UtcNow,
        };
        db.Vouchers.Add(v);
        db.VoucherLines.Add(new VoucherLine
        {
            Id = Guid.NewGuid(), CompanyId = companyId, VoucherId = v.Id,
            LedgerName = vendorName, Debit = gross, Credit = 0, LineNarration = v.Narration,
        });
        var bankLedger = mode.Equals("Cash", StringComparison.OrdinalIgnoreCase) ? "Cash" : "Bank";
        db.VoucherLines.Add(new VoucherLine
        {
            Id = Guid.NewGuid(), CompanyId = companyId, VoucherId = v.Id,
            LedgerName = bankLedger, Debit = 0, Credit = net, LineNarration = v.Narration,
        });
        if (tds > 0)
        {
            db.VoucherLines.Add(new VoucherLine
            {
                Id = Guid.NewGuid(), CompanyId = companyId, VoucherId = v.Id,
                LedgerName = settings.TdsPayableLedgerName, Debit = 0, Credit = tds, LineNarration = v.Narration,
            });
        }
        return v.Id;
    }

    async Task<Guid> PostReceivableVoucherAsync(
        TdsSettings settings, string customerName, decimal gross, decimal tds, decimal net,
        string mode, DateOnly date, string receiptRef, CancellationToken ct)
    {
        var companyId = CompanyId;
        var count = await tenants.Filter(db.Vouchers.AsQueryable()).CountAsync(ct) + 1;
        var v = new Voucher
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            VoucherNo = $"TR-{date.Year}-{count:D4}",
            VoucherDate = date,
            VoucherType = "Receipt",
            PartyName = customerName,
            Mode = mode,
            Narration = $"Receipt {receiptRef} with TDS receivable {tds:0.##}",
            TotalAmount = gross,
            CreatedAt = DateTime.UtcNow,
        };
        db.Vouchers.Add(v);
        var bankLedger = mode.Equals("Cash", StringComparison.OrdinalIgnoreCase) ? "Cash" : "Bank";
        db.VoucherLines.Add(new VoucherLine
        {
            Id = Guid.NewGuid(), CompanyId = companyId, VoucherId = v.Id,
            LedgerName = bankLedger, Debit = net, Credit = 0, LineNarration = v.Narration,
        });
        if (tds > 0)
        {
            db.VoucherLines.Add(new VoucherLine
            {
                Id = Guid.NewGuid(), CompanyId = companyId, VoucherId = v.Id,
                LedgerName = settings.TdsReceivableLedgerName, Debit = tds, Credit = 0, LineNarration = v.Narration,
            });
        }
        db.VoucherLines.Add(new VoucherLine
        {
            Id = Guid.NewGuid(), CompanyId = companyId, VoucherId = v.Id,
            LedgerName = customerName, Debit = 0, Credit = gross, LineNarration = v.Narration,
        });
        return v.Id;
    }

    async Task<Guid> PostReversalVoucherAsync(TdsSettings settings, TdsTransaction original, CancellationToken ct)
    {
        var companyId = CompanyId;
        var count = await tenants.Filter(db.Vouchers.AsQueryable()).CountAsync(ct) + 1;
        var date = DateOnly.FromDateTime(DateTime.UtcNow);
        var v = new Voucher
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            VoucherNo = $"TDSR-{date.Year}-{count:D4}",
            VoucherDate = date,
            VoucherType = "Journal",
            PartyName = original.PartyName,
            Narration = $"TDS reversal of {original.Id:N}",
            TotalAmount = Math.Abs(original.TdsAmount),
            CreatedAt = DateTime.UtcNow,
        };
        db.Vouchers.Add(v);
        var ledger = original.Direction == TdsDirections.Payable
            ? settings.TdsPayableLedgerName
            : settings.TdsReceivableLedgerName;
        var amt = Math.Abs(original.TdsAmount);
        if (original.Direction == TdsDirections.Payable)
        {
            db.VoucherLines.Add(new VoucherLine
            {
                Id = Guid.NewGuid(), CompanyId = companyId, VoucherId = v.Id,
                LedgerName = ledger, Debit = amt, Credit = 0, LineNarration = v.Narration,
            });
            db.VoucherLines.Add(new VoucherLine
            {
                Id = Guid.NewGuid(), CompanyId = companyId, VoucherId = v.Id,
                LedgerName = original.PartyName ?? "Vendor", Debit = 0, Credit = amt, LineNarration = v.Narration,
            });
        }
        else
        {
            db.VoucherLines.Add(new VoucherLine
            {
                Id = Guid.NewGuid(), CompanyId = companyId, VoucherId = v.Id,
                LedgerName = original.PartyName ?? "Customer", Debit = amt, Credit = 0, LineNarration = v.Narration,
            });
            db.VoucherLines.Add(new VoucherLine
            {
                Id = Guid.NewGuid(), CompanyId = companyId, VoucherId = v.Id,
                LedgerName = ledger, Debit = 0, Credit = amt, LineNarration = v.Narration,
            });
        }
        return v.Id;
    }

    public static object MapTxn(TdsTransaction t) => new
    {
        id = t.Id,
        direction = t.Direction,
        sectionId = t.SectionId,
        sectionCode = t.Section?.SectionCode,
        ratePercent = t.RatePercent,
        baseAmount = t.BaseAmount,
        tdsAmount = t.TdsAmount,
        partyType = t.PartyType,
        partyId = t.PartyId,
        partyName = t.PartyName,
        partyPan = t.PartyPan,
        sourceType = t.SourceType,
        sourceId = t.SourceId,
        sourceRef = t.SourceRef,
        paymentMode = t.PaymentMode,
        transactionDate = t.TransactionDate.ToString("yyyy-MM-dd"),
        financialYear = t.FinancialYear,
        voucherId = t.VoucherId,
        status = t.Status,
        reversedByTxnId = t.ReversedByTxnId,
        reversalOfTxnId = t.ReversalOfTxnId,
        narration = t.Narration,
        createdAt = t.CreatedAt,
        createdBy = t.CreatedBy,
    };

    public static object MapVendorPayment(VendorPayment p, string? sectionCode = null) => new
    {
        id = p.Id,
        paymentNo = p.PaymentNo,
        paymentDate = p.PaymentDate.ToString("yyyy-MM-dd"),
        vendorId = p.VendorId,
        grossAmount = p.GrossAmount,
        tdsAmount = p.TdsAmount,
        netAmount = p.NetAmount,
        tdsSectionId = p.TdsSectionId,
        sectionCode,
        tdsRatePercent = p.TdsRatePercent,
        tdsTransactionId = p.TdsTransactionId,
        paymentMode = p.PaymentMode,
        referenceNo = p.ReferenceNo,
        narration = p.Narration,
        status = p.Status,
    };
}
