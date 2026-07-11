using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tms.Api.Services;

namespace Tms.Api.Controllers;

public record ImportBatchRequest(List<Dictionary<string, string?>> Rows);

[Authorize]
[ApiController]
[Route("api/import")]
public class ImportController(ImportService imports) : ControllerBase
{
    [HttpPost("customers")]
    public async Task<ActionResult<ImportBatchResult>> Customers([FromBody] ImportBatchRequest body, CancellationToken ct) =>
        Ok(await imports.ImportCustomersAsync(body.Rows ?? [], ct));

    [HttpPost("vendors")]
    public async Task<ActionResult<ImportBatchResult>> Vendors([FromBody] ImportBatchRequest body, CancellationToken ct) =>
        Ok(await imports.ImportVendorsAsync(body.Rows ?? [], ct));

    [HttpPost("vehicles")]
    public async Task<ActionResult<ImportBatchResult>> Vehicles([FromBody] ImportBatchRequest body, CancellationToken ct) =>
        Ok(await imports.ImportVehiclesAsync(body.Rows ?? [], ct));

    [HttpPost("employees")]
    public async Task<ActionResult<ImportBatchResult>> Employees([FromBody] ImportBatchRequest body, CancellationToken ct) =>
        Ok(await imports.ImportEmployeesAsync(body.Rows ?? [], ct));
}
