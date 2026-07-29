using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace Tms.Api.Services;

public static class AuthRateLimiting
{
    public const string PolicyName = "auth";
    public const string PortalPolicyName = "portal";
    public const string PlatformPolicyName = "platform";

    public static IServiceCollection AddAuthRateLimiting(this IServiceCollection services, IConfiguration config)
    {
        var permitLimit = config.GetValue("Auth:RateLimitPermitLimit", 10);
        var windowMinutes = config.GetValue("Auth:RateLimitWindowMinutes", 1);

        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.AddPolicy(PolicyName, context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = permitLimit,
                        Window = TimeSpan.FromMinutes(windowMinutes),
                        QueueLimit = 0,
                    }));

            options.AddPolicy(PortalPolicyName, context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = config.GetValue("Portal:RateLimitPermitLimit", 60),
                        Window = TimeSpan.FromMinutes(1),
                        QueueLimit = 0,
                    }));

            options.AddPolicy(PlatformPolicyName, context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = config.GetValue("Platform:RateLimitPermitLimit", 30),
                        Window = TimeSpan.FromMinutes(1),
                        QueueLimit = 0,
                    }));
        });

        return services;
    }
}
