using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.DTOs;
using Tms.Api.Models;
using Tms.Api.Services;

namespace Tms.Api.Controllers;

[Authorize(Roles = $"{TenantRoles.PlatformSuperAdmin},{TenantRoles.SuperAdmin}")]
[ApiController]
[Route("api/platform")]
public class PlatformController(TmsDbContext db) : ControllerBase
{
    [HttpGet("companies")]
    public async Task<ActionResult<object>> ListCompanies() =>
        Ok(await db.Companies.OrderBy(c => c.Name).Select(c => new
        {
            c.Id,
            c.Code,
            c.Name,
            c.Email,
            c.Phone,
            c.City,
            c.IsActive,
            plan = db.CompanySubscriptions
                .Where(s => s.CompanyId == c.Id && s.Status == "active")
                .Select(s => s.Plan!.Name)
                .FirstOrDefault()
        }).ToListAsync());

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
            Code = "HO",
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

        return Ok(new { message = "Company created.", companyId, branchId, plan = plan.Code });
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
    public async Task<ActionResult<object>> BillingSummary() =>
        Ok(await db.CompanySubscriptions
            .Include(s => s.Company)
            .Include(s => s.Plan)
            .Where(s => s.Status == "active")
            .OrderBy(s => s.Company!.Name)
            .Select(s => new
            {
                company = s.Company!.Name,
                companyCode = s.Company.Code,
                plan = s.Plan!.Name,
                s.AmountInr,
                s.StartedAt,
                s.ExpiresAt
            }).ToListAsync());
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
