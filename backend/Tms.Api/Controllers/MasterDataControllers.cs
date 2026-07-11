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
public class DriversController(TmsDbContext db, IBranchContext branches, ITenantContext tenants) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<DriverDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true)
    {
        var q = tenants.Filter(branches.Filter(db.Drivers.AsNoTracking()));
        if (!string.IsNullOrWhiteSpace(status) && status != "(All)")
            q = q.Where(d => d.Status == status);
        q = SearchHelper.Filter(q, search);
        q = q.OrderBy(d => d.Name);
        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize);
        var (items, total, hasMore, approx) = await q.ToPagedListAsync(p, size, includeTotal);
        return Ok(new PagedResult<DriverDto>(
            items.Select(EntityMappers.ToDto).ToList(), total, p, size, hasMore, approx));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<DriverDto>> Get(string id)
    {
        var d = await db.Drivers.FindAsync(id);
        if (d == null || !TenantScope.CanAccessBranchEntity(tenants, branches, d)) return NotFound();
        return Ok(EntityMappers.ToDto(d));
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
            BranchId = branches.AssignBranchId,
            CompanyId = TenantScope.ResolveCompanyId(tenants),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
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
        d.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(EntityMappers.ToDto(d));
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
public class VendorsController(TmsDbContext db, ITenantContext tenants) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<VendorDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? category,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true)
    {
        var q = tenants.Filter(db.Vendors.AsNoTracking());
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
        var v = await db.Vendors.FindAsync(id);
        if (v == null || !TenantScope.CanAccessTenantEntity(tenants, v)) return NotFound();
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
        if (v == null || !TenantScope.CanAccessTenantEntity(tenants, v)) return NotFound();
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
        if (v == null || !TenantScope.CanAccessTenantEntity(tenants, v)) return NotFound();
        db.Vendors.Remove(v);
        await db.SaveChangesAsync();
        return NoContent();
    }
}

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ExpensesController(TmsDbContext db, IBranchContext branches, ITenantContext tenants) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<ExpenseDto>>> GetAll(
        [FromQuery] string? category,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true)
    {
        var q = tenants.Filter(branches.Filter(db.Expenses.AsNoTracking()));
        if (!string.IsNullOrWhiteSpace(category) && category != "(All)") q = q.Where(e => e.Category == category);
        q = SearchHelper.Filter(q, search);
        q = q.OrderByDescending(e => e.ExpenseDate).ThenByDescending(e => e.Id);
        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize);
        var (items, total, hasMore, approx) = await q.ToPagedListAsync(p, size, includeTotal);
        return Ok(new PagedResult<ExpenseDto>(
            items.Select(EntityMappers.ToDto).ToList(), total, p, size, hasMore, approx));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ExpenseDto>> Get(string id)
    {
        var e = await db.Expenses.FindAsync(id);
        if (e == null || !TenantScope.CanAccessBranchEntity(tenants, branches, e)) return NotFound();
        return Ok(EntityMappers.ToDto(e));
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
            UpdatedAt = DateTime.UtcNow
        };
        db.Expenses.Add(exp);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id }, EntityMappers.ToDto(exp));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ExpenseDto>> Update(string id, [FromBody] Dictionary<string, object?> body)
    {
        var exp = await db.Expenses.FindAsync(id);
        if (exp == null || !TenantScope.CanAccessBranchEntity(tenants, branches, exp)) return NotFound();
        if (body.ContainsKey("category")) exp.Category = body["category"]?.ToString() ?? exp.Category;
        if (body.ContainsKey("description")) exp.Description = body["description"]?.ToString();
        if (body.ContainsKey("amount") && decimal.TryParse(body["amount"]?.ToString(), out var amt)) exp.Amount = amt;
        if (body.ContainsKey("status")) exp.Status = body["status"]?.ToString() ?? exp.Status;
        exp.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(EntityMappers.ToDto(exp));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var exp = await db.Expenses.FindAsync(id);
        if (exp == null || !TenantScope.CanAccessBranchEntity(tenants, branches, exp)) return NotFound();
        db.Expenses.Remove(exp);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("categories")]
    public ActionResult<string[]> Categories() =>
        Ok(new[] { "Fuel", "Toll", "Maintenance", "Salary", "Office Expense", "Miscellaneous" });
}

