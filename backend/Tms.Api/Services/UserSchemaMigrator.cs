using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tms.Api.Data;

namespace Tms.Api.Services;

public static class UserSchemaMigrator
{
    public static async Task EnsureAsync(TmsDbContext db, CancellationToken ct = default)
    {
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync(ct);

        await SchemaMigrationHelper.EnsureBranchesPrimaryKeyAsync(conn, ct);
        await SchemaMigrationHelper.EnsureUsersProfileColumnsAsync(conn, ct);

        try
        {
            var text = await LoadSqlAsync(ct);
            await SchemaMigrationHelper.ExecuteStatementsAsync(conn, ParseSql(text), ct);
        }
        catch (FileNotFoundException)
        {
            // Core columns already added above; SQL file optional for user_branches.
        }
    }

    static async Task<string> LoadSqlAsync(CancellationToken ct)
    {
        foreach (var p in PathCandidates())
        {
            if (File.Exists(p))
                return await File.ReadAllTextAsync(p, ct);
        }
        throw new FileNotFoundException("database/users/schema.sql not found");
    }

    static IEnumerable<string> PathCandidates()
    {
        yield return Path.Combine(AppContext.BaseDirectory, "database", "users", "schema.sql");
        yield return Path.Combine(Directory.GetCurrentDirectory(), "database", "users", "schema.sql");
        yield return Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "database", "users", "schema.sql"));
        yield return Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "database", "users", "schema.sql"));
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
