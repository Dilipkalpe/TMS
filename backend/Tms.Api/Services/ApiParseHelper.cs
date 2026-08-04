using System.Text.Json;

namespace Tms.Api.Services;

public static class ApiParseHelper
{
    public static bool TryParseDate(string? value, out DateOnly date)
    {
        date = default;
        return !string.IsNullOrWhiteSpace(value) && DateOnly.TryParse(value, out date);
    }

    public static double JwtExpireHours(IConfiguration config)
    {
        var raw = config["Jwt:ExpireHours"];
        return double.TryParse(raw, out var hours) && hours > 0 ? hours : 12;
    }

    public static string? BodyString(Dictionary<string, object?> body, string key)
    {
        if (!body.TryGetValue(key, out var val) || val is null) return null;
        if (val is JsonElement el)
        {
            return el.ValueKind switch
            {
                JsonValueKind.String => el.GetString(),
                JsonValueKind.Number => el.GetRawText(),
                JsonValueKind.True => "true",
                JsonValueKind.False => "false",
                JsonValueKind.Null => null,
                _ => el.ToString(),
            };
        }
        return val.ToString();
    }

    public static decimal BodyDecimal(Dictionary<string, object?> body, string key, decimal defaultValue = 0)
    {
        var s = BodyString(body, key);
        return decimal.TryParse(s, out var d) ? d : defaultValue;
    }

    public static DateOnly BodyDate(Dictionary<string, object?> body, string key, DateOnly defaultValue)
    {
        var s = BodyString(body, key);
        return !string.IsNullOrWhiteSpace(s) && DateOnly.TryParse(s, out var dt) ? dt : defaultValue;
    }

    /// <summary>Parse request datetime as UTC for PostgreSQL timestamptz columns.</summary>
    public static DateTime BodyUtcDateTime(Dictionary<string, object?> body, string key, DateTime? defaultValue = null)
    {
        var s = BodyString(body, key);
        if (string.IsNullOrWhiteSpace(s))
            return defaultValue ?? DateTime.UtcNow;
        return ParseUtcDateTime(s, defaultValue);
    }

    public static DateTime ParseUtcDateTime(string? value, DateTime? defaultValue = null)
    {
        if (string.IsNullOrWhiteSpace(value))
            return defaultValue ?? DateTime.UtcNow;

        if (DateTime.TryParse(
                value,
                null,
                System.Globalization.DateTimeStyles.RoundtripKind,
                out var dt))
            return EnsureUtc(dt);

        if (DateTime.TryParse(value, out dt))
            return EnsureUtc(dt);

        return defaultValue ?? DateTime.UtcNow;
    }

    public static DateTime EnsureUtc(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Local => value.ToUniversalTime(),
        _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
    };

    public static bool? BodyBool(Dictionary<string, object?> body, string key)
    {
        if (!body.TryGetValue(key, out var val) || val is null) return null;
        if (val is JsonElement el)
        {
            return el.ValueKind switch
            {
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                _ => bool.TryParse(el.GetRawText(), out var b) ? b : null,
            };
        }
        return bool.TryParse(val.ToString(), out var result) ? result : null;
    }
}
