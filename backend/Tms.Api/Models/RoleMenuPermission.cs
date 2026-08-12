namespace Tms.Api.Models;

public class RoleMenuPermission : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string Role { get; set; } = "";
    public string MenuKey { get; set; } = "";
    public bool IsVisible { get; set; } = true;
    public DateTime UpdatedAt { get; set; }
}
