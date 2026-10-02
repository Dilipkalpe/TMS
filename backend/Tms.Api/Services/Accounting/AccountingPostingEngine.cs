using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services.Accounting;

public class AccountingPostingEngine(
    TmsDbContext db,
    ITenantContext tenants,
    IBranchContext branches)
{
    Guid CompanyId => TenantScope.ResolveCompanyId(tenants);

    public static void ValidateBalanced(IReadOnlyList<PostingLine> lines)
    {
        if (lines == null || lines.Count < 2)
            throw new InvalidOperationException("Voucher requires at least two lines.");
        foreach (var line in lines)
        {
            if (line.LedgerAccountId == Guid.Empty)
                throw new InvalidOperationException("Every line requires a ledger account.");
            if (line.Debit < 0 || line.Credit < 0)
                throw new InvalidOperationException("Debit/Credit cannot be negative.");
            if (line.Debit > 0 && line.Credit > 0)
                throw new InvalidOperationException("A line cannot have both debit and credit.");
            if (line.Debit == 0 && line.Credit == 0)
                throw new InvalidOperationException("A line must have debit or credit amount.");
        }
        var dr = Math.Round(lines.Sum(l => l.Debit), 2);
        var cr = Math.Round(lines.Sum(l => l.Credit), 2);
        if (dr != cr)
            throw new InvalidOperationException($"Unbalanced voucher: Debit {dr:0.##} != Credit {cr:0.##}.");
        if (dr <= 0)
            throw new InvalidOperationException("Voucher total must be greater than zero.");
    }

    public async Task<AccountingSettings> GetOrCreateSettingsAsync(CancellationToken ct = default)
    {
        var s = await db.AccountingSettings.FirstOrDefaultAsync(x => x.CompanyId == CompanyId, ct);
        if (s != null) return s;
        s = new AccountingSettings
        {
            CompanyId = CompanyId,
            GlReportsEnabled = false,
            AutoPostOps = true,
            UpdatedAt = DateTime.UtcNow,
        };
        db.AccountingSettings.Add(s);
        await db.SaveChangesAsync(ct);
        return s;
    }

    public async Task<(FinancialYear Fy, AccountingPeriod Period)> ResolvePeriodAsync(DateOnly date, CancellationToken ct = default)
    {
        var fy = await db.FinancialYears.AsNoTracking()
            .FirstOrDefaultAsync(f => f.CompanyId == CompanyId && f.StartDate <= date && f.EndDate >= date, ct)
            ?? throw new InvalidOperationException($"No financial year covers {date:yyyy-MM-dd}. Create FY first.");
        if (fy.IsClosed)
            throw new InvalidOperationException($"Financial year {fy.Code} is closed.");

        var period = await db.AccountingPeriods.AsNoTracking()
            .FirstOrDefaultAsync(p => p.CompanyId == CompanyId && p.FinancialYearId == fy.Id
                && p.StartDate <= date && p.EndDate >= date, ct)
            ?? throw new InvalidOperationException($"No accounting period covers {date:yyyy-MM-dd}.");
        if (period.IsLocked)
            throw new InvalidOperationException($"Accounting period {period.Name} is locked.");
        return (fy, period);
    }

    public async Task<Voucher> PostAsync(PostingRequest request, CancellationToken ct = default)
    {
        ValidateBalanced(request.Lines);

        var settings = await GetOrCreateSettingsAsync(ct);
        var txnDate = request.TransactionDate;
        var postDate = request.PostingDate ?? txnDate;
        var (fy, period) = await ResolvePeriodAsync(postDate, ct);

        if (!string.IsNullOrWhiteSpace(request.SourceType) && !string.IsNullOrWhiteSpace(request.SourceId))
        {
            var exists = await db.Vouchers.AnyAsync(v =>
                v.CompanyId == CompanyId
                && v.SourceType == request.SourceType
                && v.SourceId == request.SourceId
                && v.Status == VoucherStatuses.Posted, ct);
            if (exists)
                throw new InvalidOperationException($"Source already posted: {request.SourceType}/{request.SourceId}");
        }

        var ledgerIds = request.Lines.Select(l => l.LedgerAccountId).Distinct().ToList();
        var ledgers = await db.LedgerAccounts.Where(l => l.CompanyId == CompanyId && ledgerIds.Contains(l.Id)).ToListAsync(ct);
        foreach (var id in ledgerIds)
        {
            var led = ledgers.FirstOrDefault(l => l.Id == id)
                ?? throw new InvalidOperationException($"Ledger not found: {id}");
            if (!led.IsActive)
                throw new InvalidOperationException($"Ledger inactive: {led.Code} {led.Name}");
        }

        var status = request.AsDraft || (settings.RequireApproval && string.IsNullOrWhiteSpace(request.CreatedBy) == false && false)
            ? (request.AsDraft ? VoucherStatuses.Draft : VoucherStatuses.Posted)
            : (request.AsDraft ? VoucherStatuses.Draft : VoucherStatuses.Posted);
        if (settings.RequireApproval && request.AsDraft == false)
        {
            // When approval required, still allow direct post from engine callers that set ApprovedBy via CreatedBy path;
            // drafts are explicit via AsDraft.
        }

        var total = Math.Round(request.Lines.Sum(l => l.Debit), 2);
        var voucherNo = await NextVoucherNoAsync(request.VoucherType, postDate, ct);

        var voucher = new Voucher
        {
            Id = Guid.NewGuid(),
            CompanyId = CompanyId,
            BranchId = request.BranchId ?? branches.AssignBranchId,
            FinancialYearId = fy.Id,
            PeriodId = period.Id,
            VoucherNo = voucherNo,
            VoucherDate = postDate,
            TransactionDate = txnDate,
            PostingDate = postDate,
            VoucherType = request.VoucherType,
            Status = status,
            PartyName = request.PartyName,
            Mode = request.Mode,
            Narration = request.Narration,
            ReferenceNo = request.ReferenceNo,
            CostCentreId = request.CostCentreId,
            SourceType = request.SourceType,
            SourceId = request.SourceId,
            TotalAmount = total,
            CreatedBy = request.CreatedBy,
            ApprovedBy = status == VoucherStatuses.Posted ? request.CreatedBy : null,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        var lineNo = 1;
        foreach (var line in request.Lines)
        {
            var led = ledgers.First(l => l.Id == line.LedgerAccountId);
            voucher.Lines.Add(new VoucherLine
            {
                Id = Guid.NewGuid(),
                CompanyId = CompanyId,
                VoucherId = voucher.Id,
                LedgerAccountId = line.LedgerAccountId,
                LedgerName = string.IsNullOrWhiteSpace(line.LedgerName) ? led.Name : line.LedgerName,
                Debit = Math.Round(line.Debit, 2),
                Credit = Math.Round(line.Credit, 2),
                LineNarration = line.Narration ?? request.Narration,
                CostCentreId = line.CostCentreId ?? request.CostCentreId,
                PartyType = line.PartyType,
                PartyId = line.PartyId,
                LineNo = lineNo++,
            });
        }

        db.Vouchers.Add(voucher);
        if (status == VoucherStatuses.Posted)
            await ApplyBalanceCacheAsync(voucher.Lines, +1, ct);

        db.AccountingAuditLogs.Add(new AccountingAuditLog
        {
            Id = Guid.NewGuid(),
            CompanyId = CompanyId,
            EntityType = "Voucher",
            EntityId = voucher.Id.ToString("N"),
            Action = status == VoucherStatuses.Draft ? "DRAFT" : "POST",
            Details = $"{voucher.VoucherType} {voucher.VoucherNo} total={total}",
            UserName = request.CreatedBy,
            CreatedAt = DateTime.UtcNow,
        });

        await db.SaveChangesAsync(ct);
        return voucher;
    }

    public async Task<Voucher> PostDraftAsync(Guid voucherId, string? approvedBy, CancellationToken ct = default)
    {
        var voucher = await db.Vouchers.Include(v => v.Lines)
            .FirstOrDefaultAsync(v => v.Id == voucherId && v.CompanyId == CompanyId, ct)
            ?? throw new InvalidOperationException("Voucher not found.");
        if (voucher.Status != VoucherStatuses.Draft)
            throw new InvalidOperationException("Only DRAFT vouchers can be posted.");

        var lines = voucher.Lines.Select(l => new PostingLine(
            l.LedgerAccountId ?? Guid.Empty, l.LedgerName ?? "", l.Debit, l.Credit, l.LineNarration,
            l.CostCentreId, l.PartyType, l.PartyId)).ToList();
        ValidateBalanced(lines);
        await ResolvePeriodAsync(voucher.PostingDate ?? voucher.VoucherDate, ct);

        voucher.Status = VoucherStatuses.Posted;
        voucher.ApprovedBy = approvedBy;
        voucher.UpdatedAt = DateTime.UtcNow;
        await ApplyBalanceCacheAsync(voucher.Lines, +1, ct);

        db.AccountingAuditLogs.Add(new AccountingAuditLog
        {
            Id = Guid.NewGuid(),
            CompanyId = CompanyId,
            EntityType = "Voucher",
            EntityId = voucher.Id.ToString("N"),
            Action = "POST",
            Details = $"Posted draft {voucher.VoucherNo}",
            UserName = approvedBy,
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync(ct);
        return voucher;
    }

    public async Task<Voucher> ReverseAsync(Guid voucherId, string? remarks, string? userName, CancellationToken ct = default)
    {
        var original = await db.Vouchers.Include(v => v.Lines)
            .FirstOrDefaultAsync(v => v.Id == voucherId && v.CompanyId == CompanyId, ct)
            ?? throw new InvalidOperationException("Voucher not found.");
        if (original.Status != VoucherStatuses.Posted)
            throw new InvalidOperationException("Only POSTED vouchers can be reversed.");
        if (original.ReversedByVoucherId != null)
            throw new InvalidOperationException("Voucher already reversed.");

        var revLines = original.Lines
            .OrderBy(l => l.LineNo)
            .Select(l => new PostingLine(
                l.LedgerAccountId ?? Guid.Empty,
                l.LedgerName ?? "",
                l.Credit,
                l.Debit,
                $"Reversal of {original.VoucherNo}: {l.LineNarration}",
                l.CostCentreId,
                l.PartyType,
                l.PartyId))
            .ToList();

        var rev = await PostAsync(new PostingRequest(
            VoucherType: "Journal",
            TransactionDate: DateOnly.FromDateTime(DateTime.UtcNow),
            PostingDate: DateOnly.FromDateTime(DateTime.UtcNow),
            PartyName: original.PartyName,
            Mode: original.Mode,
            Narration: remarks ?? $"Reversal of {original.VoucherNo}",
            ReferenceNo: original.VoucherNo,
            SourceType: "REVERSAL",
            SourceId: original.Id.ToString("N"),
            BranchId: original.BranchId,
            CostCentreId: original.CostCentreId,
            Lines: revLines,
            CreatedBy: userName,
            AsDraft: false), ct);

        original.Status = VoucherStatuses.Reversed;
        original.ReversedByVoucherId = rev.Id;
        original.UpdatedAt = DateTime.UtcNow;
        rev.ReversalOfVoucherId = original.Id;
        // Offsetting ledger impact is applied by PostAsync on the reversing voucher (swapped lines).
        // Do not apply a second -1 on the original — that would double-count.
        await db.SaveChangesAsync(ct);
        return rev;
    }

    /// <summary>Update DRAFT voucher header/lines in place (no ledger balance impact).</summary>
    public async Task<Voucher> UpdateDraftAsync(Guid voucherId, PostingRequest request, CancellationToken ct = default)
    {
        ValidateBalanced(request.Lines);
        var voucher = await db.Vouchers.Include(v => v.Lines)
            .FirstOrDefaultAsync(v => v.Id == voucherId && v.CompanyId == CompanyId, ct)
            ?? throw new InvalidOperationException("Voucher not found.");
        if (voucher.Status != VoucherStatuses.Draft)
            throw new InvalidOperationException("Only DRAFT vouchers can be edited in place. Reverse a posted voucher and create a new one.");

        await ReplaceHeaderAndLinesAsync(voucher, request, ct);
        voucher.UpdatedAt = DateTime.UtcNow;
        db.AccountingAuditLogs.Add(new AccountingAuditLog
        {
            Id = Guid.NewGuid(),
            CompanyId = CompanyId,
            EntityType = "Voucher",
            EntityId = voucher.Id.ToString("N"),
            Action = "UPDATE_DRAFT",
            Details = $"{voucher.VoucherType} {voucher.VoucherNo}",
            UserName = request.CreatedBy,
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync(ct);
        return voucher;
    }

    /// <summary>
    /// Update a posted voucher without leaving duplicate active GL impact.
    /// Engine-posted (has FY): reverse then post a new voucher.
    /// Legacy accounting entry (no FY): replace lines in place (create path never applied balance cache).
    /// </summary>
    public async Task<Voucher> UpdatePostedAsync(Guid voucherId, PostingRequest request, CancellationToken ct = default)
    {
        ValidateBalanced(request.Lines);
        var voucher = await db.Vouchers.Include(v => v.Lines)
            .FirstOrDefaultAsync(v => v.Id == voucherId && v.CompanyId == CompanyId, ct)
            ?? throw new InvalidOperationException("Voucher not found.");
        if (voucher.Status != VoucherStatuses.Posted)
            throw new InvalidOperationException("Only POSTED vouchers can be corrected via update.");
        if (voucher.ReversedByVoucherId != null)
            throw new InvalidOperationException("Voucher already reversed.");

        if (voucher.FinancialYearId != null)
        {
            await ReverseAsync(voucherId, $"Corrected via edit of {voucher.VoucherNo}", request.CreatedBy, ct);
            var recreate = request with
            {
                SourceType = string.IsNullOrWhiteSpace(request.SourceType) ? "VOUCHER_EDIT" : request.SourceType,
                SourceId = string.IsNullOrWhiteSpace(request.SourceId) ? Guid.NewGuid().ToString("N") : request.SourceId,
                AsDraft = false,
            };
            return await PostAsync(recreate, ct);
        }

        // Legacy CreateVoucher path — never touched LedgerAccount.Balance
        await ReplaceHeaderAndLinesAsync(voucher, request, ct);
        voucher.UpdatedAt = DateTime.UtcNow;
        db.AccountingAuditLogs.Add(new AccountingAuditLog
        {
            Id = Guid.NewGuid(),
            CompanyId = CompanyId,
            EntityType = "Voucher",
            EntityId = voucher.Id.ToString("N"),
            Action = "UPDATE_POSTED_LEGACY",
            Details = $"{voucher.VoucherType} {voucher.VoucherNo}",
            UserName = request.CreatedBy,
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync(ct);
        return voucher;
    }

    /// <summary>Hard-delete a DRAFT voucher (no balances were applied).</summary>
    public async Task DeleteDraftAsync(Guid voucherId, string? userName, CancellationToken ct = default)
    {
        var voucher = await db.Vouchers.Include(v => v.Lines)
            .FirstOrDefaultAsync(v => v.Id == voucherId && v.CompanyId == CompanyId, ct)
            ?? throw new InvalidOperationException("Voucher not found.");
        if (voucher.Status != VoucherStatuses.Draft)
            throw new InvalidOperationException("Only DRAFT vouchers can be permanently deleted. Posted vouchers must be reversed.");

        db.VoucherLines.RemoveRange(voucher.Lines);
        db.Vouchers.Remove(voucher);
        db.AccountingAuditLogs.Add(new AccountingAuditLog
        {
            Id = Guid.NewGuid(),
            CompanyId = CompanyId,
            EntityType = "Voucher",
            EntityId = voucherId.ToString("N"),
            Action = "DELETE_DRAFT",
            Details = $"{voucher.VoucherType} {voucher.VoucherNo}",
            UserName = userName,
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync(ct);
    }

    /// <summary>Soft-cancel a legacy posted voucher that cannot go through FY-aware reverse.</summary>
    public async Task SoftCancelLegacyAsync(Guid voucherId, string? remarks, string? userName, CancellationToken ct = default)
    {
        var voucher = await db.Vouchers.Include(v => v.Lines)
            .FirstOrDefaultAsync(v => v.Id == voucherId && v.CompanyId == CompanyId, ct)
            ?? throw new InvalidOperationException("Voucher not found.");
        if (voucher.Status != VoucherStatuses.Posted)
            throw new InvalidOperationException("Only POSTED vouchers can be cancelled.");
        if (voucher.FinancialYearId != null)
            throw new InvalidOperationException("Use reverse for engine-posted vouchers.");

        voucher.Status = VoucherStatuses.Reversed;
        voucher.UpdatedAt = DateTime.UtcNow;
        voucher.Narration = string.IsNullOrWhiteSpace(remarks)
            ? voucher.Narration
            : $"{voucher.Narration} | Cancelled: {remarks}".Trim(' ', '|');
        db.AccountingAuditLogs.Add(new AccountingAuditLog
        {
            Id = Guid.NewGuid(),
            CompanyId = CompanyId,
            EntityType = "Voucher",
            EntityId = voucher.Id.ToString("N"),
            Action = "SOFT_CANCEL",
            Details = remarks ?? $"Cancelled {voucher.VoucherNo}",
            UserName = userName,
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync(ct);
    }

    async Task ReplaceHeaderAndLinesAsync(Voucher voucher, PostingRequest request, CancellationToken ct)
    {
        var ledgerIds = request.Lines.Select(l => l.LedgerAccountId).Distinct().ToList();
        var ledgers = await db.LedgerAccounts.Where(l => l.CompanyId == CompanyId && ledgerIds.Contains(l.Id)).ToListAsync(ct);
        foreach (var id in ledgerIds)
        {
            var led = ledgers.FirstOrDefault(l => l.Id == id)
                ?? throw new InvalidOperationException($"Ledger not found: {id}");
            if (!led.IsActive)
                throw new InvalidOperationException($"Ledger inactive: {led.Code} {led.Name}");
        }

        var postDate = request.PostingDate ?? request.TransactionDate;
        voucher.VoucherType = request.VoucherType;
        voucher.VoucherDate = postDate;
        voucher.TransactionDate = request.TransactionDate;
        voucher.PostingDate = postDate;
        voucher.PartyName = request.PartyName;
        voucher.Mode = request.Mode;
        voucher.Narration = request.Narration;
        voucher.ReferenceNo = request.ReferenceNo;
        voucher.CostCentreId = request.CostCentreId ?? voucher.CostCentreId;
        if (request.BranchId != null) voucher.BranchId = request.BranchId;
        voucher.TotalAmount = Math.Round(request.Lines.Sum(l => l.Debit), 2);

        db.VoucherLines.RemoveRange(voucher.Lines);
        voucher.Lines.Clear();
        var lineNo = 1;
        foreach (var line in request.Lines)
        {
            var led = ledgers.First(l => l.Id == line.LedgerAccountId);
            voucher.Lines.Add(new VoucherLine
            {
                Id = Guid.NewGuid(),
                CompanyId = CompanyId,
                VoucherId = voucher.Id,
                LedgerAccountId = line.LedgerAccountId,
                LedgerName = string.IsNullOrWhiteSpace(line.LedgerName) ? led.Name : line.LedgerName,
                Debit = line.Debit,
                Credit = line.Credit,
                LineNarration = line.Narration ?? request.Narration,
                CostCentreId = line.CostCentreId,
                PartyType = line.PartyType,
                PartyId = line.PartyId,
                LineNo = lineNo++,
            });
        }
    }

    public async Task<LedgerAccount> ResolveLedgerByNameAsync(string name, CancellationToken ct = default)
    {
        var led = await db.LedgerAccounts.AsNoTracking()
            .FirstOrDefaultAsync(l => l.CompanyId == CompanyId && l.IsActive && l.Name == name, ct);
        if (led != null) return led;
        throw new InvalidOperationException($"Ledger '{name}' not found. Configure Chart of Accounts / posting maps.");
    }

    public async Task<AccountPostingMap?> GetMapAsync(string txnType, CancellationToken ct = default) =>
        await db.AccountPostingMaps.AsNoTracking()
            .FirstOrDefaultAsync(m => m.CompanyId == CompanyId && m.TxnType == txnType && m.IsActive, ct);

    public async Task<Voucher?> FindBySourceAsync(string sourceType, string sourceId, CancellationToken ct = default) =>
        await db.Vouchers.AsNoTracking()
            .FirstOrDefaultAsync(v => v.CompanyId == CompanyId
                && v.SourceType == sourceType
                && v.SourceId == sourceId
                && v.Status == VoucherStatuses.Posted, ct);

    public async Task<decimal> GetLedgerBalanceAsync(Guid ledgerId, DateOnly? asOf = null, CancellationToken ct = default)
    {
        var led = await db.LedgerAccounts.AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == ledgerId && l.CompanyId == CompanyId, ct)
            ?? throw new InvalidOperationException("Ledger not found.");
        var q = from line in db.VoucherLines.AsNoTracking()
                join v in db.Vouchers.AsNoTracking() on line.VoucherId equals v.Id
                where line.CompanyId == CompanyId && line.LedgerAccountId == ledgerId && v.Status == VoucherStatuses.Posted
                select new { line.Debit, line.Credit, Date = v.PostingDate ?? v.VoucherDate };
        if (asOf != null)
            q = q.Where(x => x.Date <= asOf);
        var movements = await q.ToListAsync(ct);
        var net = movements.Sum(x => x.Debit - x.Credit);
        return led.OpeningBalance + net;
    }

    async Task ApplyBalanceCacheAsync(IEnumerable<VoucherLine> lines, int sign, CancellationToken ct)
    {
        foreach (var group in lines.GroupBy(l => l.LedgerAccountId))
        {
            if (group.Key == null) continue;
            var led = await db.LedgerAccounts.FirstOrDefaultAsync(l => l.Id == group.Key && l.CompanyId == CompanyId, ct);
            if (led == null) continue;
            var delta = group.Sum(l => l.Debit - l.Credit) * sign;
            led.Balance += delta;
        }
    }

    async Task<string> NextVoucherNoAsync(string voucherType, DateOnly date, CancellationToken ct)
    {
        var prefix = voucherType.ToUpperInvariant() switch
        {
            "JOURNAL" => "JV",
            "PAYMENT" => "PV",
            "RECEIPT" => "RV",
            "CONTRA" => "CV",
            _ => "VX",
        };
        var stem = $"{prefix}-{date:yyyyMM}-";

        // Allocate per-company, then ensure global uniqueness (legacy DB had a global voucher_no unique key).
        var existing = await db.Vouchers.AsNoTracking()
            .Where(v => v.CompanyId == CompanyId && v.VoucherNo.StartsWith(stem))
            .Select(v => v.VoucherNo)
            .ToListAsync(ct);
        var next = 1;
        foreach (var no in existing)
        {
            var suffix = no.Length > stem.Length ? no[stem.Length..] : "";
            if (int.TryParse(suffix, out var n) && n >= next)
                next = n + 1;
        }

        for (var attempt = 0; attempt < 25; attempt++)
        {
            var candidate = $"{stem}{next:D5}";
            var taken = await db.Vouchers.AsNoTracking().AnyAsync(v => v.VoucherNo == candidate, ct);
            if (!taken)
                return candidate;
            next++;
        }

        // Extremely unlikely fallback — still unique under global constraint.
        return $"{stem}{next:D5}-{CompanyId.ToString("N")[..6]}";
    }
}
