using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tms.Api.Data;

namespace Tms.Api.Services;

public static class TenantSchemaMigrator
{
    public static async Task EnsureAsync(TmsDbContext db, ILogger? logger = null, CancellationToken ct = default)
    {
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync(ct);

        if (await SchemaMigrationHelper.IsTenantSchemaAppliedAsync(conn, ct))
        {
            logger?.LogInformation("SaaS tenant schema: already applied, skipping.");
            if (!await TenantHrPayrollInstallGuard.IsTenantProcsInstalledAsync(db, ct))
            {
                logger?.LogInformation("SaaS tenant schema: installing tenant HR/payroll procedures…");
                await PsqlFileRunner.RunSqlFileAsync(db, "database/saas/tenant_hr_payroll_procs.sql", ct);
            }
            else if (!await TenantHrPayrollInstallGuard.IsTenantHrEmployeeProcsInstalledAsync(db, ct))
            {
                logger?.LogInformation("SaaS tenant schema: installing tenant HR employee procedures…");
                await PsqlFileRunner.RunSqlFileAsync(db, "database/hr/install_tenant_hr_employee_procs.sql", ct);
            }
            logger?.LogInformation("SaaS tenant schema: complete.");
            return;
        }

        logger?.LogInformation("SaaS tenant schema: applying schema.sql…");
        var text = await LoadSchemaSqlAsync(ct);
        await ExecuteStatementsAsync(conn, text, ct, continueOnError: true, logger, "schema.sql");

        foreach (var extra in new[] { "tenant_modules.sql", "tenant_hr_payroll_columns.sql" })
        {
            var extraText = await LoadOptionalSqlAsync(extra, ct);
            if (extraText == null) continue;
            logger?.LogInformation("SaaS tenant schema: applying {File}…", extra);
            await ExecuteStatementsAsync(conn, extraText, ct, continueOnError: true, logger, extra);
        }

        if (!await TenantHrPayrollInstallGuard.IsTenantProcsInstalledAsync(db, ct))
        {
            logger?.LogInformation("SaaS tenant schema: installing tenant HR/payroll procedures…");
            await PsqlFileRunner.RunSqlFileAsync(db, "database/saas/tenant_hr_payroll_procs.sql", ct);
        }
        else if (!await TenantHrPayrollInstallGuard.IsTenantHrEmployeeProcsInstalledAsync(db, ct))
        {
            logger?.LogInformation("SaaS tenant schema: installing tenant HR employee procedures…");
            await PsqlFileRunner.RunSqlFileAsync(db, "database/hr/install_tenant_hr_employee_procs.sql", ct);
        }
        else
            logger?.LogInformation("SaaS tenant schema: HR/payroll procedures already installed.");

        logger?.LogInformation("SaaS tenant schema: complete.");
    }

    static async Task ExecuteStatementsAsync(
        NpgsqlConnection conn, string text, CancellationToken ct,
        bool continueOnError = false, ILogger? logger = null, string? label = null)
    {
        var count = 0;
        foreach (var stmt in ParseSql(text))
        {
            try
            {
                await using var cmd = new NpgsqlCommand(stmt, conn);
                cmd.CommandTimeout = SchemaMigrationHelper.CommandTimeoutSeconds;
                await cmd.ExecuteNonQueryAsync(ct);
                count++;
            }
            catch (PostgresException ex) when (continueOnError)
            {
                logger?.LogDebug("SaaS tenant schema ({Label}): skipped ({SqlState}): {Message}",
                    label ?? "sql", ex.SqlState, ex.MessageText);
            }
        }
        logger?.LogDebug("SaaS tenant schema ({Label}): executed {Count} statement(s).", label ?? "sql", count);
    }

    static async Task<string?> LoadOptionalSqlAsync(string fileName, CancellationToken ct)
    {
        foreach (var p in SchemaPathCandidates(fileName))
        {
            if (File.Exists(p))
                return await File.ReadAllTextAsync(p, ct);
        }
        return null;
    }

    static IEnumerable<string> SchemaPathCandidates(string fileName = "schema.sql")
    {
        yield return Path.Combine(AppContext.BaseDirectory, "database", "saas", fileName);
        yield return Path.Combine(Directory.GetCurrentDirectory(), "database", "saas", fileName);
        yield return Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "database", "saas", fileName));
    }

    static async Task<string> LoadSchemaSqlAsync(CancellationToken ct)
    {
        foreach (var p in SchemaPathCandidates("schema.sql"))
        {
            if (File.Exists(p))
                return await File.ReadAllTextAsync(p, ct);
        }
        throw new FileNotFoundException("database/saas/schema.sql not found");
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
        var tail = buf.ToString().Trim();
        if (tail.Length > 0) yield return tail;
    }
}
