using System.Collections.Concurrent;
using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;

namespace Tms.Api.Services;

/// <summary>
/// Reverse-geocodes lat/lng → "Area/Locality, City, State" for master location display.
/// Uses OpenStreetMap Nominatim by default (no API key). Results are memory-cached and
/// callers should also persist the last successful label on vehicle_last_position.
/// </summary>
public class ReverseGeocodeService(
    IHttpClientFactory httpClientFactory,
    IMemoryCache cache,
    IConfiguration config,
    ILogger<ReverseGeocodeService> logger)
{
    static readonly ConcurrentDictionary<string, byte> InFlight = new();
    static readonly SemaphoreSlim RateGate = new(1, 1);
    static DateTime _lastRequestUtc = DateTime.MinValue;

    bool Enabled => config.GetValue("Gps:ReverseGeocode:Enabled", true);
    string BaseUrl => (config["Gps:ReverseGeocode:BaseUrl"] ?? "https://nominatim.openstreetmap.org").TrimEnd('/');
    string UserAgent => config["Gps:ReverseGeocode:UserAgent"] ?? "TMS-Pro/1.0 (transport-management)";
    int CacheMinutes => config.GetValue("Gps:ReverseGeocode:CacheMinutes", 1440);
    int TimeoutSeconds => Math.Clamp(config.GetValue("Gps:ReverseGeocode:TimeoutSeconds", 5), 2, 30);
    int MinIntervalMs => Math.Clamp(config.GetValue("Gps:ReverseGeocode:MinIntervalMs", 1100), 200, 5000);
    public int MinMoveMeters => config.GetValue("Gps:ReverseGeocode:MinMoveMeters", 250);

    public bool NeedsRefresh(decimal lat, decimal lng, string? existingLabel, decimal? geocodedLat, decimal? geocodedLng)
    {
        if (string.IsNullOrWhiteSpace(existingLabel) || geocodedLat == null || geocodedLng == null)
            return true;
        return DistanceMeters(lat, lng, geocodedLat.Value, geocodedLng.Value) >= MinMoveMeters;
    }

    public async Task<string?> ResolveAsync(decimal lat, decimal lng, CancellationToken ct = default)
    {
        if (!Enabled) return null;
        if (lat is < -90 or > 90 || lng is < -180 or > 180) return null;
        if (lat == 0 && lng == 0) return null;

        var cacheKey = CacheKey(lat, lng);
        if (cache.TryGetValue(cacheKey, out string? cached))
            return string.IsNullOrWhiteSpace(cached) ? null : cached;

        // Avoid stampedes for the same rounded coordinate bucket
        if (!InFlight.TryAdd(cacheKey, 0))
        {
            await Task.Delay(150, ct);
            return cache.TryGetValue(cacheKey, out string? raced) && !string.IsNullOrWhiteSpace(raced) ? raced : null;
        }

        try
        {
            await RateGate.WaitAsync(ct);
            try
            {
                if (cache.TryGetValue(cacheKey, out string? again))
                    return string.IsNullOrWhiteSpace(again) ? null : again;

                var elapsed = DateTime.UtcNow - _lastRequestUtc;
                var waitMs = MinIntervalMs - (int)elapsed.TotalMilliseconds;
                if (waitMs > 0)
                    await Task.Delay(waitMs, ct);

                var label = await CallNominatimAsync(lat, lng, ct);
                _lastRequestUtc = DateTime.UtcNow;

                var ttl = TimeSpan.FromMinutes(label != null ? CacheMinutes : Math.Min(5, CacheMinutes));
                cache.Set(cacheKey, label ?? "", ttl);
                return label;
            }
            finally
            {
                RateGate.Release();
            }
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Reverse geocode failed for {Lat},{Lng}", lat, lng);
            cache.Set(cacheKey, "", TimeSpan.FromMinutes(2));
            return null;
        }
        finally
        {
            InFlight.TryRemove(cacheKey, out _);
        }
    }

    async Task<string?> CallNominatimAsync(decimal lat, decimal lng, CancellationToken ct)
    {
        var client = httpClientFactory.CreateClient("Nominatim");
        client.Timeout = TimeSpan.FromSeconds(TimeoutSeconds);
        if (!client.DefaultRequestHeaders.UserAgent.Any())
            client.DefaultRequestHeaders.TryAddWithoutValidation("User-Agent", UserAgent);
        if (!client.DefaultRequestHeaders.AcceptLanguage.Any())
            client.DefaultRequestHeaders.TryAddWithoutValidation("Accept-Language", "en");

        var url =
            $"{BaseUrl}/reverse?lat={lat.ToString(CultureInfo.InvariantCulture)}" +
            $"&lon={lng.ToString(CultureInfo.InvariantCulture)}" +
            "&format=json&addressdetails=1&zoom=18";

        using var response = await client.GetAsync(url, ct);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("Nominatim HTTP {Status} for {Lat},{Lng}", (int)response.StatusCode, lat, lng);
            return null;
        }

        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
        if (!doc.RootElement.TryGetProperty("address", out var address))
            return null;

        return FormatIndianAddress(address);
    }

    /// <summary>Build "Area/Locality, City, State" from Nominatim address parts (India-friendly).</summary>
    public static string? FormatIndianAddress(JsonElement address)
    {
        var area = First(address,
            "suburb", "neighbourhood", "neighborhood", "quarter", "residential",
            "village", "hamlet", "locality", "city_district", "county");
        var city = First(address, "city", "town", "municipality", "city_district", "county");
        var state = First(address, "state");

        // Prefer a more specific area than city when Nominatim puts the city in suburb
        if (!string.IsNullOrEmpty(area) &&
            !string.IsNullOrEmpty(city) &&
            string.Equals(area, city, StringComparison.OrdinalIgnoreCase))
        {
            var finer = First(address, "neighbourhood", "neighborhood", "quarter", "residential", "road");
            if (!string.IsNullOrEmpty(finer) &&
                !string.Equals(finer, city, StringComparison.OrdinalIgnoreCase))
                area = finer;
            else
                area = null;
        }

        var parts = new List<string>();
        if (!string.IsNullOrWhiteSpace(area)) parts.Add(area!);
        if (!string.IsNullOrWhiteSpace(city) &&
            (parts.Count == 0 || !string.Equals(parts[^1], city, StringComparison.OrdinalIgnoreCase)))
            parts.Add(city!);
        if (!string.IsNullOrWhiteSpace(state) &&
            (parts.Count == 0 || !string.Equals(parts[^1], state, StringComparison.OrdinalIgnoreCase)))
            parts.Add(state!);

        if (parts.Count == 0) return null;
        // Area unavailable → City, State (requirement)
        return string.Join(", ", parts);
    }

    static string? First(JsonElement address, params string[] keys)
    {
        foreach (var key in keys)
        {
            if (address.TryGetProperty(key, out var el))
            {
                var v = el.GetString()?.Trim();
                if (!string.IsNullOrWhiteSpace(v)) return v;
            }
        }
        return null;
    }

    static string CacheKey(decimal lat, decimal lng)
        => $"revgeo:{Math.Round(lat, 4).ToString(CultureInfo.InvariantCulture)}:{Math.Round(lng, 4).ToString(CultureInfo.InvariantCulture)}";

    public static double DistanceMeters(decimal lat1, decimal lng1, decimal lat2, decimal lng2)
    {
        const double R = 6371000;
        var φ1 = (double)lat1 * Math.PI / 180;
        var φ2 = (double)lat2 * Math.PI / 180;
        var Δφ = ((double)(lat2 - lat1)) * Math.PI / 180;
        var Δλ = ((double)(lng2 - lng1)) * Math.PI / 180;
        var a = Math.Sin(Δφ / 2) * Math.Sin(Δφ / 2) +
                Math.Cos(φ1) * Math.Cos(φ2) * Math.Sin(Δλ / 2) * Math.Sin(Δλ / 2);
        return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }
}
