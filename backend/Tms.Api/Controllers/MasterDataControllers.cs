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
public class DriversController(
    TmsDbContext db,
    IBranchContext branches,
    ITenantContext tenants,
    MasterLiveLocationService liveLocations) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<DriverDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true)
    {
        var q = tenants.Filter(branches.Filter(db.Drivers.AsNoTracking().Include(d => d.Branch)));
        if (!string.IsNullOrWhiteSpace(status) && status != "(All)")
            q = q.Where(d => d.Status == status);
        q = SearchHelper.Filter(q, search);
        q = q.OrderBy(d => d.Name);
        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize);
        var (items, total, hasMore, approx) = await q.ToPagedListAsync(p, size, includeTotal);
        var live = await liveLocations.ForDriversAsync(items.Select(d => d.Id).ToList());
        return Ok(new PagedResult<DriverDto>(
            items.Select(d => EntityMappers.ToDto(d, live.GetValueOrDefault(d.Id))).ToList(),
            total, p, size, hasMore, approx));
    }

    public record DriverPortalAccessBody(bool Enabled, string? Pin, string? Phone);

    [HttpGet("portal-access/list")]
    public async Task<ActionResult<PagedResult<object>>> PortalAccessList(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true)
    {
        var q = tenants.Filter(branches.Filter(db.Drivers.AsNoTracking().Include(d => d.Branch)));
        q = SearchHelper.Filter(q, search);
        q = q.OrderBy(d => d.Name);
        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize);
        var (items, total, hasMore, approx) = await q.ToPagedListAsync(p, size, includeTotal);
        var rows = items.Select(d => (object)new
        {
            d.Id,
            d.Name,
            d.Phone,
            portalPhone = d.PortalPhone ?? d.Phone,
            d.PortalEnabled,
            allowDriverAppAccess = d.PortalEnabled,
            hasPin = d.PortalPinHash != null,
            driverAppStatus = d.PortalEnabled ? "Enabled" : "Disabled",
            branchId = d.BranchId,
            branchName = d.Branch?.Name,
        }).ToList();
        return Ok(new PagedResult<object>(rows, total, p, size, hasMore, approx));
    }

    [HttpPut("{id}/portal")]
    public async Task<IActionResult> SetPortalAccess(string id, [FromBody] DriverPortalAccessBody body)
    {
        var d = await db.Drivers.FindAsync(id);
        if (d == null || !TenantScope.CanAccessBranchEntity(tenants, branches, d)) return NotFound();
        d.PortalEnabled = body.Enabled;
        if (body.Phone != null) d.PortalPhone = string.IsNullOrWhiteSpace(body.Phone) ? null : body.Phone.Trim();
        if (!string.IsNullOrWhiteSpace(body.Pin))
            d.PortalPinHash = BCrypt.Net.BCrypt.HashPassword(body.Pin.Trim());
        else if (!body.Enabled)
            d.PortalPinHash = null;
        d.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new
        {
            d.Id,
            d.PortalEnabled,
            allowDriverAppAccess = d.PortalEnabled,
            portalPhone = d.PortalPhone ?? d.Phone,
            hasPin = d.PortalPinHash != null,
            driverAppStatus = d.PortalEnabled ? "Enabled" : "Disabled",
        });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<DriverDto>> Get(string id)
    {
        var d = await db.Drivers.AsNoTracking().Include(x => x.Branch).FirstOrDefaultAsync(x => x.Id == id);
        if (d == null || !TenantScope.CanAccessBranchEntity(tenants, branches, d)) return NotFound();
        var live = await liveLocations.ForDriversAsync([id]);
        return Ok(EntityMappers.ToDto(d, live.GetValueOrDefault(id)));
    }

    [HttpPost]
    public async Task<ActionResult<DriverDto>> Create([FromBody] Dictionary<string, object?> body)
    {
        var id = await IdGenerator.NextDriverId(db);
        var d = new Driver
        {
            Id = id,
            Name = body.GetValueOrDefault("name")?.ToString() ?? "",
            License = body.GetValueOrDefault("license")?.ToString(),
            LicenseExpiry = DateOnly.TryParse(body.GetValueOrDefault("licenseExpiry")?.ToString(), out var le) ? le : null,
            Phone = body.GetValueOrDefault("phone")?.ToString(),
            Email = body.GetValueOrDefault("email")?.ToString(),
            Address = body.GetValueOrDefault("address")?.ToString(),
            Salary = decimal.TryParse(body.GetValueOrDefault("salary")?.ToString(), out var sal) ? sal : 0,
            Advance = decimal.TryParse(body.GetValueOrDefault("advance")?.ToString(), out var adv) ? adv : 0,
            Status = body.GetValueOrDefault("status")?.ToString() ?? "Active",
            PortalEnabled = false,
            BranchId = branches.AssignBranchId,
            CompanyId = TenantScope.ResolveCompanyId(tenants),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        ApplyPortalFields(body, d, creating: true);
        db.Drivers.Add(d);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id }, EntityMappers.ToDto(d));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<DriverDto>> Update(string id, [FromBody] Dictionary<string, object?> body)
    {
        var d = await db.Drivers.FindAsync(id);
        if (d == null || !TenantScope.CanAccessBranchEntity(tenants, branches, d)) return NotFound();
        if (body.ContainsKey("name")) d.Name = body["name"]?.ToString() ?? d.Name;
        if (body.ContainsKey("license")) d.License = body["license"]?.ToString();
        if (body.ContainsKey("phone")) d.Phone = body["phone"]?.ToString();
        if (body.ContainsKey("email")) d.Email = body["email"]?.ToString();
        if (body.ContainsKey("address")) d.Address = body["address"]?.ToString();
        if (body.ContainsKey("status")) d.Status = body["status"]?.ToString() ?? d.Status;
        if (body.ContainsKey("salary") && decimal.TryParse(body["salary"]?.ToString(), out var sal)) d.Salary = sal;
        ApplyPortalFields(body, d, creating: false);
        d.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        var live = await liveLocations.ForDriversAsync([id]);
        return Ok(EntityMappers.ToDto(d, live.GetValueOrDefault(id)));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var d = await db.Drivers.FindAsync(id);
        if (d == null || !TenantScope.CanAccessBranchEntity(tenants, branches, d)) return NotFound();
        db.Drivers.Remove(d);
        await db.SaveChangesAsync();
        return NoContent();
    }

    static void ApplyPortalFields(Dictionary<string, object?> body, Driver d, bool creating)
    {
        // Allow Driver App Access — optional, default OFF
        var enabledKey = body.ContainsKey("allowDriverAppAccess") ? "allowDriverAppAccess"
            : body.ContainsKey("portalEnabled") ? "portalEnabled" : null;
        if (enabledKey != null)
        {
            var raw = body[enabledKey]?.ToString();
            d.PortalEnabled = raw is "true" or "True" or "1" or "yes" or "Yes";
        }
        else if (creating)
        {
            d.PortalEnabled = false;
        }

        if (body.ContainsKey("portalPhone"))
            d.PortalPhone = string.IsNullOrWhiteSpace(body["portalPhone"]?.ToString())
                ? null : body["portalPhone"]!.ToString()!.Trim();

        var pin = body.ContainsKey("portalPin") ? body["portalPin"]?.ToString()
            : body.ContainsKey("accessPin") ? body["accessPin"]?.ToString() : null;
        if (!string.IsNullOrWhiteSpace(pin))
            d.PortalPinHash = BCrypt.Net.BCrypt.HashPassword(pin.Trim());
        else if (!d.PortalEnabled)
            d.PortalPinHash = null;
    }
}

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class CustomersController(TmsDbContext db, IBranchContext branches, ITenantContext tenants) : ControllerBase
{
    [HttpGet("portal-access/list")]
    public async Task<ActionResult<PagedResult<object>>> PortalAccessList(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true)
    {
        var q = tenants.Filter(branches.Filter(db.Customers.AsNoTracking().Include(c => c.Branch)));
        q = SearchHelper.Filter(q, search);
        q = q.OrderBy(c => c.Name);
        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize);
        var (items, total, hasMore, approx) = await q.ToPagedListAsync(p, size, includeTotal);
        var rows = items.Select(c => (object)new
        {
            c.Id,
            c.Name,
            c.Phone,
            portalPhone = c.PortalPhone ?? c.Phone,
            c.PortalEnabled,
            hasPin = c.PortalPinHash != null,
            branchId = c.BranchId,
            branchCode = c.Branch?.Code,
            branchName = c.Branch?.Name,
        }).ToList();
        return Ok(new PagedResult<object>(rows, total, p, size, hasMore, approx));
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<CustomerDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true)
    {
        var q = tenants.Filter(branches.Filter(db.Customers.AsNoTracking().Include(c => c.Branch)));
        q = SearchHelper.Filter(q, search);
        q = q.OrderBy(c => c.Name);
        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize);
        var (items, total, hasMore, approx) = await q.ToPagedListAsync(p, size, includeTotal);
        return Ok(new PagedResult<CustomerDto>(
            items.Select(EntityMappers.ToDto).ToList(), total, p, size, hasMore, approx));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CustomerDto>> Get(string id)
    {
        var c = await db.Customers.Include(x => x.Branch).FirstOrDefaultAsync(x => x.Id == id);
        if (c == null || !TenantScope.CanAccessBranchEntity(tenants, branches, c)) return NotFound();
        return Ok(EntityMappers.ToDto(c));
    }

    [HttpPost]
    public async Task<ActionResult<CustomerDto>> Create([FromBody] Dictionary<string, object?> body)
    {
        var id = await IdGenerator.NextCustomerId(db);
        var c = new Customer
        {
            Id = id,
            Name = body.GetValueOrDefault("name")?.ToString() ?? "",
            Contact = body.GetValueOrDefault("contact")?.ToString(),
            Phone = body.GetValueOrDefault("phone")?.ToString(),
            Email = body.GetValueOrDefault("email")?.ToString(),
            Gst = body.GetValueOrDefault("gst")?.ToString(),
            Address = body.GetValueOrDefault("address")?.ToString(),
            CreditLimit = decimal.TryParse(body.GetValueOrDefault("creditLimit")?.ToString(), out var cl) ? cl : 0,
            BranchId = branches.AssignBranchId,
            CompanyId = TenantScope.ResolveCompanyId(tenants),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.Customers.Add(c);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id }, EntityMappers.ToDto(c));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<CustomerDto>> Update(string id, [FromBody] Dictionary<string, object?> body)
    {
        var c = await db.Customers.FindAsync(id);
        if (c == null || !TenantScope.CanAccessBranchEntity(tenants, branches, c)) return NotFound();
        if (body.ContainsKey("name")) c.Name = body["name"]?.ToString() ?? c.Name;
        if (body.ContainsKey("contact")) c.Contact = body["contact"]?.ToString();
        if (body.ContainsKey("phone")) c.Phone = body["phone"]?.ToString();
        if (body.ContainsKey("email")) c.Email = body["email"]?.ToString();
        if (body.ContainsKey("gst")) c.Gst = body["gst"]?.ToString();
        if (body.ContainsKey("address")) c.Address = body["address"]?.ToString();
        c.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(EntityMappers.ToDto(c));
    }

    public record PortalAccessBody(bool Enabled, string? Pin, string? Phone);

    [HttpPut("{id}/portal")]
    public async Task<IActionResult> SetPortalAccess(string id, [FromBody] PortalAccessBody body)
    {
        var c = await db.Customers.FindAsync(id);
        if (c == null || !TenantScope.CanAccessBranchEntity(tenants, branches, c)) return NotFound();
        c.PortalEnabled = body.Enabled;
        if (body.Phone != null) c.PortalPhone = body.Phone;
        if (!string.IsNullOrWhiteSpace(body.Pin))
            c.PortalPinHash = BCrypt.Net.BCrypt.HashPassword(body.Pin);
        else if (!body.Enabled)
            c.PortalPinHash = null;
        c.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { c.Id, c.PortalEnabled, portalPhone = c.PortalPhone ?? c.Phone, hasPin = c.PortalPinHash != null });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var c = await db.Customers.FindAsync(id);
        if (c == null || !TenantScope.CanAccessBranchEntity(tenants, branches, c)) return NotFound();
        db.Customers.Remove(c);
        await db.SaveChangesAsync();
        return NoContent();
    }
}

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class VendorsController(TmsDbContext db, ITenantContext tenants, IBranchContext branches) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<VendorDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? category,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true)
    {
        var q = tenants.Filter(branches.Filter(db.Vendors.AsNoTracking().Include(v => v.Branch)));
        if (!string.IsNullOrWhiteSpace(category) && category != "(All)")
            q = q.Where(v => v.Category == category);
        q = SearchHelper.Filter(q, search);
        q = q.OrderBy(v => v.Name);
        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize);
        var (items, total, hasMore, approx) = await q.ToPagedListAsync(p, size, includeTotal);
        return Ok(new PagedResult<VendorDto>(
            items.Select(EntityMappers.ToDto).ToList(), total, p, size, hasMore, approx));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<VendorDto>> Get(string id)
    {
        var v = await db.Vendors.AsNoTracking().Include(x => x.Branch).FirstOrDefaultAsync(x => x.Id == id);
        if (v == null || !TenantScope.CanAccessBranchEntity(tenants, branches, v)) return NotFound();
        return Ok(EntityMappers.ToDto(v));
    }

    [HttpPost]
    public async Task<ActionResult<VendorDto>> Create([FromBody] Dictionary<string, object?> body)
    {
        var id = await IdGenerator.NextVendorId(db);
        var v = new Vendor
        {
            Id = id,
            Name = body.GetValueOrDefault("name")?.ToString() ?? "",
            Contact = body.GetValueOrDefault("contact")?.ToString(),
            Phone = body.GetValueOrDefault("phone")?.ToString(),
            Email = body.GetValueOrDefault("email")?.ToString(),
            Gst = body.GetValueOrDefault("gst")?.ToString(),
            Address = body.GetValueOrDefault("address")?.ToString(),
            Category = body.GetValueOrDefault("category")?.ToString(),
            CompanyId = TenantScope.ResolveCompanyId(tenants),
            BranchId = branches.AssignBranchId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.Vendors.Add(v);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id }, EntityMappers.ToDto(v));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<VendorDto>> Update(string id, [FromBody] Dictionary<string, object?> body)
    {
        var v = await db.Vendors.FindAsync(id);
        if (v == null || !TenantScope.CanAccessBranchEntity(tenants, branches, v)) return NotFound();
        if (body.ContainsKey("name")) v.Name = body["name"]?.ToString() ?? v.Name;
        if (body.ContainsKey("contact")) v.Contact = body["contact"]?.ToString();
        if (body.ContainsKey("phone")) v.Phone = body["phone"]?.ToString();
        if (body.ContainsKey("category")) v.Category = body["category"]?.ToString();
        v.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(EntityMappers.ToDto(v));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var v = await db.Vendors.FindAsync(id);
        if (v == null || !TenantScope.CanAccessBranchEntity(tenants, branches, v)) return NotFound();
        db.Vendors.Remove(v);
        await db.SaveChangesAsync();
        return NoContent();
    }
}

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ConsignorsController(TmsDbContext db, ITenantContext tenants, IBranchContext branches) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<ConsignorDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true)
    {
        var q = tenants.Filter(branches.Filter(db.Consignors.AsNoTracking().Include(c => c.Branch)));
        if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "(All)", StringComparison.OrdinalIgnoreCase))
            q = q.Where(c => c.Status == status);
        q = SearchHelper.Filter(q, search);
        q = q.OrderBy(c => c.Name);
        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize);
        var (items, total, hasMore, approx) = await q.ToPagedListAsync(p, size, includeTotal);
        return Ok(new PagedResult<ConsignorDto>(
            items.Select(EntityMappers.ToDto).ToList(), total, p, size, hasMore, approx));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ConsignorDto>> Get(string id)
    {
        var c = await db.Consignors.AsNoTracking().Include(x => x.Branch).FirstOrDefaultAsync(x => x.Id == id);
        if (c == null || !TenantScope.CanAccessBranchEntity(tenants, branches, c)) return NotFound();
        return Ok(EntityMappers.ToDto(c));
    }

    [HttpPost]
    public async Task<ActionResult<ConsignorDto>> Create([FromBody] Dictionary<string, object?> body)
    {
        var name = ApiParseHelper.BodyString(body, "name");
        if (string.IsNullOrWhiteSpace(name))
            return BadRequest(new ApiError("Consignor name is required."));

        var id = await IdGenerator.NextConsignorId(db);
        var c = new Consignor
        {
            Id = id,
            Name = name,
            Status = ApiParseHelper.BodyString(body, "status") ?? "Active",
            CompanyId = TenantScope.ResolveCompanyId(tenants),
            BranchId = branches.AssignBranchId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        PartyMasterHelper.ApplyConsignorBody(c, body);
        db.Consignors.Add(c);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id }, EntityMappers.ToDto(c));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ConsignorDto>> Update(string id, [FromBody] Dictionary<string, object?> body)
    {
        var c = await db.Consignors.FindAsync(id);
        if (c == null || !TenantScope.CanAccessBranchEntity(tenants, branches, c)) return NotFound();
        PartyMasterHelper.ApplyConsignorBody(c, body);
        c.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(EntityMappers.ToDto(c));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var c = await db.Consignors.FindAsync(id);
        if (c == null || !TenantScope.CanAccessBranchEntity(tenants, branches, c)) return NotFound();
        db.Consignors.Remove(c);
        await db.SaveChangesAsync();
        return NoContent();
    }
}

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ConsigneesController(TmsDbContext db, ITenantContext tenants, IBranchContext branches) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<ConsigneeDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true)
    {
        var q = tenants.Filter(branches.Filter(db.Consignees.AsNoTracking().Include(c => c.Branch)));
        if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "(All)", StringComparison.OrdinalIgnoreCase))
            q = q.Where(c => c.Status == status);
        q = SearchHelper.Filter(q, search);
        q = q.OrderBy(c => c.Name);
        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize);
        var (items, total, hasMore, approx) = await q.ToPagedListAsync(p, size, includeTotal);
        return Ok(new PagedResult<ConsigneeDto>(
            items.Select(EntityMappers.ToDto).ToList(), total, p, size, hasMore, approx));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ConsigneeDto>> Get(string id)
    {
        var c = await db.Consignees.AsNoTracking().Include(x => x.Branch).FirstOrDefaultAsync(x => x.Id == id);
        if (c == null || !TenantScope.CanAccessBranchEntity(tenants, branches, c)) return NotFound();
        return Ok(EntityMappers.ToDto(c));
    }

    [HttpPost]
    public async Task<ActionResult<ConsigneeDto>> Create([FromBody] Dictionary<string, object?> body)
    {
        var name = ApiParseHelper.BodyString(body, "name");
        if (string.IsNullOrWhiteSpace(name))
            return BadRequest(new ApiError("Consignee name is required."));

        var id = await IdGenerator.NextConsigneeId(db);
        var c = new Consignee
        {
            Id = id,
            Name = name,
            Status = ApiParseHelper.BodyString(body, "status") ?? "Active",
            CompanyId = TenantScope.ResolveCompanyId(tenants),
            BranchId = branches.AssignBranchId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        PartyMasterHelper.ApplyConsigneeBody(c, body);
        db.Consignees.Add(c);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id }, EntityMappers.ToDto(c));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ConsigneeDto>> Update(string id, [FromBody] Dictionary<string, object?> body)
    {
        var c = await db.Consignees.FindAsync(id);
        if (c == null || !TenantScope.CanAccessBranchEntity(tenants, branches, c)) return NotFound();
        PartyMasterHelper.ApplyConsigneeBody(c, body);
        c.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(EntityMappers.ToDto(c));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var c = await db.Consignees.FindAsync(id);
        if (c == null || !TenantScope.CanAccessBranchEntity(tenants, branches, c)) return NotFound();
        db.Consignees.Remove(c);
        await db.SaveChangesAsync();
        return NoContent();
    }
}

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ItemsController(TmsDbContext db, ITenantContext tenants, IBranchContext branches) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<ItemMasterDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true)
    {
        var q = tenants.Filter(branches.Filter(db.Items.AsNoTracking().Include(i => i.Branch)));
        if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "(All)", StringComparison.OrdinalIgnoreCase))
            q = q.Where(i => i.Status == status);
        q = SearchHelper.Filter(q, search);
        q = q.OrderBy(i => i.Name);
        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize);
        var (items, total, hasMore, approx) = await q.ToPagedListAsync(p, size, includeTotal);
        return Ok(new PagedResult<ItemMasterDto>(
            items.Select(EntityMappers.ToDto).ToList(), total, p, size, hasMore, approx));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ItemMasterDto>> Get(string id)
    {
        var item = await db.Items.AsNoTracking().Include(x => x.Branch).FirstOrDefaultAsync(x => x.Id == id);
        if (item == null || !TenantScope.CanAccessBranchEntity(tenants, branches, item)) return NotFound();
        return Ok(EntityMappers.ToDto(item));
    }

    [HttpPost]
    public async Task<ActionResult<ItemMasterDto>> Create([FromBody] Dictionary<string, object?> body)
    {
        var name = ApiParseHelper.BodyString(body, "name");
        if (string.IsNullOrWhiteSpace(name))
            return BadRequest(new ApiError("Item name is required."));

        var id = await IdGenerator.NextItemId(db);
        var item = new ItemMaster
        {
            Id = id,
            Name = name,
            Status = ApiParseHelper.BodyString(body, "status") ?? "Active",
            CompanyId = TenantScope.ResolveCompanyId(tenants),
            BranchId = branches.AssignBranchId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        ItemMasterHelper.ApplyBody(item, body);
        db.Items.Add(item);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id }, EntityMappers.ToDto(item));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ItemMasterDto>> Update(string id, [FromBody] Dictionary<string, object?> body)
    {
        var item = await db.Items.FindAsync(id);
        if (item == null || !TenantScope.CanAccessBranchEntity(tenants, branches, item)) return NotFound();
        ItemMasterHelper.ApplyBody(item, body);
        item.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(EntityMappers.ToDto(item));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var item = await db.Items.FindAsync(id);
        if (item == null || !TenantScope.CanAccessBranchEntity(tenants, branches, item)) return NotFound();
        db.Items.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ExpensesController(
    TmsDbContext db,
    IBranchContext branches,
    ITenantContext tenants,
    IWebHostEnvironment env) : ControllerBase
{
    string AttachmentRoot => Path.Combine(env.ContentRootPath, "App_Data", "expense-attachments");
    string? CurrentUser() => User.Identity?.Name;

    [HttpGet]
    public async Task<ActionResult<PagedResult<ExpenseDto>>> GetAll(
        [FromQuery] string? category,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true)
    {
        var q = tenants.Filter(branches.Filter(db.Expenses.AsNoTracking().Include(e => e.Branch)));
        if (!string.IsNullOrWhiteSpace(category) && category != "(All)") q = q.Where(e => e.Category == category);
        q = SearchHelper.Filter(q, search);
        q = q.OrderByDescending(e => e.ExpenseDate).ThenByDescending(e => e.Id);
        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize);
        var (items, total, hasMore, approx) = await q.ToPagedListAsync(p, size, includeTotal);
        return Ok(new PagedResult<ExpenseDto>(
            items.Select(e => EntityMappers.ToDto(e)).ToList(), total, p, size, hasMore, approx));
    }

    [HttpGet("categories")]
    public ActionResult<string[]> Categories() =>
        Ok(new[] { "Fuel", "Toll", "Maintenance", "Salary", "Office Expense", "Miscellaneous" });

    [HttpGet("{id}")]
    public async Task<ActionResult<ExpenseDto>> Get(string id)
    {
        var e = await db.Expenses.AsNoTracking().Include(x => x.Branch).FirstOrDefaultAsync(x => x.Id == id);
        if (e == null || !TenantScope.CanAccessBranchEntity(tenants, branches, e)) return NotFound();
        var attachments = await ListAttachmentDtosAsync(id);
        return Ok(EntityMappers.ToDto(e, attachments));
    }

    [HttpPost]
    public async Task<ActionResult<ExpenseDto>> Create([FromBody] Dictionary<string, object?> body)
    {
        var id = await IdGenerator.NextExpenseId(db);
        var vehicleNum = body.GetValueOrDefault("vehicle")?.ToString();
        var vehicle = !string.IsNullOrEmpty(vehicleNum)
            ? await TenantScope.FindVehicleByRefAsync(db, tenants, branches, vehicleNum) : null;
        var exp = new Expense
        {
            Id = id,
            ExpenseDate = DateOnly.TryParse(body.GetValueOrDefault("date")?.ToString(), out var dt) ? dt : DateOnly.FromDateTime(DateTime.UtcNow),
            Category = body.GetValueOrDefault("category")?.ToString() ?? "Miscellaneous",
            Description = body.GetValueOrDefault("description")?.ToString(),
            VehicleId = vehicle?.Id,
            VehicleNumber = vehicleNum,
            VendorName = body.GetValueOrDefault("vendor")?.ToString(),
            Amount = decimal.TryParse(body.GetValueOrDefault("amount")?.ToString(), out var amt) ? amt : 0,
            PaymentMode = body.GetValueOrDefault("paymentMode")?.ToString(),
            Status = body.GetValueOrDefault("status")?.ToString() ?? "Approved",
            BranchId = branches.AssignBranchId,
            CompanyId = TenantScope.ResolveCompanyId(tenants),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = CurrentUser(),
        };
        db.Expenses.Add(exp);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id }, EntityMappers.ToDto(exp, []));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ExpenseDto>> Update(string id, [FromBody] Dictionary<string, object?> body)
    {
        var exp = await db.Expenses.FindAsync(id);
        if (exp == null || !TenantScope.CanAccessBranchEntity(tenants, branches, exp)) return NotFound();
        if (body.ContainsKey("date") && DateOnly.TryParse(body["date"]?.ToString(), out var dt))
            exp.ExpenseDate = dt;
        if (body.ContainsKey("category")) exp.Category = body["category"]?.ToString() ?? exp.Category;
        if (body.ContainsKey("description")) exp.Description = body["description"]?.ToString();
        if (body.ContainsKey("vehicle"))
        {
            var vehicleNum = body["vehicle"]?.ToString();
            var vehicle = !string.IsNullOrEmpty(vehicleNum)
                ? await TenantScope.FindVehicleByRefAsync(db, tenants, branches, vehicleNum) : null;
            exp.VehicleId = vehicle?.Id;
            exp.VehicleNumber = vehicleNum;
        }
        if (body.ContainsKey("vendor")) exp.VendorName = body["vendor"]?.ToString();
        if (body.ContainsKey("amount") && decimal.TryParse(body["amount"]?.ToString(), out var amt)) exp.Amount = amt;
        if (body.ContainsKey("paymentMode")) exp.PaymentMode = body["paymentMode"]?.ToString();
        if (body.ContainsKey("status")) exp.Status = body["status"]?.ToString() ?? exp.Status;
        exp.UpdatedAt = DateTime.UtcNow;
        exp.UpdatedBy = CurrentUser();
        await db.SaveChangesAsync();
        var attachments = await ListAttachmentDtosAsync(id);
        return Ok(EntityMappers.ToDto(exp, attachments));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var exp = await db.Expenses.FindAsync(id);
        if (exp == null || !TenantScope.CanAccessBranchEntity(tenants, branches, exp)) return NotFound();

        var attachments = await db.ExpenseAttachments.Where(a => a.ExpenseId == id).ToListAsync();
        foreach (var a in attachments)
            TryDeletePhysicalFile(a.RelativePath);

        // Cascade removes attachment rows; also remove local folder leftovers
        db.Expenses.Remove(exp);
        await db.SaveChangesAsync();
        TryDeleteExpenseFolder(id);
        return NoContent();
    }

    [HttpGet("{id}/attachments")]
    public async Task<ActionResult<IReadOnlyList<ExpenseAttachmentDto>>> ListAttachments(string id)
    {
        var exp = await db.Expenses.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (exp == null || !TenantScope.CanAccessBranchEntity(tenants, branches, exp)) return NotFound();
        return Ok(await ListAttachmentDtosAsync(id));
    }

    [HttpPost("{id}/attachments")]
    [RequestSizeLimit(ExpenseAttachmentRules.MaxUploadBytes + 1024 * 64)]
    [RequestFormLimits(MultipartBodyLengthLimit = ExpenseAttachmentRules.MaxUploadBytes + 1024 * 64)]
    public async Task<ActionResult<ExpenseAttachmentDto>> UploadAttachment(string id, IFormFile? file)
    {
        var exp = await db.Expenses.FirstOrDefaultAsync(x => x.Id == id);
        if (exp == null || !TenantScope.CanAccessBranchEntity(tenants, branches, exp)) return NotFound();

        var activeCount = await db.ExpenseAttachments.CountAsync(a => a.ExpenseId == id && a.IsActive);
        var validationError = ExpenseAttachmentRules.ValidateUpload(file?.FileName, file?.Length ?? 0, activeCount);
        if (validationError != null)
            return BadRequest(new ApiError(validationError));

        var ext = Path.GetExtension(file!.FileName).ToLowerInvariant();
        var originalName = Path.GetFileName(file.FileName);
        if (string.IsNullOrWhiteSpace(originalName)) originalName = $"document{ext}";
        if (originalName.Length > 240) originalName = originalName[..240] + ext;

        var storedName = $"{Guid.NewGuid():N}{ext}";
        var relativePath = Path.Combine(id, storedName).Replace('\\', '/');
        var dir = Path.Combine(AttachmentRoot, id);
        Directory.CreateDirectory(dir);
        var fullPath = Path.Combine(dir, storedName);

        await using (var stream = System.IO.File.Create(fullPath))
            await file.CopyToAsync(stream);

        var row = new ExpenseAttachment
        {
            Id = Guid.NewGuid(),
            ExpenseId = id,
            FileName = originalName,
            StoredFileName = storedName,
            RelativePath = relativePath,
            FileExtension = ext.TrimStart('.'),
            FileSize = file.Length,
            ContentType = string.IsNullOrWhiteSpace(file.ContentType) ? null : file.ContentType,
            UploadedAt = DateTime.UtcNow,
            UploadedBy = CurrentUser(),
            IsActive = true,
        };
        db.ExpenseAttachments.Add(row);
        exp.UpdatedAt = DateTime.UtcNow;
        exp.UpdatedBy = CurrentUser();
        await db.SaveChangesAsync();
        return Ok(EntityMappers.ToDto(row));
    }

    [HttpGet("{id}/attachments/{attachmentId:guid}/download")]
    public async Task<IActionResult> DownloadAttachment(string id, Guid attachmentId)
    {
        var exp = await db.Expenses.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (exp == null || !TenantScope.CanAccessBranchEntity(tenants, branches, exp)) return NotFound();

        var row = await db.ExpenseAttachments.AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == attachmentId && a.ExpenseId == id && a.IsActive);
        if (row == null) return NotFound();

        var fullPath = ResolveSafePath(row.RelativePath);
        if (fullPath == null || !System.IO.File.Exists(fullPath))
            return NotFound(new ApiError("File not found on server."));

        var contentType = row.ContentType;
        if (string.IsNullOrWhiteSpace(contentType))
            contentType = "application/octet-stream";
        return PhysicalFile(fullPath, contentType, row.FileName);
    }

    [HttpDelete("{id}/attachments/{attachmentId:guid}")]
    public async Task<IActionResult> DeleteAttachment(string id, Guid attachmentId)
    {
        var exp = await db.Expenses.FirstOrDefaultAsync(x => x.Id == id);
        if (exp == null || !TenantScope.CanAccessBranchEntity(tenants, branches, exp)) return NotFound();

        var row = await db.ExpenseAttachments
            .FirstOrDefaultAsync(a => a.Id == attachmentId && a.ExpenseId == id);
        if (row == null) return NotFound();

        TryDeletePhysicalFile(row.RelativePath);
        db.ExpenseAttachments.Remove(row);
        exp.UpdatedAt = DateTime.UtcNow;
        exp.UpdatedBy = CurrentUser();
        await db.SaveChangesAsync();
        return NoContent();
    }

    async Task<IReadOnlyList<ExpenseAttachmentDto>> ListAttachmentDtosAsync(string expenseId)
    {
        var rows = await db.ExpenseAttachments.AsNoTracking()
            .Where(a => a.ExpenseId == expenseId && a.IsActive)
            .OrderByDescending(a => a.UploadedAt)
            .ToListAsync();
        return rows.Select(EntityMappers.ToDto).ToList();
    }

    string? ResolveSafePath(string relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath)) return null;
        var combined = Path.GetFullPath(Path.Combine(AttachmentRoot, relativePath.Replace('/', Path.DirectorySeparatorChar)));
        var root = Path.GetFullPath(AttachmentRoot);
        if (!combined.StartsWith(root, StringComparison.OrdinalIgnoreCase)) return null;
        return combined;
    }

    void TryDeletePhysicalFile(string relativePath)
    {
        try
        {
            var full = ResolveSafePath(relativePath);
            if (full != null && System.IO.File.Exists(full))
                System.IO.File.Delete(full);
        }
        catch
        {
            // best-effort cleanup
        }
    }

    void TryDeleteExpenseFolder(string expenseId)
    {
        try
        {
            var dir = Path.Combine(AttachmentRoot, expenseId);
            if (Directory.Exists(dir))
                Directory.Delete(dir, recursive: true);
        }
        catch
        {
            // best-effort cleanup
        }
    }
}

