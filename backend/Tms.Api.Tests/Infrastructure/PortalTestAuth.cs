using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Tms.Api.Services;

namespace Tms.Api.Tests.Infrastructure;

public static class PortalTestAuth
{
    public static string CreateCustomerToken(TmsWebApplicationFactory factory, Guid companyId, string? customerId = null)
    {
        using var scope = factory.Services.CreateScope();
        var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(AppConfiguration.ResolveJwtKey(config)));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, "Portal Test Customer"),
            new(ClaimTypes.Role, "Customer"),
            new("portal_scope", "customer"),
            new("name", "Portal Test Customer"),
            new("company_id", companyId.ToString()),
        };
        if (customerId != null)
            claims.Add(new Claim("customer_id", customerId));

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
