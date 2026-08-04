using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tms.Api.Data;

namespace Tms.Api.Services;

/// <summary>Shared helpers for idempotent SQL schema scripts during API startup.</summary>
public static class SchemaMigrationHelper
{
    /// <summary>Large-table ALTER/CREATE INDEX can exceed Npgsql's 30s default on perf datasets.</summary>
    public const int CommandTimeoutSeconds = 600;

    public static async Task ExecuteNonQueryAsync(
        NpgsqlConnection conn, string sql, CancellationToken ct = default, int? commandTimeoutSeconds = null)
    {
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.CommandTimeout = commandTimeoutSeconds ?? CommandTimeoutSeconds;
        await cmd.ExecuteNonQueryAsync(ct);
    }

    public static async Task ExecuteStatementsAsync(
        NpgsqlConnection conn, IEnumerable<string> statements, CancellationToken ct = default, int? commandTimeoutSeconds = null)
    {
        foreach (var stmt in statements)
            await ExecuteNonQueryAsync(conn, stmt, ct, commandTimeoutSeconds);
    }

    public static async Task<bool> TableExistsAsync(NpgsqlConnection conn, string table, CancellationToken ct = default)
    {
        await using var cmd = new NpgsqlCommand(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = @t)",
            conn);
        cmd.CommandTimeout = CommandTimeoutSeconds;
        cmd.Parameters.AddWithValue("t", table);
        return (bool)(await cmd.ExecuteScalarAsync(ct) ?? false);
    }

    public static async Task<bool> ColumnExistsAsync(
        NpgsqlConnection conn, string table, string column, CancellationToken ct = default)
    {
        await using var cmd = new NpgsqlCommand(
            """
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = @t AND column_name = @c
            )
            """,
            conn);
        cmd.CommandTimeout = CommandTimeoutSeconds;
        cmd.Parameters.AddWithValue("t", table);
        cmd.Parameters.AddWithValue("c", column);
        return (bool)(await cmd.ExecuteScalarAsync(ct) ?? false);
    }

    public static async Task<bool> IndexExistsAsync(NpgsqlConnection conn, string indexName, CancellationToken ct = default)
    {
        await using var cmd = new NpgsqlCommand(
            "SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = @i)",
            conn);
        cmd.CommandTimeout = CommandTimeoutSeconds;
        cmd.Parameters.AddWithValue("i", indexName);
        return (bool)(await cmd.ExecuteScalarAsync(ct) ?? false);
    }

    /// <summary>
    /// Legacy installs may have CREATE TABLE IF NOT EXISTS tables without PK/UNIQUE needed for ON CONFLICT.
    /// Dedupes conflicting rows, then creates the named unique index when missing.
    /// </summary>
    public static async Task EnsureUniqueIndexAsync(
        NpgsqlConnection conn,
        string indexName,
        string table,
        IReadOnlyList<string> columns,
        string dedupeSql,
        CancellationToken ct = default)
    {
        if (await IndexExistsAsync(conn, indexName, ct)) return;
        await ExecuteNonQueryAsync(conn, dedupeSql, ct);
        var cols = string.Join(", ", columns);
        await ExecuteNonQueryAsync(conn, $"CREATE UNIQUE INDEX {indexName} ON {table} ({cols})", ct);
    }

    /// <summary>Branch DDL is safe to skip once core objects exist — avoids ACCESS EXCLUSIVE ALTER on 500k-row tables.</summary>
    public static async Task<bool> IsBranchSchemaAppliedAsync(NpgsqlConnection conn, CancellationToken ct = default)
    {
        if (!await TableExistsAsync(conn, "branches", ct)) return false;
        if (!await BranchesPrimaryKeyExistsAsync(conn, ct)) return false;
        if (!await ColumnExistsAsync(conn, "vehicles", "branch_id", ct)) return false;
        if (!await ColumnExistsAsync(conn, "bookings", "branch_id", ct)) return false;
        return await IndexExistsAsync(conn, "idx_vehicles_branch", ct)
            && await IndexExistsAsync(conn, "idx_bookings_branch", ct);
    }

    /// <summary>
    /// Legacy installs may have branches without PRIMARY KEY on id, which blocks REFERENCES branches(id).
    /// </summary>
    public static async Task EnsureBranchesPrimaryKeyAsync(NpgsqlConnection conn, CancellationToken ct = default)
    {
        if (!await TableExistsAsync(conn, "branches", ct)) return;

        await ExecuteNonQueryAsync(conn, """
            ALTER TABLE branches ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid()
            """, ct);
        await ExecuteNonQueryAsync(conn, """
            UPDATE branches SET id = gen_random_uuid() WHERE id IS NULL
            """, ct);
        await ExecuteNonQueryAsync(conn, """
            WITH ranked AS (
                SELECT ctid, ROW_NUMBER() OVER (PARTITION BY id ORDER BY ctid) AS rn
                FROM branches
            )
            UPDATE branches b SET id = gen_random_uuid()
            FROM ranked r
            WHERE b.ctid = r.ctid AND r.rn > 1
            """, ct);

        if (await BranchesPrimaryKeyExistsAsync(conn, ct)) return;

        await ExecuteNonQueryAsync(conn, """
            ALTER TABLE branches ADD CONSTRAINT branches_pkey PRIMARY KEY (id)
            """, ct);
    }

    public static async Task EnsureUsersProfileColumnsAsync(NpgsqlConnection conn, CancellationToken ct = default)
    {
        if (!await TableExistsAsync(conn, "users", ct)) return;

        await ExecuteNonQueryAsync(conn, """
            ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(200)
            """, ct);
        await ExecuteNonQueryAsync(conn, """
            ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile VARCHAR(40)
            """, ct);
        await ExecuteNonQueryAsync(conn, """
            ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_id UUID
            """, ct);
        await ExecuteNonQueryAsync(conn, """
            ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id UUID
            """, ct);
    }

    /// <summary>Minimum schema required before EF seeder / login can run.</summary>
    public static async Task EnsureCriticalSchemaAsync(TmsDbContext db, CancellationToken ct = default)
    {
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync(ct);

        await EnsureBranchesPrimaryKeyAsync(conn, ct);
        await EnsureUsersProfileColumnsAsync(conn, ct);
    }

    static async Task<bool> BranchesPrimaryKeyExistsAsync(NpgsqlConnection conn, CancellationToken ct)
    {
        await using var cmd = new NpgsqlCommand(
            """
            SELECT EXISTS (
                SELECT 1 FROM pg_constraint c
                JOIN pg_class t ON c.conrelid = t.oid
                JOIN pg_namespace n ON t.relnamespace = n.oid
                WHERE n.nspname = 'public' AND t.relname = 'branches' AND c.contype = 'p'
            )
            """,
            conn);
        cmd.CommandTimeout = CommandTimeoutSeconds;
        return (bool)(await cmd.ExecuteScalarAsync(ct) ?? false);
    }

    /// <summary>
    /// SaaS tenant scripts (schema.sql + tenant_modules.sql) re-scan large tables on every run.
    /// Uses markers from core tables only — optional module tables (warehouses, geofences) may not exist.
    /// </summary>
    public static async Task<bool> IsTenantSchemaAppliedAsync(NpgsqlConnection conn, CancellationToken ct = default)
    {
        return await TableExistsAsync(conn, "companies", ct)
            && await ColumnExistsAsync(conn, "bookings", "company_id", ct)
            && await IndexExistsAsync(conn, "idx_bookings_company", ct)
            && await TableExistsAsync(conn, "accounting_report_jobs", ct);
    }
}
