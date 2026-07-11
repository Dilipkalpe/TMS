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
}
