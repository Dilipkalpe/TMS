using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

namespace Tms.Api.Services;

public static class AuthorizationPolicies
{
    public const string StaffOnly = "StaffOnly";
    public const string PortalUser = "PortalUser";
    public const string DriverPortal = "DriverPortal";

    public static void Configure(AuthorizationOptions options)
    {
        options.AddPolicy(StaffOnly, policy => policy.RequireAssertion(ctx =>
        {
            var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
            return role != null
                && !string.Equals(role, "Customer", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(role, "Driver", StringComparison.OrdinalIgnoreCase);
        }));

        options.AddPolicy(PortalUser, policy => policy.RequireAssertion(ctx =>
        {
            var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
            return role != null && !string.Equals(role, "Driver", StringComparison.OrdinalIgnoreCase);
        }));

        options.AddPolicy(DriverPortal, policy => policy.RequireAssertion(ctx =>
        {
            var role = ctx.User.FindFirst(ClaimTypes.Role)?.Value;
            var scope = ctx.User.FindFirst("portal_scope")?.Value;
            return string.Equals(role, "Driver", StringComparison.OrdinalIgnoreCase)
                || string.Equals(scope, "driver", StringComparison.OrdinalIgnoreCase);
        }));

        options.DefaultPolicy = options.GetPolicy(StaffOnly)!;
    }
}
