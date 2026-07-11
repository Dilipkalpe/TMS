using Microsoft.AspNetCore.Authorization;

using Microsoft.AspNetCore.Mvc;

using Microsoft.EntityFrameworkCore;

using Tms.Api.Data;

using Tms.Api.Models;

using Tms.Api.Services;



namespace Tms.Api.Controllers;



[Authorize]

[ApiController]

[Route("api/branches")]

public class BranchesController(TmsDbContext db, ITenantContext tenants) : ControllerBase

{

    public record BranchDto(Guid Id, string Code, string Name, string? City, string? State, string? Phone, string? Address, bool IsHeadOffice, bool IsActive);

    public record UpsertBranch(string Code, string Name, string? City, string? State, string? Phone, string? Address, bool IsHeadOffice = false, bool IsActive = true);



    [HttpGet]

    public async Task<IActionResult> List([FromQuery] bool activeOnly = true)

    {

        var q = tenants.Filter(db.Branches.AsNoTracking().AsQueryable());

        if (activeOnly) q = q.Where(b => b.IsActive);

        var rows = await q.OrderBy(b => b.IsHeadOffice ? 0 : 1).ThenBy(b => b.Name).ToListAsync();

        return Ok(rows.Select(ToDto));

    }



    [HttpGet("{id:guid}")]

    public async Task<IActionResult> Get(Guid id)

    {

        var b = await db.Branches.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);

        if (b == null || !TenantAccess.CanAccess(tenants, b)) return NotFound();

        return Ok(ToDto(b));

    }



    [HttpPost]

    public async Task<IActionResult> Create([FromBody] UpsertBranch body)

    {

        if (string.IsNullOrWhiteSpace(body.Code) || string.IsNullOrWhiteSpace(body.Name))

            return BadRequest(new { message = "Code and name are required" });



        var companyId = TenantScope.ResolveCompanyId(tenants);

        var code = body.Code.Trim().ToUpperInvariant();

        if (await tenants.Filter(db.Branches.AsQueryable()).AnyAsync(b => b.Code == code))

            return BadRequest(new { message = "Branch code already exists for this company" });



        if (body.IsHeadOffice)

            await tenants.Filter(db.Branches.AsQueryable()).Where(b => b.IsHeadOffice)

                .ExecuteUpdateAsync(s => s.SetProperty(b => b.IsHeadOffice, false));



        var branch = new Branch

        {

            Id = Guid.NewGuid(),

            CompanyId = companyId,

            Code = code,

            Name = body.Name.Trim(),

            City = body.City?.Trim(),

            State = body.State?.Trim(),

            Phone = body.Phone?.Trim(),

            Address = body.Address?.Trim(),

            IsHeadOffice = body.IsHeadOffice,

            IsActive = body.IsActive,

            CreatedAt = DateTime.UtcNow,

            UpdatedAt = DateTime.UtcNow,

        };

        db.Branches.Add(branch);

        await db.SaveChangesAsync();

        return Ok(ToDto(branch));

    }



    [HttpPut("{id:guid}")]

    public async Task<IActionResult> Update(Guid id, [FromBody] UpsertBranch body)

    {

        var branch = await db.Branches.FirstOrDefaultAsync(b => b.Id == id);

        if (branch == null || !TenantAccess.CanAccess(tenants, branch)) return NotFound();



        var code = body.Code.Trim().ToUpperInvariant();

        if (await tenants.Filter(db.Branches.AsQueryable()).AnyAsync(b => b.Code == code && b.Id != id))

            return BadRequest(new { message = "Branch code already exists for this company" });



        if (body.IsHeadOffice && !branch.IsHeadOffice)

            await tenants.Filter(db.Branches.AsQueryable()).Where(b => b.IsHeadOffice && b.Id != id)

                .ExecuteUpdateAsync(s => s.SetProperty(b => b.IsHeadOffice, false));



        branch.Code = code;

        branch.Name = body.Name.Trim();

        branch.City = body.City?.Trim();

        branch.State = body.State?.Trim();

        branch.Phone = body.Phone?.Trim();

        branch.Address = body.Address?.Trim();

        branch.IsHeadOffice = body.IsHeadOffice;

        branch.IsActive = body.IsActive;

        branch.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        return Ok(ToDto(branch));

    }



    [HttpDelete("{id:guid}")]

    public async Task<IActionResult> Delete(Guid id)

    {

        var branch = await db.Branches.FirstOrDefaultAsync(b => b.Id == id);

        if (branch == null || !TenantAccess.CanAccess(tenants, branch)) return NotFound();

        if (branch.IsHeadOffice) return BadRequest(new { message = "Cannot delete head office branch" });



        var inUse = await db.Vehicles.AnyAsync(v => v.BranchId == id)

            || await db.Drivers.AnyAsync(d => d.BranchId == id)

            || await db.Bookings.AnyAsync(b => b.BranchId == id)

            || await db.Users.AnyAsync(u => u.BranchId == id);

        if (inUse) return BadRequest(new { message = "Branch is in use — deactivate instead" });



        db.Branches.Remove(branch);

        await db.SaveChangesAsync();

        return Ok(new { deleted = true });

    }



    static BranchDto ToDto(Branch b) => new(b.Id, b.Code, b.Name, b.City, b.State, b.Phone, b.Address, b.IsHeadOffice, b.IsActive);

}

