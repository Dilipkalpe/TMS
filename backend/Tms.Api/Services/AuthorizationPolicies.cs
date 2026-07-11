using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

namespace Tms.Api.Services;

public static class AuthorizationPolicies
{
    public const string StaffOnly = "StaffOnly";
    public const string PortalUser = "PortalUser";

    public static void Configure(AuthorizationOptions options)
    {
        options.AddPolicy(StaffOnly, policy => policy.RequireAssertion(ctx =>
        {
            var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
            return role != null && !string.Equals(role, "Customer", StringComparison.OrdinalIgnoreCase);
        }));

        options.AddPolicy(PortalUser, policy => policy.RequireAuthenticatedUser());

        options.DefaultPolicy = options.GetPolicy(StaffOnly)!;
    }
}
