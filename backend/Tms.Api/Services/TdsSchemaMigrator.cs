using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tms.Api.Data;

namespace Tms.Api.Services;

public static class TdsSchemaMigrator
{
    public static async Task EnsureAsync(TmsDbContext db, CancellationToken ct = default)
    {
        await PsqlFileRunner.RunSqlFileAsync(db, "database/tds/schema.sql", ct);
        await SeedDefaultSectionsAsync(db, ct);
    }

    static async Task SeedDefaultSectionsAsync(TmsDbContext db, CancellationToken ct)
    {
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync(ct);

        // Seed sections/rates for every company that has none yet
        await using var companies = new NpgsqlCommand(
            "SELECT id FROM companies", conn);
        await using var reader = await companies.ExecuteReaderAsync(ct);
        var companyIds = new List<Guid>();
        while (await reader.ReadAsync(ct))
            companyIds.Add(reader.GetGuid(0));
        await reader.DisposeAsync();

        if (companyIds.Count == 0)
        {
            // Fallback: distinct company_id from vendors/customers/settings
            await using var alt = new NpgsqlCommand("""
                SELECT DISTINCT company_id FROM (
                    SELECT company_id FROM vendors WHERE company_id IS NOT NULL
                    UNION SELECT company_id FROM customers WHERE company_id IS NOT NULL
                    UNION SELECT company_id FROM company_settings WHERE company_id IS NOT NULL
                ) x
                """, conn);
            await using var r2 = await alt.ExecuteReaderAsync(ct);
            while (await r2.ReadAsync(ct))
                companyIds.Add(r2.GetGuid(0));
        }

        foreach (var companyId in companyIds.Distinct())
            await SeedCompanyAsync(conn, companyId, ct);
    }

    static async Task SeedCompanyAsync(NpgsqlConnection conn, Guid companyId, CancellationToken ct)
    {
        await using (var check = new NpgsqlCommand(
            "SELECT COUNT(*)::int FROM tds_sections WHERE company_id = @c", conn))
        {
            check.Parameters.AddWithValue("c", companyId);
            var count = (int)(await check.ExecuteScalarAsync(ct) ?? 0);
            if (count > 0) return;
        }

        await using (var settings = new NpgsqlCommand("""
            INSERT INTO tds_settings (company_id, enabled, tds_payable_ledger_name, tds_receivable_ledger_name, round_off, auto_post_voucher, updated_at)
            VALUES (@c, true, 'TDS Payable', 'TDS Receivable', 'NEAREST', true, NOW())
            ON CONFLICT (company_id) DO NOTHING
            """, conn))
        {
            settings.Parameters.AddWithValue("c", companyId);
            await settings.ExecuteNonQueryAsync(ct);
        }

        var sections = new (string Code, string Name, string Nature)[]
        {
            ("194C", "Payments to Contractors", "Contract / transport contractor"),
            ("194J", "Professional / Technical Fees", "Professional or technical services"),
            ("194H", "Commission / Brokerage", "Commission or brokerage"),
            ("194I", "Rent", "Rent of plant/machinery or land/building"),
        };

        var fyStart = new DateOnly(DateTime.UtcNow.Month >= 4 ? DateTime.UtcNow.Year : DateTime.UtcNow.Year - 1, 4, 1);
        foreach (var (code, name, nature) in sections)
        {
            var sectionId = Guid.NewGuid();
            await using (var ins = new NpgsqlCommand("""
                INSERT INTO tds_sections (id, company_id, section_code, name, nature_of_payment, party_type, is_active, created_at, updated_at)
                VALUES (@id, @c, @code, @name, @nature, 'BOTH', true, NOW(), NOW())
                """, conn))
            {
                ins.Parameters.AddWithValue("id", sectionId);
                ins.Parameters.AddWithValue("c", companyId);
                ins.Parameters.AddWithValue("code", code);
                ins.Parameters.AddWithValue("name", name);
                ins.Parameters.AddWithValue("nature", nature);
                await ins.ExecuteNonQueryAsync(ct);
            }

            var rate = code switch
            {
                "194C" => 1.0m,
                "194J" => 10.0m,
                "194H" => 5.0m,
                "194I" => 10.0m,
                _ => 1.0m,
            };
            var threshold = code == "194C" ? 30000m : 0m;
            await using var rateCmd = new NpgsqlCommand("""
                INSERT INTO tds_rates (id, company_id, section_id, rate_percent, rate_without_pan_percent, threshold_amount, threshold_type, effective_from, is_active, created_at, updated_at)
                VALUES (@id, @c, @sid, @rate, 20, @thr, 'TRANSACTION', @from, true, NOW(), NOW())
                """, conn);
            rateCmd.Parameters.AddWithValue("id", Guid.NewGuid());
            rateCmd.Parameters.AddWithValue("c", companyId);
            rateCmd.Parameters.AddWithValue("sid", sectionId);
            rateCmd.Parameters.AddWithValue("rate", rate);
            rateCmd.Parameters.AddWithValue("thr", threshold);
            rateCmd.Parameters.AddWithValue("from", fyStart);
            await rateCmd.ExecuteNonQueryAsync(ct);
        }
    }
}
