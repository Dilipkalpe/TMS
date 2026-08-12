using System.Security.Claims;
using Tms.Api.Models;

namespace Tms.Api.Services;

public interface ITenantContext
{
    Guid? EffectiveCompanyId { get; }
    Guid? AssignCompanyId { get; }
    bool IsPlatformAdmin { get; }
    IQueryable<T> Filter<T>(IQueryable<T> query) where T : class, ITenantScoped;
}

public class TenantContext : ITenantContext
{
    public static readonly Guid DefaultCompanyId = Guid.Parse("00000000-0000-4000-8000-000000000001");

    public Guid? EffectiveCompanyId { get; }
    public Guid? AssignCompanyId { get; }
    public bool IsPlatformAdmin { get; }

    public TenantContext(IHttpContextAccessor http)
    {
        var ctx = http.HttpContext;
        var user = ctx?.User;
        if (user?.Identity?.IsAuthenticated != true) return;

        var role = user.FindFirstValue(ClaimTypes.Role)
            ?? user.FindFirstValue("role")
            ?? "";
        IsPlatformAdmin = TenantRoles.IsPlatformAdmin(role);

        Guid? userCompany = Guid.TryParse(user.FindFirst("company_id")?.Value, out var uc) ? uc : null;
        var header = ctx?.Request.Headers["X-Company-Id"].FirstOrDefault();

        if (IsPlatformAdmin)
        {
            if (!string.IsNullOrWhiteSpace(header) && Guid.TryParse(header, out var selected))
            {
                EffectiveCompanyId = selected;
                AssignCompanyId = selected;
            }
        }
        else
        {
            EffectiveCompanyId = userCompany ?? DefaultCompanyId;
            AssignCompanyId = EffectiveCompanyId;
        }
    }

    public IQueryable<T> Filter<T>(IQueryable<T> query) where T : class, ITenantScoped
    {
        if (EffectiveCompanyId == null)
            return query.Where(_ => false);
        var id = EffectiveCompanyId.Value;
        return query.Where(x => x.CompanyId == id);
    }
}

public static class TenantRoles
{
    public const string PlatformSuperAdmin = "Platform Super Admin";
    public const string SuperAdmin = "Super Admin";
    public const string CompanyAdmin = "Admin";
    public const string Accountant = "Accountant";
    public const string Operator = "Operator";
    public const string BranchManager = "Branch Manager";

    public static bool IsPlatformAdmin(string? role) =>
        role is PlatformSuperAdmin or SuperAdmin;

    public static bool CanAccessAllBranches(string? role) =>
        IsPlatformAdmin(role) || role is CompanyAdmin;

    public static bool CanManageUsers(string? role) =>
        IsPlatformAdmin(role) || role is CompanyAdmin;

    public static readonly string[] AssignableRoles =
    [
        CompanyAdmin, BranchManager, Accountant, Operator
    ];


    public static bool CanAccessAccounting(string? role) =>
        IsPlatformAdmin(role) || role is CompanyAdmin or Accountant;

    public static bool CanAccessOperations(string? role) =>
        IsPlatformAdmin(role)
        || role is CompanyAdmin or Accountant or Operator
        // Custom User Role Types get Operator-level operations access by default
        || (role != null
            && !IsPlatformAdmin(role)
            && !AssignableRoles.Contains(role, StringComparer.OrdinalIgnoreCase));

    public static bool IsSystemAssignableRole(string? role) =>
        role != null && AssignableRoles.Contains(role, StringComparer.OrdinalIgnoreCase);
}

public static class TenantAccess
{
    public static bool CanAccess(ITenantContext tenant, ITenantScoped entity) =>
        tenant.EffectiveCompanyId != null && tenant.EffectiveCompanyId == entity.CompanyId;
}

/// <summary>Fixed company scope for background jobs without HTTP context.</summary>
public sealed class FixedTenantContext(Guid companyId) : ITenantContext
{
    public Guid? EffectiveCompanyId => companyId;
    public Guid? AssignCompanyId => companyId;
    public bool IsPlatformAdmin => false;

    public IQueryable<T> Filter<T>(IQueryable<T> query) where T : class, ITenantScoped
        => query.Where(x => x.CompanyId == companyId);
}
