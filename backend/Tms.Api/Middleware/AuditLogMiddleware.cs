using System.Diagnostics;
using System.Security.Claims;

namespace Tms.Api.Middleware;

public class AuditLogMiddleware(RequestDelegate next, ILogger<AuditLogMiddleware> logger)
{
    static readonly HashSet<string> MutateMethods = new(StringComparer.OrdinalIgnoreCase) { "POST", "PUT", "PATCH", "DELETE" };

    public async Task InvokeAsync(HttpContext context)
    {
        var sw = Stopwatch.StartNew();
        await next(context);
        sw.Stop();

        if (!MutateMethods.Contains(context.Request.Method)) return;
        if (context.Request.Path.StartsWithSegments("/api/health")) return;

        var username = context.User?.FindFirstValue("username") ?? context.User?.Identity?.Name ?? "anonymous";
        var companyId = context.User?.FindFirstValue("company_id") ?? "-";
        var status = context.Response.StatusCode;

        logger.LogInformation(
            "AUDIT | {Method} {Path} | User={User} Company={Company} | Status={Status} | {ElapsedMs}ms",
            context.Request.Method, context.Request.Path, username, companyId, status, sw.ElapsedMilliseconds);
    }
}
