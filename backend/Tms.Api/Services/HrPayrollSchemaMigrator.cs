using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tms.Api.Data;

namespace Tms.Api.Services;

public static class HrPayrollSchemaMigrator
{
    /// <summary>Idempotent table DDL only — safe on every API start.</summary>
    static readonly string[] SchemaSqlFiles =
    [
        "database/hr/schema.sql",
        "database/payroll/schema.sql",
    ];

    /// <summary>Heavy stored procedures — run once via npm run hr:install, skipped when fully present.</summary>
    static readonly string[] InstallSqlFiles =
    [
        "database/hr/employment_types.sql",
        "database/hr/upgrade_drop_employee_sp.sql",
        "database/hr/stored_procedures.sql",
        "database/payroll/upgrade_drop_functions.sql",
        "database/payroll/stored_procedures.sql",
        "database/payroll/accounting_integration.sql",
        "database/payroll/upgrade_drop_functions.sql",
        "database/payroll/payroll_hr_extension.sql",
        "database/payroll/payroll_accounting_sp.sql",
        "database/hr/upgrade_drop_employee_sp.sql",
        "database/hr/employment_hr_sp.sql",
        "database/payroll/upgrade_drop_transport.sql",
        "database/payroll/employment_payroll.sql",
        "database/hr/upgrade_drop_employee_sp.sql",
        "database/hr/tms_transport_hr.sql",
        "database/payroll/upgrade_drop_transport.sql",
        "database/payroll/tms_transport_payroll.sql",
    ];

    public static async Task EnsureAsync(TmsDbContext db, CancellationToken ct = default)
    {
        foreach (var file in SchemaSqlFiles)
            await PsqlFileRunner.RunSqlFileAsync(db, file, ct);

        if (!await IsInstalledAsync(db, ct))
        {
            foreach (var file in InstallSqlFiles)
                await PsqlFileRunner.RunSqlFileAsync(db, file, ct);
        }

        await PsqlFileRunner.RunSqlFileAsync(db, "database/saas/tenant_hr_payroll_columns.sql", ct);
        if (!await TenantHrPayrollInstallGuard.IsTenantProcsInstalledAsync(db, ct))
            await PsqlFileRunner.RunSqlFileAsync(db, "database/saas/tenant_hr_payroll_procs.sql", ct);

        // Always ensure tenant-aware employee save (38-param legacy versions break the API).
        if (!await TenantHrPayrollInstallGuard.IsSaveEmployeeProcInstalledAsync(db, ct))
            await PsqlFileRunner.RunSqlFileAsync(db, "database/hr/install_sp_hr_save_employee.sql", ct);
    }

    static async Task<bool> IsInstalledAsync(TmsDbContext db, CancellationToken ct)
    {
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync(ct);

        await using var cmd = new NpgsqlCommand("""
            SELECT
              EXISTS (
                SELECT 1 FROM pg_proc p
                JOIN pg_namespace n ON n.oid = p.pronamespace
                WHERE n.nspname = 'public'
                  AND p.proname = 'sp_hr_list_employees'
                  AND p.pronargs = 5
              ),
              EXISTS (
                SELECT 1 FROM pg_proc p
                JOIN pg_namespace n ON n.oid = p.pronamespace
                WHERE n.nspname = 'public' AND p.proname = 'sp_payroll_list_settings'
              ),
              EXISTS (
                SELECT 1 FROM pg_proc p
                JOIN pg_namespace n ON n.oid = p.pronamespace
                WHERE n.nspname = 'public' AND p.proname = 'sp_payroll_mark_paid'
                  AND p.proretset = TRUE
              ),
              EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'payroll_settings'
              )
            """, conn);

        await using var r = await cmd.ExecuteReaderAsync(ct);
        if (!await r.ReadAsync(ct)) return false;
        return r.GetBoolean(0) && r.GetBoolean(1) && r.GetBoolean(2) && r.GetBoolean(3);
    }
}
