using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tms.Api.Data;

namespace Tms.Api.Services;

/// <summary>Applies base TMS schema on fresh databases; upgrades settings columns on existing installs.</summary>
public static class CoreSchemaMigrator
{
    public static async Task EnsureAsync(TmsDbContext db, CancellationToken ct = default)
    {
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync(ct);

        if (!await TableExistsAsync(conn, "users", ct))
        {
            var schema = await LoadSqlAsync("schema.sql", ct);
            foreach (var stmt in ParseSql(schema))
            {
                await using var cmd = new NpgsqlCommand(stmt, conn);
                await cmd.ExecuteNonQueryAsync(ct);
            }
        }

        // Use PsqlFileRunner so DO $$ / multi-statement blocks in settings_extension.sql are not split.
        await PsqlFileRunner.RunSqlFileAsync(db, "database/settings_extension.sql", ct);
        await PsqlFileRunner.RunSqlFileAsync(db, "database/settings_document_flow.sql", ct);

        await PsqlFileRunner.RunSqlFileAsync(db, "database/core/stored_procedures.sql", ct);
    }

    static async Task<bool> TableExistsAsync(NpgsqlConnection conn, string table, CancellationToken ct)
    {
        await using var cmd = new NpgsqlCommand(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = @t)",
            conn);
        cmd.Parameters.AddWithValue("t", table);
        return (bool)(await cmd.ExecuteScalarAsync(ct) ?? false);
    }

    static async Task<string> LoadSqlAsync(string fileName, CancellationToken ct)
    {
        foreach (var p in PathCandidates(fileName))
        {
            if (File.Exists(p))
                return await File.ReadAllTextAsync(p, ct);
        }
        throw new FileNotFoundException($"SQL file not found: database/{fileName}");
    }

    static IEnumerable<string> PathCandidates(string fileName)
    {
        yield return Path.Combine(AppContext.BaseDirectory, "database", fileName);
        yield return Path.Combine(Directory.GetCurrentDirectory(), "database", fileName);
        yield return Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "database", fileName));
        yield return Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "database", fileName));
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
                var stmt = buf.ToString().Trim();
                if (stmt.Length > 0) yield return stmt;
                buf.Clear();
            }
        }
        var tail = buf.ToString().Trim();
        if (tail.Length > 0) yield return tail;
    }
}
