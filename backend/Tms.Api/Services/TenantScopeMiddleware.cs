namespace Tms.Api.Services;

/// <summary>
/// Platform admins must send X-Company-Id when calling tenant APIs so they cannot browse all companies at once.
/// </summary>
public class TenantScopeMiddleware(RequestDelegate next)
{
    static readonly string[] ExcludedPrefixes =
    [
        "/api/platform",
        "/api/auth",
        "/api/health",
        "/swagger",
    ];

    public async Task InvokeAsync(HttpContext context, ITenantContext tenants)
    {
        if (context.User.Identity?.IsAuthenticated == true
            && tenants.IsPlatformAdmin
            && tenants.EffectiveCompanyId == null
            && RequiresTenantScope(context.Request.Path))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new
            {
                message = "Select a company (X-Company-Id header) before accessing tenant data.",
            });
            return;
        }

        await next(context);
    }

    static bool RequiresTenantScope(PathString path)
    {
        var value = path.Value ?? "";
        if (!value.StartsWith("/api/", StringComparison.OrdinalIgnoreCase))
            return false;
        return !ExcludedPrefixes.Any(p => value.StartsWith(p, StringComparison.OrdinalIgnoreCase));
    }
}
