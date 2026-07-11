using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Tms.Api.Data;
using Tms.Api.DTOs;
using Tms.Api.Services;

namespace Tms.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(TmsDbContext db, IConfiguration config, SubscriptionService subscriptions) : ControllerBase
{
    [AllowAnonymous]
    [EnableRateLimiting(AuthRateLimiting.PolicyName)]
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest req)
    {
        var user = await db.Users.Include(u => u.Branch).Include(u => u.Company)
            .FirstOrDefaultAsync(u => u.Username == req.Username && u.IsActive);
        if (user == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new ApiError("Invalid username or password."));

        var token = GenerateToken(user);
        return Ok(await ToResponseAsync(user, token));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<LoginResponse>> Me()
    {
        var username = User.Identity?.Name;
        if (string.IsNullOrEmpty(username)) return Unauthorized();
        var user = await db.Users.Include(u => u.Branch).Include(u => u.Company)
            .FirstOrDefaultAsync(u => u.Username == username);
        if (user == null) return Unauthorized();
        return Ok(await ToResponseAsync(user, ""));
    }

    async Task<LoginResponse> ToResponseAsync(Models.User user, string token)
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
            features);
    }

    string GenerateToken(Models.User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(AppConfiguration.ResolveJwtKey(config)));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, user.Username),
            new(ClaimTypes.Role, user.Role),
            new("name", user.FullName),
        };
        if (user.CompanyId.HasValue)
            claims.Add(new Claim("company_id", user.CompanyId.Value.ToString()));
        if (user.BranchId.HasValue)
            claims.Add(new Claim("branch_id", user.BranchId.Value.ToString()));

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(ApiParseHelper.JwtExpireHours(config)),
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
