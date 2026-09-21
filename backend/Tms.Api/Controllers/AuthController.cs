using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using Tms.Api.Data;
using Tms.Api.DTOs;
using Tms.Api.Services;

namespace Tms.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(TmsDbContext db, IConfiguration config, SubscriptionService subscriptions, RoleMenuService roleMenus) : ControllerBase
{
    [AllowAnonymous]
    [EnableRateLimiting(AuthRateLimiting.PolicyName)]
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest req)
    {
        var username = (req.Username ?? "").Trim();
        var password = (req.Password ?? "").Trim();
        if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password))
            return Unauthorized(new ApiError("Invalid username or password."));

        var user = await db.Users.Include(u => u.Branch).Include(u => u.Company)
            .FirstOrDefaultAsync(u => u.IsActive && u.Username.ToLower() == username.ToLower());
        if (user == null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            return Unauthorized(new ApiError("Invalid username or password."));

        var allowed = await LoadAllowedBranchIdsAsync(user);
        var token = GenerateToken(user, allowed);
        return Ok(await ToResponseAsync(user, token, allowed));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<LoginResponse>> Me()
    {
        // Prefer explicit username claim (Identity.Name can be polluted by JWT "name" = FullName).
        var username = User.FindFirstValue("username")
            ?? User.FindFirstValue(ClaimTypes.Name)
            ?? User.Identity?.Name;
        if (string.IsNullOrEmpty(username)) return Unauthorized();

        var user = await db.Users.Include(u => u.Branch).Include(u => u.Company)
            .FirstOrDefaultAsync(u => u.Username.ToLower() == username.ToLower());
        if (user == null || !user.IsActive) return Unauthorized();

        var allowed = await LoadAllowedBranchIdsAsync(user);
        return Ok(await ToResponseAsync(user, "", allowed));
    }

    async Task<List<Guid>> LoadAllowedBranchIdsAsync(Models.User user)
    {
        var ids = await db.UserBranches.AsNoTracking()
            .Where(x => x.UserId == user.Id)
            .Select(x => x.BranchId)
            .ToListAsync();
        if (ids.Count == 0 && user.BranchId.HasValue)
            ids.Add(user.BranchId.Value);
        return ids.Distinct().ToList();
    }

    async Task<LoginResponse> ToResponseAsync(Models.User user, string token, IReadOnlyList<Guid> allowed)
    {
        var isPlatform = TenantRoles.IsPlatformAdmin(user.Role);
        IReadOnlyList<string>? features = null;
        string? planCode = null;
        if (user.CompanyId.HasValue)
        {
            var sub = await subscriptions.GetActiveSubscriptionAsync(user.CompanyId.Value);
            features = await subscriptions.GetFeaturesAsync(user.CompanyId.Value);
            planCode = sub?.Plan?.Code;
        }

        IReadOnlyList<string>? menuKeys = null;
        if (isPlatform)
        {
            menuKeys = RoleMenuService.AllCatalogKeys.ToList();
        }
        else if (user.CompanyId.HasValue)
        {
            menuKeys = await roleMenus.GetEffectiveMenuKeysAsync(user.CompanyId.Value, user.Role);
        }

        return new LoginResponse(
            token,
            user.FullName,
            user.Role,
            user.Username,
            user.CompanyId,
            user.Company?.Name,
            user.BranchId,
            user.Branch?.Name,
            TenantRoles.CanAccessAllBranches(user.Role),
            isPlatform,
            planCode,
            features,
            allowed,
            menuKeys);
    }

    string GenerateToken(Models.User user, IReadOnlyList<Guid> allowedBranchIds)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(AppConfiguration.ResolveJwtKey(config)));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Username),
            new("username", user.Username),
            new(ClaimTypes.Role, user.Role),
            new(ClaimTypes.GivenName, user.FullName),
            new("full_name", user.FullName),
            // Do not emit short "name" — JWT inbound mapping overwrites Identity.Name and breaks /auth/me.
        };
        if (user.CompanyId.HasValue)
            claims.Add(new Claim("company_id", user.CompanyId.Value.ToString()));
        if (user.BranchId.HasValue)
            claims.Add(new Claim("branch_id", user.BranchId.Value.ToString()));
        if (allowedBranchIds.Count > 0)
            claims.Add(new Claim("allowed_branch_ids", string.Join(",", allowedBranchIds)));

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(ApiParseHelper.JwtExpireHours(config)),
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public sealed class ChangePasswordRequest
    {
        public string? CurrentPassword { get; set; }
        public string? NewPassword { get; set; }
    }

    /// <summary>Change password for the currently authenticated user.</summary>
    [HttpPost("change-password")]
    [Authorize]
    public async Task<ActionResult> ChangePassword([FromBody] ChangePasswordRequest req)
    {
        var username = User.FindFirstValue("username")
            ?? User.FindFirstValue(ClaimTypes.Name)
            ?? User.Identity?.Name;
        if (string.IsNullOrEmpty(username)) return Unauthorized();

        var current = (req.CurrentPassword ?? "").Trim();
        var next = (req.NewPassword ?? "").Trim();
        if (string.IsNullOrEmpty(current) || string.IsNullOrEmpty(next))
            return BadRequest(new ApiError("Current and new password are required."));
        if (next.Length < 6)
            return BadRequest(new ApiError("New password must be at least 6 characters."));
        if (string.Equals(current, next, StringComparison.Ordinal))
            return BadRequest(new ApiError("New password must be different from the current password."));

        var user = await db.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == username.ToLower());
        if (user == null || !user.IsActive) return Unauthorized();
        if (!BCrypt.Net.BCrypt.Verify(current, user.PasswordHash))
            return BadRequest(new ApiError("Current password is incorrect."));

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(next);
        await db.SaveChangesAsync();
        return Ok(new { message = "Password updated." });
    }
}
