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
[Route("api/[controller]")]
public class VehiclesController(TmsDbContext db, IBranchContext branches, ITenantContext tenants) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<VehicleDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true)
    {
        var q = tenants.Filter(branches.Filter(db.Vehicles.AsNoTracking()));
        if (!string.IsNullOrWhiteSpace(status) && status != "(All)")
            q = q.Where(v => v.Status == status);
        q = SearchHelper.Filter(q, search);
        q = q.OrderBy(v => v.Number);
        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize);
        var (items, total, hasMore, approx) = await q.ToPagedListAsync(p, size, includeTotal);
        return Ok(new PagedResult<VehicleDto>(
            items.Select(EntityMappers.ToDto).ToList(), total, p, size, hasMore, approx));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<VehicleDto>> Get(string id)
    {
        var v = await db.Vehicles.FindAsync(id);
        if (v == null || !TenantScope.CanAccessBranchEntity(tenants, branches, v)) return NotFound();
        return Ok(EntityMappers.ToDto(v));
    }

    [HttpPost]
    public async Task<ActionResult<VehicleDto>> Create([FromBody] Dictionary<string, object?> body)
    {
        var id = await IdGenerator.NextVehicleId(db);
        var v = MapVehicle(body, id);
        v.BranchId = branches.AssignBranchId;
        v.CompanyId = TenantScope.ResolveCompanyId(tenants);
        v.CreatedAt = v.UpdatedAt = DateTime.UtcNow;
        db.Vehicles.Add(v);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id }, EntityMappers.ToDto(v));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<VehicleDto>> Update(string id, [FromBody] Dictionary<string, object?> body)
    {
        var v = await db.Vehicles.FindAsync(id);
        if (v == null || !TenantScope.CanAccessBranchEntity(tenants, branches, v)) return NotFound();
        ApplyVehicle(body, v);
        v.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(EntityMappers.ToDto(v));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var v = await db.Vehicles.FindAsync(id);
        if (v == null || !TenantScope.CanAccessBranchEntity(tenants, branches, v)) return NotFound();
        db.Vehicles.Remove(v);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static Vehicle MapVehicle(Dictionary<string, object?> b, string id) => new()
    {
        Id = id,
        Number = BodyStr(b, "number") ?? "",
        Type = BodyStr(b, "type"),
        Model = BodyStr(b, "model"),
        Capacity = BodyStr(b, "capacity"),
        Owner = BodyStr(b, "owner") ?? "Self",
        Status = BodyStr(b, "status") ?? "Active",
        Insurance = ParseDate(b, "insurance"),
        Fitness = ParseDate(b, "fitness"),
        Permit = ParseDate(b, "permit"),
        Puc = ParseDate(b, "puc"),
        LastMaintenance = ParseDate(b, "lastMaintenance"),
    };

    private static void ApplyVehicle(Dictionary<string, object?> b, Vehicle v)
    {
        if (b.ContainsKey("number")) v.Number = BodyStr(b, "number") ?? v.Number;
        if (b.ContainsKey("type")) v.Type = BodyStr(b, "type");
        if (b.ContainsKey("model")) v.Model = BodyStr(b, "model");
        if (b.ContainsKey("capacity")) v.Capacity = BodyStr(b, "capacity");
        if (b.ContainsKey("owner")) v.Owner = BodyStr(b, "owner") ?? v.Owner;
        if (b.ContainsKey("status"))
        {
            var status = BodyStr(b, "status");
            if (!string.IsNullOrWhiteSpace(status)) v.Status = status;
        }
        if (b.ContainsKey("insurance")) v.Insurance = ParseDate(b, "insurance");
        if (b.ContainsKey("fitness")) v.Fitness = ParseDate(b, "fitness");
        if (b.ContainsKey("permit")) v.Permit = ParseDate(b, "permit");
        if (b.ContainsKey("puc")) v.Puc = ParseDate(b, "puc");
    }

    static string? BodyStr(Dictionary<string, object?> b, string key) => ApiParseHelper.BodyString(b, key);

    static DateOnly? ParseDate(Dictionary<string, object?> b, string key)
    {
        var s = ApiParseHelper.BodyString(b, key);
        if (string.IsNullOrWhiteSpace(s)) return null;
        return DateOnly.TryParse(s, out var d) ? d : null;
    }
}
