using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tms.Api.Data;

namespace Tms.Api.Services;

public static class PsqlFileRunner
{
    public static async Task RunSqlFileAsync(TmsDbContext db, string relativePath, CancellationToken ct = default)
    {
        var fullPath = ResolveSqlPath(relativePath)
            ?? throw new FileNotFoundException($"SQL file not found: {relativePath}");

        // In-process Npgsql avoids external psql blocking on interactive password prompts during API startup.
        await RunViaNpgsqlAsync(db, fullPath, ct);
    }

    static string? ResolveSqlPath(string relativePath)
    {
        foreach (var p in PathCandidates(relativePath))
        {
            if (File.Exists(p)) return p;
        }
        return null;
    }

    static IEnumerable<string> PathCandidates(string relativePath)
    {
        yield return Path.Combine(AppContext.BaseDirectory, relativePath.Replace('/', Path.DirectorySeparatorChar));
        yield return Path.Combine(Directory.GetCurrentDirectory(), relativePath.Replace('/', Path.DirectorySeparatorChar));
        yield return Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", relativePath.Replace('/', Path.DirectorySeparatorChar)));
        yield return Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "..", relativePath.Replace('/', Path.DirectorySeparatorChar)));
    }

    static string? FindPsqlPath()
    {
        foreach (var ver in new[] { 18, 17, 16, 15, 14, 13 })
        {
            var candidate = $@"C:\Program Files\PostgreSQL\{ver}\bin\psql.exe";
            if (File.Exists(candidate)) return candidate;
        }
        return null;
    }

    static async Task RunViaPsqlAsync(TmsDbContext db, string psql, string sqlPath, CancellationToken ct)
    {
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        var cs = conn.ConnectionString;
        var builder = new NpgsqlConnectionStringBuilder(cs);

        var args = new List<string>
        {
            "-U", builder.Username ?? "postgres",
            "-d", builder.Database ?? "tms_pro",
            "-h", builder.Host ?? "localhost",
            "-p", builder.Port.ToString(),
            "-v", "ON_ERROR_STOP=1",
            "-f", sqlPath,
        };

        var psi = new ProcessStartInfo
        {
            FileName = psql,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };
        foreach (var arg in args) psi.ArgumentList.Add(arg);

        if (!string.IsNullOrEmpty(builder.Password))
            psi.Environment["PGPASSWORD"] = builder.Password;
        else if (!string.IsNullOrEmpty(Environment.GetEnvironmentVariable("TMS_PG_PASSWORD")))
            psi.Environment["PGPASSWORD"] = Environment.GetEnvironmentVariable("TMS_PG_PASSWORD")!;
        else if (!string.IsNullOrEmpty(Environment.GetEnvironmentVariable("PGPASSWORD")))
            psi.Environment["PGPASSWORD"] = Environment.GetEnvironmentVariable("PGPASSWORD")!;

        using var process = Process.Start(psi)
            ?? throw new InvalidOperationException($"Failed to start psql for {sqlPath}");

        var stdout = await process.StandardOutput.ReadToEndAsync(ct);
        var stderr = await process.StandardError.ReadToEndAsync(ct);
        await process.WaitForExitAsync(ct);

        if (process.ExitCode != 0)
            throw new InvalidOperationException($"psql failed ({Path.GetFileName(sqlPath)}): {stderr}\n{stdout}");
    }

    static async Task RunViaNpgsqlAsync(TmsDbContext db, string sqlPath, CancellationToken ct)
    {
        var text = await ExpandIncludesAsync(await File.ReadAllTextAsync(sqlPath, ct), sqlPath, ct);
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync(ct);

        foreach (var stmt in SqlStatementParser.Parse(text))
            await SchemaMigrationHelper.ExecuteNonQueryAsync(conn, stmt, ct);
    }

    /// <summary>Expands psql \ir / \i includes so Npgsql fallback matches psql behaviour.</summary>
    static async Task<string> ExpandIncludesAsync(string text, string sqlPath, CancellationToken ct)
    {
        var dir = Path.GetDirectoryName(sqlPath) ?? Directory.GetCurrentDirectory();
        var sb = new System.Text.StringBuilder();

        foreach (var rawLine in text.Split('\n'))
        {
            var trimmed = rawLine.TrimStart();
            if (trimmed.StartsWith("\\ir ", StringComparison.OrdinalIgnoreCase)
                || trimmed.StartsWith("\\i ", StringComparison.OrdinalIgnoreCase))
            {
                var includeName = trimmed.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries)[1].Trim();
                var includePath = Path.IsPathRooted(includeName)
                    ? includeName
                    : Path.Combine(dir, includeName.Replace('/', Path.DirectorySeparatorChar));
                if (!File.Exists(includePath))
                    throw new FileNotFoundException($"SQL include not found: {includePath} (referenced from {sqlPath})");
                var included = await ExpandIncludesAsync(await File.ReadAllTextAsync(includePath, ct), includePath, ct);
                sb.AppendLine(included);
                continue;
            }

            sb.AppendLine(rawLine);
        }

        return sb.ToString();
    }
}

/// <summary>Splits SQL respecting $$ ... $$ function bodies.</summary>
public static class SqlStatementParser
{
    public static IEnumerable<string> Parse(string text)
    {
        var buf = new System.Text.StringBuilder();
        var inDollarQuote = false;
        string? dollarTag = null;

        foreach (var rawLine in text.Split('\n'))
        {
            var line = rawLine;
            if (!inDollarQuote && line.TrimStart().StartsWith("--"))
                continue;

            var i = 0;
            while (i < line.Length)
            {
                if (line[i] == '$')
                {
                    var tagStart = i;
                    var j = i + 1;
                    while (j < line.Length && line[j] != '$') j++;
                    if (j < line.Length)
                    {
                        var tag = line[tagStart..(j + 1)];
                        if (!inDollarQuote)
                        {
                            inDollarQuote = true;
                            dollarTag = tag;
                        }
                        else if (tag == dollarTag)
                        {
                            inDollarQuote = false;
                            dollarTag = null;
                        }
                        buf.Append(line, i, j - i + 1);
                        i = j + 1;
                        continue;
                    }
                }

                if (!inDollarQuote && line[i] == ';')
                {
                    buf.Append(line, i, 1);
                    var stmt = buf.ToString().Trim();
                    if (stmt.Length > 0) yield return stmt;
                    buf.Clear();
                    i++;
                    continue;
                }

                buf.Append(line[i]);
                i++;
            }

            buf.AppendLine();
        }

        var tail = buf.ToString().Trim();
        if (tail.Length > 0) yield return tail;
    }
}
