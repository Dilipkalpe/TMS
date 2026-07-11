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
