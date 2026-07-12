using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tms.Api.Data;

namespace Tms.Api.Services;

static class TenantHrPayrollInstallGuard
{
    public static async Task<bool> IsTenantProcsInstalledAsync(TmsDbContext db, CancellationToken ct = default)
    {
        return await IsTenantHrEmployeeProcsInstalledAsync(db, ct)
            && await ProcExistsAsync(db, "sp_hr_list_employees_paged", 8, ct);
    }

    public static async Task<bool> IsTenantHrEmployeeProcsInstalledAsync(TmsDbContext db, CancellationToken ct = default)
    {
        return await ProcExistsAsync(db, "sp_hr_save_employee", 39, ct)
            && await ProcExistsAsync(db, "sp_hr_get_employee", 2, ct)
            && await ProcExistsAsync(db, "sp_hr_delete_employee", 2, ct)
            && await ProcExistsAsync(db, "sp_hr_list_employees", 5, ct);
    }

    public static Task<bool> IsSaveEmployeeProcInstalledAsync(TmsDbContext db, CancellationToken ct = default)
        => ProcExistsAsync(db, "sp_hr_save_employee", 39, ct);

    static async Task<bool> ProcExistsAsync(TmsDbContext db, string name, int argCount, CancellationToken ct)
    {
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync(ct);

        await using var cmd = new NpgsqlCommand("""
            SELECT EXISTS (
                SELECT 1 FROM pg_proc p
                JOIN pg_namespace n ON n.oid = p.pronamespace
                WHERE n.nspname = 'public'
                  AND p.proname = @name
                  AND p.pronargs = @args
            )
            """, conn);
        cmd.Parameters.AddWithValue("name", name);
        cmd.Parameters.AddWithValue("args", argCount);
        return (bool)(await cmd.ExecuteScalarAsync(ct) ?? false);
    }
}
