using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tms.Api.Data;

namespace Tms.Api.Services;

public static class MaintenanceSchemaMigrator
{
    static readonly string[] SchemaStatements =
    [
        "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS odometer INT NOT NULL DEFAULT 0",
        "ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS record_type VARCHAR(30) DEFAULT 'SCHEDULED'",
        "ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS description TEXT",
        "ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS odometer INT",
        "ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS next_due_at TIMESTAMPTZ",
        "ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS performed_at TIMESTAMPTZ",
        """
        UPDATE maintenance_records
        SET description = COALESCE(description, type),
            record_type = COALESCE(record_type, 'SCHEDULED'),
            performed_at = COALESCE(performed_at, record_date::timestamptz)
        WHERE description IS NULL OR performed_at IS NULL
        """,
        """
        CREATE TABLE IF NOT EXISTS maintenance_schedules (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            vehicle_id      VARCHAR(20) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
            service_type    VARCHAR(100) NOT NULL,
            interval_km     INT,
            interval_days   INT,
            last_service_at TIMESTAMPTZ,
            next_due_at     TIMESTAMPTZ,
            is_active       BOOLEAN NOT NULL DEFAULT true,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_maint_schedules_vehicle ON maintenance_schedules(vehicle_id)",
        "CREATE INDEX IF NOT EXISTS idx_maint_schedules_due ON maintenance_schedules(next_due_at) WHERE is_active = true",
        """
        CREATE TABLE IF NOT EXISTS spare_parts (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sku         VARCHAR(50) NOT NULL UNIQUE,
            name        VARCHAR(200) NOT NULL,
            unit_cost   DECIMAL(12,2) NOT NULL DEFAULT 0,
            stock_qty   INT NOT NULL DEFAULT 0,
            min_stock   INT NOT NULL DEFAULT 5,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_spare_parts_sku ON spare_parts(sku)",
        "ALTER TABLE spare_parts ADD COLUMN IF NOT EXISTS company_id UUID",
        """
        UPDATE spare_parts
        SET company_id = '00000000-0000-4000-8000-000000000001'
        WHERE company_id IS NULL
        """,
        "ALTER TABLE maintenance_schedules ADD COLUMN IF NOT EXISTS company_id UUID",
        "ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS company_id UUID",
        "ALTER TABLE maintenance_work_orders ADD COLUMN IF NOT EXISTS company_id UUID",
        "ALTER TABLE maintenance_prediction_snapshots ADD COLUMN IF NOT EXISTS company_id UUID",
    ];

    public static async Task EnsureAsync(TmsDbContext db, CancellationToken ct = default)
    {
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync(ct);

        foreach (var sql in SchemaStatements)
        {
            await using var cmd = new NpgsqlCommand(sql, conn);
            await cmd.ExecuteNonQueryAsync(ct);
        }

        await ApplyPhase4Async(conn, ct);
    }

    static async Task ApplyPhase4Async(NpgsqlConnection conn, CancellationToken ct)
    {
        foreach (var path in Phase4PathCandidates())
        {
            if (!File.Exists(path)) continue;
            var text = await File.ReadAllTextAsync(path, ct);
            foreach (var stmt in ParseSqlStatements(text))
            {
                await using var cmd = new NpgsqlCommand(stmt, conn);
                await cmd.ExecuteNonQueryAsync(ct);
            }
            return;
        }
    }

    static IEnumerable<string> Phase4PathCandidates()
    {
        yield return Path.Combine(AppContext.BaseDirectory, "database", "maintenance", "phase4.sql");
        yield return Path.Combine(Directory.GetCurrentDirectory(), "database", "maintenance", "phase4.sql");
        yield return Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "database", "maintenance", "phase4.sql"));
    }

    static IEnumerable<string> ParseSqlStatements(string text)
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
    }
}
