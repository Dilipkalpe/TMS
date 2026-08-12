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
    IQueryable<LorryReceipt> BaseLrs(bool includeClosed = false) =>
        tenants.Filter(branches.Filter(db.LorryReceipts.AsNoTracking().Include(l => l.Branch)))
            .Where(l => includeClosed || l.Status != LrStatuses.Closed);

    [HttpGet("summary")]
    public async Task<ActionResult<object>> Summary(CancellationToken ct)
    {
        var all = tenants.Filter(branches.Filter(db.LorryReceipts.AsNoTracking()));
        var summary = await LrOperationsService.BuildStatusSummaryAsync(all, db, ct);
        return Ok(summary);
    }

    [HttpGet("status-summary")]
    public Task<ActionResult<object>> StatusSummary(CancellationToken ct) => Summary(ct);

    [HttpGet("queue")]
    public async Task<ActionResult<PagedResult<LrQueueItemDto>>> Queue(
        [FromQuery] string stage,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true,
        CancellationToken ct = default)
    {
        var normalized = LrOperationStages.Normalize(stage ?? "");
        if (string.IsNullOrWhiteSpace(stage) || !LrOperationStages.WorkflowFlow.Contains(normalized))
            return BadRequest(new ApiError($"Unknown stage. Use one of: {string.Join(", ", LrOperationStages.WorkflowFlow)}"));

        var includeClosed = normalized == LrOperationStages.Closed;
        var q = LrOperationsService.ApplyStageFilter(BaseLrs(includeClosed), db, normalized);
        q = SearchHelper.Filter(q, search);
        q = q.OrderByDescending(l => l.LrDate).ThenByDescending(l => l.LrNumber);

        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize);
        var (items, total, hasMore, approx) = await q.ToPagedListAsync(p, size, includeTotal, ct);

        var dtos = items.Select(l =>
        {
            var stageAction = LrOperationsService.NextActionLabel(normalized);
            var (_, step) = LrOperationsService.ResolveNextAction(l.Status);
            return new LrQueueItemDto(
                l.LrNumber,
                l.LrDate,
                l.Branch?.Name,
                l.Consignor,
                l.Consignee,
                l.FromCity,
                l.ToCity,
                l.VehicleNumber,
                l.CustomerName,
                l.BusinessType,
                l.Status,
                l.Freight,
                stageAction,
                LrOperationsService.ResolveProcessStep(normalized) ?? step);
        }).ToList();

        var missingVehicle = dtos
            .Where(d => string.IsNullOrWhiteSpace(d.Vehicle))
            .Select(d => d.LrNumber)
            .ToList();
        if (missingVehicle.Count > 0)
        {
            var map = await LrProcessService.LoadVehicleByLrAsync(db, missingVehicle, ct);
            for (var i = 0; i < dtos.Count; i++)
            {
                if (!string.IsNullOrWhiteSpace(dtos[i].Vehicle)) continue;
                if (map.TryGetValue(dtos[i].LrNumber, out var vehicle))
                    dtos[i] = dtos[i] with { Vehicle = vehicle };
            }
        }

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
    string? Customer,
    string? BusinessType,
    string Status,
    decimal Freight,
    string NextAction,
    string? ProcessStep);
