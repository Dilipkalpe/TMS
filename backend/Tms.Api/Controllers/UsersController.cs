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
[Route("api/users")]
public class UsersController(TmsDbContext db, ITenantContext tenants, UserRoleTypeService roleTypes) : ControllerBase
{
    public record UserDto(
        Guid Id,
        string Username,
        string FullName,
        string? Email,
        string? Mobile,
        string Role,
        Guid? CompanyId,
        string? CompanyName,
        Guid? BranchId,
        string? BranchName,
        IReadOnlyList<Guid> BranchIds,
        IReadOnlyList<string> BranchNames,
        bool IsActive,
        DateTime CreatedAt);

    public record UpsertUserRequest(
        string Username,
        string FullName,
        string? Email,
        string? Mobile,
        string? Password,
        string? ConfirmPassword,
        string Role,
        Guid? BranchId,
        IReadOnlyList<Guid>? BranchIds,
        bool IsActive = true);

    bool CanManage() => TenantRoles.CanManageUsers(User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value);

    [HttpGet]
    public async Task<ActionResult<object>> List(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        if (!CanManage()) return Forbid();

        var q = db.Users.AsNoTracking()
            .Include(u => u.Branch)
            .Include(u => u.Company)
            .Include(u => u.UserBranches).ThenInclude(ub => ub.Branch)
            .AsQueryable();

        if (tenants.IsPlatformAdmin)
        {
            if (tenants.EffectiveCompanyId != null)
                q = q.Where(u => u.CompanyId == tenants.EffectiveCompanyId);
        }
        else
        {
            var cid = tenants.EffectiveCompanyId;
            if (cid == null) return Forbid();
            q = q.Where(u => u.CompanyId == cid);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLowerInvariant();
            q = q.Where(u =>
                u.Username.ToLower().Contains(s) ||
                u.FullName.ToLower().Contains(s) ||
                (u.Email != null && u.Email.ToLower().Contains(s)) ||
                (u.Mobile != null && u.Mobile.Contains(s)));
        }

        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize);
        var total = await q.CountAsync();
        var rows = await q.OrderBy(u => u.Username)
            .Skip((p - 1) * size).Take(size)
            .ToListAsync();

        return Ok(new PagedResult<UserDto>(rows.Select(Map).ToList(), total, p, size));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<UserDto>> Get(Guid id)
    {
        if (!CanManage()) return Forbid();
        var u = await LoadUserAsync(id);
        if (u == null || !CanAccessUser(u)) return NotFound();
        return Ok(Map(u));
    }

    [HttpPost]
    public async Task<ActionResult<UserDto>> Create([FromBody] UpsertUserRequest body)
    {
        if (!CanManage()) return Forbid();
        var err = Validate(body, requirePassword: true);
        if (err != null) return BadRequest(new ApiError(err));

        var companyId = tenants.AssignCompanyId ?? tenants.EffectiveCompanyId;
        if (companyId == null)
            return BadRequest(new ApiError("Company context is required."));

        var roleErr = await ValidateRoleAsync(companyId.Value, body.Role);
        if (roleErr != null) return BadRequest(new ApiError(roleErr));

        var username = body.Username.Trim();
        var exists = await db.Users.AnyAsync(u =>
            u.Username == username && u.CompanyId == companyId);
        if (exists)
            return BadRequest(new ApiError("Username already exists for this company."));

        var branchIds = await ResolveBranchIdsAsync(companyId.Value, body);
        if (branchIds.Count == 0 && !TenantRoles.CanAccessAllBranches(body.Role))
            return BadRequest(new ApiError("Select at least one branch for this role."));

        var user = new User
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            Username = username,
            FullName = body.FullName.Trim(),
            Email = NullIfEmpty(body.Email),
            Mobile = NullIfEmpty(body.Mobile),
            Role = NormalizeRole(body.Role),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(body.Password!.Trim()),
            BranchId = body.BranchId ?? branchIds.FirstOrDefault(),
            IsActive = body.IsActive,
            CreatedAt = DateTime.UtcNow,
        };
        if (user.BranchId == Guid.Empty) user.BranchId = null;

        db.Users.Add(user);
        foreach (var bid in branchIds)
        {
            db.UserBranches.Add(new UserBranch
            {
                UserId = user.Id,
                BranchId = bid,
                CompanyId = companyId.Value,
            });
        }

