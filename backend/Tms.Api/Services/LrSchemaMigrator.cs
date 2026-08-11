using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;
using Tms.Api.Data;

namespace Tms.Api.Services;

public static class LrSchemaMigrator
{
    public static async Task EnsureAsync(TmsDbContext db, ILogger? logger = null, CancellationToken ct = default)
    {
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync(ct);

        await SchemaMigrationHelper.EnsureLorryReceiptsLrNumberKeyAsync(conn, ct);

        // Base tables first — column ensures need lr_loading_sheets / lr_expenses etc. to exist.
        await RunSqlFileAsync(conn, "schema.sql", logger, ct);
        await EnsureLrProcessColumnsAsync(conn, logger, ct);
        await EnsureLrLoadingSheetItemsTableAsync(conn, ct);

        foreach (var file in new[]
        {
            "module_extensions.sql",
            "phase2_extended_data.sql",
            "business_type.sql",
            "consignor_consignee.sql",
            "items.sql",
            "status_history.sql",
        })
        {
            await RunSqlFileAsync(conn, file, logger, ct);
        }

        // Re-run after SQL scripts so columns are present even when scripts partially fail.
        await EnsureLrProcessColumnsAsync(conn, logger, ct);
    }

    static async Task RunSqlFileAsync(NpgsqlConnection conn, string fileName, ILogger? logger, CancellationToken ct)
    {
        var text = await LoadSchemaSqlAsync(fileName, ct);
        foreach (var stmt in SchemaMigrationHelper.ParseSqlStatements(text))
        {
            try
            {
                await SchemaMigrationHelper.ExecuteNonQueryAsync(conn, stmt, ct);
            }
            catch (PostgresException ex) when (ex.SqlState is "42P01" or "42P07")
            {
                logger?.LogDebug(ex, "LR schema statement skipped ({SqlState}): {Message}", ex.SqlState, ex.MessageText);
            }
            catch (PostgresException ex) when (ex.SqlState == "42703")
            {
                logger?.LogWarning(ex, "LR schema statement skipped (missing column): {Message}", ex.MessageText);
            }
        }
    }

