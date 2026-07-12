using System.Data;
using Npgsql;
using Tms.Api.DTOs;

namespace Tms.Api.Services;

public class HrService(IConfiguration config, ITenantContext tenants)
{
    private string ConnectionString => AppConfiguration.ResolveConnectionString(config);
    private Guid CompanyId => TenantScope.ResolveCompanyId(tenants);

    public async Task<HrSummaryDto> GetSummaryAsync(CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = new NpgsqlCommand("SELECT * FROM sp_hr_summary(@p_company_id)", conn);
        cmd.Parameters.AddWithValue("p_company_id", CompanyId);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        if (!await r.ReadAsync(ct)) return new HrSummaryDto();
        return new HrSummaryDto(
            DataReaderCols.ColInt64(r, "total_employees"),
            DataReaderCols.ColInt64(r, "active_employees"),
            DataReaderCols.ColInt64(r, "on_leave"),
            DataReaderCols.ColInt64(r, "departments"),
            DataReaderCols.ColInt64(r, "pending_leaves"),
            DataReaderCols.ColInt64(r, "today_present"),
            DataReaderCols.ColInt64(r, "today_absent"));
    }

    public async Task<List<HrDepartmentDto>> ListDepartmentsAsync(CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = new NpgsqlCommand("SELECT * FROM sp_hr_list_departments(@p_company_id)", conn);
        cmd.Parameters.AddWithValue("p_company_id", CompanyId);
        var list = new List<HrDepartmentDto>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
            list.Add(new HrDepartmentDto(
                DataReaderCols.ColGuid(r, "id"),
                DataReaderCols.ColString(r, "code"),
                DataReaderCols.ColString(r, "name"),
                DataReaderCols.ColStringN(r, "description"),
                DataReaderCols.ColString(r, "status"),
                DataReaderCols.ColInt64(r, "employee_count"),
                DataReaderCols.ColDateTimeN(r, "created_at") ?? DateTime.UtcNow));
        return list;
    }

    public async Task<Guid> SaveDepartmentAsync(SaveDepartmentRequest body, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = new NpgsqlCommand(
            "SELECT sp_hr_save_department(@p_company_id, @p_id, @p_code, @p_name, @p_desc, @p_status)", conn);
        cmd.Parameters.AddWithValue("p_company_id", CompanyId);
        cmd.Parameters.AddWithValue("p_id", (object?)body.Id ?? DBNull.Value);
        cmd.Parameters.AddWithValue("p_code", body.Code);
        cmd.Parameters.AddWithValue("p_name", body.Name);
        cmd.Parameters.AddWithValue("p_desc", (object?)body.Description ?? DBNull.Value);
        cmd.Parameters.AddWithValue("p_status", body.Status ?? "Active");
        var result = await cmd.ExecuteScalarAsync(ct);
        return result is Guid g ? g : Guid.Parse(result!.ToString()!);
    }

    public async Task<List<HrDesignationDto>> ListDesignationsAsync(CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = new NpgsqlCommand("SELECT * FROM sp_hr_list_designations(@p_company_id)", conn);
        cmd.Parameters.AddWithValue("p_company_id", CompanyId);
        var list = new List<HrDesignationDto>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
            list.Add(new HrDesignationDto(
                r.GetGuid(0), r.GetString(1), r.GetString(2),
                r.IsDBNull(3) ? null : r.GetGuid(3),
                r.IsDBNull(4) ? null : r.GetString(4),
                r.GetInt32(5), r.GetString(6)));
        return list;
    }

    public async Task<List<HrEmployeeDto>> ListEmployeesAsync(
        Guid? departmentId, string? employeeType, string? status, string? employmentType, CancellationToken ct = default)
    {
        var (items, _) = await ListEmployeesPagedAsync(
            1, QueryExtensions.MaxPageSize, null, departmentId, employeeType, status, employmentType, ct);
        return items;
    }

