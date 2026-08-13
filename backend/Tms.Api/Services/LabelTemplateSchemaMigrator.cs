using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public static class LabelTemplateSchemaMigrator
{
    public const string TemplateTypeLrPackage = "LR_PACKAGE";

    public static async Task EnsureAsync(TmsDbContext db, CancellationToken ct = default)
    {
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync(ct);

        var text = await LoadSchemaSqlAsync(ct);
        foreach (var stmt in ParseSql(text))
        {
            await using var cmd = new NpgsqlCommand(stmt, conn);
            cmd.CommandTimeout = SchemaMigrationHelper.CommandTimeoutSeconds;
            await cmd.ExecuteNonQueryAsync(ct);
        }

        await SeedBuiltInTemplatesAsync(db, ct);
    }

    public static string DefaultTemplateJson() => LabelTemplateDesigns.CompactDefault;

    static readonly (string Name, decimal W, decimal H, string Json, bool IsDefault)[] BuiltIns =
    [
        ("Express Shipping Label", 100, 150, LabelTemplateDesigns.ExpressShippingStyle, true),
        ("Shipping Label (Barcode)", 100, 150, LabelTemplateDesigns.ShippingBarcodeStyle, false),
        ("Compact LR Package Label", 100, 150, LabelTemplateDesigns.CompactDefault, false),
    ];

    static async Task SeedBuiltInTemplatesAsync(TmsDbContext db, CancellationToken ct)
    {
        List<Guid> companyIds;
        try
        {
            companyIds = await db.Companies.AsNoTracking().Select(c => c.Id).ToListAsync(ct);
        }
        catch
        {
            companyIds = [TenantContext.DefaultCompanyId];
        }

        if (companyIds.Count == 0)
            companyIds.Add(TenantContext.DefaultCompanyId);

        var now = DateTime.UtcNow;
        var changed = false;

        foreach (var companyId in companyIds.Distinct())
        {
            changed |= await EnsureBuiltInsForCompanyAsync(db, companyId, now, ct);
        }

        if (changed)
            await db.SaveChangesAsync(ct);
    }

    static async Task<bool> EnsureBuiltInsForCompanyAsync(TmsDbContext db, Guid companyId, DateTime now, CancellationToken ct)
    {
        var existing = await db.LabelTemplates
            .Where(t => t.CompanyId == companyId && t.TemplateType == TemplateTypeLrPackage)
            .ToListAsync(ct);

        var changed = false;

        // Rename legacy sample name before matching built-ins (avoid duplicates)
        foreach (var row in existing.Where(t =>
            string.Equals(t.TemplateName, "Priority Mail Style", StringComparison.OrdinalIgnoreCase)))
        {
            row.TemplateName = "Express Shipping Label";
            row.TemplateJson = LabelTemplateDesigns.ExpressShippingStyle;
            row.UpdatedAt = now;
            row.UpdatedBy = "system";
            changed = true;
        }

        var hasDefault = existing.Any(t => t.IsDefault && t.IsActive);

        foreach (var (name, w, h, json, wantDefault) in BuiltIns)
        {
            var row = existing.FirstOrDefault(t =>
                string.Equals(t.TemplateName, name, StringComparison.OrdinalIgnoreCase));
            if (row != null)
            {
                // Keep user edits — only fill empty/broken json
                if (string.IsNullOrWhiteSpace(row.TemplateJson) || row.TemplateJson.Trim() == "{}")
                {
                    row.TemplateJson = json;
                    row.PaperWidth = w;
                    row.PaperHeight = h;
                    row.UpdatedAt = now;
                    row.UpdatedBy = "system";
                    changed = true;
                }
                continue;
            }

            // Rename legacy default name to Compact if that was the only seed
            if (name == "Compact LR Package Label")
            {
                var legacy = existing.FirstOrDefault(t =>
                    string.Equals(t.TemplateName, "Default LR Package Label", StringComparison.OrdinalIgnoreCase));
                if (legacy != null)
                {
                    legacy.TemplateName = "Compact LR Package Label";
                    if (string.IsNullOrWhiteSpace(legacy.TemplateJson) || legacy.TemplateJson.Contains("\"elements\""))
                    {
                        // Upgrade compact layout to latest compact design when still system-owned name
                        legacy.TemplateJson = json;
                    }
                    legacy.UpdatedAt = now;
                    changed = true;
                    continue;
                }
            }

            // Prefer Express Shipping Label as default when first introduced.
            var makeDefault = wantDefault || !hasDefault;
            if (makeDefault)
            {
                foreach (var prev in existing.Where(t => t.IsDefault))
                {
                    prev.IsDefault = false;
                    prev.UpdatedAt = now;
                }
                hasDefault = true;
            }

            db.LabelTemplates.Add(new LabelTemplate
            {
                Id = Guid.NewGuid(),
                CompanyId = companyId,
                TemplateName = name,
                TemplateType = TemplateTypeLrPackage,
                PaperWidth = w,
                PaperHeight = h,
                TemplateJson = json,
                IsDefault = makeDefault,
                IsActive = true,
                CreatedBy = "system",
                CreatedAt = now,
                UpdatedBy = "system",
                UpdatedAt = now,
            });
            changed = true;
        }

        // If still no default, mark Express or first active
        if (!existing.Any(t => t.IsDefault && t.IsActive))
        {
            var pick = existing.FirstOrDefault(t =>
                string.Equals(t.TemplateName, "Express Shipping Label", StringComparison.OrdinalIgnoreCase) && t.IsActive)
                ?? existing.FirstOrDefault(t => t.IsActive);
            if (pick != null)
            {
                pick.IsDefault = true;
                pick.UpdatedAt = now;
                changed = true;
            }
        }

        return changed;
    }

    /// <summary>Ensure built-in templates exist for a company (lazy seed on API use).</summary>
    public static async Task EnsureCompanyDefaultAsync(TmsDbContext db, Guid companyId, CancellationToken ct = default)
    {
        var changed = await EnsureBuiltInsForCompanyAsync(db, companyId, DateTime.UtcNow, ct);
        if (changed)
            await db.SaveChangesAsync(ct);

        // Ensure exactly one default among active
        var actives = await db.LabelTemplates
            .Where(t => t.CompanyId == companyId && t.TemplateType == TemplateTypeLrPackage && t.IsActive)
            .ToListAsync(ct);
        if (actives.Count == 0) return;
        if (actives.Any(t => t.IsDefault)) return;

        var prefer = actives.FirstOrDefault(t =>
            string.Equals(t.TemplateName, "Express Shipping Label", StringComparison.OrdinalIgnoreCase))
            ?? actives[0];
        prefer.IsDefault = true;
        prefer.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    static async Task<string> LoadSchemaSqlAsync(CancellationToken ct)
    {
        foreach (var p in SchemaPathCandidates())
        {
            if (File.Exists(p))
                return await File.ReadAllTextAsync(p, ct);
        }
        return EmbeddedSchemaSql;
    }

    static IEnumerable<string> SchemaPathCandidates()
    {
        yield return Path.Combine(AppContext.BaseDirectory, "database", "label-templates", "schema.sql");
        yield return Path.Combine(Directory.GetCurrentDirectory(), "database", "label-templates", "schema.sql");
        yield return Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "database", "label-templates", "schema.sql"));
        yield return Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "database", "label-templates", "schema.sql"));
    }

    static IEnumerable<string> ParseSql(string text)
    {
        var buf = new System.Text.StringBuilder();
        foreach (var line in text.Split('\n'))
        {
            if (line.TrimStart().StartsWith("--")) continue;
            buf.AppendLine(line);
            if (line.TrimEnd().EndsWith(';'))
            {
                var s = buf.ToString().Trim();
                if (s.Length > 0) yield return s;
                buf.Clear();
            }
        }
        if (buf.Length > 0)
        {
            var s = buf.ToString().Trim();
            if (s.Length > 0) yield return s;
        }
    }

    const string EmbeddedSchemaSql = """
        CREATE TABLE IF NOT EXISTS label_templates (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id      UUID NOT NULL,
            template_name   VARCHAR(120) NOT NULL,
            template_type   VARCHAR(40) NOT NULL DEFAULT 'LR_PACKAGE',
            paper_width     NUMERIC(10,2) NOT NULL DEFAULT 100,
            paper_height    NUMERIC(10,2) NOT NULL DEFAULT 150,
            template_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
            is_default      BOOLEAN NOT NULL DEFAULT FALSE,
            is_active       BOOLEAN NOT NULL DEFAULT TRUE,
            created_by      VARCHAR(120),
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_by      VARCHAR(120),
            updated_at      TIMESTAMPTZ
        );
        CREATE INDEX IF NOT EXISTS idx_label_templates_company ON label_templates (company_id);
        CREATE INDEX IF NOT EXISTS idx_label_templates_company_type ON label_templates (company_id, template_type) WHERE is_active = TRUE;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_label_templates_one_default ON label_templates (company_id, template_type) WHERE is_default = TRUE AND is_active = TRUE;
        """;
}
