using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using Tms.Api.DTOs;
using Tms.Api.Services;

namespace Tms.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/hr")]
public class HrController(HrService hr, DriverSyncService driverSync) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<ActionResult<HrSummaryDto>> Summary(CancellationToken ct)
    {
        try
        {
            return Ok(await hr.GetSummaryAsync(ct));
        }
        catch (PostgresException)
        {
            return StatusCode(503, new ApiError(
                "HR module is not installed. Run: npm run hr:install"));
        }
    }

    [HttpGet("departments")]
    public async Task<ActionResult<IReadOnlyList<HrDepartmentDto>>> Departments(CancellationToken ct)
        => Ok(await hr.ListDepartmentsAsync(ct));

    [HttpPost("departments")]
    public async Task<ActionResult<object>> SaveDepartment([FromBody] SaveDepartmentRequest body, CancellationToken ct)
    {
        try
        {
            var id = await hr.SaveDepartmentAsync(body, ct);
            return Ok(new { id });
        }
        catch (PostgresException ex) { return BadRequest(new ApiError(ex.MessageText)); }
    }

    [HttpGet("designations")]
    public async Task<ActionResult<IReadOnlyList<HrDesignationDto>>> Designations(CancellationToken ct)
        => Ok(await hr.ListDesignationsAsync(ct));

    [HttpGet("employees")]
    public async Task<ActionResult<PagedResult<HrEmployeeDto>>> Employees(
        [FromQuery] Guid? departmentId, [FromQuery] string? employeeType,
        [FromQuery] string? status, [FromQuery] string? employmentType,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        CancellationToken ct = default)
    {
        try
        {
            var (p, size) = QueryExtensions.NormalizePaging(page, pageSize);
            var (items, total) = await hr.ListEmployeesPagedAsync(
                p, size, search, departmentId, employeeType, status, employmentType, ct);
            return Ok(new PagedResult<HrEmployeeDto>(items, total, p, size));
        }
        catch (PostgresException ex) when (ex.SqlState is "42883" or "42P01")
        {
            return StatusCode(503, new ApiError(
                "HR employee list is not installed. Run: npm run hr:install"));
        }
    }

    [HttpGet("employees/{id:guid}")]
    public async Task<ActionResult<HrEmployeeDetailDto>> GetEmployee(Guid id, CancellationToken ct)
    {
        var emp = await hr.GetEmployeeAsync(id, ct);
        return emp == null ? NotFound() : Ok(emp);
    }

    [HttpPost("employees")]
    public async Task<ActionResult<object>> SaveEmployee([FromBody] JsonElement body, CancellationToken ct)
    {
        var request = HrEmployeeRequestMapper.FromJsonElement(body);
        if (string.IsNullOrWhiteSpace(request.EmployeeCode))
            return BadRequest(new ApiError("Employee code is required."));
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new ApiError("Name is required."));
        try
        {
            var id = await hr.SaveEmployeeAsync(request, ct);
            if (string.Equals(request.EmployeeType, "Driver", StringComparison.OrdinalIgnoreCase)
                && !string.IsNullOrWhiteSpace(request.Name))
            {
                await driverSync.EnsureDriverByNameAsync(request.Name, request.Phone, request.LicenseNumber, ct);
            }
            return Ok(new { id });
        }
        catch (PostgresException ex)
        {
            if (ex.SqlState == "42883" && ex.MessageText.Contains("sp_hr_", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new ApiError("HR database procedures are missing or outdated. On the server run: bash deploy/fix-employee-save.sh then retry."));
            return BadRequest(new ApiError(ex.MessageText));
        }
    }

    [HttpDelete("employees/{id:guid}")]
    public async Task<ActionResult<object>> DeleteEmployee(Guid id, CancellationToken ct)
    {
        await hr.DeleteEmployeeAsync(id, ct);
        return Ok(new { message = "Employee deleted." });
    }

    [HttpGet("attendance")]
    public async Task<ActionResult<IReadOnlyList<HrAttendanceDto>>> Attendance(
        [FromQuery] string? date, [FromQuery] Guid? employeeId,
        [FromQuery] int? month, [FromQuery] int? year, CancellationToken ct)
    {
        try
        {
            DateOnly? d = null;
            if (date != null)
            {
                if (!ApiParseHelper.TryParseDate(date, out var parsed))
                    return BadRequest(new ApiError("Invalid date format. Use YYYY-MM-DD."));
                d = parsed;
            }
            return Ok(await hr.ListAttendanceAsync(d, employeeId, month, year, ct));
        }
        catch (FormatException)
        {
            return BadRequest(new ApiError("Invalid date format. Use YYYY-MM-DD."));
        }
        catch (PostgresException ex) when (ex.SqlState is "42883" or "42P01")
        {
            return StatusCode(503, new ApiError(
                "HR attendance is not installed. Run: npm run hr:install"));
        }
    }

    [HttpPost("attendance")]
    public async Task<ActionResult<object>> MarkAttendance([FromBody] MarkAttendanceRequest body, CancellationToken ct)
    {
        try
        {
            var id = await hr.MarkAttendanceAsync(body, ct);
            return Ok(new { id });
        }
        catch (PostgresException ex) { return BadRequest(new ApiError(ex.MessageText)); }
    }

    [HttpPost("attendance/bulk")]
    public async Task<ActionResult<object>> BulkAttendance([FromBody] BulkAttendanceRequest body, CancellationToken ct)
    {
        try
        {
            var count = await hr.BulkAttendanceAsync(body, ct);
            return Ok(new { count });
        }
        catch (PostgresException ex) { return BadRequest(new ApiError(ex.MessageText)); }
    }

    [HttpGet("leave-types")]
    public async Task<ActionResult<IReadOnlyList<HrLeaveTypeDto>>> LeaveTypes(CancellationToken ct)
        => Ok(await hr.ListLeaveTypesAsync(ct));

    [HttpGet("leaves")]
    public async Task<ActionResult<IReadOnlyList<HrLeaveRequestDto>>> Leaves(
        [FromQuery] string? status, [FromQuery] Guid? employeeId, CancellationToken ct)
        => Ok(await hr.ListLeaveRequestsAsync(status, employeeId, ct));

    [HttpPost("leaves")]
    public async Task<ActionResult<object>> ApplyLeave([FromBody] ApplyLeaveRequest body, CancellationToken ct)
    {
        try
        {
            var id = await hr.ApplyLeaveAsync(body, ct);
            return Ok(new { id });
        }
        catch (PostgresException ex) { return BadRequest(new ApiError(ex.MessageText)); }
    }

    [HttpPost("leaves/{id:guid}/approve")]
    public async Task<ActionResult<object>> ApproveLeave(Guid id, CancellationToken ct)
    {
        try
        {
            var user = User.FindFirstValue(ClaimTypes.Name) ?? "admin";
            await hr.ApproveLeaveAsync(id, user, ct);
            return Ok(new { message = "Leave approved." });
        }
        catch (PostgresException ex) { return BadRequest(new ApiError(ex.MessageText)); }
    }

    [HttpPost("leaves/{id:guid}/reject")]
    public async Task<ActionResult<object>> RejectLeave(Guid id, CancellationToken ct)
    {
        try
        {
            var user = User.FindFirstValue(ClaimTypes.Name) ?? "admin";
            await hr.RejectLeaveAsync(id, user, ct);
            return Ok(new { message = "Leave rejected." });
        }
        catch (PostgresException ex) { return BadRequest(new ApiError(ex.MessageText)); }
    }

    [HttpGet("holidays")]
    public async Task<ActionResult<IReadOnlyList<HrHolidayDto>>> Holidays(
        [FromQuery] int? year, CancellationToken ct)
        => Ok(await hr.ListHolidaysAsync(year, ct));
}
