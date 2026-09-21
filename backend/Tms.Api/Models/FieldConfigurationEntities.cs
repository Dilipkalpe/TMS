namespace Tms.Api.Models;

/// <summary>
/// Per-company field visibility / required / label configuration for Booking and LR.
/// TechnicalFieldName never changes; only CustomDisplayName is user-facing.
/// </summary>
public class FieldConfiguration
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string Module { get; set; } = "";
    public string TechnicalFieldName { get; set; } = "";
    public string DefaultDisplayName { get; set; } = "";
    public string? CustomDisplayName { get; set; }
    public bool IsVisible { get; set; } = true;
    public bool IsRequired { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public string EffectiveDisplayName =>
        string.IsNullOrWhiteSpace(CustomDisplayName)
            ? DefaultDisplayName
            : CustomDisplayName.Trim();
}
