using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tms.Api.Data;

namespace Tms.Api.Services;

/// <summary>Installs reporting stored procedures and supporting indexes.</summary>
public static class ReportsSchemaMigrator
{
    static readonly string[] SqlFiles =
    [
        "database/reports/report_indexes.sql",
        "database/reports/sp_dashboard_stats.sql",
        "database/reports/sp_accounting_customer_ledger.sql",
        "database/reports/sp_accounting_ledger_report.sql",
        "database/reports/sp_accounting_registers.sql",
    ];

    public static async Task EnsureAsync(TmsDbContext db, CancellationToken ct = default)
    {
        foreach (var file in SqlFiles)
            await PsqlFileRunner.RunSqlFileAsync(db, file, ct);
    }

    public static async Task<bool> IsInstalledAsync(TmsDbContext db, CancellationToken ct = default)
    {
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync(ct);

        return await FunctionExistsAsync(conn, "sp_dashboard_stats", ct)
            && await FunctionExistsAsync(conn, "sp_accounting_ledger_report", ct)
            && await FunctionExistsAsync(conn, "sp_accounting_register_sales", ct);
    }

    static async Task<bool> FunctionExistsAsync(NpgsqlConnection conn, string name, CancellationToken ct)
    {
        await using var cmd = new NpgsqlCommand(
            "SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = @name)",
            conn);
        cmd.CommandTimeout = SchemaMigrationHelper.CommandTimeoutSeconds;
        cmd.Parameters.AddWithValue("name", name);
        return (bool)(await cmd.ExecuteScalarAsync(ct) ?? false);
    }
}
