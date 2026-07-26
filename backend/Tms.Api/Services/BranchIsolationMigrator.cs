using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tms.Api.Data;

namespace Tms.Api.Services;

/// <summary>Adds branch_id to LR / vendor / commercial tables and backfills from bookings / HO.</summary>
public static class BranchIsolationMigrator
{
    public static async Task EnsureAsync(TmsDbContext db, CancellationToken ct = default)
    {
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync(ct);

        await using (var check = new NpgsqlCommand(
            """
            SELECT COUNT(*) FROM information_schema.columns
            WHERE table_name = 'lorry_receipts' AND column_name = 'branch_id'
            """, conn))
        {
            var exists = Convert.ToInt64(await check.ExecuteScalarAsync(ct)) > 0;
            // Still run backfill statements even if column exists (idempotent UPDATEs).
            if (!exists)
            {
                // fall through to full script
            }
        }

        var text = await LoadSqlAsync(ct);
        foreach (var stmt in ParseSql(text))
        {
            await using var cmd = new NpgsqlCommand(stmt, conn);
            await cmd.ExecuteNonQueryAsync(ct);
        }
    }

    static async Task<string> LoadSqlAsync(CancellationToken ct)
    {
        foreach (var p in PathCandidates())
        {
            if (File.Exists(p))
                return await File.ReadAllTextAsync(p, ct);
        }
        throw new FileNotFoundException("database/branches/branch_isolation.sql not found");
    }

    static IEnumerable<string> PathCandidates()
    {
        yield return Path.Combine(AppContext.BaseDirectory, "database", "branches", "branch_isolation.sql");
        yield return Path.Combine(Directory.GetCurrentDirectory(), "database", "branches", "branch_isolation.sql");
        yield return Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "database", "branches", "branch_isolation.sql"));
        yield return Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "database", "branches", "branch_isolation.sql"));
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
}
