using System.Text.RegularExpressions;

namespace Tms.Api.Services;

/// <summary>Company/branch codes for document numbering must be exactly 2 alphanumeric chars (e.g. 01, PN).</summary>
public static class DocumentCodeRules
{
    static readonly Regex TwoDigit = new(@"^[A-Z0-9]{2}$", RegexOptions.Compiled);

    public static string Normalize(string? code) => (code ?? "").Trim().ToUpperInvariant();

    public static bool IsValid(string? code) => TwoDigit.IsMatch(Normalize(code));

    public static string Require(string? code, string label)
    {
        var n = Normalize(code);
        if (!IsValid(n))
            throw new InvalidOperationException(
                $"{label} code must be exactly 2 characters (A–Z / 0–9), e.g. 01 or PN. Current value: '{code}'.");
        return n;
    }

    /// <summary>Decode path-safe ids where '/' was replaced with '~'.</summary>
    public static string DecodePathId(string? id)
    {
        if (string.IsNullOrEmpty(id)) return "";
        var decoded = Uri.UnescapeDataString(id);
        return decoded.Replace('~', '/');
    }
}
