using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace Tms.Api.Services;

public static class AuthRateLimiting
{
    public const string PolicyName = "auth";

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
        });

        return services;
    }
}
