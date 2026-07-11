using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using Tms.Api.DTOs;
using Tms.Api.Services;

namespace Tms.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/payroll")]
public class PayrollController(PayrollService payroll) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<ActionResult<PayrollSummaryDto>> Summary(CancellationToken ct)
    {
        try
        {
            return Ok(await payroll.GetSummaryAsync(ct));
        }
        catch (PostgresException ex) when (ex.SqlState is "42883" or "42P01")
        {
            return StatusCode(503, new ApiError(
                "Payroll module is not installed. Run: npm run hr:install"));
        }
    }

    [HttpGet("runs")]
    public async Task<ActionResult<PagedResult<PayrollRunDto>>> ListRuns(
        [FromQuery] int? month,
        [FromQuery] int? year,
        [FromQuery] string? status,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        CancellationToken ct = default)
    {
        try
        {
            var (p, size) = QueryExtensions.NormalizePaging(page, pageSize);
            var filterStatus = string.IsNullOrWhiteSpace(status) || status == "(All)" ? null : status;
            var (items, total) = await payroll.ListRunsPagedAsync(
                p, size, search, month, year, filterStatus, ct);
            return Ok(new PagedResult<PayrollRunDto>(items, total, p, size));
        }
        catch (PostgresException ex) when (ex.SqlState is "42883" or "42P01")
        {
            return StatusCode(503, new ApiError("Payroll module is not installed. Run: npm run hr:install"));
        }
    }

    [HttpGet("runs/{id:guid}")]
    public async Task<ActionResult<PayrollRunDto>> GetRun(Guid id, CancellationToken ct)
    {
        var run = await payroll.GetRunAsync(id, ct);
        return run == null ? NotFound() : Ok(run);
    }

    [HttpGet("runs/{id:guid}/entries")]
    public async Task<ActionResult<IReadOnlyList<PayrollEntryDto>>> ListEntries(Guid id, CancellationToken ct)
    {
        try
        {
            return Ok(await payroll.ListEntriesAsync(id, ct));
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new ApiError(ex.Message));
        }
        catch (PostgresException ex) when (ex.SqlState is "42883" or "42P01")
        {
            return StatusCode(503, new ApiError("Payroll entries are not installed. Run: npm run hr:install"));
        }
    }

    [HttpGet("runs/{id:guid}/accounting")]
    public async Task<ActionResult<IReadOnlyList<PayrollAccountingAttendantDto>>> ListAccounting(Guid id, CancellationToken ct)
        => Ok(await payroll.ListAttendantsAsync(id, ct));

    [HttpPost("generate")]
    public async Task<ActionResult<object>> Generate([FromBody] GeneratePayrollRequest body, CancellationToken ct)
    {
        try
        {
            var user = User.FindFirstValue(ClaimTypes.Name) ?? User.Identity?.Name ?? "system";
            var id = await payroll.GenerateAsync(body.Month, body.Year, user, ct);
            var run = await payroll.GetRunAsync(id, ct);
            return Ok(new { id, run });
        }
        catch (PostgresException ex)
        {
            return BadRequest(new ApiError(ex.MessageText));
        }
    }

    [HttpPost("runs/{id:guid}/process")]
    public async Task<ActionResult<object>> Process(Guid id, CancellationToken ct)
    {
        try
        {
            await payroll.ProcessAsync(id, ct);
            return Ok(new { message = "Payroll processed successfully." });
        }
        catch (PostgresException ex)
        {
            return BadRequest(new ApiError(ex.MessageText));
        }
    }

    [HttpPost("runs/{id:guid}/pay")]
    public async Task<ActionResult<object>> Pay(Guid id, [FromBody] PayPayrollRequest body, CancellationToken ct)
    {
        try
        {
            var (voucherId, voucherNo) = await payroll.MarkPaidAsync(id, body.PaymentMode, ct);
            return Ok(new
            {
                message = "Payroll marked as paid and posted to accounting.",
                voucherId,
                voucherNo,
            });
        }
        catch (PostgresException ex)
        {
            return BadRequest(new ApiError(ex.MessageText));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiError(ex.Message));
        }
    }

    [HttpDelete("runs/{id:guid}")]
    public async Task<ActionResult<object>> Cancel(Guid id, CancellationToken ct)
    {
        try
        {
            await payroll.CancelAsync(id, ct);
            return Ok(new { message = "Payroll run cancelled." });
        }
        catch (PostgresException ex)
        {
            return BadRequest(new ApiError(ex.MessageText));
        }
    }

    [HttpGet("settings")]
    public async Task<ActionResult<IReadOnlyList<PayrollSettingDto>>> Settings(CancellationToken ct)
    {
        try
        {
            return Ok(await payroll.ListSettingsAsync(ct));
        }
        catch (PostgresException ex) when (ex.SqlState is "42883" or "42P01")
        {
            return StatusCode(503, new ApiError(
                "Payroll settings are not installed. Run: npm run hr:install"));
        }
    }

    [HttpPut("settings")]
    public async Task<ActionResult<object>> UpdateSetting([FromBody] UpdatePayrollSettingRequest body, CancellationToken ct)
    {
        try
        {
            await payroll.UpdateSettingAsync(body.Key, body.Value, ct);
            return Ok(new { message = "Setting updated." });
        }
        catch (PostgresException ex) when (ex.SqlState is "42883" or "42P01")
        {
            return StatusCode(503, new ApiError(
                "Payroll settings are not installed. Run: npm run hr:install"));
        }
    }

    [HttpGet("payslips")]
    public async Task<ActionResult<PagedResult<PayslipListItemDto>>> Payslips(
        [FromQuery] Guid? runId, [FromQuery] string? employeeId,
        [FromQuery] int? month, [FromQuery] int? year,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        CancellationToken ct = default)
    {
        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize);
        var (items, total) = await payroll.ListPayslipsPagedAsync(
            p, size, search, runId, employeeId, month, year, ct);
        return Ok(new PagedResult<PayslipListItemDto>(items, total, p, size));
    }

    [HttpGet("payslips/{entryId:guid}")]
    public async Task<ActionResult<PayslipDto>> GetPayslip(Guid entryId, CancellationToken ct)
    {
        var slip = await payroll.GetPayslipAsync(entryId, ct);
        return slip == null ? NotFound() : Ok(slip);
    }

    [HttpGet("salary-register")]
    public async Task<ActionResult<IReadOnlyList<SalaryRegisterRowDto>>> SalaryRegister(
        [FromQuery] int? month, [FromQuery] int? year, CancellationToken ct)
        => Ok(await payroll.SalaryRegisterAsync(month, year, ct));
}
