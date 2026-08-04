namespace Tms.Api.Models;

public static class LrBusinessTypes
{
    public const string FTL = "FTL";
    public const string PTL = "PTL";

    public static readonly IReadOnlyList<string> All = [FTL, PTL];

    public static bool IsValid(string? value) =>
        !string.IsNullOrWhiteSpace(value) && All.Contains(value.Trim().ToUpperInvariant());

    public static string Normalize(string? value) =>
        IsValid(value) ? value!.Trim().ToUpperInvariant() : FTL;
}
