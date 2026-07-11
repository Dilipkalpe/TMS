namespace Tms.Api.Services;

public static class AppConfiguration
{
    public static string ResolveConnectionString(IConfiguration config)
    {
        var cs = Environment.GetEnvironmentVariable("TMS_CONNECTION_STRING")
            ?? config.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(cs))
            throw new InvalidOperationException(
                "Database connection string is required. Set ConnectionStrings:DefaultConnection or TMS_CONNECTION_STRING.");
        return AppendPoolSettings(cs);
    }

    /// <summary>Read replica for reports/dashboard aggregates. Falls back to primary when unset.</summary>
    public static string ResolveReadOnlyConnectionString(IConfiguration config)
    {
        var cs = Environment.GetEnvironmentVariable("TMS_READONLY_CONNECTION_STRING")
            ?? config.GetConnectionString("ReadOnlyConnection");
        return string.IsNullOrWhiteSpace(cs) ? ResolveConnectionString(config) : AppendPoolSettings(cs);
    }

    /// <summary>Redis connection string (StackExchange.Redis format). Empty = in-process distributed memory cache.</summary>
    public static string? ResolveRedisConfiguration(IConfiguration config) =>
        Environment.GetEnvironmentVariable("TMS_REDIS")
        ?? config["Cache:Redis"];

    static string AppendPoolSettings(string cs)
    {
        if (!cs.Contains("Maximum Pool Size", StringComparison.OrdinalIgnoreCase))
            cs += ";Maximum Pool Size=50;Minimum Pool Size=5;Connection Idle Lifetime=300;Timeout=30;Command Timeout=120";
        return cs;
    }

    public static string ResolveJwtKey(IConfiguration config)
    {
        var key = Environment.GetEnvironmentVariable("TMS_JWT_KEY") ?? config["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(key) || key.Length < 32)
            throw new InvalidOperationException(
                "JWT signing key is required (min 32 chars). Set Jwt:Key or TMS_JWT_KEY.");
        return key;
    }
}
