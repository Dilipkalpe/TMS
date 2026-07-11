using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;

namespace Tms.Api.Services;

/// <summary>
/// Tenant-scoped cache backed by Redis (production) or in-process distributed memory (dev).
/// Use for dashboard aggregates, lookup dropdowns, and report summaries.
/// </summary>
public sealed class TenantCacheService(IDistributedCache cache)
{
    static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
    static readonly TimeSpan DefaultTtl = TimeSpan.FromSeconds(60);

    public Task<T> GetOrCreateAsync<T>(string key, Func<Task<T>> factory, CancellationToken ct = default)
        => GetOrCreateAsync(key, factory, DefaultTtl, ct);

    public async Task<T> GetOrCreateAsync<T>(
        string key, Func<Task<T>> factory, TimeSpan ttl, CancellationToken ct = default)
    {
        var cached = await cache.GetStringAsync(key, ct);
        if (!string.IsNullOrEmpty(cached))
        {
            try
            {
                var hit = JsonSerializer.Deserialize<T>(cached, JsonOpts);
                if (hit is not null) return hit;
            }
            catch
            {
                await cache.RemoveAsync(key, ct);
            }
        }

        var value = await factory();
        await cache.SetStringAsync(
            key,
            JsonSerializer.Serialize(value, JsonOpts),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl },
            ct);
        return value;
    }

    public Task RemoveAsync(string key, CancellationToken ct = default) =>
        cache.RemoveAsync(key, ct);

    public static string LookupKey(string type, Guid companyId, Guid? branchId, string? search, int limit) =>
        $"lookup:{type}:{companyId}:{branchId?.ToString() ?? "all"}:{search?.Trim().ToLowerInvariant() ?? ""}:{limit}";

    public static string DashboardKey(string section, Guid companyId, Guid? branchId) =>
        $"dashboard:{section}:{companyId}:{branchId?.ToString() ?? "all"}";
}