    /// <summary>Every column mapped by EF on LR process entities — safe to re-run.</summary>
    static async Task EnsureLrProcessColumnsAsync(NpgsqlConnection conn, ILogger? logger, CancellationToken ct)
    {
        (string Table, string Column, string Type)[] columns =
        [
            // lr_loading_sheets
            ("lr_loading_sheets", "business_type", "VARCHAR(10) NOT NULL DEFAULT 'FTL'"),
            ("lr_loading_sheets", "vehicle_id", "VARCHAR(50)"),
            ("lr_loading_sheets", "total_quantity", "DECIMAL(12,3)"),
            ("lr_loading_sheets", "capacity_limit", "DECIMAL(12,3)"),
            ("lr_loading_sheets", "capacity_used", "DECIMAL(12,3)"),
            ("lr_loading_sheets", "loader_name", "VARCHAR(100)"),
            ("lr_loading_sheets", "supervisor_name", "VARCHAR(100)"),
            ("lr_loading_sheets", "seal_number", "VARCHAR(50)"),
            ("lr_loading_sheets", "trip_no", "VARCHAR(30)"),
            ("lr_loading_sheets", "extended_data", "JSONB NOT NULL DEFAULT '{}'::jsonb"),

            // lr_transit_passes
            ("lr_transit_passes", "loading_sheet_id", "UUID"),
            ("lr_transit_passes", "seal_number", "VARCHAR(50)"),
            ("lr_transit_passes", "seal_condition", "VARCHAR(30)"),
            ("lr_transit_passes", "transit_type", "VARCHAR(30) DEFAULT 'By Road'"),
            ("lr_transit_passes", "trip_no", "VARCHAR(30)"),
            ("lr_transit_passes", "expected_delivery", "DATE"),
            ("lr_transit_passes", "updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("lr_transit_passes", "extended_data", "JSONB NOT NULL DEFAULT '{}'::jsonb"),

            // lr_delivery_sheets
            ("lr_delivery_sheets", "loading_sheet_id", "UUID"),
            ("lr_delivery_sheets", "trip_no", "VARCHAR(30)"),
            ("lr_delivery_sheets", "delivery_time", "TIME"),
            ("lr_delivery_sheets", "packages_total", "INT"),
            ("lr_delivery_sheets", "packages_received", "INT"),
            ("lr_delivery_sheets", "packages_damaged", "INT"),
            ("lr_delivery_sheets", "actual_weight", "DECIMAL(12,3)"),
            ("lr_delivery_sheets", "charged_weight", "DECIMAL(12,3)"),
            ("lr_delivery_sheets", "condition", "VARCHAR(30) DEFAULT 'Good'"),
            ("lr_delivery_sheets", "receiver_designation", "VARCHAR(100)"),
            ("lr_delivery_sheets", "receiver_mobile", "VARCHAR(20)"),
            ("lr_delivery_sheets", "pod_no", "VARCHAR(30)"),
            ("lr_delivery_sheets", "delivery_note_no", "VARCHAR(30)"),
            ("lr_delivery_sheets", "extended_data", "JSONB NOT NULL DEFAULT '{}'::jsonb"),

            // lr_expenses
            ("lr_expenses", "trip_no", "VARCHAR(30)"),
            ("lr_expenses", "bill_no", "VARCHAR(50)"),
            ("lr_expenses", "payment_mode", "VARCHAR(30)"),
            ("lr_expenses", "advance_taken", "DECIMAL(12,2) DEFAULT 0"),
            ("lr_expenses", "reimbursed", "DECIMAL(12,2) DEFAULT 0"),
            ("lr_expenses", "updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
            ("lr_expenses", "extended_data", "JSONB NOT NULL DEFAULT '{}'::jsonb"),
        ];

        foreach (var (table, column, type) in columns)
            await EnsureColumnAsync(conn, table, column, type, logger, ct);
    }

    static async Task EnsureColumnAsync(
        NpgsqlConnection conn,
        string table,
        string column,
        string typeDef,
        ILogger? logger,
        CancellationToken ct)
    {
        if (!await SchemaMigrationHelper.TableExistsAsync(conn, table, ct)) return;
        if (await SchemaMigrationHelper.ColumnExistsAsync(conn, table, column, ct)) return;

        await SchemaMigrationHelper.ExecuteNonQueryAsync(
            conn, $"ALTER TABLE {table} ADD COLUMN {column} {typeDef}", ct);
        logger?.LogInformation("LR schema: added {Table}.{Column}", table, column);
    }

    static async Task EnsureLrLoadingSheetItemsTableAsync(NpgsqlConnection conn, CancellationToken ct)
    {
        if (await SchemaMigrationHelper.TableExistsAsync(conn, "lr_loading_sheet_items", ct)) return;
        if (!await SchemaMigrationHelper.TableExistsAsync(conn, "lr_loading_sheets", ct)) return;

        await SchemaMigrationHelper.ExecuteNonQueryAsync(conn, """
            CREATE TABLE lr_loading_sheet_items (
                id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                loading_sheet_id    UUID NOT NULL REFERENCES lr_loading_sheets(id) ON DELETE CASCADE,
                lr_number           VARCHAR(64) NOT NULL,
                customer_id         VARCHAR(50),
                customer_name       VARCHAR(200),
                quantity_text       VARCHAR(50),
                quantity_tons       DECIMAL(12,3),
                sort_order          INT NOT NULL DEFAULT 0,
                created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """, ct);
        await SchemaMigrationHelper.ExecuteNonQueryAsync(conn,
            "CREATE INDEX IF NOT EXISTS idx_lr_loading_sheet_items_sheet ON lr_loading_sheet_items(loading_sheet_id)", ct);
    }

    static async Task<string> LoadSchemaSqlAsync(string fileName, CancellationToken ct)
    {
        foreach (var p in SchemaPathCandidates(fileName))
        {
            if (File.Exists(p))
                return await File.ReadAllTextAsync(p, ct);
        }
        throw new FileNotFoundException($"database/lr/{fileName} not found");
    }

    static IEnumerable<string> SchemaPathCandidates(string fileName)
    {
        yield return Path.Combine(AppContext.BaseDirectory, "database", "lr", fileName);
        yield return Path.Combine(Directory.GetCurrentDirectory(), "database", "lr", fileName);
        yield return Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "database", "lr", fileName));
    }
}
