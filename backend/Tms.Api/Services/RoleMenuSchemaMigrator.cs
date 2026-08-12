using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;

namespace Tms.Api.Services;

public static class RoleMenuSchemaMigrator
{
    public static async Task EnsureAsync(TmsDbContext db, CancellationToken ct = default)
    {
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS role_menu_permissions (
                id uuid PRIMARY KEY,
                company_id uuid NOT NULL,
                role text NOT NULL,
                menu_key text NOT NULL,
                is_visible boolean NOT NULL DEFAULT true,
                updated_at timestamptz NOT NULL DEFAULT NOW()
            );
            """, ct);

        await db.Database.ExecuteSqlRawAsync("""
            CREATE UNIQUE INDEX IF NOT EXISTS ux_role_menu_permissions_company_role_key
                ON role_menu_permissions (company_id, role, menu_key);
            """, ct);

        await db.Database.ExecuteSqlRawAsync("""
            CREATE INDEX IF NOT EXISTS ix_role_menu_permissions_company_role
                ON role_menu_permissions (company_id, role);
            """, ct);
    }
}