[Authorize]
[ApiController]
[Route("api/lr")]
public class LrController(TmsDbContext db, ITenantContext tenants, IBranchContext branches, DriverSyncService driverSync, DocumentFlowService documentFlow, DocumentNumberService documentNumbers, EwayBillSyncService ewayBillSync, FieldConfigurationService fieldConfig) : ControllerBase
{
    async Task<Driver?> ResolveDriverAsync(string? driverName, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(driverName)) return null;
        var driver = await TenantScope.FindDriverByRefAsync(db, tenants, branches, driverName, ct);
        return driver ?? await driverSync.EnsureDriverByNameAsync(driverName, ct: ct);
    }

    [HttpGet]
    public Task<ActionResult<PagedResult<LrDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? paymentType,
        [FromQuery] string? status,
        [FromQuery] string? stage,
        [FromQuery] string? businessType,
        [FromQuery] DateOnly? dateFrom,
        [FromQuery] DateOnly? dateTo,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true,
        [FromQuery] string? sortColumn = null,
        [FromQuery] string? sortDirection = null,
        CancellationToken ct = default)
        => QueryLrs(search, paymentType, status, stage, businessType, dateFrom, dateTo, page, pageSize, includeTotal, sortColumn, sortDirection, ct);

    [HttpGet("list")]
    public Task<ActionResult<PagedResult<LrDto>>> List(
        [FromQuery] string? search,
        [FromQuery] string? paymentType,
        [FromQuery] string? status,
        [FromQuery] string? stage,
        [FromQuery] string? businessType,
        [FromQuery] DateOnly? dateFrom,
        [FromQuery] DateOnly? dateTo,
        [FromQuery] int page = 1,
        [FromQuery] int pageNo = 0,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true,
        [FromQuery] string? sortColumn = null,
        [FromQuery] string? sortDirection = null,
        CancellationToken ct = default)
        => QueryLrs(search, paymentType, status, stage, businessType, dateFrom, dateTo, pageNo > 0 ? pageNo : page, pageSize, includeTotal, sortColumn, sortDirection, ct);

    [HttpGet("status-summary")]
    public async Task<ActionResult<object>> StatusSummary(CancellationToken ct)
    {
        var all = tenants.Filter(branches.Filter(db.LorryReceipts.AsNoTracking()));
        return Ok(await LrOperationsService.BuildStatusSummaryAsync(all, db, ct));
    }

    async Task<ActionResult<PagedResult<LrDto>>> QueryLrs(
        string? search,
        string? paymentType,
        string? status,
        string? stage,
        string? businessType,
        DateOnly? dateFrom,
        DateOnly? dateTo,
        int page,
        int pageSize,
        bool includeTotal,
        string? sortColumn,
        string? sortDirection,
        CancellationToken ct)
    {
        var q = tenants.Filter(branches.Filter(db.LorryReceipts.AsNoTracking().Include(l => l.Branch)));
        if (!string.IsNullOrWhiteSpace(paymentType) && paymentType != "(All)")
            q = q.Where(l => l.PaymentType == paymentType);
        if (!string.IsNullOrWhiteSpace(businessType) && businessType != "(All)")
            q = q.Where(l => l.BusinessType == businessType);
        if (dateFrom.HasValue)
            q = q.Where(l => l.LrDate >= dateFrom);
        if (dateTo.HasValue)
            q = q.Where(l => l.LrDate <= dateTo);
        if (!string.IsNullOrWhiteSpace(status) && status != "(All)")
            q = q.Where(l => l.Status == status);
        if (!string.IsNullOrWhiteSpace(stage) && stage != "lr-list" && stage != "(All)")
        {
            var normalized = LrOperationStages.Normalize(stage);
            if (LrOperationStages.WorkflowFlow.Contains(normalized))
                q = LrOperationsService.ApplyStageFilter(q, db, normalized);
        }
        q = SearchHelper.Filter(q, search);
        q = ApplyLrSort(q, sortColumn, sortDirection);
        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize);
        var (items, total, hasMore, approx) = await q.ToPagedListAsync(p, size, includeTotal, ct);
        var dtos = items.Select(l => EntityMappers.ToDto(l)).ToList();
        await LrProcessService.FillVehicleFromLoadingSheetAsync(db, dtos, ct);
        return Ok(new PagedResult<LrDto>(dtos, total, p, size, hasMore, approx));
    }

    static IQueryable<LorryReceipt> ApplyLrSort(IQueryable<LorryReceipt> q, string? sortColumn, string? sortDirection)
    {
        var desc = string.Equals(sortDirection, "desc", StringComparison.OrdinalIgnoreCase) || string.IsNullOrWhiteSpace(sortDirection);
        return (sortColumn?.ToLowerInvariant()) switch
        {
            "lrnumber" or "lr_no" => desc ? q.OrderByDescending(l => l.LrNumber) : q.OrderBy(l => l.LrNumber),
            "customer" => desc ? q.OrderByDescending(l => l.CustomerName) : q.OrderBy(l => l.CustomerName),
            "consignor" => desc ? q.OrderByDescending(l => l.Consignor) : q.OrderBy(l => l.Consignor),
            "consignee" => desc ? q.OrderByDescending(l => l.Consignee) : q.OrderBy(l => l.Consignee),
            "vehicle" => desc ? q.OrderByDescending(l => l.VehicleNumber) : q.OrderBy(l => l.VehicleNumber),
            "status" => desc ? q.OrderByDescending(l => l.Status) : q.OrderBy(l => l.Status),
            "from" => desc ? q.OrderByDescending(l => l.FromCity) : q.OrderBy(l => l.FromCity),
            "to" => desc ? q.OrderByDescending(l => l.ToCity) : q.OrderBy(l => l.ToCity),
            _ => desc
                ? q.OrderByDescending(l => l.LrDate).ThenByDescending(l => l.LrNumber)
                : q.OrderBy(l => l.LrDate).ThenBy(l => l.LrNumber),
        };
    }

    [HttpGet("{lrNumber}/status-history")]
    public async Task<ActionResult<object>> StatusHistory(string lrNumber, CancellationToken ct)
    {
        lrNumber = DocumentCodeRules.DecodePathId(lrNumber);
        var lr = await db.LorryReceipts.AsNoTracking().FirstOrDefaultAsync(x => x.LrNumber == lrNumber, ct);
        if (lr == null || !TenantScope.CanAccessBranchEntity(tenants, branches, lr)) return NotFound();

        var rows = await db.LrStatusHistories.AsNoTracking()
            .Where(h => h.LrNumber == lrNumber && h.CompanyId == lr.CompanyId)
            .OrderBy(h => h.ChangedAt)
            .Select(h => new
            {
                h.OldStatus,
                h.NewStatus,
                changedBy = h.ChangedBy,
                changedAt = h.ChangedAt,
                h.Remarks,
            })
            .ToListAsync(ct);

        if (rows.Count == 0)
        {
            rows =
            [
                new
                {
                    OldStatus = (string?)null,
                    NewStatus = lr.Status,
                    changedBy = lr.CreatedBy,
                    changedAt = lr.CreatedAt,
                    Remarks = (string?)null,
                },
            ];
        }

        return Ok(new { lrNumber, items = rows });
    }

    [HttpGet("{lrNumber}")]
    public async Task<ActionResult<LrDto>> Get(string lrNumber)
    {
        lrNumber = DocumentCodeRules.DecodePathId(lrNumber);
        var l = await db.LorryReceipts.AsNoTracking().Include(x => x.Branch).FirstOrDefaultAsync(x => x.LrNumber == lrNumber);
        if (l == null || !TenantScope.CanAccessBranchEntity(tenants, branches, l)) return NotFound();
        var dto = EntityMappers.ToDto(l);
        if (string.IsNullOrWhiteSpace(dto.Vehicle))
        {
            var map = await LrProcessService.LoadVehicleByLrAsync(db, [dto.LrNumber]);
            if (map.TryGetValue(dto.LrNumber, out var vehicle))
                dto = dto with { Vehicle = vehicle };
        }
        return Ok(dto);
    }

    [HttpGet("eligible-for-loading")]
    public async Task<ActionResult<object>> EligibleForLoading(
        [FromQuery] string businessType,
        [FromQuery] string? anchorLr,
        [FromQuery] string? customerId,
        [FromQuery] string? vehicleId)
    {
        var bt = LrBusinessTypes.Normalize(businessType);
        var q = tenants.Filter(branches.Filter(db.LorryReceipts.AsNoTracking()))
            .Where(l => l.BusinessType == bt && l.Status == LrStatuses.LRCreated);

        var loadedLrs = db.LrLoadingSheetItems.AsNoTracking()
            .Join(db.LrLoadingSheets.AsNoTracking(),
                i => i.LoadingSheetId,
                s => s.Id,
                (i, s) => new { i.LrNumber, s.LoadingStatus })
            .Where(x => x.LoadingStatus == "Completed")
            .Select(x => x.LrNumber);

        q = q.Where(l => !loadedLrs.Contains(l.LrNumber));

        if (bt == LrBusinessTypes.FTL && !string.IsNullOrWhiteSpace(anchorLr))
        {
            anchorLr = DocumentCodeRules.DecodePathId(anchorLr);
            var anchor = await db.LorryReceipts.AsNoTracking().FirstOrDefaultAsync(l => l.LrNumber == anchorLr);
            if (anchor != null)
            {
                var (cid, cname) = await LrBusinessTypeService.ResolveLrCustomerAsync(db, anchor);
                if (!string.IsNullOrWhiteSpace(cid))
                    q = q.Where(l => l.CustomerId == cid || l.BookingId == anchor.BookingId);
                else if (!string.IsNullOrWhiteSpace(cname))
                    q = q.Where(l => l.CustomerName == cname || l.Consignor == cname);
            }
        }

        if (!string.IsNullOrWhiteSpace(customerId))
            q = q.Where(l => l.CustomerId == customerId);

        decimal? capacity = null;
        if (!string.IsNullOrWhiteSpace(vehicleId))
            capacity = await LrBusinessTypeService.ResolveVehicleCapacityTonsAsync(db, tenants, branches, vehicleId, null);

        var rows = await q.OrderByDescending(l => l.LrDate).Take(100)
            .Select(l => new
            {
                l.LrNumber,
                l.LrDate,
                l.BusinessType,
                l.CustomerId,
                l.CustomerName,
                l.Consignor,
                l.Consignee,
                l.FromCity,
                l.ToCity,
                l.Quantity,
                l.VehicleNumber,
            })
            .ToListAsync();

        return Ok(new { businessType = bt, vehicleCapacityTons = capacity, items = rows });
    }

    [HttpGet("prefill/{bookingId}")]
    public async Task<ActionResult<object>> PrefillFromBooking(string bookingId)
    {
        bookingId = DocumentCodeRules.DecodePathId(bookingId);
        var b = await TenantScope.FindBookingAsync(db, tenants, branches, bookingId);
        if (b == null) return NotFound();

        var paymentsTotal = await db.BookingPayments
            .Where(p => p.BookingId == bookingId)
            .SumAsync(p => p.Amount);
        var advanceTotal = b.Advance + paymentsTotal;

        var bookingExpenses = await db.BookingExpenses
            .Where(e => e.BookingId == bookingId)
            .ToListAsync();
        var brokerCharges = await db.BookingBrokerCharges
            .Where(c => c.BookingId == bookingId)
            .ToListAsync();

        var hamali = bookingExpenses.Where(e => e.Category == "Hamali").Sum(e => e.Amount);
        var loading = bookingExpenses.Where(e => e.Category == "Loading").Sum(e => e.Amount)
            + brokerCharges.Where(c => c.ChargeType == "Loading").Sum(c => c.Amount);
        var unloading = bookingExpenses.Where(e => e.Category == "Detention").Sum(e => e.Amount);
        var otherExp = bookingExpenses.Where(e => e.Category is "Fuel" or "Toll" or "Other").Sum(e => e.Amount);

        var gst = Math.Round(b.Freight * 0.18m, 2);
        var totalCharges = gst + hamali + loading + unloading + otherExp;
        var balance = Math.Max(0, b.Freight + totalCharges - advanceTotal);

        var remarkParts = new List<string>();
        if (brokerCharges.Count > 0)
            remarkParts.Add($"Broker: {string.Join(", ", brokerCharges.Select(c => $"{c.BrokerName} ₹{c.Amount:N0}"))}");
        if (bookingExpenses.Count > 0)
            remarkParts.Add($"Expenses: {string.Join(", ", bookingExpenses.Select(e => $"{e.Category} ₹{e.Amount:N0}"))}");
        if (paymentsTotal > 0)
            remarkParts.Add($"Payments received: ₹{paymentsTotal:N0}");

        return Ok(new
        {
            bookingId = b.Id,
            consignorId = b.ConsignorId,
            consigneeId = b.ConsigneeId,
            consignor = b.Consignor,
            consignee = b.Consignee,
            from = b.FromCity,
            to = b.ToCity,
            vehicle = b.VehicleNumber,
            driver = b.DriverName,
            materialId = b.MaterialId,
            material = b.Material,
            quantity = b.Quantity,
            freight = b.Freight,
            gst,
            hamali,
            loadingCharges = loading,
            unloadingCharges = unloading,
            insurance = otherExp,
            advance = advanceTotal,
            bookingAdvance = b.Advance,
            paymentsTotal,
            balance,
            paymentType = b.Payment == "Paid" ? "Paid" : "To Pay",
            brokerChargesTotal = brokerCharges.Sum(c => c.Amount),
            bookingExpensesTotal = bookingExpenses.Sum(e => e.Amount),
            remarks = string.Join(" | ", remarkParts)
        });
    }

    [HttpPost]
    public async Task<ActionResult<LrDto>> Create([FromBody] Dictionary<string, object?> body)
    {
        var fieldMap = await fieldConfig.GetMapAsync(FieldConfigurationCatalog.ModuleLr);
        static bool Visible(IReadOnlyDictionary<string, FieldConfigurationDto> map, string key) =>
            !map.TryGetValue(key, out var f) || FieldConfigurationService.IsVisible(f);

        var from = Visible(fieldMap, "From") ? ApiParseHelper.BodyString(body, "from") : null;
        var to = Visible(fieldMap, "To") ? ApiParseHelper.BodyString(body, "to") : null;
        if (FieldConfigurationService.MustValidate(fieldMap.GetValueOrDefault("From")) && string.IsNullOrWhiteSpace(from))
            return BadRequest(new ApiError(FieldConfigurationService.RequiredMessage(fieldMap.GetValueOrDefault("From"), "Pickup City")));
        if (FieldConfigurationService.MustValidate(fieldMap.GetValueOrDefault("To")) && string.IsNullOrWhiteSpace(to))
            return BadRequest(new ApiError(FieldConfigurationService.RequiredMessage(fieldMap.GetValueOrDefault("To"), "Delivery City")));

        var consignorId = Visible(fieldMap, "Consignor") ? ApiParseHelper.BodyString(body, "consignorId") : null;
        var consigneeId = Visible(fieldMap, "Consignee") ? ApiParseHelper.BodyString(body, "consigneeId") : null;
        var consignorText = Visible(fieldMap, "Consignor") ? ApiParseHelper.BodyString(body, "consignor") : null;
        var consigneeText = Visible(fieldMap, "Consignee") ? ApiParseHelper.BodyString(body, "consignee") : null;

        Consignor? consignorRow = null;
        Consignee? consigneeRow = null;
        if (Visible(fieldMap, "Consignor"))
        {
            var requireConsignor = FieldConfigurationService.MustValidate(fieldMap.GetValueOrDefault("Consignor"));
            var (row, consignorErr) = await PartyMasterHelper.ResolveActiveConsignorAsync(
                db, tenants, branches, consignorId, consignorText, requireValue: requireConsignor);
            if (consignorErr != null) return BadRequest(new ApiError(
                requireConsignor && consignorErr == "Consignor is required."
                    ? FieldConfigurationService.RequiredMessage(fieldMap.GetValueOrDefault("Consignor"), "Consignor")
                    : consignorErr));
            consignorRow = row;
        }
        if (Visible(fieldMap, "Consignee"))
        {
            var requireConsignee = FieldConfigurationService.MustValidate(fieldMap.GetValueOrDefault("Consignee"));
            var (row, consigneeErr) = await PartyMasterHelper.ResolveActiveConsigneeAsync(
                db, tenants, branches, consigneeId, consigneeText, requireValue: requireConsignee);
            if (consigneeErr != null) return BadRequest(new ApiError(
                requireConsignee && consigneeErr == "Consignee is required."
                    ? FieldConfigurationService.RequiredMessage(fieldMap.GetValueOrDefault("Consignee"), "Consignee")
                    : consigneeErr));
            consigneeRow = row;
        }

        if (FieldConfigurationService.MustValidate(fieldMap.GetValueOrDefault("LrDate"))
            && string.IsNullOrWhiteSpace(ApiParseHelper.BodyString(body, "lrDate")))
            return BadRequest(new ApiError(FieldConfigurationService.RequiredMessage(fieldMap.GetValueOrDefault("LrDate"), "LR Date")));

        var consignorName = consignorRow != null
            ? PartyMasterHelper.DisplayName(consignorRow.Name, consignorRow.CompanyName)
            : (consignorText?.Trim());
        var consigneeName = consigneeRow != null
            ? PartyMasterHelper.DisplayName(consigneeRow.Name, consigneeRow.CompanyName)
            : (consigneeText?.Trim());

        var bookingId = Visible(fieldMap, "BookingId") ? ApiParseHelper.BodyString(body, "bookingId") : null;

        Booking? booking = null;
        if (!string.IsNullOrEmpty(bookingId))
            booking = await TenantScope.FindBookingAsync(db, tenants, branches, bookingId);

        if (!string.IsNullOrEmpty(bookingId) && booking == null)
            return BadRequest(new ApiError("Booking not found in your company."));

        var companyId = booking?.CompanyId ?? TenantScope.ResolveCompanyId(tenants);
        Guid branchId;
        DateOnly lrDate;
        string lrNumber;
        try
        {
            branchId = await documentNumbers.ResolveBranchIdForNumberingAsync(tenants, branches, booking?.BranchId);
            lrDate = ApiParseHelper.BodyDate(body, "lrDate", DateOnly.FromDateTime(DateTime.UtcNow));
            lrNumber = await documentNumbers.NextAsync(DocumentNumberTypes.LR, companyId, branchId, lrDate);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiError(ex.Message));
        }
        var vehicleNum = Visible(fieldMap, "Vehicle") ? ApiParseHelper.BodyString(body, "vehicle") : null;
        var vehicle = !string.IsNullOrEmpty(vehicleNum)
            ? await TenantScope.FindVehicleByRefAsync(db, tenants, branches, vehicleNum) : null;
        var driverName = Visible(fieldMap, "Driver") ? ApiParseHelper.BodyString(body, "driver") : null;
        var driver = !string.IsNullOrEmpty(driverName)
            ? await ResolveDriverAsync(driverName) : null;
        var freight = Visible(fieldMap, "Freight") ? ApiParseHelper.BodyDecimal(body, "freight") : 0;
        var gst = body.ContainsKey("gst") && Visible(fieldMap, "GstPercent")
            ? ApiParseHelper.BodyDecimal(body, "gst")
            : (Visible(fieldMap, "GstPercent") ? freight * 0.18m : 0);
        var hamali = ApiParseHelper.BodyDecimal(body, "hamali");
        var loading = Visible(fieldMap, "LoadingCharges") ? ApiParseHelper.BodyDecimal(body, "loadingCharges") : 0;
        var unloading = Visible(fieldMap, "UnloadingCharges") ? ApiParseHelper.BodyDecimal(body, "unloadingCharges") : 0;
        var insurance = Visible(fieldMap, "Insurance") ? ApiParseHelper.BodyDecimal(body, "insurance") : 0;
        var advance = Visible(fieldMap, "Advance") ? ApiParseHelper.BodyDecimal(body, "advance") : 0;
        if (booking != null && Visible(fieldMap, "Advance"))
        {
            var paymentsTotal = await db.BookingPayments
                .Where(p => p.BookingId == bookingId)
                .SumAsync(p => p.Amount);
            if (advance == 0)
                advance = booking.Advance + paymentsTotal;
        }

        var billingCustomerId = Visible(fieldMap, "BillingParty")
            ? (ApiParseHelper.BodyString(body, "customerId") ?? ApiParseHelper.BodyString(body, "billingPartyId"))
            : null;
        var billingCustomerName = Visible(fieldMap, "BillingParty")
            ? (ApiParseHelper.BodyString(body, "customerName")
                ?? ApiParseHelper.BodyString(body, "billingParty")
                ?? booking?.CustomerName
                ?? consignorName)
            : (booking?.CustomerName ?? consignorName);
        var billingCustomer = await BookingFinanceService.ResolveBillingCustomerAsync(
            db, tenants, branches, billingCustomerId, billingCustomerName);
        // Prefer explicit billing party; fall back to booking customer when unresolved.
        if (billingCustomer == null && !string.IsNullOrEmpty(booking?.CustomerId))
            billingCustomer = await TenantScope.FindCustomerAsync(db, tenants, branches, booking.CustomerId);

        var lr = new LorryReceipt
        {
            LrNumber = lrNumber,
            CompanyId = companyId,
            BranchId = branchId,
            LrDate = lrDate,
            BookingId = booking?.Id,
            BusinessType = Visible(fieldMap, "BusinessType")
                ? LrBusinessTypes.Normalize(ApiParseHelper.BodyString(body, "businessType"))
                : LrBusinessTypes.Normalize(null),
            CustomerId = billingCustomer?.Id ?? booking?.CustomerId,
            CustomerName = billingCustomer?.Name ?? billingCustomerName ?? booking?.CustomerName,
            ConsignorId = consignorRow?.Id ?? consignorId,
            ConsigneeId = consigneeRow?.Id ?? consigneeId,
            Consignor = consignorName,
            Consignee = consigneeName,
            FromCity = from ?? "",
            ToCity = to ?? "",
            VehicleId = vehicle?.Id,
            VehicleNumber = vehicle?.Number ?? vehicleNum,
            DriverId = driver?.Id,
            DriverName = driver?.Name ?? driverName,
            Material = Visible(fieldMap, "Material") ? ApiParseHelper.BodyString(body, "material") : null,
            Quantity = ApiParseHelper.BodyString(body, "quantity"),
            Freight = freight,
            Gst = gst,
            Hamali = hamali,
            LoadingCharges = loading,
            UnloadingCharges = unloading,
            Insurance = insurance,
            Advance = advance,
            Balance = freight + gst + hamali + loading + unloading + insurance - advance,
            PaymentType = Visible(fieldMap, "PaymentType")
                ? (ApiParseHelper.BodyString(body, "paymentType") ?? "To Pay")
                : "To Pay",
            Status = ApiParseHelper.BodyBool(body, "isDraft") == true ? LrStatuses.Draft : LrStatuses.LRCreated,
            Remarks = Visible(fieldMap, "Remarks") ? ApiParseHelper.BodyString(body, "remarks") : null,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.LorryReceipts.Add(lr);
        await db.SaveChangesAsync();
        await BookingFinanceService.SyncCustomerOutstandingAsync(db, companyId, lr.CustomerId);
        await db.SaveChangesAsync();
        try { await ewayBillSync.SyncFromLrAsync(lr); }
        catch { /* e-way sync is best-effort */ }
        return CreatedAtAction(nameof(Get), new { lrNumber }, EntityMappers.ToDto(lr));
    }

    [HttpPut("{lrNumber}")]
    public async Task<ActionResult<LrDto>> Update(string lrNumber, [FromBody] Dictionary<string, object?> body)
    {
        lrNumber = DocumentCodeRules.DecodePathId(lrNumber);
        var lr = await db.LorryReceipts.FindAsync(lrNumber);
        if (lr == null || !TenantScope.CanAccessBranchEntity(tenants, branches, lr)) return NotFound();
        var previousCustomerId = lr.CustomerId;

        if (body.ContainsKey("lrDate"))
            lr.LrDate = ApiParseHelper.BodyDate(body, "lrDate", lr.LrDate);
        if (body.ContainsKey("bookingId"))
        {
            var newBookingId = ApiParseHelper.BodyString(body, "bookingId");
            if (string.IsNullOrEmpty(newBookingId))
            {
                lr.BookingId = null;
            }
            else
            {
                var linked = await TenantScope.FindBookingAsync(db, tenants, branches, newBookingId);
                if (linked == null) return BadRequest(new ApiError("Booking not found in your company."));
                lr.BookingId = linked.Id;
            }
        }
        if (body.ContainsKey("consignorId"))
            lr.ConsignorId = ApiParseHelper.BodyString(body, "consignorId");
        if (body.ContainsKey("consignor"))
            lr.Consignor = ApiParseHelper.BodyString(body, "consignor");
        if (body.ContainsKey("consigneeId"))
            lr.ConsigneeId = ApiParseHelper.BodyString(body, "consigneeId");
        if (body.ContainsKey("consignee"))
            lr.Consignee = ApiParseHelper.BodyString(body, "consignee");
        if (body.ContainsKey("consignorId") || body.ContainsKey("consignor"))
        {
            var lrFieldMap = await fieldConfig.GetMapAsync(FieldConfigurationCatalog.ModuleLr);
            var consignorCfg = lrFieldMap.GetValueOrDefault("Consignor");
            if (FieldConfigurationService.IsVisible(consignorCfg))
            {
                var requireConsignor = FieldConfigurationService.MustValidate(consignorCfg);
                var (row, err) = await PartyMasterHelper.ResolveActiveConsignorAsync(
                    db, tenants, branches, lr.ConsignorId, lr.Consignor, requireValue: requireConsignor);
                if (err != null) return BadRequest(new ApiError(
                    requireConsignor && err == "Consignor is required."
                        ? FieldConfigurationService.RequiredMessage(consignorCfg, "Consignor")
                        : err));
                if (row != null)
                {
                    lr.ConsignorId = row.Id;
                    lr.Consignor = PartyMasterHelper.DisplayName(row.Name, row.CompanyName);
                }
                else if (requireConsignor && string.IsNullOrWhiteSpace(lr.Consignor))
                    return BadRequest(new ApiError(FieldConfigurationService.RequiredMessage(consignorCfg, "Consignor")));
            }
        }
        if (body.ContainsKey("consigneeId") || body.ContainsKey("consignee"))
        {
            var lrFieldMap = await fieldConfig.GetMapAsync(FieldConfigurationCatalog.ModuleLr);
            var consigneeCfg = lrFieldMap.GetValueOrDefault("Consignee");
            if (FieldConfigurationService.IsVisible(consigneeCfg))
            {
                var requireConsignee = FieldConfigurationService.MustValidate(consigneeCfg);
                var (row, err) = await PartyMasterHelper.ResolveActiveConsigneeAsync(
                    db, tenants, branches, lr.ConsigneeId, lr.Consignee, requireValue: requireConsignee);
                if (err != null) return BadRequest(new ApiError(
                    requireConsignee && err == "Consignee is required."
                        ? FieldConfigurationService.RequiredMessage(consigneeCfg, "Consignee")
                        : err));
                if (row != null)
                {
                    lr.ConsigneeId = row.Id;
                    lr.Consignee = PartyMasterHelper.DisplayName(row.Name, row.CompanyName);
                }
                else if (requireConsignee && string.IsNullOrWhiteSpace(lr.Consignee))
                    return BadRequest(new ApiError(FieldConfigurationService.RequiredMessage(consigneeCfg, "Consignee")));
            }
        }
        if (body.ContainsKey("from") && !string.IsNullOrWhiteSpace(ApiParseHelper.BodyString(body, "from")))
            lr.FromCity = ApiParseHelper.BodyString(body, "from")!;
        if (body.ContainsKey("to") && !string.IsNullOrWhiteSpace(ApiParseHelper.BodyString(body, "to")))
            lr.ToCity = ApiParseHelper.BodyString(body, "to")!;

        if (body.ContainsKey("vehicle"))
        {
            var vehicleNum = ApiParseHelper.BodyString(body, "vehicle");
            var vehicle = !string.IsNullOrEmpty(vehicleNum)
                ? await TenantScope.FindVehicleByRefAsync(db, tenants, branches, vehicleNum) : null;
            lr.VehicleId = vehicle?.Id;
            lr.VehicleNumber = vehicle?.Number ?? vehicleNum;
        }
        if (body.ContainsKey("driver"))
        {
            var driverName = ApiParseHelper.BodyString(body, "driver");
            var driver = !string.IsNullOrEmpty(driverName)
                ? await ResolveDriverAsync(driverName) : null;
            lr.DriverId = driver?.Id;
            lr.DriverName = driver?.Name ?? driverName;
        }
        if (body.ContainsKey("material"))
            lr.Material = ApiParseHelper.BodyString(body, "material");
        if (body.ContainsKey("quantity"))
            lr.Quantity = ApiParseHelper.BodyString(body, "quantity");
        if (body.ContainsKey("freight"))
            lr.Freight = ApiParseHelper.BodyDecimal(body, "freight");
        if (body.ContainsKey("gst"))
            lr.Gst = ApiParseHelper.BodyDecimal(body, "gst");
        if (body.ContainsKey("hamali"))
            lr.Hamali = ApiParseHelper.BodyDecimal(body, "hamali");
        if (body.ContainsKey("loadingCharges"))
            lr.LoadingCharges = ApiParseHelper.BodyDecimal(body, "loadingCharges");
        if (body.ContainsKey("unloadingCharges"))
            lr.UnloadingCharges = ApiParseHelper.BodyDecimal(body, "unloadingCharges");
        if (body.ContainsKey("insurance"))
            lr.Insurance = ApiParseHelper.BodyDecimal(body, "insurance");
        if (body.ContainsKey("advance"))
            lr.Advance = ApiParseHelper.BodyDecimal(body, "advance");
        if (body.ContainsKey("paymentType"))
            lr.PaymentType = ApiParseHelper.BodyString(body, "paymentType") ?? lr.PaymentType;
        if (body.ContainsKey("businessType"))
            lr.BusinessType = LrBusinessTypes.Normalize(ApiParseHelper.BodyString(body, "businessType"));
        if (body.ContainsKey("remarks"))
            lr.Remarks = ApiParseHelper.BodyString(body, "remarks");

        lr.Balance = lr.Freight + lr.Gst
            + (lr.Hamali ?? 0) + (lr.LoadingCharges ?? 0) + (lr.UnloadingCharges ?? 0) + (lr.Insurance ?? 0)
            - (lr.Advance ?? 0);

        if (body.ContainsKey("customerId") || body.ContainsKey("billingPartyId")
            || body.ContainsKey("customerName") || body.ContainsKey("billingParty"))
        {
            var billingCustomerId = ApiParseHelper.BodyString(body, "customerId")
                ?? ApiParseHelper.BodyString(body, "billingPartyId");
            var billingCustomerName = ApiParseHelper.BodyString(body, "customerName")
                ?? ApiParseHelper.BodyString(body, "billingParty")
                ?? lr.CustomerName
                ?? lr.Consignor;
            var billingCustomer = await BookingFinanceService.ResolveBillingCustomerAsync(
                db, tenants, branches, billingCustomerId, billingCustomerName);
            if (billingCustomer != null)
            {
                lr.CustomerId = billingCustomer.Id;
                lr.CustomerName = billingCustomer.Name;
            }
            else if (!string.IsNullOrWhiteSpace(billingCustomerName))
            {
                lr.CustomerName = billingCustomerName;
            }
        }

        lr.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await BookingFinanceService.SyncCustomerOutstandingAsync(db, lr.CompanyId, previousCustomerId);
        if (!string.Equals(previousCustomerId, lr.CustomerId, StringComparison.OrdinalIgnoreCase))
            await BookingFinanceService.SyncCustomerOutstandingAsync(db, lr.CompanyId, lr.CustomerId);
        await db.SaveChangesAsync();
        try { await ewayBillSync.SyncFromLrAsync(lr); }
        catch { /* e-way sync is best-effort */ }
        return Ok(EntityMappers.ToDto(lr));
    }

    [HttpDelete("{lrNumber}")]
    public async Task<IActionResult> Delete(string lrNumber)
    {
        lrNumber = DocumentCodeRules.DecodePathId(lrNumber);
        var lr = await db.LorryReceipts.FindAsync(lrNumber);
        if (lr == null || !TenantScope.CanAccessBranchEntity(tenants, branches, lr)) return NotFound();
        var customerId = lr.CustomerId;
        var companyId = lr.CompanyId;
        db.LorryReceipts.Remove(lr);
        await db.SaveChangesAsync();
        await BookingFinanceService.SyncCustomerOutstandingAsync(db, companyId, customerId);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
