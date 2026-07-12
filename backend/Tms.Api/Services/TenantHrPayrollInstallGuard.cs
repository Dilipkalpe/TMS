using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tms.Api.Data;

namespace Tms.Api.Services;

static class TenantHrPayrollInstallGuard
{
    public static async Task<bool> IsTenantProcsInstalledAsync(TmsDbContext db, CancellationToken ct = default)
    {
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync(ct);

        await using var cmd = new NpgsqlCommand("""
            SELECT EXISTS (
                SELECT 1 FROM pg_proc p
                JOIN pg_namespace n ON n.oid = p.pronamespace
                WHERE n.nspname = 'public'
                  AND p.proname = 'sp_hr_list_employees_paged'
                  AND p.pronargs = 8
            )
            """, conn);

        return (bool)(await cmd.ExecuteScalarAsync(ct) ?? false);
    }

    public static async Task<bool> IsSaveEmployeeProcInstalledAsync(TmsDbContext db, CancellationToken ct = default)
    {
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync(ct);

        await using var cmd = new NpgsqlCommand("""
            SELECT EXISTS (
                SELECT 1 FROM pg_proc p
                JOIN pg_namespace n ON n.oid = p.pronamespace
                WHERE n.nspname = 'public'
                  AND p.proname = 'sp_hr_save_employee'
                  AND p.pronargs = 39
            )
            """, conn);

        return (bool)(await cmd.ExecuteScalarAsync(ct) ?? false);
    }
}
