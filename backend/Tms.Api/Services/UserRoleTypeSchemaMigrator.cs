using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;

namespace Tms.Api.Services;

public static class UserRoleTypeSchemaMigrator
{
    public static async Task EnsureAsync(TmsDbContext db, CancellationToken ct = default)
    {
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS user_role_types (
                id uuid PRIMARY KEY,
                company_id uuid NOT NULL,
                name text NOT NULL,
                description text NULL,
                is_system boolean NOT NULL DEFAULT false,
                is_active boolean NOT NULL DEFAULT true,
                created_at timestamptz NOT NULL DEFAULT NOW(),
                updated_at timestamptz NOT NULL DEFAULT NOW()
            );
            """, ct);

        await db.Database.ExecuteSqlRawAsync("""
            CREATE UNIQUE INDEX IF NOT EXISTS ux_user_role_types_company_name_ci
                ON user_role_types (company_id, lower(name));
            """, ct);

        await db.Database.ExecuteSqlRawAsync("""
            CREATE INDEX IF NOT EXISTS ix_user_role_types_company_active
                ON user_role_types (company_id, is_active);
            """, ct);
    }
}