        await db.SaveChangesAsync();
        var created = await LoadUserAsync(user.Id);
        return CreatedAtAction(nameof(Get), new { id = user.Id }, Map(created!));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<UserDto>> Update(Guid id, [FromBody] UpsertUserRequest body)
    {
        if (!CanManage()) return Forbid();
        var err = Validate(body, requirePassword: false);
        if (err != null) return BadRequest(new ApiError(err));

        var user = await db.Users.Include(u => u.UserBranches).FirstOrDefaultAsync(u => u.Id == id);
        if (user == null || !CanAccessUser(user)) return NotFound();

        var companyId = user.CompanyId ?? tenants.EffectiveCompanyId;
        if (companyId == null)
            return BadRequest(new ApiError("Company context is required."));

        var roleErr = await ValidateRoleAsync(companyId.Value, body.Role);
        if (roleErr != null) return BadRequest(new ApiError(roleErr));

        var username = body.Username.Trim();
        var clash = await db.Users.AnyAsync(u =>
            u.Id != id && u.Username == username && u.CompanyId == companyId);
        if (clash)
            return BadRequest(new ApiError("Username already exists for this company."));

        var branchIds = await ResolveBranchIdsAsync(companyId.Value, body);
        if (branchIds.Count == 0 && !TenantRoles.CanAccessAllBranches(body.Role))
            return BadRequest(new ApiError("Select at least one branch for this role."));

        user.Username = username;
        user.FullName = body.FullName.Trim();
        user.Email = NullIfEmpty(body.Email);
        user.Mobile = NullIfEmpty(body.Mobile);
        user.Role = NormalizeRole(body.Role);
        user.IsActive = body.IsActive;
        user.BranchId = body.BranchId ?? branchIds.FirstOrDefault();
        if (user.BranchId == Guid.Empty) user.BranchId = null;

        if (!string.IsNullOrWhiteSpace(body.Password))
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(body.Password.Trim());

        db.UserBranches.RemoveRange(user.UserBranches);
        foreach (var bid in branchIds)
        {
            db.UserBranches.Add(new UserBranch
            {
                UserId = user.Id,
                BranchId = bid,
                CompanyId = companyId.Value,
            });
        }

        await db.SaveChangesAsync();
        var updated = await LoadUserAsync(user.Id);
        return Ok(Map(updated!));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        if (!CanManage()) return Forbid();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null || !CanAccessUser(user)) return NotFound();

        var selfName = User.Identity?.Name;
        if (string.Equals(user.Username, selfName, StringComparison.OrdinalIgnoreCase))
            return BadRequest(new ApiError("You cannot delete your own account."));

        db.Users.Remove(user);
        await db.SaveChangesAsync();
        return Ok(new { message = "User deleted", id });
    }

    async Task<User?> LoadUserAsync(Guid id) =>
        await db.Users.AsNoTracking()
            .Include(u => u.Branch)
            .Include(u => u.Company)
            .Include(u => u.UserBranches).ThenInclude(ub => ub.Branch)
            .FirstOrDefaultAsync(u => u.Id == id);

    bool CanAccessUser(User u)
    {
        if (tenants.IsPlatformAdmin)
            return tenants.EffectiveCompanyId == null || u.CompanyId == tenants.EffectiveCompanyId;
        return u.CompanyId != null && u.CompanyId == tenants.EffectiveCompanyId;
    }

    async Task<List<Guid>> ResolveBranchIdsAsync(Guid companyId, UpsertUserRequest body)
    {
        var requested = (body.BranchIds ?? [])
            .Concat(body.BranchId.HasValue ? [body.BranchId.Value] : Array.Empty<Guid>())
            .Where(id => id != Guid.Empty)
            .Distinct()
            .ToList();

        if (requested.Count == 0) return [];

        var valid = await db.Branches.AsNoTracking()
            .Where(b => b.CompanyId == companyId && requested.Contains(b.Id))
            .Select(b => b.Id)
            .ToListAsync();
        return valid;
    }

    static string? Validate(UpsertUserRequest body, bool requirePassword)
    {
        if (string.IsNullOrWhiteSpace(body.Username)) return "Username is required.";
        if (string.IsNullOrWhiteSpace(body.FullName)) return "Display name is required.";
        if (string.IsNullOrWhiteSpace(body.Role)) return "User Role Type is required.";

        if (requirePassword || !string.IsNullOrWhiteSpace(body.Password))
        {
            if (string.IsNullOrWhiteSpace(body.Password) || body.Password.Length < 6)
                return "Password must be at least 6 characters.";
            if (body.Password != body.ConfirmPassword)
                return "Password and Confirm Password do not match.";
        }
        return null;
    }

    async Task<string?> ValidateRoleAsync(Guid companyId, string role)
    {
        if (TenantRoles.IsPlatformAdmin(role)) return null;
        await roleTypes.EnsureSystemRolesAsync(companyId);
        if (await roleTypes.ExistsAsync(companyId, role))
            return null;
        return "User Role Type is not valid for this company. Add it under User Role Types first.";
    }

    static string NormalizeRole(string role) => role.Trim();

    static string? NullIfEmpty(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();

    static UserDto Map(User u)
    {
        var branchIds = u.UserBranches.Select(x => x.BranchId).Distinct().ToList();
        if (branchIds.Count == 0 && u.BranchId.HasValue) branchIds.Add(u.BranchId.Value);
        var names = u.UserBranches
            .Select(x => x.Branch?.Name)
            .Where(n => !string.IsNullOrWhiteSpace(n))
            .Cast<string>()
            .Distinct()
            .ToList();
        if (names.Count == 0 && !string.IsNullOrWhiteSpace(u.Branch?.Name))
            names.Add(u.Branch!.Name);

        return new UserDto(
            u.Id,
            u.Username,
            u.FullName,
            u.Email,
            u.Mobile,
            u.Role,
            u.CompanyId,
            u.Company?.Name,
            u.BranchId,
            u.Branch?.Name,
            branchIds,
            names,
            u.IsActive,
            u.CreatedAt);
    }
}