[Authorize]
[ApiController]
[Route("api/lr")]
public class LrController(TmsDbContext db, ITenantContext tenants, IBranchContext branches, DriverSyncService driverSync) : ControllerBase
{
    async Task<Driver?> ResolveDriverAsync(string? driverName, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(driverName)) return null;
        var driver = await TenantScope.FindDriverByRefAsync(db, tenants, branches, driverName, ct);
        return driver ?? await driverSync.EnsureDriverByNameAsync(driverName, ct: ct);
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<LrDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? paymentType,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true)
    {
        var q = tenants.Filter(db.LorryReceipts.AsNoTracking());
        if (!string.IsNullOrWhiteSpace(paymentType) && paymentType != "(All)")
            q = q.Where(l => l.PaymentType == paymentType);
        q = SearchHelper.Filter(q, search);
        q = q.OrderByDescending(l => l.LrDate).ThenByDescending(l => l.LrNumber);
        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize);
        var (items, total, hasMore, approx) = await q.ToPagedListAsync(p, size, includeTotal);
        return Ok(new PagedResult<LrDto>(
            items.Select(EntityMappers.ToDto).ToList(), total, p, size, hasMore, approx));
    }

    [HttpGet("{lrNumber}")]
    public async Task<ActionResult<LrDto>> Get(string lrNumber)
    {
        var l = await db.LorryReceipts.FindAsync(lrNumber);
        if (l == null || !TenantScope.CanAccessTenantEntity(tenants, l)) return NotFound();
        return Ok(EntityMappers.ToDto(l));
    }

    [HttpGet("prefill/{bookingId}")]
    public async Task<ActionResult<object>> PrefillFromBooking(string bookingId)
    {
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
            consignor = b.Consignor,
            consignee = b.Consignee,
            from = b.FromCity,
            to = b.ToCity,
            vehicle = b.VehicleNumber,
            driver = b.DriverName,
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
        var from = ApiParseHelper.BodyString(body, "from");
        var to = ApiParseHelper.BodyString(body, "to");
        if (string.IsNullOrWhiteSpace(from) || string.IsNullOrWhiteSpace(to))
            return BadRequest(new ApiError("From and To cities are required."));

        var bookingId = ApiParseHelper.BodyString(body, "bookingId");
        Booking? booking = null;
        if (!string.IsNullOrEmpty(bookingId))
            booking = await TenantScope.FindBookingAsync(db, tenants, branches, bookingId);

        if (!string.IsNullOrEmpty(bookingId) && booking == null)
            return BadRequest(new ApiError("Booking not found in your company."));

        var lrNumber = await IdGenerator.NextLrNumber(db);
        var vehicleNum = ApiParseHelper.BodyString(body, "vehicle");
        var vehicle = !string.IsNullOrEmpty(vehicleNum)
            ? await TenantScope.FindVehicleByRefAsync(db, tenants, branches, vehicleNum) : null;
        var driverName = ApiParseHelper.BodyString(body, "driver");
        var driver = !string.IsNullOrEmpty(driverName)
            ? await ResolveDriverAsync(driverName) : null;
        var freight = ApiParseHelper.BodyDecimal(body, "freight");
        var gst = body.ContainsKey("gst")
            ? ApiParseHelper.BodyDecimal(body, "gst")
            : freight * 0.18m;
        var hamali = ApiParseHelper.BodyDecimal(body, "hamali");
        var loading = ApiParseHelper.BodyDecimal(body, "loadingCharges");
        var unloading = ApiParseHelper.BodyDecimal(body, "unloadingCharges");
        var insurance = ApiParseHelper.BodyDecimal(body, "insurance");
        var advance = ApiParseHelper.BodyDecimal(body, "advance");
        if (booking != null)
        {
            var paymentsTotal = await db.BookingPayments
                .Where(p => p.BookingId == bookingId)
                .SumAsync(p => p.Amount);
            if (advance == 0)
                advance = booking.Advance + paymentsTotal;
        }

        var lr = new LorryReceipt
        {
            LrNumber = lrNumber,
            CompanyId = booking?.CompanyId ?? TenantScope.ResolveCompanyId(tenants),
            LrDate = ApiParseHelper.BodyDate(body, "lrDate", DateOnly.FromDateTime(DateTime.UtcNow)),
            BookingId = booking?.Id,
            Consignor = ApiParseHelper.BodyString(body, "consignor"),
            Consignee = ApiParseHelper.BodyString(body, "consignee"),
            FromCity = from,
            ToCity = to,
            VehicleId = vehicle?.Id,
            VehicleNumber = vehicle?.Number ?? vehicleNum,
            DriverId = driver?.Id,
            DriverName = driver?.Name ?? driverName,
            Material = ApiParseHelper.BodyString(body, "material"),
            Quantity = ApiParseHelper.BodyString(body, "quantity"),
            Freight = freight,
            Gst = gst,
            Hamali = hamali,
            LoadingCharges = loading,
            UnloadingCharges = unloading,
            Insurance = insurance,
            Advance = advance,
            Balance = freight + gst + hamali + loading + unloading + insurance - advance,
            PaymentType = ApiParseHelper.BodyString(body, "paymentType") ?? "To Pay",
            Remarks = ApiParseHelper.BodyString(body, "remarks"),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.LorryReceipts.Add(lr);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { lrNumber }, EntityMappers.ToDto(lr));
    }

    [HttpPut("{lrNumber}")]
    public async Task<ActionResult<LrDto>> Update(string lrNumber, [FromBody] Dictionary<string, object?> body)
    {
        var lr = await db.LorryReceipts.FindAsync(lrNumber);
        if (lr == null || !TenantScope.CanAccessTenantEntity(tenants, lr)) return NotFound();

        if (body.ContainsKey("lrDate"))
            lr.LrDate = ApiParseHelper.BodyDate(body, "lrDate", lr.LrDate);
        if (body.ContainsKey("bookingId"))
        {
            var newBookingId = ApiParseHelper.BodyString(body, "bookingId");
            if (string.IsNullOrEmpty(newBookingId))
                lr.BookingId = null;
            else
            {
                var linked = await TenantScope.FindBookingAsync(db, tenants, branches, newBookingId);
                if (linked == null) return BadRequest(new ApiError("Booking not found in your company."));
                lr.BookingId = linked.Id;
            }
        }
        if (body.ContainsKey("consignor"))
            lr.Consignor = ApiParseHelper.BodyString(body, "consignor");
        if (body.ContainsKey("consignee"))
            lr.Consignee = ApiParseHelper.BodyString(body, "consignee");
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
        if (body.ContainsKey("remarks"))
            lr.Remarks = ApiParseHelper.BodyString(body, "remarks");

        lr.Balance = lr.Freight + lr.Gst
            + (lr.Hamali ?? 0) + (lr.LoadingCharges ?? 0) + (lr.UnloadingCharges ?? 0) + (lr.Insurance ?? 0)
            - (lr.Advance ?? 0);
        lr.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(EntityMappers.ToDto(lr));
    }

    [HttpDelete("{lrNumber}")]
    public async Task<IActionResult> Delete(string lrNumber)
    {
        var lr = await db.LorryReceipts.FindAsync(lrNumber);
        if (lr == null || !TenantScope.CanAccessTenantEntity(tenants, lr)) return NotFound();
        db.LorryReceipts.Remove(lr);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
