using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tms.Api.Data;

namespace Tms.Api.Services;

public static class LrSchemaMigrator
{
    public static async Task EnsureAsync(TmsDbContext db, CancellationToken ct = default)
    {
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync(ct);

        foreach (var file in new[] { "schema.sql", "business_type.sql" })
        {
            var text = await LoadSchemaSqlAsync(file, ct);
            foreach (var stmt in ParseSql(text))
            {
                await using var cmd = new NpgsqlCommand(stmt, conn);
                await cmd.ExecuteNonQueryAsync(ct);
            }
        }
    }

    static async Task<string> LoadSchemaSqlAsync(string fileName, CancellationToken ct)
    {
        foreach (var p in SchemaPathCandidates(fileName))
        {
            if (File.Exists(p))
                return await File.ReadAllTextAsync(p, ct);
        }
        throw new FileNotFoundException($"database/lr/{fileName} not found");
    }

    static IEnumerable<string> SchemaPathCandidates(string fileName)
    {
        yield return Path.Combine(AppContext.BaseDirectory, "database", "lr", fileName);
        yield return Path.Combine(Directory.GetCurrentDirectory(), "database", "lr", fileName);
        yield return Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "database", "lr", fileName));
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
