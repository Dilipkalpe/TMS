using System.Text.Json;
using System.Text.Json.Serialization;

namespace Tms.Api.Services;

/// <summary>Accepts null, empty string, or yyyy-MM-dd for optional date fields.</summary>
public sealed class NullableDateOnlyJsonConverter : JsonConverter<DateOnly?>
{
    public override DateOnly? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null) return null;
        if (reader.TokenType == JsonTokenType.String)
        {
            var s = reader.GetString();
            if (string.IsNullOrWhiteSpace(s)) return null;
            if (DateOnly.TryParse(s, out var d)) return d;
            throw new JsonException($"Invalid date '{s}'. Use YYYY-MM-DD or leave blank.");
        }
        throw new JsonException("Expected a date string (YYYY-MM-DD) or null.");
    }

    public override void Write(Utf8JsonWriter writer, DateOnly? value, JsonSerializerOptions options)
    {
        if (value == null) writer.WriteNullValue();
        else writer.WriteStringValue(value.Value.ToString("yyyy-MM-dd"));
    }
}

/// <summary>Accepts null, empty string, or GUID for optional id fields.</summary>
public sealed class NullableGuidJsonConverter : JsonConverter<Guid?>
{
    public override Guid? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null) return null;
        if (reader.TokenType == JsonTokenType.String)
        {
            var s = reader.GetString();
            if (string.IsNullOrWhiteSpace(s)) return null;
            if (Guid.TryParse(s, out var g)) return g;
            throw new JsonException($"Invalid id '{s}'.");
        }
        throw new JsonException("Expected a GUID string or null.");
    }

    public override void Write(Utf8JsonWriter writer, Guid? value, JsonSerializerOptions options)
    {
        if (value == null) writer.WriteNullValue();
        else writer.WriteStringValue(value.Value);
    }
}

public sealed class DateOnlyJsonConverter : JsonConverter<DateOnly>
{
    public override DateOnly Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.String)
        {
            var s = reader.GetString();
            if (string.IsNullOrWhiteSpace(s))
                throw new JsonException("Date is required. Use YYYY-MM-DD.");
            if (DateOnly.TryParse(s, out var d)) return d;
            throw new JsonException($"Invalid date '{s}'. Use YYYY-MM-DD.");
        }
        throw new JsonException("Expected a date string (YYYY-MM-DD).");
    }

    public override void Write(Utf8JsonWriter writer, DateOnly value, JsonSerializerOptions options)
        => writer.WriteStringValue(value.ToString("yyyy-MM-dd"));
}
