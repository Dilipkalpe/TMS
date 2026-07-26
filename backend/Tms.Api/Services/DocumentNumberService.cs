using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public sealed class DocumentNumberService(TmsDbContext db)
{
    public const string DefaultFormatPattern = "{company}/{branch}/{fy}/{prefix}/{seq}";

    public static Guid RequireBranchId(Guid? branchId) =>
        branchId ?? throw new InvalidOperationException("Branch is required for document numbering. Select a branch and try again.");

    /// <summary>Resolve branch for document numbering — header / assign, else company head office.</summary>
    public async Task<Guid> ResolveBranchIdForNumberingAsync(
        ITenantContext tenants,
        IBranchContext branches,
        Guid? preferredBranchId = null,
        CancellationToken ct = default)
    {
        if (preferredBranchId.HasValue && preferredBranchId.Value != Guid.Empty)
            return preferredBranchId.Value;
        if (branches.AssignBranchId.HasValue && branches.AssignBranchId.Value != Guid.Empty)
            return branches.AssignBranchId.Value;

        var companyId = tenants.AssignCompanyId ?? TenantContext.DefaultCompanyId;
        var fallback = await db.Branches.AsNoTracking()
            .Where(b => b.CompanyId == companyId && b.IsActive)
            .OrderByDescending(b => b.IsHeadOffice)
            .ThenBy(b => b.Code)
            .Select(b => (Guid?)b.Id)
            .FirstOrDefaultAsync(ct);

        if (fallback == null || fallback == Guid.Empty)
            throw new InvalidOperationException("Branch is required for document numbering. Select a branch and try again.");

        return fallback.Value;
    }

    /// <summary>Indian financial year label (1 Apr – 31 Mar). July 2026 → 2026-27.</summary>
    public static string GetFinancialYear(DateOnly date)
    {
        var startYear = date.Month >= 4 ? date.Year : date.Year - 1;
        var endYearShort = (startYear + 1) % 100;
        return $"{startYear}-{endYearShort:D2}";
    }

    public static string GetFinancialYear(DateTime utcOrLocal) =>
        GetFinancialYear(DateOnly.FromDateTime(utcOrLocal));

    public async Task<string> NextAsync(
        string documentType,
        Guid companyId,
        Guid branchId,
        DateOnly? asOf = null,
        CancellationToken ct = default)
    {
        if (companyId == Guid.Empty)
            throw new InvalidOperationException("Company is required for document numbering.");
        if (branchId == Guid.Empty)
            throw new InvalidOperationException("Branch is required for document numbering.");
        if (!DocumentNumberTypes.All.Contains(documentType, StringComparer.OrdinalIgnoreCase))
            throw new InvalidOperationException($"Unsupported document type: {documentType}");

        documentType = DocumentNumberTypes.All.First(t =>
            t.Equals(documentType, StringComparison.OrdinalIgnoreCase));

        var asOfDate = asOf ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var fyLabel = GetFinancialYear(asOfDate);

        var company = await db.Companies.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == companyId, ct)
            ?? throw new InvalidOperationException("Company not found.");
        var branch = await db.Branches.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == branchId && b.CompanyId == companyId, ct)
            ?? throw new InvalidOperationException("Branch not found for this company.");

        var companyCode = DocumentCodeRules.Require(company.Code, "Company");
        var branchCode = DocumentCodeRules.Require(branch.Code, "Branch");

        var config = await EnsureConfigAsync(companyId, branchId, documentType, ct);
        var fyKey = string.Equals(config.ResetRule, DocumentNumberResetRules.Never, StringComparison.OrdinalIgnoreCase)
            ? "ALL"
            : fyLabel;

        var next = await AllocateNextAsync(companyId, branchId, documentType, fyKey, ct);
        return FormatNumber(config, companyCode, branchCode, fyLabel, next);
    }

    public static string FormatNumber(
        DocumentNumberConfig config,
        string companyCode,
        string branchCode,
        string fyLabel,
        int sequence)
    {
        var pad = Math.Clamp(config.RunningNumberLength, 1, 12);
        var seq = sequence.ToString().PadLeft(pad, '0');
        var pattern = string.IsNullOrWhiteSpace(config.FormatPattern)
            ? DefaultFormatPattern
            : config.FormatPattern.Trim();

        return pattern
            .Replace("{company}", companyCode, StringComparison.OrdinalIgnoreCase)
            .Replace("{branch}", branchCode, StringComparison.OrdinalIgnoreCase)
            .Replace("{fy}", fyLabel, StringComparison.OrdinalIgnoreCase)
            .Replace("{prefix}", (config.Prefix ?? "").Trim().ToUpperInvariant(), StringComparison.OrdinalIgnoreCase)
            .Replace("{seq}", seq, StringComparison.OrdinalIgnoreCase);
    }

    public async Task<DocumentNumberConfig> EnsureConfigAsync(
        Guid companyId,
        Guid branchId,
        string documentType,
        CancellationToken ct = default)
    {
        var existing = await db.DocumentNumberConfigs
            .FirstOrDefaultAsync(c =>
                c.CompanyId == companyId &&
                c.BranchId == branchId &&
                c.DocumentType == documentType, ct);
        if (existing != null) return existing;

        var created = new DocumentNumberConfig
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            BranchId = branchId,
            DocumentType = documentType,
            Prefix = DocumentNumberTypes.DefaultPrefix(documentType),
            FormatPattern = DefaultFormatPattern,
            FyFormat = "YY-YY",
            RunningNumberLength = 5,
            ResetRule = DocumentNumberResetRules.FinancialYear,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.DocumentNumberConfigs.Add(created);
        try
        {
            await db.SaveChangesAsync(ct);
            return created;
        }
        catch (DbUpdateException)
        {
            db.Entry(created).State = EntityState.Detached;
            return await db.DocumentNumberConfigs
                .FirstAsync(c =>
                    c.CompanyId == companyId &&
                    c.BranchId == branchId &&
                    c.DocumentType == documentType, ct);
        }
    }

    public async Task EnsureDefaultsForBranchAsync(Guid companyId, Guid branchId, CancellationToken ct = default)
    {
        foreach (var type in DocumentNumberTypes.All)
            await EnsureConfigAsync(companyId, branchId, type, ct);
    }

    async Task<int> AllocateNextAsync(
        Guid companyId,
        Guid branchId,
        string documentType,
        string financialYear,
        CancellationToken ct)
    {
        var rows = await db.Database.SqlQueryRaw<int>(
            """
            SELECT sp_next_document_number({0}, {1}, {2}, {3}) AS "Value"
            """,
            companyId, branchId, documentType, financialYear)
            .ToListAsync(ct);

        if (rows.Count == 0)
            throw new InvalidOperationException("Failed to allocate document number.");
        return rows[0];
    }

    public async Task<IReadOnlyList<DocumentNumberConfigDto>> ListConfigsAsync(
        Guid companyId,
        Guid? branchId,
        CancellationToken ct = default)
    {
        var branchesQuery = db.Branches.AsNoTracking().Where(b => b.CompanyId == companyId && b.IsActive);
        if (branchId.HasValue)
            branchesQuery = branchesQuery.Where(b => b.Id == branchId.Value);

        var branches = await branchesQuery.OrderBy(b => b.Code).ToListAsync(ct);
        var result = new List<DocumentNumberConfigDto>();
        var fyLabel = GetFinancialYear(DateOnly.FromDateTime(DateTime.UtcNow));

        foreach (var branch in branches)
        {
            await EnsureDefaultsForBranchAsync(companyId, branch.Id, ct);
            var configs = await db.DocumentNumberConfigs.AsNoTracking()
                .Where(c => c.CompanyId == companyId && c.BranchId == branch.Id)
                .OrderBy(c => c.DocumentType)
                .ToListAsync(ct);

            foreach (var cfg in configs)
            {
                var fyKey = string.Equals(cfg.ResetRule, DocumentNumberResetRules.Never, StringComparison.OrdinalIgnoreCase)
                    ? "ALL"
                    : fyLabel;
                var seq = await db.DocumentNumberSequences.AsNoTracking()
                    .FirstOrDefaultAsync(s =>
                        s.CompanyId == companyId &&
                        s.BranchId == branch.Id &&
                        s.DocumentType == cfg.DocumentType &&
                        s.FinancialYear == fyKey, ct);

                var preview = FormatNumber(cfg, "01", DocumentCodeRules.Normalize(branch.Code).Length == 2 ? DocumentCodeRules.Normalize(branch.Code) : "02", fyLabel, (seq?.CurrentNumber ?? 0) + 1);
                result.Add(new DocumentNumberConfigDto(
                    cfg.Id,
                    cfg.CompanyId,
                    cfg.BranchId,
                    branch.Code,
                    branch.Name,
                    cfg.DocumentType,
                    cfg.Prefix,
                    cfg.FormatPattern,
                    cfg.FyFormat,
                    cfg.RunningNumberLength,
                    cfg.ResetRule,
                    seq?.CurrentNumber ?? 0,
                    fyLabel,
                    preview));
            }
        }

        return result;
    }

    public async Task<DocumentNumberConfigDto> UpdateConfigAsync(
        Guid configId,
        Guid companyId,
        UpdateDocumentNumberConfigRequest req,
        CancellationToken ct = default)
    {
        var cfg = await db.DocumentNumberConfigs
            .FirstOrDefaultAsync(c => c.Id == configId && c.CompanyId == companyId, ct)
            ?? throw new InvalidOperationException("Document numbering config not found.");

        if (!string.IsNullOrWhiteSpace(req.Prefix))
            cfg.Prefix = req.Prefix.Trim().ToUpperInvariant();
        if (!string.IsNullOrWhiteSpace(req.FormatPattern))
            cfg.FormatPattern = req.FormatPattern.Trim();
        if (!string.IsNullOrWhiteSpace(req.FyFormat))
            cfg.FyFormat = req.FyFormat.Trim();
        if (req.RunningNumberLength is >= 1 and <= 12)
            cfg.RunningNumberLength = req.RunningNumberLength.Value;
        if (!string.IsNullOrWhiteSpace(req.ResetRule))
        {
            if (req.ResetRule is not (DocumentNumberResetRules.FinancialYear or DocumentNumberResetRules.Never))
                throw new InvalidOperationException("Reset rule must be FinancialYear or Never.");
            cfg.ResetRule = req.ResetRule;
        }
        cfg.UpdatedAt = DateTime.UtcNow;

        var fyLabel = GetFinancialYear(DateOnly.FromDateTime(DateTime.UtcNow));
        var fyKey = string.Equals(cfg.ResetRule, DocumentNumberResetRules.Never, StringComparison.OrdinalIgnoreCase)
            ? "ALL"
            : fyLabel;

        if (req.CurrentNumber.HasValue)
        {
            if (req.CurrentNumber.Value < 0)
                throw new InvalidOperationException("Current number cannot be negative.");

            var seq = await db.DocumentNumberSequences
                .FirstOrDefaultAsync(s =>
                    s.CompanyId == cfg.CompanyId &&
                    s.BranchId == cfg.BranchId &&
                    s.DocumentType == cfg.DocumentType &&
                    s.FinancialYear == fyKey, ct);
            if (seq == null)
            {
                seq = new DocumentNumberSequence
                {
                    Id = Guid.NewGuid(),
                    CompanyId = cfg.CompanyId,
                    BranchId = cfg.BranchId,
                    DocumentType = cfg.DocumentType,
                    FinancialYear = fyKey,
                    CurrentNumber = req.CurrentNumber.Value,
                    UpdatedAt = DateTime.UtcNow,
                };
                db.DocumentNumberSequences.Add(seq);
            }
            else
            {
                seq.CurrentNumber = req.CurrentNumber.Value;
                seq.UpdatedAt = DateTime.UtcNow;
            }
        }

        await db.SaveChangesAsync(ct);

        var branch = await db.Branches.AsNoTracking().FirstAsync(b => b.Id == cfg.BranchId, ct);
        var current = await db.DocumentNumberSequences.AsNoTracking()
            .FirstOrDefaultAsync(s =>
                s.CompanyId == cfg.CompanyId &&
                s.BranchId == cfg.BranchId &&
                s.DocumentType == cfg.DocumentType &&
                s.FinancialYear == fyKey, ct);

        return new DocumentNumberConfigDto(
            cfg.Id,
            cfg.CompanyId,
            cfg.BranchId,
            branch.Code,
            branch.Name,
            cfg.DocumentType,
            cfg.Prefix,
            cfg.FormatPattern,
            cfg.FyFormat,
            cfg.RunningNumberLength,
            cfg.ResetRule,
            current?.CurrentNumber ?? 0,
            fyLabel,
            FormatNumber(cfg, "01", DocumentCodeRules.IsValid(branch.Code) ? DocumentCodeRules.Normalize(branch.Code) : "02", fyLabel, (current?.CurrentNumber ?? 0) + 1));
    }
}

public record DocumentNumberConfigDto(
    Guid Id,
    Guid CompanyId,
    Guid BranchId,
    string BranchCode,
    string BranchName,
    string DocumentType,
    string Prefix,
    string FormatPattern,
    string FyFormat,
    int RunningNumberLength,
    string ResetRule,
    int CurrentNumber,
    string ActiveFinancialYear,
    string PreviewNext);

public record UpdateDocumentNumberConfigRequest(
    string? Prefix,
    string? FormatPattern,
    string? FyFormat,
    int? RunningNumberLength,
    string? ResetRule,
    int? CurrentNumber);
