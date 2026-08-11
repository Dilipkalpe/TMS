using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tms.Api.Services;

namespace Tms.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/hub-transfer")]
public class HubTransferController(HubTransferService hub) : ControllerBase
{
    string? CurrentUser() => User.Identity?.Name;

    [HttpGet("summary")]
    public async Task<IActionResult> Summary([FromQuery] Guid? hubBranchId, CancellationToken ct)
    {
        try { return Ok(await hub.GetSummaryAsync(hubBranchId, ct)); }
        catch (HubTransferException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("lrs")]
    public async Task<IActionResult> ListLrs(
        [FromQuery] string? lrNo,
        [FromQuery] DateOnly? dateFrom,
        [FromQuery] DateOnly? dateTo,
        [FromQuery] Guid? hubBranchId,
        [FromQuery] string? destination,
        [FromQuery] string? status,
        [FromQuery] string? vehicleNo,
        [FromQuery] string? manifestNo,
        [FromQuery] string? customer,
        [FromQuery] string? search,
        [FromQuery] string? kpi,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        try
        {
            var (items, total) = await hub.ListLrsAsync(
                lrNo, dateFrom, dateTo, hubBranchId, destination, status, vehicleNo, manifestNo,
                customer, search, kpi, page, pageSize, ct);
            return Ok(new { items, total, page, pageSize, hasMore = page * pageSize < total });
        }
        catch (HubTransferException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("inbound-preview")]
    public async Task<IActionResult> InboundPreview(
        [FromQuery] string? loadingSheetNo,
        [FromQuery] string? vehicleNo,
        [FromQuery] string? manifestNo,
        CancellationToken ct)
    {
        try { return Ok(await hub.GetInboundPreviewAsync(loadingSheetNo, vehicleNo, manifestNo, ct)); }
        catch (HubTransferException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("manifests/{id:guid}")]
    public async Task<IActionResult> GetManifest(Guid id, CancellationToken ct)
    {
        try { return Ok(await hub.GetManifestAsync(id, ct)); }
        catch (HubTransferException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpPost("receive")]
    public async Task<IActionResult> Receive([FromBody] ReceiveAtHubRequest body, CancellationToken ct)
    {
        try { return Ok(await hub.ReceiveAtHubAsync(body, CurrentUser(), ct)); }
        catch (HubTransferException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("unload")]
    public async Task<IActionResult> Unload([FromBody] UnloadAtHubRequest body, CancellationToken ct)
    {
        try { return Ok(await hub.UnloadAtHubAsync(body, CurrentUser(), ct)); }
        catch (HubTransferException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("re-manifest")]
    public async Task<IActionResult> ReManifest([FromBody] CreateReManifestRequest body, CancellationToken ct)
    {
        try { return Ok(await hub.CreateReManifestAsync(body, CurrentUser(), ct)); }
        catch (HubTransferException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPut("manifests/{id:guid}/vehicle")]
    public async Task<IActionResult> AssignVehicle(Guid id, [FromBody] AssignVehicleRequest body, CancellationToken ct)
    {
        try { return Ok(await hub.AssignVehicleAsync(id, body, CurrentUser(), ct)); }
        catch (HubTransferException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("manifests/{id:guid}/dispatch")]
    public async Task<IActionResult> Dispatch(Guid id, [FromBody] DispatchManifestRequest? body, CancellationToken ct)
    {
        try { return Ok(await hub.DispatchManifestAsync(id, body ?? new DispatchManifestRequest(null, null), CurrentUser(), ct)); }
        catch (HubTransferException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("lrs/{lrNumber}/movements")]
    public async Task<IActionResult> Movements(string lrNumber, CancellationToken ct)
    {
        try { return Ok(await hub.GetMovementHistoryAsync(DocumentCodeRules.DecodePathId(lrNumber), ct)); }
        catch (HubTransferException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpGet("manifests/{id:guid}/print")]
    public async Task<IActionResult> ManifestPrint(Guid id, CancellationToken ct)
    {
        try { return Ok(await hub.GetManifestPrintAsync(id, ct)); }
        catch (HubTransferException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpGet("receive-report/{id:guid}")]
    public async Task<IActionResult> ReceiveReport(Guid id, CancellationToken ct)
    {
        try { return Ok(await hub.GetReceiveReportAsync(id, ct)); }
        catch (HubTransferException ex) { return NotFound(new { message = ex.Message }); }
    }
}
