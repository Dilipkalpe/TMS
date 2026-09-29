using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tms.Api.Data;

namespace Tms.Api.Services;

public static class GpsSchemaMigrator
{
    public static async Task EnsureAsync(TmsDbContext db, CancellationToken ct = default)
    {
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync(ct);

        var text = await LoadSchemaSqlAsync(ct);
        await UpgradeLegacyColumnsAsync(conn, ct);
        foreach (var stmt in ParseSql(text))
        {
            await using var cmd = new NpgsqlCommand(stmt, conn);
            await cmd.ExecuteNonQueryAsync(ct);
        }

        await EnsureVehicleLastPositionKeyAsync(conn, ct);
        await BackfillLastPositionsAsync(conn, ct);
        await EnsureDriverPortalSchemaAsync(conn, ct);
    }

    /// <summary>
    /// Ensures drivers.portal_* columns + driver_trip_sessions (safe when RunStartupMigrations=false).
    /// </summary>
    public static async Task EnsureDriverPortalAsync(TmsDbContext db, CancellationToken ct = default)
    {
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync(ct);
        await EnsureDriverPortalSchemaAsync(conn, ct);
    }

    static async Task EnsureDriverPortalSchemaAsync(NpgsqlConnection conn, CancellationToken ct)
    {
        // Always ensure driver portal columns first (required for API + seeder even when GPS module is partial)
        await EnsureColumnAsync(conn, "drivers", "portal_enabled", "portal_enabled BOOLEAN NOT NULL DEFAULT false", ct);
        await EnsureColumnAsync(conn, "drivers", "portal_pin_hash", "portal_pin_hash VARCHAR(200)", ct);
        await EnsureColumnAsync(conn, "drivers", "portal_phone", "portal_phone VARCHAR(30)", ct);

        foreach (var p in DriverPortalSchemaPathCandidates())
        {
            if (!File.Exists(p)) continue;
            var text = await File.ReadAllTextAsync(p, ct);
            foreach (var stmt in ParseSql(text))
            {
                try
                {
                    await using var cmd = new NpgsqlCommand(stmt, conn);
                    await cmd.ExecuteNonQueryAsync(ct);
                }
                catch (PostgresException)
                {
                    // Ignore statements that depend on optional GPS tables not yet installed
                }
            }
            break;
        }

        try
        {
            await EnsureColumnAsync(conn, "vehicle_last_position", "driver_id", "driver_id VARCHAR(20)", ct);
            await EnsureColumnAsync(conn, "vehicle_last_position", "loading_slip_id", "loading_slip_id UUID", ct);
            await EnsureColumnAsync(conn, "vehicle_last_position", "tracking_status", "tracking_status VARCHAR(30) NOT NULL DEFAULT 'STOPPED'", ct);
            await EnsureColumnAsync(conn, "vehicle_last_position", "accuracy_meters", "accuracy_meters DECIMAL(8,2)", ct);
            await EnsureColumnAsync(conn, "vehicle_last_position", "location_label", "location_label VARCHAR(300)", ct);
            await EnsureColumnAsync(conn, "vehicle_last_position", "geocoded_lat", "geocoded_lat DECIMAL(10,7)", ct);
            await EnsureColumnAsync(conn, "vehicle_last_position", "geocoded_lng", "geocoded_lng DECIMAL(10,7)", ct);
            await EnsureColumnAsync(conn, "gps_tracks", "driver_id", "driver_id VARCHAR(20)", ct);
            await EnsureColumnAsync(conn, "gps_tracks", "loading_slip_id", "loading_slip_id UUID", ct);
        }
        catch (PostgresException)
        {
            // vehicle_last_position / gps_tracks may not exist until GPS install
        }

        await using (var cmd = new NpgsqlCommand("""
            CREATE TABLE IF NOT EXISTS driver_trip_sessions (
                id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                company_id          UUID NOT NULL,
                driver_id           VARCHAR(20) NOT NULL,
                vehicle_id          VARCHAR(20) NOT NULL,
                loading_slip_id     UUID,
                lr_number           VARCHAR(50) NOT NULL,
                loading_slip_number VARCHAR(50),
                trip_no             VARCHAR(50),
                customer_name       VARCHAR(200),
                source              VARCHAR(200),
                destination         VARCHAR(200),
                status              VARCHAR(40) NOT NULL DEFAULT 'ASSIGNED',
                tracking_active     BOOLEAN NOT NULL DEFAULT false,
                started_at          TIMESTAMPTZ,
                completed_at        TIMESTAMPTZ,
                created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            """, conn))
        {
            await cmd.ExecuteNonQueryAsync(ct);
        }

        await using (var cmd = new NpgsqlCommand("""
            CREATE TABLE IF NOT EXISTS driver_trip_status_history (
                id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                session_id      UUID NOT NULL REFERENCES driver_trip_sessions(id) ON DELETE CASCADE,
                company_id      UUID NOT NULL,
                old_status      VARCHAR(40),
                new_status      VARCHAR(40) NOT NULL,
                changed_by      VARCHAR(100),
                changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                notes           TEXT
            );
            """, conn))
        {
            await cmd.ExecuteNonQueryAsync(ct);
        }
    }

