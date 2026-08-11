using System.Data;
using System.Data.Common;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tms.Api.Data;

namespace Tms.Api.Services;

/// <summary>
/// Deletes company transaction + master data while preserving configuration.
/// Uses batched SQL so large demo volumes (hundreds of thousands of LRs) can finish.
/// </summary>
public class CompanyDataPurgeService(TmsDbContext db, ITenantContext tenants, ILogger<CompanyDataPurgeService> logger)
{
    public const string ConfirmPhrase = "DELETE DATA";
    const int BatchSize = 25_000;

    public async Task<CompanyDataPurgeResult> PurgeAsync(CancellationToken ct = default)
    {
        var companyId = tenants.EffectiveCompanyId
            ?? throw new InvalidOperationException("Company context is required.");

        var counts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var previousTimeout = db.Database.GetCommandTimeout();
        db.Database.SetCommandTimeout(0);

        try
        {
            await db.Database.OpenConnectionAsync(ct);
            var conn = db.Database.GetDbConnection();

            await using (var setCmd = conn.CreateCommand())
            {
                setCmd.CommandText = "SET statement_timeout = 0";
                setCmd.CommandTimeout = 0;
                try { await setCmd.ExecuteNonQueryAsync(ct); } catch { /* ignore */ }
            }

            await BatchSql(counts, "lr_loading_sheet_items",
                "DELETE FROM lr_loading_sheet_items WHERE ctid IN (" +
                "SELECT i.ctid FROM lr_loading_sheet_items i " +
                "INNER JOIN lr_loading_sheets s ON s.id = i.loading_sheet_id " +
                "WHERE s.company_id = @cid LIMIT @batch)", conn, companyId, ct);

            await DeleteByCompany(counts, "freight_invoice_lines", conn, companyId, ct);

            await BatchSql(counts, "invoice_lines",
                "DELETE FROM invoice_lines WHERE ctid IN (" +
                "SELECT l.ctid FROM invoice_lines l " +
                "INNER JOIN invoices i ON i.id = l.invoice_id " +
                "WHERE i.company_id = @cid LIMIT @batch)", conn, companyId, ct);

            await DeleteByCompany(counts, "quotation_lines", conn, companyId, ct);
            await DeleteByCompany(counts, "voucher_lines", conn, companyId, ct);

            await BatchSql(counts, "booking_status_history",
                "DELETE FROM booking_status_history WHERE ctid IN (" +
                "SELECT h.ctid FROM booking_status_history h " +
                "INNER JOIN bookings b ON b.id = h.booking_id " +
                "WHERE b.company_id = @cid LIMIT @batch)", conn, companyId, ct);

            await BatchSql(counts, "booking_tracking_tokens",
                "DELETE FROM booking_tracking_tokens WHERE ctid IN (" +
                "SELECT t.ctid FROM booking_tracking_tokens t " +
                "INNER JOIN bookings b ON b.id = t.booking_id " +
                "WHERE b.company_id = @cid LIMIT @batch)", conn, companyId, ct);

            await BatchSql(counts, "trip_stops",
                "DELETE FROM trip_stops WHERE ctid IN (" +
                "SELECT s.ctid FROM trip_stops s " +
                "INNER JOIN trips t ON t.id = s.trip_id " +
                "WHERE t.company_id = @cid LIMIT @batch)", conn, companyId, ct);

            await BatchSql(counts, "trip_status_history",
                "DELETE FROM trip_status_history WHERE ctid IN (" +
                "SELECT h.ctid FROM trip_status_history h " +
                "INNER JOIN trips t ON t.id = h.trip_id " +
                "WHERE t.company_id = @cid LIMIT @batch)", conn, companyId, ct);

            await DeleteByCompany(counts, "ai_messages", conn, companyId, ct);

            await BatchSql(counts, "geofence_events",
                "DELETE FROM geofence_events WHERE ctid IN (" +
                "SELECT e.ctid FROM geofence_events e " +
                "INNER JOIN geofences g ON g.id = e.geofence_id " +
                "WHERE g.company_id = @cid LIMIT @batch)", conn, companyId, ct);

            await BatchSql(counts, "geofence_vehicle_state",
                "DELETE FROM geofence_vehicle_state WHERE ctid IN (" +
                "SELECT e.ctid FROM geofence_vehicle_state e " +
                "INNER JOIN geofences g ON g.id = e.geofence_id " +
                "WHERE g.company_id = @cid LIMIT @batch)", conn, companyId, ct);

            await BatchSql(counts, "geofence_assignments",
                "DELETE FROM geofence_assignments WHERE ctid IN (" +
                "SELECT e.ctid FROM geofence_assignments e " +
                "INNER JOIN geofences g ON g.id = e.geofence_id " +
                "WHERE g.company_id = @cid LIMIT @batch)", conn, companyId, ct);

            await BatchSql(counts, "gps_tracks",
                "DELETE FROM gps_tracks WHERE ctid IN (" +
                "SELECT t.ctid FROM gps_tracks t " +
                "INNER JOIN vehicles v ON v.id = t.vehicle_id " +
                "WHERE v.company_id = @cid LIMIT @batch)", conn, companyId, ct);

            await BatchSql(counts, "vehicle_last_position",
                "DELETE FROM vehicle_last_position WHERE ctid IN (" +
                "SELECT p.ctid FROM vehicle_last_position p " +
                "INNER JOIN vehicles v ON v.id = p.vehicle_id " +
                "WHERE v.company_id = @cid LIMIT @batch)", conn, companyId, ct);

            await DeleteByCompany(counts, "warehouse_inventory", conn, companyId, ct);
            await DeleteByCompany(counts, "iot_sensor_readings", conn, companyId, ct);
            await DeleteByCompany(counts, "freight_bids", conn, companyId, ct);

            await DeleteByCompany(counts, "lr_status_history", conn, companyId, ct, batched: true);
            await DeleteByCompany(counts, "lr_expenses", conn, companyId, ct, batched: true);
            await DeleteByCompany(counts, "lr_delivery_sheets", conn, companyId, ct, batched: true);
            await DeleteByCompany(counts, "lr_transit_passes", conn, companyId, ct, batched: true);
            await DeleteByCompany(counts, "lr_loading_sheets", conn, companyId, ct, batched: true);
            await DeleteByCompany(counts, "proof_of_delivery", conn, companyId, ct, batched: true);
            await DeleteByCompany(counts, "lorry_receipts", conn, companyId, ct, batched: true);

            await DeleteByCompany(counts, "booking_broker_charges", conn, companyId, ct);
            await DeleteByCompany(counts, "booking_expenses", conn, companyId, ct);
            await DeleteByCompany(counts, "booking_payments", conn, companyId, ct);
            await DeleteByCompany(counts, "bookings", conn, companyId, ct, batched: true);

            await DeleteByCompany(counts, "freight_invoices", conn, companyId, ct);
            await DeleteByCompany(counts, "invoices", conn, companyId, ct);
            await DeleteByCompany(counts, "quotations", conn, companyId, ct);
            await DeleteByCompany(counts, "vouchers", conn, companyId, ct);
            await DeleteByCompany(counts, "provisions", conn, companyId, ct);
            await DeleteByCompany(counts, "transport_bills", conn, companyId, ct);
            await DeleteByCompany(counts, "accounting_report_jobs", conn, companyId, ct);
            await DeleteByCompany(counts, "expenses", conn, companyId, ct);

            await DeleteByCompany(counts, "trips", conn, companyId, ct);
            await DeleteByCompany(counts, "route_optimization_jobs", conn, companyId, ct);

            await BatchSql(counts, "fuel_entries",
                "DELETE FROM fuel_entries WHERE ctid IN (" +
                "SELECT x.ctid FROM fuel_entries x INNER JOIN vehicles v ON v.id = x.vehicle_id " +
                "WHERE v.company_id = @cid LIMIT @batch)", conn, companyId, ct);
            await BatchSql(counts, "maintenance_work_orders",
                "DELETE FROM maintenance_work_orders WHERE ctid IN (" +
                "SELECT x.ctid FROM maintenance_work_orders x INNER JOIN vehicles v ON v.id = x.vehicle_id " +
                "WHERE v.company_id = @cid LIMIT @batch)", conn, companyId, ct);
            await BatchSql(counts, "maintenance_records",
                "DELETE FROM maintenance_records WHERE ctid IN (" +
                "SELECT x.ctid FROM maintenance_records x INNER JOIN vehicles v ON v.id = x.vehicle_id " +
                "WHERE v.company_id = @cid LIMIT @batch)", conn, companyId, ct);
            await BatchSql(counts, "maintenance_prediction_snapshots",
                "DELETE FROM maintenance_prediction_snapshots WHERE ctid IN (" +
                "SELECT x.ctid FROM maintenance_prediction_snapshots x INNER JOIN vehicles v ON v.id = x.vehicle_id " +
                "WHERE v.company_id = @cid LIMIT @batch)", conn, companyId, ct);
            await BatchSql(counts, "maintenance_schedules",
                "DELETE FROM maintenance_schedules WHERE ctid IN (" +
                "SELECT x.ctid FROM maintenance_schedules x INNER JOIN vehicles v ON v.id = x.vehicle_id " +
                "WHERE v.company_id = @cid LIMIT @batch)", conn, companyId, ct);
            await BatchSql(counts, "gps_devices",
                "DELETE FROM gps_devices WHERE ctid IN (" +
                "SELECT x.ctid FROM gps_devices x INNER JOIN vehicles v ON v.id = x.vehicle_id " +
                "WHERE v.company_id = @cid LIMIT @batch)", conn, companyId, ct);

            await DeleteByCompany(counts, "documents", conn, companyId, ct);
            await DeleteByCompany(counts, "notifications", conn, companyId, ct);
            await DeleteByCompany(counts, "notification_outbox", conn, companyId, ct);
            await DeleteByCompany(counts, "marketplace_listings", conn, companyId, ct);
            await DeleteByCompany(counts, "ai_chat_sessions", conn, companyId, ct);
            await DeleteByCompany(counts, "forecast_snapshots", conn, companyId, ct);

            await DeleteByCompany(counts, "spare_parts", conn, companyId, ct);
            await DeleteByCompany(counts, "geofences", conn, companyId, ct);
            await DeleteByCompany(counts, "iot_devices", conn, companyId, ct);
            await DeleteByCompany(counts, "warehouses", conn, companyId, ct);
            await DeleteByCompany(counts, "freight_rates", conn, companyId, ct);
            await DeleteByCompany(counts, "brokers", conn, companyId, ct);
            await DeleteByCompany(counts, "vehicles", conn, companyId, ct);
            await DeleteByCompany(counts, "drivers", conn, companyId, ct);
            await DeleteByCompany(counts, "customers", conn, companyId, ct);
            await DeleteByCompany(counts, "vendors", conn, companyId, ct);
            await DeleteByCompany(counts, "consignors", conn, companyId, ct);
            await DeleteByCompany(counts, "consignees", conn, companyId, ct);
            await DeleteByCompany(counts, "items", conn, companyId, ct);
            await DeleteByCompany(counts, "document_number_sequences", conn, companyId, ct);

            await TryDeleteByCompany(counts, "payroll_entries", conn, companyId, ct);
            await TryDeleteByCompany(counts, "payroll_runs", conn, companyId, ct);
            await TryDeleteByCompany(counts, "hr_attendance", conn, companyId, ct);
            await TryDeleteByCompany(counts, "hr_leave_requests", conn, companyId, ct);
            await TryDeleteByCompany(counts, "hr_employees", conn, companyId, ct);

            logger.LogWarning("Company data purge completed for {CompanyId}", companyId);
            return new CompanyDataPurgeResult(
                true,
                "Transaction and master data deleted. Configuration was kept.",
                counts);
        }
        finally
        {
            db.Database.SetCommandTimeout(previousTimeout);
            if (db.Database.GetDbConnection().State == ConnectionState.Open)
                await db.Database.CloseConnectionAsync();
        }
    }

