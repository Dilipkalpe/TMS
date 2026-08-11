using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tms.Api.Data;

namespace Tms.Api.Services;

public enum AuditMigrationMode
{
    /// <summary>ADD COLUMN only — fast, safe on every API startup.</summary>
    ColumnsOnly,
    /// <summary>ADD + widen types + backfill NULLs — for full installs / deploy scripts.</summary>
    Full
}

public static class AuditSchemaMigrator
{
    static readonly Regex TableFromAlter = new(@"^ALTER\s+TABLE\s+(\w+)", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    static readonly Regex TableFromUpdate = new(@"^UPDATE\s+(\w+)", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    static readonly Regex ColumnFromAlter = new(@"^ALTER\s+TABLE\s+\w+\s+ALTER\s+COLUMN\s+(\w+)", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static Task EnsureAsync(TmsDbContext db, CancellationToken ct = default)
        => EnsureAsync(db, AuditMigrationMode.Full, ct);

    public static async Task EnsureAsync(TmsDbContext db, AuditMigrationMode mode, CancellationToken ct = default)
    {
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync(ct);

        var text = await LoadSqlAsync(ct);
        foreach (var stmt in ParseSql(text))
        {
            if (mode == AuditMigrationMode.ColumnsOnly && !IsAddColumnStatement(stmt)) continue;
            if (!await ShouldRunStatementAsync(conn, stmt, ct)) continue;

            try
            {
                await SchemaMigrationHelper.ExecuteNonQueryAsync(conn, stmt, ct);
            }
            catch (PostgresException ex) when (ex.SqlState is "42703" or "42P01")
            {
                // Table/column missing on partial installs — safe to skip.
            }
        }
    }

    static bool IsAddColumnStatement(string stmt)
        => stmt.Contains("ADD COLUMN", StringComparison.OrdinalIgnoreCase);

    static async Task<bool> ShouldRunStatementAsync(NpgsqlConnection conn, string stmt, CancellationToken ct)
    {
        var table = ExtractTableName(stmt);
        if (table == null) return true;
        if (!await SchemaMigrationHelper.TableExistsAsync(conn, table, ct)) return false;

        if (ColumnFromAlter.IsMatch(stmt))
        {
            var column = ColumnFromAlter.Match(stmt).Groups[1].Value;
            return await SchemaMigrationHelper.ColumnExistsAsync(conn, table, column, ct);
        }

        return true;
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
        throw new FileNotFoundException("database/audit/schema.sql not found");
    }

    static IEnumerable<string> PathCandidates()
    {
        yield return Path.Combine(AppContext.BaseDirectory, "database", "audit", "schema.sql");
        yield return Path.Combine(Directory.GetCurrentDirectory(), "database", "audit", "schema.sql");
        yield return Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "database", "audit", "schema.sql"));
        yield return Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "database", "audit", "schema.sql"));
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
