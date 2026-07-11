namespace Tms.Api.Models;

public interface IBranchScoped : ITenantScoped
{
    Guid? BranchId { get; set; }
}

public class Branch : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public bool IsHeadOffice { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
