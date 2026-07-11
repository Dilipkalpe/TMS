using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tms.Api.Data;

namespace Tms.Api.Services;

public static class NotificationSchemaMigrator
{
    public static async Task EnsureAsync(TmsDbContext db, CancellationToken ct = default)
    {
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync(ct);

        var text = await LoadSchemaSqlAsync(ct);
        foreach (var stmt in ParseSql(text))
        {
            await using var cmd = new NpgsqlCommand(stmt, conn);
            await cmd.ExecuteNonQueryAsync(ct);
        }

        await EnsureTemplateUniqueKeyAsync(conn, ct);
        await SeedTemplatesAsync(conn, ct);
    }

    static async Task<string> LoadSchemaSqlAsync(CancellationToken ct)
    {
        foreach (var p in SchemaPathCandidates())
        {
            if (File.Exists(p))
                return await File.ReadAllTextAsync(p, ct);
        }
        throw new FileNotFoundException("database/notifications/schema.sql not found");
    }

    static IEnumerable<string> SchemaPathCandidates()
    {
        yield return Path.Combine(AppContext.BaseDirectory, "database", "notifications", "schema.sql");
        yield return Path.Combine(Directory.GetCurrentDirectory(), "database", "notifications", "schema.sql");
        yield return Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "database", "notifications", "schema.sql"));
        yield return Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "database", "notifications", "schema.sql"));
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

    static async Task EnsureTemplateUniqueKeyAsync(NpgsqlConnection conn, CancellationToken ct)
    {
        if (!await SchemaMigrationHelper.TableExistsAsync(conn, "notification_templates", ct)) return;

        await SchemaMigrationHelper.EnsureUniqueIndexAsync(
            conn,
            "idx_notification_templates_code_channel_lang",
            "notification_templates",
            ["code", "channel", "language"],
            """
            DELETE FROM notification_templates a
            USING notification_templates b
            WHERE a.code = b.code AND a.channel = b.channel AND a.language = b.language AND a.ctid < b.ctid
            """,
            ct);
    }

    static async Task SeedTemplatesAsync(NpgsqlConnection conn, CancellationToken ct)
    {
        await using var chk = new NpgsqlCommand("SELECT COUNT(*) FROM notification_templates", conn);
        if (Convert.ToInt64(await chk.ExecuteScalarAsync(ct)) > 0) return;

        var seeds = new (string code, string channel, string body)[]
        {
            ("GEOFENCE_ENTER", "SMS", "TMS Pro: Vehicle {{vehicleNo}} entered {{zoneName}} at {{time}}."),
            ("GEOFENCE_ENTER", "WHATSAPP", "TMS Pro Alert: Vehicle *{{vehicleNo}}* entered zone *{{zoneName}}* at {{time}}."),
            ("GEOFENCE_ENTER", "IN_APP", "Vehicle {{vehicleNo}} entered {{zoneName}}."),
            ("GEOFENCE_EXIT", "SMS", "TMS Pro: Vehicle {{vehicleNo}} left {{zoneName}} at {{time}}."),
            ("GEOFENCE_EXIT", "WHATSAPP", "TMS Pro Alert: Vehicle *{{vehicleNo}}* left zone *{{zoneName}}* at {{time}}."),
            ("GEOFENCE_EXIT", "IN_APP", "Vehicle {{vehicleNo}} left {{zoneName}}."),
            ("MAINT_HIGH_RISK", "SMS", "TMS Pro: High maintenance risk for {{vehicleNo}}. Score {{riskScore}}. {{factors}}"),
            ("MAINT_HIGH_RISK", "WHATSAPP", "TMS Pro: Vehicle *{{vehicleNo}}* has HIGH maintenance risk ({{riskScore}})."),
            ("MAINT_DUE", "SMS", "TMS Pro: {{serviceType}} due for {{vehicleNo}} by {{dueDate}}."),
            ("SHIPMENT_DISPATCHED", "SMS", "TMS Pro: Shipment {{bookingId}} ({{origin}} to {{destination}}) is now {{status}}."),
            ("SHIPMENT_DISPATCHED", "WHATSAPP", "Your shipment *{{bookingId}}* from {{origin}} to {{destination}} is now *{{status}}*."),
            ("SHIPMENT_DELIVERED", "SMS", "TMS Pro: Shipment {{bookingId}} delivered. Recipient: {{recipientName}}."),
            ("SHIPMENT_DELIVERED", "WHATSAPP", "Delivery confirmed for booking *{{bookingId}}*. Received by {{recipientName}}."),
            ("DOC_EXPIRING", "SMS", "TMS Pro: {{docTitle}} expires on {{expiresAt}} for {{entityName}}."),
        };

        foreach (var (code, channel, body) in seeds)
        {
            await using var cmd = new NpgsqlCommand(
                """
                INSERT INTO notification_templates (code, channel, language, body_template)
                VALUES (@code, @channel, 'en', @body)
                ON CONFLICT (code, channel, language) DO NOTHING
                """, conn);
            cmd.Parameters.AddWithValue("code", code);
            cmd.Parameters.AddWithValue("channel", channel);
            cmd.Parameters.AddWithValue("body", body);
            await cmd.ExecuteNonQueryAsync(ct);
        }
    }
}
