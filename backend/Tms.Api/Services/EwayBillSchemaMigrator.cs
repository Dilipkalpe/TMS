using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tms.Api.Data;

namespace Tms.Api.Services;

public static class EwayBillSchemaMigrator
{
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
        yield return Path.Combine(AppContext.BaseDirectory, "database", "eway", "schema.sql");
        yield return Path.Combine(Directory.GetCurrentDirectory(), "database", "eway", "schema.sql");
        yield return Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "database", "eway", "schema.sql"));
        yield return Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "database", "eway", "schema.sql"));
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
        CREATE TABLE IF NOT EXISTS eway_bills (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id      UUID NOT NULL,
            branch_id       UUID,
            lr_number       VARCHAR(80) NOT NULL,
            eway_bill_no    VARCHAR(50),
            eway_bill_date  DATE,
            valid_upto      DATE,
            vehicle_no      VARCHAR(40),
            from_place      VARCHAR(200),
            to_place        VARCHAR(200),
            document_value  DECIMAL(18,2),
            status          VARCHAR(30) NOT NULL DEFAULT 'Draft',
            source          VARCHAR(20) NOT NULL DEFAULT 'Manual',
            portal_ref      VARCHAR(100),
            notes           TEXT,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_by      VARCHAR(100),
            updated_by      VARCHAR(100)
        );
        CREATE INDEX IF NOT EXISTS ix_eway_bills_company_lr ON eway_bills (company_id, lr_number);
        CREATE INDEX IF NOT EXISTS ix_eway_bills_company_status ON eway_bills (company_id, status);
        CREATE INDEX IF NOT EXISTS ix_eway_bills_company_valid ON eway_bills (company_id, valid_upto);
        """;
}
