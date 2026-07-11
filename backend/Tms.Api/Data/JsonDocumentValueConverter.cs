using System.Text.Json;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Tms.Api.Data;

sealed class JsonDocumentValueConverter : ValueConverter<JsonDocument?, string?>
{
    public static readonly JsonDocumentValueConverter Instance = new();

    JsonDocumentValueConverter()
        : base(
            doc => doc == null ? null : doc.RootElement.GetRawText(),
            json => ParseJson(json))
    {
    }

    static JsonDocument? ParseJson(string? json)
        => string.IsNullOrWhiteSpace(json) ? null : JsonDocument.Parse(json, default);
}