    static IEnumerable<string> DriverPortalSchemaPathCandidates()
    {
        yield return Path.Combine(AppContext.BaseDirectory, "database", "gps", "driver_portal.sql");
        yield return Path.Combine(Directory.GetCurrentDirectory(), "database", "gps", "driver_portal.sql");
        yield return Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "database", "gps", "driver_portal.sql"));
        yield return Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "database", "gps", "driver_portal.sql"));
    }

    static async Task EnsureColumnAsync(NpgsqlConnection conn, string table, string column, string ddl, CancellationToken ct)
    {
        const string check = """
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = @table AND column_name = @column
            """;
        await using (var checkCmd = new NpgsqlCommand(check, conn))
        {
            checkCmd.Parameters.AddWithValue("table", table);
            checkCmd.Parameters.AddWithValue("column", column);
            if (await checkCmd.ExecuteScalarAsync(ct) != null) return;
        }
        await using var alter = new NpgsqlCommand($"ALTER TABLE {table} ADD COLUMN {ddl}", conn);
        await alter.ExecuteNonQueryAsync(ct);
    }

    internal static async Task UpgradeLegacyColumnsAsync(NpgsqlConnection conn, CancellationToken ct)
    {
        await EnsureColumnAsync(conn, "vehicle_last_position", "recorded_at", "recorded_at TIMESTAMPTZ DEFAULT NOW()", ct);
        await EnsureColumnAsync(conn, "vehicle_last_position", "updated_at", "updated_at TIMESTAMPTZ DEFAULT NOW()", ct);
        await EnsureColumnAsync(conn, "geofence_events", "recorded_at", "recorded_at TIMESTAMPTZ DEFAULT NOW()", ct);
        await EnsureColumnAsync(conn, "geofence_events", "created_at", "created_at TIMESTAMPTZ DEFAULT NOW()", ct);
    }

    static async Task<string> LoadSchemaSqlAsync(CancellationToken ct)
    {
        foreach (var p in SchemaPathCandidates())
        {
            if (File.Exists(p))
                return await File.ReadAllTextAsync(p, ct);
        }
        throw new FileNotFoundException("database/gps/schema.sql not found");
    }

    static IEnumerable<string> SchemaPathCandidates()
    {
        yield return Path.Combine(AppContext.BaseDirectory, "database", "gps", "schema.sql");
        yield return Path.Combine(Directory.GetCurrentDirectory(), "database", "gps", "schema.sql");
        yield return Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "database", "gps", "schema.sql"));
        yield return Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "database", "gps", "schema.sql"));
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
        if (buf.Length > 0)
        {
            var s = buf.ToString().Trim();
            if (s.Length > 0) yield return s;
        }
    }

    static async Task EnsureVehicleLastPositionKeyAsync(NpgsqlConnection conn, CancellationToken ct)
    {
        if (!await SchemaMigrationHelper.TableExistsAsync(conn, "vehicle_last_position", ct)) return;

        await SchemaMigrationHelper.EnsureUniqueIndexAsync(
            conn,
            "idx_vehicle_last_position_vehicle_id",
            "vehicle_last_position",
            ["vehicle_id"],
            """
            DELETE FROM vehicle_last_position a
            USING vehicle_last_position b
            WHERE a.vehicle_id = b.vehicle_id AND a.ctid < b.ctid
            """,
            ct);
    }

    static async Task BackfillLastPositionsAsync(NpgsqlConnection conn, CancellationToken ct)
    {
        const string sql = """
            INSERT INTO vehicle_last_position (vehicle_id, lat, lng, speed_kmh, heading, source, recorded_at, updated_at)
            SELECT DISTINCT ON (t.vehicle_id)
                t.vehicle_id, t.lat, t.lng, t.speed_kmh, t.heading, COALESCE(t.source, 'DEVICE'), t.recorded_at, NOW()
            FROM gps_tracks t
            ORDER BY t.vehicle_id, t.recorded_at DESC
            ON CONFLICT (vehicle_id) DO NOTHING
            """;
        await using var cmd = new NpgsqlCommand(sql, conn);
        await cmd.ExecuteNonQueryAsync(ct);
    }
}
