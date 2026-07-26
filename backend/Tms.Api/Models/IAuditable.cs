namespace Tms.Api.Models;

/// <summary>Standard create/modify audit fields for TMS entities.</summary>
public interface IAuditable
{
    DateTime CreatedAt { get; set; }
    DateTime UpdatedAt { get; set; }
    string? CreatedBy { get; set; }
    string? UpdatedBy { get; set; }
}
