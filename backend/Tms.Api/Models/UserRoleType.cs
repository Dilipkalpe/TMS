namespace Tms.Api.Models;

/// <summary>Company-scoped User Role Type master (Admin, Operator, custom types, etc.).</summary>
public class UserRoleType : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    /// <summary>Stored on users.role and role_menu_permissions.role.</summary>
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    /// <summary>Built-in types seeded per company; cannot be renamed/deleted.</summary>
    public bool IsSystem { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
