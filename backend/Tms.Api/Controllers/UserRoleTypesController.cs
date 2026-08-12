using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tms.Api.DTOs;
using Tms.Api.Services;

namespace Tms.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/user-role-types")]
public class UserRoleTypesController(
    UserRoleTypeService roleTypes,
    RoleMenuService roleMenus,
    ITenantContext tenants) : ControllerBase
{
    bool CanManage() => TenantRoles.CanManageUsers(User.FindFirstValue(ClaimTypes.Role));

    Guid? CompanyId() => tenants.EffectiveCompanyId ?? tenants.AssignCompanyId;

    [HttpGet]
    public async Task<ActionResult<object>> List([FromQuery] bool activeOnly = true, CancellationToken ct = default)
    {
        if (!CanManage()) return Forbid();
        var companyId = CompanyId();
        if (companyId == null) return BadRequest(new ApiError("Company context required."));
        var items = await roleTypes.ListAsync(companyId.Value, activeOnly, ct);
        return Ok(new { roleTypes = items, items });
    }

    public record CreateUserRoleTypeRequest(string Name, string? Description = null);

    [HttpPost]
    public async Task<ActionResult<object>> Create([FromBody] CreateUserRoleTypeRequest body, CancellationToken ct)
    {
        if (!CanManage()) return Forbid();
        var companyId = CompanyId();
        if (companyId == null) return BadRequest(new ApiError("Company context required."));

        try
        {
            var created = await roleTypes.CreateAsync(companyId.Value, body.Name, body.Description, ct);
            // Seed default menus for the new role (Operator-style defaults)
            var name = UserRoleTypeService.NormalizeName(body.Name);
            await roleMenus.ResetRoleToDefaultsAsync(companyId.Value, name, ct);
            return Ok(created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiError(ex.Message));
        }
    }
}
