using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tms.Api.Data;

namespace Tms.Api.Services;

/// <summary>Adds branch_id to LR / vendor / commercial tables and backfills from bookings / HO.</summary>
public static class BranchIsolationMigrator
{
    static readonly Regex TableFromAlter = new(@"^ALTER\s+TABLE\s+(\w+)", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    static readonly Regex TableFromUpdate = new(@"^UPDATE\s+(\w+)", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static async Task EnsureAsync(TmsDbContext db, CancellationToken ct = default)
    {
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync(ct);

        await SchemaMigrationHelper.EnsureBranchesPrimaryKeyAsync(conn, ct);

        var text = await LoadSqlAsync(ct);
        foreach (var stmt in ParseSql(text))
        {
            var table = ExtractTableName(stmt);
            if (table != null && !await SchemaMigrationHelper.TableExistsAsync(conn, table, ct))
                continue;

            try
            {
                await SchemaMigrationHelper.ExecuteNonQueryAsync(conn, stmt, ct);
            }
            catch (PostgresException ex) when (ex.SqlState is "42P01" or "42703")
            {
                // Optional module tables may not exist on partial installs.
            }
        }
    }

    static string? ExtractTableName(string stmt)
    {
        var m = TableFromAlter.Match(stmt);
        if (m.Success) return m.Groups[1].Value;
        m = TableFromUpdate.Match(stmt);
        return m.Success ? m.Groups[1].Value : null;
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
