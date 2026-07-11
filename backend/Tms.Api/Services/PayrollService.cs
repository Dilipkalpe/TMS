using System.Data;
using Npgsql;
using Tms.Api.DTOs;

namespace Tms.Api.Services;

public class PayrollService(IConfiguration config, ITenantContext tenants)
{
    private string ConnectionString => AppConfiguration.ResolveConnectionString(config);
    private Guid CompanyId => TenantScope.ResolveCompanyId(tenants);

    public async Task<List<PayrollRunDto>> ListRunsAsync(int? month, int? year, string? status, CancellationToken ct = default)
    {
        var (items, _) = await ListRunsPagedAsync(1, QueryExtensions.MaxPageSize, null, month, year, status, ct);
        return items;
    }

    public async Task<(List<PayrollRunDto> Items, int Total)> ListRunsPagedAsync(
        int page, int pageSize, string? search,
        int? month, int? year, string? status, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = new NpgsqlCommand(
            @"SELECT * FROM sp_payroll_list_runs_paged(
                @p_company_id, @p_page, @p_page_size, @p_search,
                @p_month, @p_year, @p_status)", conn);
        cmd.Parameters.AddWithValue("p_company_id", CompanyId);
        cmd.Parameters.AddWithValue("p_page", page);
        cmd.Parameters.AddWithValue("p_page_size", pageSize);
        cmd.Parameters.AddWithValue("p_search", (object?)search ?? DBNull.Value);
        cmd.Parameters.AddWithValue("p_month", (object?)month ?? DBNull.Value);
        cmd.Parameters.AddWithValue("p_year", (object?)year ?? DBNull.Value);
        cmd.Parameters.AddWithValue("p_status", (object?)status ?? DBNull.Value);

        var list = new List<PayrollRunDto>();
        var total = 0;
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            if (total == 0 && DataReaderCols.HasColumn(reader, "total_count"))
                total = (int)DataReaderCols.ColInt64(reader, "total_count");
            list.Add(ReadRunList(reader));
        }
        return (list, total);
    }

    public async Task<PayrollRunDto?> GetRunAsync(Guid id, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = new NpgsqlCommand("SELECT * FROM sp_payroll_get_run(@p_company_id, @p_run_id)", conn);
        cmd.Parameters.AddWithValue("p_company_id", CompanyId);
        cmd.Parameters.AddWithValue("p_run_id", id);
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        return await reader.ReadAsync(ct) ? ReadRunDetail(reader) : null;
    }

    public async Task<List<PayrollEntryDto>> ListEntriesAsync(Guid runId, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await EnsurePayrollRunAsync(conn, runId, ct);
        await using var cmd = new NpgsqlCommand("SELECT * FROM sp_payroll_list_entries(@p_run_id)", conn);
        cmd.Parameters.AddWithValue("p_run_id", runId);

        var list = new List<PayrollEntryDto>();
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
            list.Add(ReadEntry(reader));
        return list;
    }

    public async Task<PayrollSummaryDto> GetSummaryAsync(CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = new NpgsqlCommand("SELECT * FROM sp_payroll_summary(@p_company_id)", conn);
        cmd.Parameters.AddWithValue("p_company_id", CompanyId);
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        if (!await reader.ReadAsync(ct))
            return new PayrollSummaryDto();

        return new PayrollSummaryDto(
            DataReaderCols.ColInt64(reader, "total_runs"),
            DataReaderCols.ColInt64(reader, "draft_runs"),
            DataReaderCols.ColInt64(reader, "processed_runs"),
            DataReaderCols.ColInt64(reader, "paid_runs"),
            DataReaderCols.ColDecimal(reader, "total_paid_amount"),
            DataReaderCols.ColInt64(reader, "active_drivers"),
            DataReaderCols.HasColumn(reader, "active_employees")
                ? DataReaderCols.ColInt64(reader, "active_employees")
                : 0,
            DataReaderCols.ColStringN(reader, "last_run_period"));
    }

    public async Task<Guid> GenerateAsync(int month, int year, string? createdBy, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = new NpgsqlCommand(
            "SELECT sp_payroll_generate(@p_company_id, @p_month, @p_year, @p_created_by)", conn);
        cmd.Parameters.AddWithValue("p_company_id", CompanyId);
        cmd.Parameters.AddWithValue("p_month", month);
        cmd.Parameters.AddWithValue("p_year", year);
        cmd.Parameters.AddWithValue("p_created_by", (object?)createdBy ?? "system");
        var result = await cmd.ExecuteScalarAsync(ct);
        return result is Guid g ? g : Guid.Parse(result!.ToString()!);
    }

    public async Task ProcessAsync(Guid runId, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await EnsurePayrollRunAsync(conn, runId, ct);
        await using var cmd = new NpgsqlCommand("SELECT sp_payroll_process(@p_run_id)", conn);
        cmd.Parameters.AddWithValue("p_run_id", runId);
        await cmd.ExecuteScalarAsync(ct);
    }

    public async Task<List<PayrollAccountingAttendantDto>> ListAttendantsAsync(Guid runId, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await EnsurePayrollRunAsync(conn, runId, ct);
        await using var cmd = new NpgsqlCommand("SELECT * FROM sp_payroll_list_attendants(@p_run_id)", conn);
        cmd.Parameters.AddWithValue("p_run_id", runId);

        var list = new List<PayrollAccountingAttendantDto>();
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
            list.Add(ReadAttendant(reader));
        return list;
    }

    public async Task<(Guid VoucherId, string? VoucherNo)> MarkPaidAsync(Guid runId, string? paymentMode, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await EnsurePayrollRunAsync(conn, runId, ct);
        await using var cmd = new NpgsqlCommand(
            "SELECT voucher_id, voucher_no FROM sp_payroll_mark_paid(@p_run_id, @p_payment_mode)", conn);
        cmd.Parameters.AddWithValue("p_run_id", runId);
        cmd.Parameters.AddWithValue("p_payment_mode", (object?)paymentMode ?? "Bank Transfer");
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        if (!await reader.ReadAsync(ct))
            throw new InvalidOperationException("Payroll payment failed");
        return (DataReaderCols.ColGuid(reader, "voucher_id"),
            DataReaderCols.ColStringN(reader, "voucher_no"));
    }

    public async Task CancelAsync(Guid runId, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await EnsurePayrollRunAsync(conn, runId, ct);
        await using var cmd = new NpgsqlCommand("SELECT sp_payroll_cancel(@p_run_id)", conn);
        cmd.Parameters.AddWithValue("p_run_id", runId);
        await cmd.ExecuteScalarAsync(ct);
    }

    public async Task<List<PayrollSettingDto>> ListSettingsAsync(CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = new NpgsqlCommand("SELECT * FROM sp_payroll_list_settings(@p_company_id)", conn);
        cmd.Parameters.AddWithValue("p_company_id", CompanyId);
        var list = new List<PayrollSettingDto>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
            list.Add(new PayrollSettingDto(
                r.GetString(0), r.GetString(1),
                r.IsDBNull(2) ? null : r.GetString(2),
                r.IsDBNull(3) ? null : r.GetDateTime(3)));
        return list;
    }

    public async Task UpdateSettingAsync(string key, string value, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await EnsurePayrollSettingAsync(conn, key, ct);
        await using var cmd = new NpgsqlCommand(
            "SELECT sp_payroll_update_setting(@cid, @key, @val)", conn);
        cmd.Parameters.AddWithValue("key", key);
        cmd.Parameters.AddWithValue("val", value);
        cmd.Parameters.AddWithValue("cid", CompanyId);
        var result = await cmd.ExecuteScalarAsync(ct);
        if (result is not int rows || rows == 0)
            throw new InvalidOperationException("Payroll setting not found.");
    }

    public async Task<PayslipDto?> GetPayslipAsync(Guid entryId, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await EnsurePayrollEntryAsync(conn, entryId, ct);
        await using var cmd = new NpgsqlCommand("SELECT * FROM sp_payroll_get_payslip(@p_id)", conn);
        cmd.Parameters.AddWithValue("p_id", entryId);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        return await r.ReadAsync(ct) ? ReadPayslip(r) : null;
    }

    public async Task<List<PayslipListItemDto>> ListPayslipsAsync(
        Guid? runId, string? employeeId, int? month, int? year, CancellationToken ct = default)
    {
        var (items, _) = await ListPayslipsPagedAsync(1, QueryExtensions.MaxPageSize, null, runId, employeeId, month, year, ct);
        return items;
    }

    public async Task<(List<PayslipListItemDto> Items, int Total)> ListPayslipsPagedAsync(
        int page, int pageSize, string? search,
        Guid? runId, string? employeeId, int? month, int? year, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        if (runId.HasValue)
            await EnsurePayrollRunAsync(conn, runId.Value, ct);

        await using var cmd = new NpgsqlCommand(
            @"SELECT * FROM sp_payroll_list_payslips_paged(
                @p_company_id, @p_page, @p_page_size, @p_search,
                @p_run, @p_emp, @p_month, @p_year)", conn);
        cmd.Parameters.AddWithValue("p_company_id", CompanyId);
        cmd.Parameters.AddWithValue("p_page", page);
        cmd.Parameters.AddWithValue("p_page_size", pageSize);
        cmd.Parameters.AddWithValue("p_search", (object?)search ?? DBNull.Value);
        cmd.Parameters.AddWithValue("p_run", (object?)runId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("p_emp", string.IsNullOrWhiteSpace(employeeId) ? DBNull.Value : employeeId);
        cmd.Parameters.AddWithValue("p_month", (object?)month ?? DBNull.Value);
        cmd.Parameters.AddWithValue("p_year", (object?)year ?? DBNull.Value);

        var list = new List<PayslipListItemDto>();
        var total = 0;
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
        {
            if (total == 0 && DataReaderCols.HasColumn(r, "total_count"))
                total = (int)DataReaderCols.ColInt64(r, "total_count");
            list.Add(ReadPayslipListItem(r));
        }
        return (list, total);
    }

    public async Task<List<SalaryRegisterRowDto>> SalaryRegisterAsync(
        int? month, int? year, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = new NpgsqlCommand(
            "SELECT * FROM sp_payroll_salary_register(@p_company_id, @p_month, @p_year)", conn);
        cmd.Parameters.AddWithValue("p_company_id", CompanyId);
        cmd.Parameters.AddWithValue("p_month", (object?)month ?? DBNull.Value);
        cmd.Parameters.AddWithValue("p_year", (object?)year ?? DBNull.Value);
        var list = new List<SalaryRegisterRowDto>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
            list.Add(new SalaryRegisterRowDto(
                DataReaderCols.ColString(r, "run_code"),
                DataReaderCols.ColString(r, "period_label"),
                DataReaderCols.ColString(r, "employee_id"),
                DataReaderCols.ColString(r, "employee_name"),
                DataReaderCols.ColString(r, "employee_type"),
                DataReaderCols.ColStringN(r, "employment_type"),
                DataReaderCols.ColDecimal(r, "days_worked"),
                DataReaderCols.ColDecimal(r, "basic_salary"),
                DataReaderCols.ColDecimal(r, "trip_incentive"),
                DataReaderCols.ColDecimal(r, "overtime"),
                DataReaderCols.ColDecimal(r, "other_allowance"),
                DataReaderCols.ColDecimal(r, "tms_allowance"),
                DataReaderCols.ColDecimal(r, "gross_pay"),
                DataReaderCols.ColDecimal(r, "pf_deduction"),
                DataReaderCols.ColDecimal(r, "esi_deduction"),
                DataReaderCols.ColDecimal(r, "insurance_deduction"),
                DataReaderCols.ColDecimal(r, "advance_recovery"),
                DataReaderCols.ColDecimal(r, "other_deduction"),
                DataReaderCols.ColDecimal(r, "net_pay"),
                DataReaderCols.ColString(r, "payment_status")));
        return list;
    }

    private static PayslipDto ReadPayslip(IDataReader r) => new(
        DataReaderCols.ColGuid(r, "entry_id"),
        DataReaderCols.ColGuid(r, "run_id"),
        DataReaderCols.ColString(r, "run_code"),
        DataReaderCols.ColString(r, "period_label"),
        DataReaderCols.ColInt32(r, "pay_month"),
        DataReaderCols.ColInt32(r, "pay_year"),
        DataReaderCols.ColString(r, "run_status"),
        DataReaderCols.ColString(r, "employee_type"),
        DataReaderCols.ColString(r, "employee_id"),
        DataReaderCols.ColString(r, "employee_name"),
        DataReaderCols.ColStringN(r, "employment_type"),
        DataReaderCols.ColStringN(r, "department_name"),
        DataReaderCols.ColStringN(r, "designation_name"),
        DataReaderCols.ColDecimal(r, "basic_salary"),
        DataReaderCols.ColDecimal(r, "trip_incentive"),
        DataReaderCols.ColDecimal(r, "overtime"),
        DataReaderCols.ColDecimal(r, "other_allowance"),
        DataReaderCols.ColDecimalN(r, "tms_allowance"),
        DataReaderCols.ColDecimal(r, "gross_pay"),
        DataReaderCols.ColDecimal(r, "pf_deduction"),
        DataReaderCols.ColDecimalN(r, "esi_deduction"),
        DataReaderCols.ColDecimalN(r, "insurance_deduction"),
        DataReaderCols.ColDecimal(r, "advance_recovery"),
        DataReaderCols.ColDecimal(r, "other_deduction"),
        DataReaderCols.ColDecimalN(r, "days_worked"),
        DataReaderCols.ColDecimal(r, "net_pay"),
        DataReaderCols.ColString(r, "payment_status"),
        DataReaderCols.ColDateTimeN(r, "paid_at"),
        DataReaderCols.ColStringN(r, "company_name"));

    private static PayslipListItemDto ReadPayslipListItem(IDataReader r) => new(
        DataReaderCols.ColGuid(r, "id"),
        DataReaderCols.ColGuid(r, "run_id"),
        DataReaderCols.ColString(r, "run_code"),
        DataReaderCols.ColString(r, "period_label"),
        DataReaderCols.ColString(r, "employee_id"),
        DataReaderCols.ColString(r, "employee_name"),
        DataReaderCols.ColString(r, "employee_type"),
        DataReaderCols.ColDecimal(r, "gross_pay"),
        DataReaderCols.ColDecimal(r, "net_pay"),
        DataReaderCols.ColString(r, "payment_status"),
        DataReaderCols.ColDateTimeN(r, "paid_at"));

    private static PayrollRunDto ReadRunList(IDataReader r) => new(
        DataReaderCols.ColGuid(r, "id"),
        DataReaderCols.ColString(r, "run_code"),
        DataReaderCols.ColInt32(r, "pay_month"),
        DataReaderCols.ColInt32(r, "pay_year"),
        DataReaderCols.ColString(r, "period_label"),
        DataReaderCols.ColString(r, "status"),
        DataReaderCols.ColDecimal(r, "total_gross"),
        DataReaderCols.ColDecimal(r, "total_deductions"),
        DataReaderCols.ColDecimal(r, "total_net"),
        DataReaderCols.ColInt32(r, "entry_count"),
        DataReaderCols.ColStringN(r, "payment_mode"),
        DataReaderCols.ColDateTimeN(r, "processed_at"),
        DataReaderCols.ColDateTimeN(r, "paid_at"),
        DataReaderCols.ColStringN(r, "remarks"),
        DataReaderCols.ColGuidN(r, "voucher_id"),
        DataReaderCols.ColStringN(r, "voucher_no"),
        DataReaderCols.ColDateTimeN(r, "created_at"));

    private static PayrollRunDto ReadRunDetail(IDataReader r) => ReadRunList(r);

    private static PayrollAccountingAttendantDto ReadAttendant(IDataReader r) => new(
        DataReaderCols.ColGuid(r, "id"),
        DataReaderCols.ColGuid(r, "run_id"),
        DataReaderCols.ColGuid(r, "voucher_id"),
        DataReaderCols.ColString(r, "voucher_no"),
        DataReaderCols.ColString(r, "link_type"),
        DataReaderCols.ColStringN(r, "debit_ledger"),
        DataReaderCols.ColStringN(r, "credit_ledger"),
        DataReaderCols.ColDecimal(r, "amount"),
        DataReaderCols.ColStringN(r, "narration"),
        DataReaderCols.ColDateTimeN(r, "voucher_date")?.ToString("yyyy-MM-dd"),
        DataReaderCols.ColStringN(r, "voucher_type"),
        DataReaderCols.ColStringN(r, "payment_mode"),
        DataReaderCols.ColDateTimeN(r, "created_at"));

    private static PayrollEntryDto ReadEntry(IDataReader r) => new(
        DataReaderCols.ColGuid(r, "id"),
        DataReaderCols.ColGuid(r, "run_id"),
        DataReaderCols.ColString(r, "employee_type"),
        DataReaderCols.ColString(r, "employee_id"),
        DataReaderCols.ColString(r, "employee_name"),
        DataReaderCols.ColStringN(r, "employment_type"),
        DataReaderCols.ColDecimal(r, "basic_salary"),
        DataReaderCols.ColDecimal(r, "trip_incentive"),
        DataReaderCols.ColDecimal(r, "overtime"),
        DataReaderCols.ColDecimal(r, "other_allowance"),
        DataReaderCols.ColDecimalN(r, "tms_allowance"),
        DataReaderCols.ColDecimal(r, "gross_pay"),
        DataReaderCols.ColDecimal(r, "pf_deduction"),
        DataReaderCols.ColDecimalN(r, "esi_deduction"),
        DataReaderCols.ColDecimalN(r, "insurance_deduction"),
        DataReaderCols.ColDecimal(r, "advance_recovery"),
        DataReaderCols.ColDecimal(r, "other_deduction"),
        DataReaderCols.ColDecimalN(r, "days_worked"),
        DataReaderCols.ColDecimal(r, "net_pay"),
        DataReaderCols.ColString(r, "payment_status"),
        DataReaderCols.ColDateTimeN(r, "paid_at"));

    private async Task<NpgsqlConnection> OpenAsync(CancellationToken ct)
    {
        var conn = new NpgsqlConnection(ConnectionString);
        await conn.OpenAsync(ct);
        return conn;
    }

    private async Task EnsurePayrollRunAsync(NpgsqlConnection conn, Guid runId, CancellationToken ct)
    {
        await using var cmd = new NpgsqlCommand("SELECT sp_payroll_ensure_run(@cid, @id)", conn);
        cmd.Parameters.AddWithValue("id", runId);
        cmd.Parameters.AddWithValue("cid", CompanyId);
        if (await cmd.ExecuteScalarAsync(ct) is not true)
            throw new InvalidOperationException("Payroll run not found.");
    }

    private async Task EnsurePayrollEntryAsync(NpgsqlConnection conn, Guid entryId, CancellationToken ct)
    {
        await using var cmd = new NpgsqlCommand("SELECT sp_payroll_ensure_entry(@cid, @id)", conn);
        cmd.Parameters.AddWithValue("id", entryId);
        cmd.Parameters.AddWithValue("cid", CompanyId);
        if (await cmd.ExecuteScalarAsync(ct) is not true)
            throw new InvalidOperationException("Payroll entry not found.");
    }

    private async Task EnsurePayrollSettingAsync(NpgsqlConnection conn, string key, CancellationToken ct)
    {
        await using var cmd = new NpgsqlCommand("SELECT sp_payroll_ensure_setting(@cid, @key)", conn);
        cmd.Parameters.AddWithValue("key", key);
        cmd.Parameters.AddWithValue("cid", CompanyId);
        if (await cmd.ExecuteScalarAsync(ct) is not true)
            throw new InvalidOperationException("Payroll setting not found.");
    }
}
