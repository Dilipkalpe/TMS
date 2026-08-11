using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
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

    /// <summary>Splits SQL on semicolons outside quotes and dollar-quoted blocks (DO $$ … $$).</summary>
    public static IEnumerable<string> ParseSqlStatements(string text)
    {
        var current = new System.Text.StringBuilder();
        var inSingle = false;
        var inDouble = false;
        string? dollarTag = null;

        for (var i = 0; i < text.Length; i++)
        {
            var c = text[i];

            if (dollarTag != null)
            {
                if (c == '$' && text.AsSpan(i).StartsWith($"${dollarTag}$"))
                {
                    current.Append('$').Append(dollarTag).Append('$');
                    i += dollarTag.Length + 1;
                    dollarTag = null;
                    continue;
                }
                current.Append(c);
                continue;
            }

            if (!inSingle && !inDouble && c == '$')
            {
                var j = i + 1;
                while (j < text.Length && (char.IsLetterOrDigit(text[j]) || text[j] == '_')) j++;
                if (j < text.Length && text[j] == '$')
                {
                    dollarTag = text.Substring(i + 1, j - i - 1);
                    current.Append('$').Append(dollarTag).Append('$');
                    i = j;
                    continue;
                }
            }

            if (c == '\'' && !inDouble)
            {
                current.Append(c);
                if (inSingle && i + 1 < text.Length && text[i + 1] == '\'')
                {
                    current.Append('\'');
                    i++;
                }
                else inSingle = !inSingle;
                continue;
            }

            if (c == '"' && !inSingle)
            {
                current.Append(c);
                inDouble = !inDouble;
                continue;
            }

            if (c == ';' && !inSingle && !inDouble)
            {
                var stmt = current.ToString().Trim();
                if (stmt.Length > 0 && !IsCommentOnly(stmt))
                    yield return stmt;
                current.Clear();
                continue;
            }

            current.Append(c);
        }

        var tail = current.ToString().Trim();
        if (tail.Length > 0 && !IsCommentOnly(tail))
            yield return tail;
    }

    static bool IsCommentOnly(string stmt)
    {
        foreach (var line in stmt.Split('\n'))
        {
            var t = line.Trim();
            if (t.Length > 0 && !t.StartsWith("--"))
                return false;
        }
        return true;
    }

    /// <summary>Legacy DBs may lack PRIMARY KEY / UNIQUE on lorry_receipts.lr_number (blocks FK from lr_status_history).</summary>
    public static async Task EnsureLorryReceiptsLrNumberKeyAsync(NpgsqlConnection conn, CancellationToken ct = default)
    {
        if (!await TableExistsAsync(conn, "lorry_receipts", ct)) return;
        if (await LorryReceiptsLrNumberKeyExistsAsync(conn, ct)) return;

        await ExecuteNonQueryAsync(conn, """
            DELETE FROM lorry_receipts a
            USING lorry_receipts b
            WHERE a.lr_number = b.lr_number AND a.ctid > b.ctid
            """, ct);

        if (await LorryReceiptsPrimaryKeyIsLrNumberAsync(conn, ct))
            return;

        try
        {
            await ExecuteNonQueryAsync(conn, """
                ALTER TABLE lorry_receipts ADD PRIMARY KEY (lr_number)
                """, ct);
        }
        catch (PostgresException ex) when (ex.SqlState is "42P16" or "23505")
        {
            // Multiple PK candidates or duplicate lr_number — fall back to unique index for FK targets.
        }

        if (!await LorryReceiptsLrNumberKeyExistsAsync(conn, ct))
        {
            await ExecuteNonQueryAsync(conn, """
                CREATE UNIQUE INDEX IF NOT EXISTS lorry_receipts_lr_number_key ON lorry_receipts (lr_number)
                """, ct);
        }
    }

    static async Task<bool> LorryReceiptsLrNumberKeyExistsAsync(NpgsqlConnection conn, CancellationToken ct)
    {
        await using var cmd = new NpgsqlCommand(
            """
            SELECT EXISTS (
                SELECT 1 FROM pg_constraint c
                JOIN pg_class t ON c.conrelid = t.oid
                JOIN pg_namespace n ON t.relnamespace = n.oid
                JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (c.conkey)
                WHERE n.nspname = 'public' AND t.relname = 'lorry_receipts'
                  AND c.contype IN ('p', 'u') AND a.attname = 'lr_number'
            )
            OR EXISTS (
                SELECT 1 FROM pg_indexes
                WHERE schemaname = 'public' AND tablename = 'lorry_receipts'
                  AND indexdef ILIKE '%UNIQUE%' AND indexdef ILIKE '%lr_number%'
            )
            """,
            conn);
        cmd.CommandTimeout = CommandTimeoutSeconds;
        return (bool)(await cmd.ExecuteScalarAsync(ct) ?? false);
    }

    static async Task<bool> LorryReceiptsPrimaryKeyIsLrNumberAsync(NpgsqlConnection conn, CancellationToken ct)
    {
        await using var cmd = new NpgsqlCommand(
            """
            SELECT EXISTS (
                SELECT 1 FROM pg_constraint c
                JOIN pg_class t ON c.conrelid = t.oid
                JOIN pg_namespace n ON t.relnamespace = n.oid
                JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (c.conkey)
                WHERE n.nspname = 'public' AND t.relname = 'lorry_receipts'
                  AND c.contype = 'p' AND a.attname = 'lr_number'
            )
            """,
            conn);
        cmd.CommandTimeout = CommandTimeoutSeconds;
        return (bool)(await cmd.ExecuteScalarAsync(ct) ?? false);
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

    public static async Task EnsureUsersPrimaryKeyAsync(NpgsqlConnection conn, CancellationToken ct = default)
    {
        if (!await TableExistsAsync(conn, "users", ct)) return;

        await ExecuteNonQueryAsync(conn, """
            ALTER TABLE users ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid()
            """, ct);
        await ExecuteNonQueryAsync(conn, """
            UPDATE users SET id = gen_random_uuid() WHERE id IS NULL
            """, ct);
        await ExecuteNonQueryAsync(conn, """
            WITH ranked AS (
                SELECT ctid, ROW_NUMBER() OVER (PARTITION BY id ORDER BY ctid) AS rn
                FROM users
            )
            UPDATE users u SET id = gen_random_uuid()
            FROM ranked r
            WHERE u.ctid = r.ctid AND r.rn > 1
            """, ct);

        if (await UsersPrimaryKeyExistsAsync(conn, ct)) return;

        await ExecuteNonQueryAsync(conn, """
            ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (id)
            """, ct);
    }

    public static async Task EnsureUserBranchesTableAsync(NpgsqlConnection conn, CancellationToken ct = default)
    {
        if (!await TableExistsAsync(conn, "users", ct)) return;
        if (!await TableExistsAsync(conn, "branches", ct)) return;
        if (!await UsersPrimaryKeyExistsAsync(conn, ct)) return;
        if (!await BranchesPrimaryKeyExistsAsync(conn, ct)) return;
        if (await TableExistsAsync(conn, "user_branches", ct)) return;

        await ExecuteNonQueryAsync(conn, """
            CREATE TABLE user_branches (
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
                company_id UUID NOT NULL,
                PRIMARY KEY (user_id, branch_id)
            )
            """, ct);
        await ExecuteNonQueryAsync(conn, """
            CREATE INDEX IF NOT EXISTS ix_user_branches_company ON user_branches(company_id)
            """, ct);
        await ExecuteNonQueryAsync(conn, """
            CREATE INDEX IF NOT EXISTS ix_user_branches_branch ON user_branches(branch_id)
            """, ct);
        await ExecuteNonQueryAsync(conn, """
            INSERT INTO user_branches (user_id, branch_id, company_id)
            SELECT u.id, u.branch_id, u.company_id
            FROM users u
            WHERE u.branch_id IS NOT NULL
              AND u.company_id IS NOT NULL
            ON CONFLICT DO NOTHING
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

    public static async Task EnsureBranchAuditColumnsAsync(NpgsqlConnection conn, CancellationToken ct = default)
    {
        if (!await TableExistsAsync(conn, "branches", ct)) return;

        await ExecuteNonQueryAsync(conn, """
            ALTER TABLE branches ADD COLUMN IF NOT EXISTS created_by VARCHAR(200)
            """, ct);
        await ExecuteNonQueryAsync(conn, """
            ALTER TABLE branches ADD COLUMN IF NOT EXISTS updated_by VARCHAR(200)
            """, ct);
    }

    /// <summary>Minimum schema required before EF seeder / login can run.</summary>
    public static async Task EnsureCriticalSchemaAsync(
        TmsDbContext db, ILogger? logger = null, CancellationToken ct = default)
    {
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync(ct);

        logger?.LogInformation("Critical schema: branches primary key…");
        await EnsureBranchesPrimaryKeyAsync(conn, ct);

        logger?.LogInformation("Critical schema: branch audit columns…");
        await EnsureBranchAuditColumnsAsync(conn, ct);

        logger?.LogInformation("Critical schema: users primary key…");
        await EnsureUsersPrimaryKeyAsync(conn, ct);

        logger?.LogInformation("Critical schema: users profile columns…");
        await EnsureUsersProfileColumnsAsync(conn, ct);

        logger?.LogInformation("Critical schema: user_branches table…");
        await EnsureUserBranchesTableAsync(conn, ct);

        logger?.LogInformation("Critical schema: audit columns (ADD only, no backfill)…");
        await AuditSchemaMigrator.EnsureAsync(db, AuditMigrationMode.ColumnsOnly, ct);

        logger?.LogInformation("Critical schema: company_settings.document_flow…");
        await EnsureCompanySettingsDocumentFlowAsync(conn, ct);
    }

    /// <summary>LR ↔ Booking workflow preference; required by DocumentFlowService queries.</summary>
    public static async Task EnsureCompanySettingsDocumentFlowAsync(NpgsqlConnection conn, CancellationToken ct = default)
    {
        if (!await TableExistsAsync(conn, "company_settings", ct)) return;

        if (!await ColumnExistsAsync(conn, "company_settings", "document_flow", ct))
        {
            await ExecuteNonQueryAsync(conn, """
                ALTER TABLE company_settings
                ADD COLUMN document_flow VARCHAR(40) NOT NULL DEFAULT 'FirstBookingThenLR'
                """, ct);
        }

        await ExecuteNonQueryAsync(conn, """
            UPDATE company_settings
            SET document_flow = 'FirstBookingThenLR'
            WHERE document_flow IS NULL OR TRIM(document_flow) = ''
            """, ct);
    }

    static async Task<bool> UsersPrimaryKeyExistsAsync(NpgsqlConnection conn, CancellationToken ct)
    {
        await using var cmd = new NpgsqlCommand(
            """
            SELECT EXISTS (
                SELECT 1 FROM pg_constraint c
                JOIN pg_class t ON c.conrelid = t.oid
                JOIN pg_namespace n ON t.relnamespace = n.oid
                WHERE n.nspname = 'public' AND t.relname = 'users' AND c.contype = 'p'
            )
            """,
            conn);
        cmd.CommandTimeout = CommandTimeoutSeconds;
        return (bool)(await cmd.ExecuteScalarAsync(ct) ?? false);
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
