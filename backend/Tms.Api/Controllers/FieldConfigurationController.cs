using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tms.Api.DTOs;
using Tms.Api.Services;

namespace Tms.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/field-configurations")]
public class FieldConfigurationController(FieldConfigurationService fieldConfig, ITenantContext tenants) : ControllerBase
{
    bool CanManage() => TenantRoles.CanManageUsers(User.FindFirstValue(ClaimTypes.Role));

    /// <summary>Get active field configuration for a module (Booking | LR). Available to all staff for form rendering.</summary>
    [HttpGet]
    public async Task<ActionResult<object>> List([FromQuery] string module, CancellationToken ct)
    {
        if (!FieldConfigurationCatalog.IsKnownModule(module))
            return BadRequest(new ApiError("module must be 'Booking' or 'LR'."));

        try
        {
            var items = await fieldConfig.GetModuleAsync(module, ct);
            return Ok(new { module = FieldConfigurationCatalog.NormalizeModule(module), items });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiError(ex.Message));
        }
    }

    /// <summary>Bulk update field configuration for a module. Admin only.</summary>
    [HttpPut]
    public async Task<ActionResult<object>> Save(
        [FromQuery] string module,
        [FromBody] FieldConfigurationSaveRequest body,
        CancellationToken ct)
    {
        if (!CanManage()) return Forbid();
        if (!FieldConfigurationCatalog.IsKnownModule(module))
            return BadRequest(new ApiError("module must be 'Booking' or 'LR'."));
        if (body?.Items == null)
            return BadRequest(new ApiError("items are required."));

        try
        {
            var items = await fieldConfig.SaveModuleAsync(module, body.Items, ct);
            return Ok(new { module = FieldConfigurationCatalog.NormalizeModule(module), items });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiError(ex.Message));
        }
    }

    /// <summary>Ensure seed rows exist for the current company (idempotent). Admin only.</summary>
    [HttpPost("ensure-defaults")]
    public async Task<ActionResult<object>> EnsureDefaults(CancellationToken ct)
    {
        if (!CanManage()) return Forbid();
        var companyId = tenants.EffectiveCompanyId ?? tenants.AssignCompanyId;
        if (companyId == null) return BadRequest(new ApiError("Company context required."));
        await fieldConfig.EnsureSeededAsync(companyId.Value, ct: ct);
        var booking = await fieldConfig.GetModuleAsync(FieldConfigurationCatalog.ModuleBooking, ct);
        var lr = await fieldConfig.GetModuleAsync(FieldConfigurationCatalog.ModuleLr, ct);
        return Ok(new { booking, lr });
    }
}

public sealed class FieldConfigurationSaveRequest
{
    public List<FieldConfigurationUpdateItem> Items { get; set; } = [];
}
