using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.DTOs;
using Tms.Api.Models;
using Tms.Api.Services;

namespace Tms.Api.Controllers;

[Authorize(Roles = $"{TenantRoles.PlatformSuperAdmin},{TenantRoles.SuperAdmin}")]
[EnableRateLimiting(AuthRateLimiting.PlatformPolicyName)]
[ApiController]
[Route("api/platform")]
public class PlatformController(TmsDbContext db, RoleMenuService roleMenus, UserRoleTypeService roleTypes) : ControllerBase
{
    /// <summary>List companies with optional search and pagination.</summary>
    [HttpGet("companies")]
    [ProducesResponseType(typeof(object), 200)]
    public async Task<ActionResult<object>> ListCompanies(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50,
        [FromQuery] string? search = null, [FromQuery] string? active = null)
    {
        var q = db.Companies.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(c => c.Name.ToLower().Contains(s) || c.Code.ToLower().Contains(s)
                || (c.City != null && c.City.ToLower().Contains(s))
                || (c.Email != null && c.Email.ToLower().Contains(s)));
        }
        if (active == "true") q = q.Where(c => c.IsActive);
        else if (active == "false") q = q.Where(c => !c.IsActive);

        var total = await q.CountAsync();
        var rows = await q.OrderBy(c => c.Name)
            .Skip((Math.Max(1, page) - 1) * pageSize)
            .Take(Math.Clamp(pageSize, 1, 100))
            .Select(c => new
            {
                c.Id, c.Code, c.Name, c.Email, c.Phone, c.City, c.State,
                c.LegalName, c.Gstin, c.IsActive,
                plan = db.CompanySubscriptions
                    .Where(s => s.CompanyId == c.Id && s.Status == "active")
                    .Select(s => s.Plan!.Name)
                    .FirstOrDefault()
            }).ToListAsync();
        return Ok(new { rows, total, page, pageSize });
    }

    [HttpPost("companies")]
    public async Task<ActionResult<object>> CreateCompany([FromBody] Dictionary<string, object?> body)
    {
        var code = ApiParseHelper.BodyString(body, "code")?.Trim().ToUpperInvariant();
        var name = ApiParseHelper.BodyString(body, "name");
        var planCode = ApiParseHelper.BodyString(body, "planCode") ?? "starter";
        var adminUsername = ApiParseHelper.BodyString(body, "adminUsername");
        var adminPassword = ApiParseHelper.BodyString(body, "adminPassword") ?? "changeme123";

        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(name))
            return BadRequest(new ApiError("Company code and name are required."));
        if (!DocumentCodeRules.IsValid(code))
            return BadRequest(new ApiError("Company code must be exactly 2 characters (A–Z / 0–9), e.g. 01."));
        if (await db.Companies.AnyAsync(c => c.Code == code))
            return BadRequest(new ApiError($"Company code '{code}' already exists."));

        var plan = await db.SubscriptionPlans.FirstOrDefaultAsync(p => p.Code == planCode && p.IsActive);
        if (plan == null) return BadRequest(new ApiError($"Plan '{planCode}' not found."));

        if (!string.IsNullOrWhiteSpace(adminUsername)
            && await db.Users.AnyAsync(u => u.Username == adminUsername))
            return BadRequest(new ApiError("Admin username already taken."));

        var companyId = Guid.NewGuid();
        var branchId = Guid.NewGuid();
        var now = DateTime.UtcNow;

        var company = new Company
        {
            Id = companyId,
            Code = code,
            Name = name,
            LegalName = ApiParseHelper.BodyString(body, "legalName") ?? name,
            Email = ApiParseHelper.BodyString(body, "email"),
            Phone = ApiParseHelper.BodyString(body, "phone"),
            City = ApiParseHelper.BodyString(body, "city"),
            State = ApiParseHelper.BodyString(body, "state"),
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };

        var branch = new Branch
        {
            Id = branchId,
            CompanyId = companyId,
            Code = "01",
            Name = $"{name} — Head Office",
            City = company.City,
            State = company.State,
            IsHeadOffice = true,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };

        db.Companies.Add(company);
        await using var tx = await db.Database.BeginTransactionAsync();
        try
        {
            await db.SaveChangesAsync();

            db.Branches.Add(branch);
            db.CompanySubscriptions.Add(new CompanySubscription
            {
                Id = Guid.NewGuid(),
                CompanyId = companyId,
                PlanId = plan.Id,
                Status = "active",
                StartedAt = DateOnly.FromDateTime(now),
                AmountInr = plan.PriceInr,
                CreatedAt = now,
                UpdatedAt = now
            });

            if (!string.IsNullOrWhiteSpace(adminUsername))
            {
                db.Users.Add(new User
                {
                    Id = Guid.NewGuid(),
                    CompanyId = companyId,
                    BranchId = branchId,
                    Username = adminUsername,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword),
                    FullName = ApiParseHelper.BodyString(body, "adminName") ?? $"{name} Admin",
                    Role = TenantRoles.CompanyAdmin,
                    IsActive = true,
                    CreatedAt = now
                });
            }

            await db.SaveChangesAsync();
            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }

        // Provision User Role Types + default menu matrix for the new company
        await roleTypes.EnsureSystemRolesAsync(companyId);
        await roleMenus.ProvisionCompanyRoleTypesAsync(companyId, overwriteExisting: false);

        return Ok(new { message = "Company created.", companyId, branchId, plan = plan.Code });
    }

    /// <summary>Update company details (name, email, phone, city, etc.).</summary>
    [HttpPut("companies/{companyId:guid}")]
    [ProducesResponseType(typeof(object), 200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<object>> UpdateCompany(Guid companyId, [FromBody] Dictionary<string, object?> body)
    {
        var company = await db.Companies.FindAsync(companyId);
        if (company == null) return NotFound();

        if (body.ContainsKey("name")) company.Name = ApiParseHelper.BodyString(body, "name") ?? company.Name;
        if (body.ContainsKey("legalName")) company.LegalName = ApiParseHelper.BodyString(body, "legalName");
        if (body.ContainsKey("email")) company.Email = ApiParseHelper.BodyString(body, "email");
        if (body.ContainsKey("phone")) company.Phone = ApiParseHelper.BodyString(body, "phone");
        if (body.ContainsKey("city")) company.City = ApiParseHelper.BodyString(body, "city");
        if (body.ContainsKey("state")) company.State = ApiParseHelper.BodyString(body, "state");
        if (body.ContainsKey("gstin")) company.Gstin = ApiParseHelper.BodyString(body, "gstin");
        company.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(new { message = "Company updated.", companyId });
    }

    /// <summary>Activate or deactivate a company.</summary>
    [HttpPatch("companies/{companyId:guid}/status")]
    [ProducesResponseType(typeof(object), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<object>> ToggleCompanyStatus(Guid companyId, [FromBody] Dictionary<string, object?> body)
    {
        var company = await db.Companies.FindAsync(companyId);
        if (company == null) return NotFound();

        var isActive = ApiParseHelper.BodyBool(body, "isActive");
        if (isActive == null) return BadRequest(new ApiError("isActive is required."));
        company.IsActive = isActive.Value;
        company.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = company.IsActive ? "Company activated." : "Company deactivated.", companyId });
    }

    [HttpGet("plans")]
    public async Task<ActionResult<object>> ListPlans() =>
        Ok(await db.SubscriptionPlans.Where(p => p.IsActive).OrderBy(p => p.SortOrder).Select(p => new
        {
            p.Id,
            p.Code,
            p.Name,
            priceInr = p.PriceInr,
            p.MaxUsers,
            maxBookingsMonth = p.MaxBookingsMonth,
            features = SubscriptionService.ParseFeatures(p.FeaturesJson),
            p.IsCustom
        }).ToListAsync());

    [HttpPut("companies/{companyId:guid}/subscription")]
    public async Task<ActionResult<object>> ChangePlan(Guid companyId, [FromBody] Dictionary<string, object?> body)
    {
        var planCode = ApiParseHelper.BodyString(body, "planCode");
        if (string.IsNullOrWhiteSpace(planCode)) return BadRequest(new ApiError("planCode is required."));

        var company = await db.Companies.FindAsync(companyId);
        if (company == null) return NotFound();

        var plan = await db.SubscriptionPlans.FirstOrDefaultAsync(p => p.Code == planCode);
        if (plan == null) return NotFound();

        var active = await db.CompanySubscriptions.Where(s => s.CompanyId == companyId && s.Status == "active").ToListAsync();
        foreach (var s in active) s.Status = "cancelled";

        var sub = new CompanySubscription
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            PlanId = plan.Id,
            Status = "active",
            StartedAt = DateOnly.FromDateTime(DateTime.UtcNow),
            AmountInr = plan.IsCustom ? ApiParseHelper.BodyDecimal(body, "amountInr") : plan.PriceInr,
            Notes = ApiParseHelper.BodyString(body, "notes"),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.CompanySubscriptions.Add(sub);
        await db.SaveChangesAsync();
        return Ok(new { message = "Subscription updated.", plan = plan.Code });
    }

    [HttpGet("billing")]
    public async Task<ActionResult<object>> BillingSummary(
        [FromQuery] string? status = "active", [FromQuery] string? from = null, [FromQuery] string? to = null)
    {
        var q = db.CompanySubscriptions.Include(s => s.Company).Include(s => s.Plan).AsQueryable();
        if (!string.IsNullOrWhiteSpace(status) && status != "all")
            q = q.Where(s => s.Status == status);
        if (DateOnly.TryParse(from, out var fromDate))
            q = q.Where(s => s.StartedAt >= fromDate);
        if (DateOnly.TryParse(to, out var toDate))
            q = q.Where(s => s.StartedAt <= toDate);

        return Ok(await q.OrderBy(s => s.Company!.Name).Select(s => new
        {
            company = s.Company!.Name,
            companyCode = s.Company.Code,
            plan = s.Plan!.Name,
            s.AmountInr,
            s.StartedAt,
            s.ExpiresAt,
            s.Status
        }).ToListAsync());
    }
}

[Authorize]
[ApiController]
[Route("api/subscription")]
public class SubscriptionController(TmsDbContext db, ITenantContext tenants, SubscriptionService subscriptions) : ControllerBase
{
    [HttpGet("current")]
    public async Task<ActionResult<object>> Current(CancellationToken ct)
    {
        if (tenants.IsPlatformAdmin && tenants.EffectiveCompanyId == null)
            return Ok(new { isPlatform = true, plan = (object?)null });

        var companyId = tenants.AssignCompanyId ?? TenantContext.DefaultCompanyId;
        var sub = await subscriptions.GetActiveSubscriptionAsync(companyId, ct);
        var features = await subscriptions.GetFeaturesAsync(companyId, ct);
        var company = await db.Companies.FindAsync([companyId], ct);

        return Ok(new
        {
            companyId,
            companyName = company?.Name,
            planCode = sub?.Plan?.Code,
            planName = sub?.Plan?.Name,
            priceInr = sub?.Plan?.PriceInr,
            maxUsers = sub?.Plan?.MaxUsers,
            maxBookingsMonth = sub?.Plan?.MaxBookingsMonth,
            features
        });
    }
}