    async Task DeleteByCompany(
        Dictionary<string, int> counts,
        string table,
        DbConnection conn,
        Guid companyId,
        CancellationToken ct,
        bool batched = false)
    {
        if (batched)
        {
            await BatchSql(counts, table,
                $"DELETE FROM {table} WHERE ctid IN (" +
                $"SELECT ctid FROM {table} WHERE company_id = @cid LIMIT @batch)",
                conn, companyId, ct);
            return;
        }

        await using var cmd = conn.CreateCommand();
        cmd.CommandTimeout = 0;
        cmd.CommandText = $"DELETE FROM {table} WHERE company_id = @cid";
        AddUuid(cmd, "cid", companyId);
        counts[table] = await cmd.ExecuteNonQueryAsync(ct);
    }

    async Task TryDeleteByCompany(
        Dictionary<string, int> counts,
        string table,
        DbConnection conn,
        Guid companyId,
        CancellationToken ct)
    {
        try
        {
            await DeleteByCompany(counts, table, conn, companyId, ct);
        }
        catch (Exception ex)
        {
            logger.LogDebug(ex, "Optional purge skipped for {Table}", table);
            counts[table] = 0;
        }
    }

    async Task BatchSql(
        Dictionary<string, int> counts,
        string key,
        string sql,
        DbConnection conn,
        Guid companyId,
        CancellationToken ct)
    {
        var total = 0;
        while (true)
        {
            ct.ThrowIfCancellationRequested();
            await using var cmd = conn.CreateCommand();
            cmd.CommandTimeout = 0;
            cmd.CommandText = sql;
            AddUuid(cmd, "cid", companyId);
            AddInt(cmd, "batch", BatchSize);
            var n = await cmd.ExecuteNonQueryAsync(ct);
            total += n;
            if (n < BatchSize) break;
            logger.LogInformation("Purge {Table}: deleted {Total} rows so far…", key, total);
        }
        counts[key] = total;
    }

    static void AddUuid(DbCommand cmd, string name, Guid value)
    {
        cmd.Parameters.Add(new NpgsqlParameter(name, NpgsqlTypes.NpgsqlDbType.Uuid) { Value = value });
    }

    static void AddInt(DbCommand cmd, string name, int value)
    {
        cmd.Parameters.Add(new NpgsqlParameter(name, NpgsqlTypes.NpgsqlDbType.Integer) { Value = value });
    }
}

public record CompanyDataPurgeResult(bool Success, string Message, IReadOnlyDictionary<string, int> DeletedCounts);
