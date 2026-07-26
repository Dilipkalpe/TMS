using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tms.Api.Data;

namespace Tms.Api.Services;

public static class AuditSchemaMigrator
{
    public static async Task EnsureAsync(TmsDbContext db, CancellationToken ct = default)
    {
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync(ct);

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
