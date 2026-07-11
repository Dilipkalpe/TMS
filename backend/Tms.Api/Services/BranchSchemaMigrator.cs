using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tms.Api.Data;

namespace Tms.Api.Services;

public static class BranchSchemaMigrator
{
    public static async Task EnsureAsync(TmsDbContext db, CancellationToken ct = default)
    {
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync(ct);

        if (await SchemaMigrationHelper.IsBranchSchemaAppliedAsync(conn, ct))
            return;

        var text = await LoadSchemaSqlAsync(ct);
        await SchemaMigrationHelper.ExecuteStatementsAsync(conn, ParseSql(text), ct);
    }

    static async Task<string> LoadSchemaSqlAsync(CancellationToken ct)
    {
        foreach (var p in SchemaPathCandidates())
        {
            if (File.Exists(p))
                return await File.ReadAllTextAsync(p, ct);
        }
        throw new FileNotFoundException("database/branches/schema.sql not found");
    }

    static IEnumerable<string> SchemaPathCandidates()
    {
        yield return Path.Combine(AppContext.BaseDirectory, "database", "branches", "schema.sql");
        yield return Path.Combine(Directory.GetCurrentDirectory(), "database", "branches", "schema.sql");
        yield return Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "database", "branches", "schema.sql"));
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
    }
}
