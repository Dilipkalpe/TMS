using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.DTOs;
using Tms.Api.Models;
using Tms.Api.Services;

namespace Tms.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/lr/operations")]
public class LrOperationsController(TmsDbContext db, ITenantContext tenants, IBranchContext branches) : ControllerBase
{
    IQueryable<LorryReceipt> BaseLrs() =>
        tenants.Filter(branches.Filter(db.LorryReceipts.AsNoTracking().Include(l => l.Branch)))
            .Where(l => l.Status != LrStatuses.Closed);

    [HttpGet("summary")]
    public async Task<ActionResult<object>> Summary(CancellationToken ct)
    {
        var counts = await LrOperationsService.CountByStageAsync(BaseLrs(), db, tenants, ct);
        var stages = LrOperationStages.All.Select(stage => new
        {
            stage,
            count = counts.GetValueOrDefault(stage),
            nextAction = LrOperationsService.NextActionLabel(stage),
            processStep = LrOperationsService.ResolveProcessStep(stage),
        });
        return Ok(new { counts, stages });
    }

    [HttpGet("queue")]
    public async Task<ActionResult<PagedResult<LrQueueItemDto>>> Queue(
        [FromQuery] string stage,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(stage) || !LrOperationStages.All.Contains(stage))
            return BadRequest(new ApiError($"Unknown stage. Use one of: {string.Join(", ", LrOperationStages.All)}"));

        if (stage == LrOperationStages.ExpenseApproval)
            return BadRequest(new ApiError("Use GET /api/lr/process/expenses/pending for expense approval queue."));

        var q = LrOperationsService.ApplyStageFilter(BaseLrs(), db, stage);
        q = SearchHelper.Filter(q, search);
        q = q.OrderByDescending(l => l.LrDate).ThenByDescending(l => l.LrNumber);

        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize);
        var (items, total, hasMore, approx) = await q.ToPagedListAsync(p, size, includeTotal, ct);

        var processStep = LrOperationsService.ResolveProcessStep(stage);
        var nextAction = LrOperationsService.NextActionLabel(stage);
        var dtos = items.Select(l => new LrQueueItemDto(
            l.LrNumber,
            l.LrDate,
            l.Branch?.Name,
            l.Consignor,
            l.Consignee,
            l.FromCity,
            l.ToCity,
            l.VehicleNumber,
            l.BusinessType,
            l.Status,
            l.Freight,
            nextAction,
            processStep)).ToList();

        return Ok(new PagedResult<LrQueueItemDto>(dtos, total, p, size, hasMore, approx));
    }
}

public record LrQueueItemDto(
    string LrNumber,
    DateOnly? LrDate,
    string? BranchName,
    string? Consignor,
    string? Consignee,
    string? From,
    string? To,
    string? Vehicle,
    string? BusinessType,
    string Status,
    decimal Freight,
    string NextAction,
    string? ProcessStep);
