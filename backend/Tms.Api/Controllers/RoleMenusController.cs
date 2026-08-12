using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tms.Api.DTOs;
using Tms.Api.Services;

namespace Tms.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/role-menus")]
public class RoleMenusController(RoleMenuService roleMenus, UserRoleTypeService roleTypes, ITenantContext tenants) : ControllerBase
{
    bool CanManage() => TenantRoles.CanManageUsers(User.FindFirstValue(ClaimTypes.Role));

    Guid? CompanyId() => tenants.EffectiveCompanyId ?? tenants.AssignCompanyId;

    /// <summary>List provisioned User Role Types (system + custom).</summary>
    [HttpGet("role-types")]
    public async Task<ActionResult<object>> ListRoleTypes(CancellationToken ct)
    {
        if (!CanManage()) return Forbid();
        var companyId = CompanyId();
        if (companyId == null) return BadRequest(new ApiError("Company context required."));
        return Ok(new
        {
            roleTypes = await roleTypes.ListAsync(companyId.Value, true, ct),
            roles = await roleTypes.ListNamesAsync(companyId.Value, true, ct),
        });
    }

    [HttpGet]
    public async Task<ActionResult<object>> GetMatrix(CancellationToken ct)
    {
        if (!CanManage()) return Forbid();
        var companyId = CompanyId();
        if (companyId == null) return BadRequest(new ApiError("Company context required."));
        return Ok(await roleMenus.GetMatrixAsync(companyId.Value, ct));
    }

    /// <summary>
    /// Provision User Role Types for this company (seed default menu matrix per role).
    /// Body: { overwriteExisting?: bool } — when true, resets all roles to defaults.
    /// </summary>
    [HttpPost("provision")]
    public async Task<ActionResult<object>> Provision([FromBody] ProvisionRequest? body, CancellationToken ct)
    {
        if (!CanManage()) return Forbid();
        var companyId = CompanyId();
        if (companyId == null) return BadRequest(new ApiError("Company context required."));
        var overwrite = body?.OverwriteExisting == true;
        return Ok(await roleMenus.ProvisionCompanyRoleTypesAsync(companyId.Value, overwrite, ct));
    }

    public record ProvisionRequest(bool? OverwriteExisting = null);

    public record SaveRoleMenusRequest(string Role, List<MenuItemDto>? Items, bool? ResetToDefaults = null);
    public record MenuItemDto(string MenuKey, bool IsVisible);

    [HttpPut]
    public async Task<ActionResult<object>> Save([FromBody] SaveRoleMenusRequest body, CancellationToken ct)
    {
        if (!CanManage()) return Forbid();
        var companyId = CompanyId();
        if (companyId == null) return BadRequest(new ApiError("Company context required."));
        if (string.IsNullOrWhiteSpace(body.Role))
            return BadRequest(new ApiError("User Role Type is required."));

        try
        {
            if (body.ResetToDefaults == true)
            {
                await roleMenus.ResetRoleToDefaultsAsync(companyId.Value, body.Role, ct);
            }
            else
            {
                var items = (body.Items ?? []).Select(i => (i.MenuKey, i.IsVisible));
                await roleMenus.SaveRoleAsync(companyId.Value, body.Role, items, ct);
            }
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiError(ex.Message));
        }

        return Ok(await roleMenus.GetMatrixAsync(companyId.Value, ct));
    }
}