    public async Task<(List<HrEmployeeDto> Items, int Total)> ListEmployeesPagedAsync(
        int page, int pageSize, string? search,
        Guid? departmentId, string? employeeType, string? status, string? employmentType,
        CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = new NpgsqlCommand(
            @"SELECT * FROM sp_hr_list_employees_paged(
                @p_company_id, @p_page, @p_page_size, @p_search,
                @p_dept, @p_type, @p_status, @p_emp_type)", conn);
        cmd.Parameters.AddWithValue("p_company_id", CompanyId);
        cmd.Parameters.AddWithValue("p_page", page);
        cmd.Parameters.AddWithValue("p_page_size", pageSize);
        cmd.Parameters.AddWithValue("p_search", (object?)search ?? DBNull.Value);
        cmd.Parameters.AddWithValue("p_dept", (object?)departmentId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("p_type", (object?)employeeType ?? DBNull.Value);
        cmd.Parameters.AddWithValue("p_status", (object?)status ?? DBNull.Value);
        cmd.Parameters.AddWithValue("p_emp_type", (object?)employmentType ?? DBNull.Value);

        var list = new List<HrEmployeeDto>();
        var total = 0;
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
        {
            if (total == 0 && DataReaderCols.HasColumn(r, "total_count"))
                total = (int)DataReaderCols.ColInt64(r, "total_count");
            list.Add(ReadEmployeeList(r));
        }
        return (list, total);
    }

    public async Task<List<string>> ListEmployeeNamesAsync(
        string? employeeType, string? search, int limit, CancellationToken ct = default)
    {
        var (items, _) = await ListEmployeesPagedAsync(
            1, limit, search, null, employeeType, "Active", null, ct);
        return items.Select(e => e.Name).Distinct(StringComparer.OrdinalIgnoreCase).OrderBy(n => n).ToList();
    }

    public async Task<HrEmployeeDetailDto?> GetEmployeeAsync(Guid id, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = new NpgsqlCommand(
            """
            SELECT e.id, e.employee_code, e.name, e.employee_type,
                   COALESCE(e.employment_type, 'Permanent') AS employment_type,
                   e.department_id, d.name AS department_name,
                   e.designation_id, g.name AS designation_name,
                   e.driver_id, e.email, e.phone,
                   e.date_of_joining, e.date_of_birth, e.gender, e.address,
                   e.bank_account, e.bank_ifsc, e.pan,
                   e.basic_salary, COALESCE(e.daily_wage, 0) AS daily_wage,
                   e.hra, e.da, e.conveyance, e.other_allowance, e.advance,
                   e.pf_applicable, COALESCE(e.esi_applicable, FALSE) AS esi_applicable,
                   COALESCE(e.insurance_applicable, TRUE) AS insurance_applicable,
                   COALESCE(e.insurance_amount, 0) AS insurance_amount,
                   e.contract_end_date,
                   e.license_number, e.license_expiry, e.assigned_vehicle_id,
                   COALESCE(e.route_allowance, 0) AS route_allowance,
                   COALESCE(e.fuel_allowance, 0) AS fuel_allowance,
                   COALESCE(e.loading_allowance, 0) AS loading_allowance,
                   COALESCE(e.halting_allowance, 0) AS halting_allowance,
                   COALESCE(e.driver_bhatta, 0) AS driver_bhatta,
                   e.status, e.created_at
            FROM hr_employees e
            LEFT JOIN hr_departments d ON d.id = e.department_id AND d.company_id = @p_company_id
            LEFT JOIN hr_designations g ON g.id = e.designation_id
            WHERE e.id = @p_id AND e.company_id = @p_company_id
            """, conn);
        cmd.Parameters.AddWithValue("p_company_id", CompanyId);
        cmd.Parameters.AddWithValue("p_id", id);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        return await r.ReadAsync(ct) ? ReadEmployeeDetail(r) : null;
    }

    public async Task<Guid> SaveEmployeeAsync(SaveEmployeeRequest body, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        if (body.Id.HasValue)
            await EnsureEmployeeAsync(conn, body.Id.Value, ct);
        if (body.DepartmentId.HasValue)
            await EnsureDepartmentAsync(conn, body.DepartmentId.Value, ct);
        await using var cmd = new NpgsqlCommand(
            @"SELECT sp_hr_save_employee(
                @p_company_id, @p_id, @p_code, @p_name, @p_type, @p_emp_type, @p_dept, @p_desig, @p_driver,
                @p_email, @p_phone, @p_doj, @p_dob, @p_gender, @p_address,
                @p_bank, @p_ifsc, @p_pan, @p_basic, @p_daily, @p_hra, @p_da, @p_conv,
                @p_other, @p_advance, @p_pf, @p_esi, @p_ins, @p_ins_amt, @p_contract_end,
                @p_license, @p_license_exp, @p_vehicle, @p_route, @p_fuel, @p_load, @p_halt, @p_bhatta, @p_status)", conn);
        cmd.Parameters.Add(NpgsqlParameterHelper.Uuid("p_company_id", CompanyId));
        cmd.Parameters.Add(NpgsqlParameterHelper.Uuid("p_id", body.Id));
        cmd.Parameters.Add(NpgsqlParameterHelper.Varchar("p_code", body.EmployeeCode));
        cmd.Parameters.Add(NpgsqlParameterHelper.Varchar("p_name", body.Name));
        cmd.Parameters.Add(NpgsqlParameterHelper.Varchar("p_type", body.EmployeeType ?? "Staff"));
        cmd.Parameters.Add(NpgsqlParameterHelper.Varchar("p_emp_type", body.EmploymentType ?? "Permanent"));
        cmd.Parameters.Add(NpgsqlParameterHelper.Uuid("p_dept", body.DepartmentId));
        cmd.Parameters.Add(NpgsqlParameterHelper.Uuid("p_desig", body.DesignationId));
        cmd.Parameters.Add(NpgsqlParameterHelper.Varchar("p_driver", body.DriverId));
        cmd.Parameters.Add(NpgsqlParameterHelper.Varchar("p_email", body.Email));
        cmd.Parameters.Add(NpgsqlParameterHelper.Varchar("p_phone", body.Phone));
        cmd.Parameters.Add(NpgsqlParameterHelper.Date("p_doj", body.DateOfJoining));
        cmd.Parameters.Add(NpgsqlParameterHelper.Date("p_dob", body.DateOfBirth));
        cmd.Parameters.Add(NpgsqlParameterHelper.Varchar("p_gender", body.Gender));
        cmd.Parameters.Add(NpgsqlParameterHelper.Text("p_address", body.Address));
        cmd.Parameters.Add(NpgsqlParameterHelper.Varchar("p_bank", body.BankAccount));
        cmd.Parameters.Add(NpgsqlParameterHelper.Varchar("p_ifsc", body.BankIfsc));
        cmd.Parameters.Add(NpgsqlParameterHelper.Varchar("p_pan", body.Pan));
        cmd.Parameters.Add(NpgsqlParameterHelper.Numeric("p_basic", body.BasicSalary));
        cmd.Parameters.Add(NpgsqlParameterHelper.Numeric("p_daily", body.DailyWage));
        cmd.Parameters.Add(NpgsqlParameterHelper.Numeric("p_hra", body.Hra));
        cmd.Parameters.Add(NpgsqlParameterHelper.Numeric("p_da", body.Da));
        cmd.Parameters.Add(NpgsqlParameterHelper.Numeric("p_conv", body.Conveyance));
        cmd.Parameters.Add(NpgsqlParameterHelper.Numeric("p_other", body.OtherAllowance));
        cmd.Parameters.Add(NpgsqlParameterHelper.Numeric("p_advance", body.Advance));
        cmd.Parameters.Add(NpgsqlParameterHelper.Bool("p_pf", body.PfApplicable));
        cmd.Parameters.Add(NpgsqlParameterHelper.Bool("p_esi", body.EsiApplicable));
        cmd.Parameters.Add(NpgsqlParameterHelper.Bool("p_ins", body.InsuranceApplicable));
        cmd.Parameters.Add(NpgsqlParameterHelper.Numeric("p_ins_amt", body.InsuranceAmount));
        cmd.Parameters.Add(NpgsqlParameterHelper.Date("p_contract_end", body.ContractEndDate));
        cmd.Parameters.Add(NpgsqlParameterHelper.Varchar("p_license", body.LicenseNumber));
        cmd.Parameters.Add(NpgsqlParameterHelper.Date("p_license_exp", body.LicenseExpiry));
        cmd.Parameters.Add(NpgsqlParameterHelper.Varchar("p_vehicle", body.AssignedVehicleId));
        cmd.Parameters.Add(NpgsqlParameterHelper.Numeric("p_route", body.RouteAllowance));
        cmd.Parameters.Add(NpgsqlParameterHelper.Numeric("p_fuel", body.FuelAllowance));
        cmd.Parameters.Add(NpgsqlParameterHelper.Numeric("p_load", body.LoadingAllowance));
        cmd.Parameters.Add(NpgsqlParameterHelper.Numeric("p_halt", body.HaltingAllowance));
        cmd.Parameters.Add(NpgsqlParameterHelper.Numeric("p_bhatta", body.DriverBhatta));
        cmd.Parameters.Add(NpgsqlParameterHelper.Varchar("p_status", body.Status ?? "Active"));
        var result = await cmd.ExecuteScalarAsync(ct);
        return result is Guid g ? g : Guid.Parse(result!.ToString()!);
    }

    public async Task DeleteEmployeeAsync(Guid id, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = new NpgsqlCommand("SELECT sp_hr_delete_employee(@p_company_id, @p_id)", conn);
        cmd.Parameters.AddWithValue("p_company_id", CompanyId);
        cmd.Parameters.AddWithValue("p_id", id);
        await cmd.ExecuteScalarAsync(ct);
    }

    public async Task<List<HrAttendanceDto>> ListAttendanceAsync(
        DateOnly? date, Guid? employeeId, int? month, int? year, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = new NpgsqlCommand(
            "SELECT * FROM sp_hr_list_attendance(@p_company_id, @p_date, @p_emp, @p_month, @p_year)", conn);
        cmd.Parameters.AddWithValue("p_company_id", CompanyId);
        cmd.Parameters.AddWithValue("p_date", date.HasValue ? date.Value : DBNull.Value);
        cmd.Parameters.AddWithValue("p_emp", (object?)employeeId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("p_month", (object?)month ?? DBNull.Value);
        cmd.Parameters.AddWithValue("p_year", (object?)year ?? DBNull.Value);

        var list = new List<HrAttendanceDto>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
            list.Add(new HrAttendanceDto(
                r.GetGuid(0), r.GetGuid(1), r.GetString(2), r.GetString(3),
                r.GetDateTime(4).Date, r.GetString(5),
                ReadTime(r, 6), ReadTime(r, 7),
                r.GetDecimal(8), r.IsDBNull(9) ? null : r.GetString(9)));
        return list;
    }

    public async Task<Guid> MarkAttendanceAsync(MarkAttendanceRequest body, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await EnsureEmployeeAsync(conn, body.EmployeeId, ct);
        return await UpsertAttendanceAsync(conn, body.EmployeeId, body.Date, body.Status,
            body.CheckIn, body.CheckOut, body.OvertimeHours, body.Remarks, ct);
    }

    public async Task<int> BulkAttendanceAsync(BulkAttendanceRequest body, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        var count = 0;
        foreach (var empId in body.EmployeeIds)
        {
            await EnsureEmployeeAsync(conn, empId, ct);
            await UpsertAttendanceAsync(conn, empId, body.Date, body.Status ?? "Present",
                null, null, 0, null, ct);
            count++;
        }
        return count;
    }

    public async Task<List<HrLeaveTypeDto>> ListLeaveTypesAsync(CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = new NpgsqlCommand("SELECT * FROM sp_hr_list_leave_types(@p_company_id)", conn);
        cmd.Parameters.AddWithValue("p_company_id", CompanyId);
        var list = new List<HrLeaveTypeDto>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
            list.Add(new HrLeaveTypeDto(
                r.GetGuid(0), r.GetString(1), r.GetString(2),
                r.GetInt32(3), r.GetBoolean(4), r.GetString(5)));
        return list;
    }

    public async Task<List<HrLeaveRequestDto>> ListLeaveRequestsAsync(
        string? status, Guid? employeeId, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = new NpgsqlCommand(
            "SELECT * FROM sp_hr_list_leave_requests(@p_company_id, @p_status, @p_emp)", conn);
        cmd.Parameters.AddWithValue("p_company_id", CompanyId);
        cmd.Parameters.AddWithValue("p_status", (object?)status ?? DBNull.Value);
        cmd.Parameters.AddWithValue("p_emp", (object?)employeeId ?? DBNull.Value);

        var list = new List<HrLeaveRequestDto>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
            list.Add(new HrLeaveRequestDto(
                r.GetGuid(0), r.GetGuid(1), r.GetString(2), r.GetString(3),
                r.GetGuid(4), r.GetString(5),
                r.GetDateTime(6).Date, r.GetDateTime(7).Date, r.GetDecimal(8),
                r.IsDBNull(9) ? null : r.GetString(9), r.GetString(10),
                r.IsDBNull(11) ? null : r.GetString(11),
                r.IsDBNull(12) ? null : r.GetDateTime(12),
                r.GetDateTime(13)));
        return list;
    }

    public async Task<Guid> ApplyLeaveAsync(ApplyLeaveRequest body, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await EnsureEmployeeAsync(conn, body.EmployeeId, ct);
        await using var cmd = new NpgsqlCommand(
            "SELECT sp_hr_apply_leave(@cid, @emp, @type, @from, @to, @days, @reason)", conn);
        cmd.Parameters.AddWithValue("cid", CompanyId);
        cmd.Parameters.AddWithValue("emp", body.EmployeeId);
        cmd.Parameters.AddWithValue("type", body.LeaveTypeId);
        cmd.Parameters.AddWithValue("from", PgDate(body.FromDate));
        cmd.Parameters.AddWithValue("to", PgDate(body.ToDate));
        cmd.Parameters.AddWithValue("days", body.Days);
        cmd.Parameters.AddWithValue("reason", (object?)body.Reason ?? DBNull.Value);
        var result = await cmd.ExecuteScalarAsync(ct);
        return result is Guid g ? g : Guid.Parse(result!.ToString()!);
    }

    public async Task ApproveLeaveAsync(Guid id, string? approvedBy, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await EnsureLeaveRequestAsync(conn, id, ct);
        await using var cmd = new NpgsqlCommand("SELECT sp_hr_approve_leave(@p_id, @p_by)", conn);
        cmd.Parameters.AddWithValue("p_id", id);
        cmd.Parameters.AddWithValue("p_by", approvedBy ?? "admin");
        await cmd.ExecuteScalarAsync(ct);
    }

    public async Task RejectLeaveAsync(Guid id, string? approvedBy, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await EnsureLeaveRequestAsync(conn, id, ct);
        await using var cmd = new NpgsqlCommand("SELECT sp_hr_reject_leave(@p_id, @p_by)", conn);
        cmd.Parameters.AddWithValue("p_id", id);
        cmd.Parameters.AddWithValue("p_by", approvedBy ?? "admin");
        await cmd.ExecuteScalarAsync(ct);
    }

    public async Task<List<HrHolidayDto>> ListHolidaysAsync(int? year, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = new NpgsqlCommand("SELECT * FROM sp_hr_list_holidays(@p_company_id, @p_year)", conn);
        cmd.Parameters.AddWithValue("p_company_id", CompanyId);
        cmd.Parameters.AddWithValue("p_year", (object?)year ?? DBNull.Value);
        var list = new List<HrHolidayDto>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
            list.Add(new HrHolidayDto(
                r.GetGuid(0), r.GetDateTime(1).Date, r.GetString(2), r.GetInt32(3)));
        return list;
    }

    private static HrEmployeeDto ReadEmployeeList(IDataReader r) => new(
        DataReaderCols.ColGuid(r, "id"),
        DataReaderCols.ColString(r, "employee_code"),
        DataReaderCols.ColString(r, "name"),
        DataReaderCols.ColString(r, "employee_type"),
        DataReaderCols.ColString(r, "employment_type"),
        DataReaderCols.ColGuidN(r, "department_id"),
        DataReaderCols.ColStringN(r, "department_name"),
        DataReaderCols.ColGuidN(r, "designation_id"),
        DataReaderCols.ColStringN(r, "designation_name"),
        DataReaderCols.ColStringN(r, "driver_id"),
        DataReaderCols.ColStringN(r, "email"),
        DataReaderCols.ColStringN(r, "phone"),
        DataReaderCols.ColDateOnlyN(r, "date_of_joining"),
        DataReaderCols.ColDecimal(r, "basic_salary"),
        DataReaderCols.ColDecimalN(r, "daily_wage"),
        DataReaderCols.ColDecimal(r, "hra"),
        DataReaderCols.ColDecimal(r, "da"),
        DataReaderCols.ColDecimal(r, "conveyance"),
        DataReaderCols.ColDecimal(r, "other_allowance"),
        DataReaderCols.ColDecimal(r, "advance"),
        DataReaderCols.ColBool(r, "pf_applicable"),
        DataReaderCols.ColBool(r, "esi_applicable"),
        DataReaderCols.ColBool(r, "insurance_applicable"),
        DataReaderCols.ColDecimal(r, "insurance_amount"),
        DataReaderCols.ColDateOnlyN(r, "contract_end_date"),
        DataReaderCols.ColString(r, "status"),
        DataReaderCols.ColDateTimeN(r, "created_at") ?? DateTime.UtcNow);

    private static HrEmployeeDetailDto ReadEmployeeDetail(IDataReader r) => new(
        DataReaderCols.ColGuid(r, "id"),
        DataReaderCols.ColString(r, "employee_code"),
        DataReaderCols.ColString(r, "name"),
        DataReaderCols.ColString(r, "employee_type"),
        DataReaderCols.ColString(r, "employment_type"),
        DataReaderCols.ColGuidN(r, "department_id"),
        DataReaderCols.ColStringN(r, "department_name"),
        DataReaderCols.ColGuidN(r, "designation_id"),
        DataReaderCols.ColStringN(r, "designation_name"),
        DataReaderCols.ColStringN(r, "driver_id"),
        DataReaderCols.ColStringN(r, "email"),
        DataReaderCols.ColStringN(r, "phone"),
        DataReaderCols.ColDateOnlyN(r, "date_of_joining"),
        DataReaderCols.ColDateOnlyN(r, "date_of_birth"),
        DataReaderCols.ColStringN(r, "gender"),
        DataReaderCols.ColStringN(r, "address"),
        DataReaderCols.ColStringN(r, "bank_account"),
        DataReaderCols.ColStringN(r, "bank_ifsc"),
        DataReaderCols.ColStringN(r, "pan"),
        DataReaderCols.ColDecimal(r, "basic_salary"),
        DataReaderCols.ColDecimalN(r, "daily_wage"),
        DataReaderCols.ColDecimal(r, "hra"),
        DataReaderCols.ColDecimal(r, "da"),
        DataReaderCols.ColDecimal(r, "conveyance"),
        DataReaderCols.ColDecimal(r, "other_allowance"),
        DataReaderCols.ColDecimal(r, "advance"),
        DataReaderCols.ColBool(r, "pf_applicable"),
        DataReaderCols.ColBool(r, "esi_applicable"),
        DataReaderCols.ColBool(r, "insurance_applicable"),
        DataReaderCols.ColDecimal(r, "insurance_amount"),
        DataReaderCols.ColDateOnlyN(r, "contract_end_date"),
        DataReaderCols.ColStringN(r, "license_number"),
        DataReaderCols.ColDateOnlyN(r, "license_expiry"),
        DataReaderCols.ColStringN(r, "assigned_vehicle_id"),
        DataReaderCols.ColDecimalN(r, "route_allowance"),
        DataReaderCols.ColDecimalN(r, "fuel_allowance"),
        DataReaderCols.ColDecimalN(r, "loading_allowance"),
        DataReaderCols.ColDecimalN(r, "halting_allowance"),
        DataReaderCols.ColDecimalN(r, "driver_bhatta"),
        DataReaderCols.ColString(r, "status"),
        DataReaderCols.ColDateTimeN(r, "created_at") ?? DateTime.UtcNow);

    private async Task<NpgsqlConnection> OpenAsync(CancellationToken ct)
    {
        var conn = new NpgsqlConnection(ConnectionString);
        await conn.OpenAsync(ct);
        return conn;
    }

    private async Task EnsureEmployeeAsync(NpgsqlConnection conn, Guid employeeId, CancellationToken ct)
    {
        await using var cmd = new NpgsqlCommand("SELECT sp_hr_ensure_employee(@cid, @id)", conn);
        cmd.Parameters.AddWithValue("id", employeeId);
        cmd.Parameters.AddWithValue("cid", CompanyId);
        if (await cmd.ExecuteScalarAsync(ct) is not true)
            throw new InvalidOperationException("Employee not found.");
    }

    private async Task EnsureDepartmentAsync(NpgsqlConnection conn, Guid departmentId, CancellationToken ct)
    {
        await using var cmd = new NpgsqlCommand("SELECT sp_hr_ensure_department(@cid, @id)", conn);
        cmd.Parameters.AddWithValue("id", departmentId);
        cmd.Parameters.AddWithValue("cid", CompanyId);
        if (await cmd.ExecuteScalarAsync(ct) is not true)
            throw new InvalidOperationException("Department not found.");
    }

    private async Task EnsureLeaveRequestAsync(NpgsqlConnection conn, Guid leaveId, CancellationToken ct)
    {
        await using var cmd = new NpgsqlCommand("SELECT sp_hr_ensure_leave_request(@cid, @id)", conn);
        cmd.Parameters.AddWithValue("id", leaveId);
        cmd.Parameters.AddWithValue("cid", CompanyId);
        if (await cmd.ExecuteScalarAsync(ct) is not true)
            throw new InvalidOperationException("Leave request not found.");
    }

    private async Task<Guid> UpsertAttendanceAsync(
        NpgsqlConnection conn, Guid employeeId, DateOnly date, string status,
        TimeSpan? checkIn, TimeSpan? checkOut, decimal overtimeHours, string? remarks,
        CancellationToken ct)
    {
        await using var cmd = new NpgsqlCommand(
            "SELECT sp_hr_upsert_attendance(@cid, @emp, @date, @status, @in, @out, @ot, @remarks)", conn);
        cmd.Parameters.AddWithValue("cid", CompanyId);
        cmd.Parameters.AddWithValue("emp", employeeId);
        cmd.Parameters.AddWithValue("date", PgDate(date));
        cmd.Parameters.AddWithValue("status", status);
        cmd.Parameters.AddWithValue("in", (object?)checkIn ?? DBNull.Value);
        cmd.Parameters.AddWithValue("out", (object?)checkOut ?? DBNull.Value);
        cmd.Parameters.AddWithValue("ot", overtimeHours);
        cmd.Parameters.AddWithValue("remarks", (object?)remarks ?? DBNull.Value);
        var result = await cmd.ExecuteScalarAsync(ct);
        return result is Guid g ? g : Guid.Parse(result!.ToString()!);
    }

    private static object PgDate(DateOnly? value) => value.HasValue ? value.Value : DBNull.Value;

    private static TimeSpan? ReadTime(IDataReader r, int ord)
    {
        if (r.IsDBNull(ord)) return null;
        return r.GetValue(ord) switch
        {
            TimeSpan ts => ts,
            TimeOnly t => t.ToTimeSpan(),
            string s => TimeSpan.Parse(s),
            _ => null,
        };
    }
}
