using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tms.Api.DTOs;
using Tms.Api.Services;

namespace Tms.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/document-numbering")]
public class DocumentNumberingController(
    DocumentNumberService documentNumbers,
    ITenantContext tenants,
    IBranchContext branches) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<object>> List([FromQuery] Guid? branchId, CancellationToken ct)
    {
        var companyId = tenants.AssignCompanyId ?? TenantContext.DefaultCompanyId;
        try
        {
            var filterBranch = branchId ?? branches.AssignBranchId;
            var rows = await documentNumbers.ListConfigsAsync(companyId, filterBranch, ct);
            return Ok(new
            {
                companyId,
                activeFinancialYear = DocumentNumberService.GetFinancialYear(DateOnly.FromDateTime(DateTime.UtcNow)),
                items = rows,
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiError(ex.Message));
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<object>> Update(Guid id, [FromBody] UpdateDocumentNumberConfigRequest body, CancellationToken ct)
    {
        var companyId = tenants.AssignCompanyId ?? TenantContext.DefaultCompanyId;
        try
        {
            var updated = await documentNumbers.UpdateConfigAsync(id, companyId, body, ct);
            return Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiError(ex.Message));
        }
    }

    [HttpPost("ensure-defaults")]
    public async Task<ActionResult<object>> EnsureDefaults([FromQuery] Guid? branchId, CancellationToken ct)
    {
        var companyId = tenants.AssignCompanyId ?? TenantContext.DefaultCompanyId;
        try
        {
            var bid = DocumentNumberService.RequireBranchId(branchId ?? branches.AssignBranchId);
            await documentNumbers.EnsureDefaultsForBranchAsync(companyId, bid, ct);
            var rows = await documentNumbers.ListConfigsAsync(companyId, bid, ct);
            return Ok(new { items = rows });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiError(ex.Message));
        }
    }
}
