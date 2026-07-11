using System.Security.Claims;
using Tms.Api.Models;

namespace Tms.Api.Services;

public interface IBranchContext
{
    Guid? EffectiveBranchId { get; }
    bool CanAccessAllBranches { get; }
    Guid? AssignBranchId { get; }
    IQueryable<T> Filter<T>(IQueryable<T> query) where T : class, IBranchScoped;
}

public class BranchContext : IBranchContext
{
    public Guid? EffectiveBranchId { get; }
    public bool CanAccessAllBranches { get; }
    public Guid? AssignBranchId { get; }

    public BranchContext(IHttpContextAccessor http)
    {
        var ctx = http.HttpContext;
        var user = ctx?.User;
        if (user?.Identity?.IsAuthenticated != true) return;

        var role = user.FindFirst(ClaimTypes.Role)?.Value ?? "";
        CanAccessAllBranches = TenantRoles.CanAccessAllBranches(role);

        Guid? userBranch = Guid.TryParse(user.FindFirst("branch_id")?.Value, out var ub) ? ub : null;
        var header = ctx?.Request.Headers["X-Branch-Id"].FirstOrDefault();

        if (CanAccessAllBranches)
        {
            if (!string.IsNullOrWhiteSpace(header) && !string.Equals(header, "all", StringComparison.OrdinalIgnoreCase)
                && Guid.TryParse(header, out var selected))
            {
                EffectiveBranchId = selected;
                AssignBranchId = selected;
            }
        }
        else
        {
            EffectiveBranchId = userBranch;
            AssignBranchId = userBranch;
        }
    }

    public IQueryable<T> Filter<T>(IQueryable<T> query) where T : class, IBranchScoped
    {
        if (CanAccessAllBranches && EffectiveBranchId == null)
            return query;
        if (EffectiveBranchId == null)
            return query.Where(_ => false);
        var id = EffectiveBranchId.Value;
        return query.Where(x => x.BranchId == id);
    }
}

public static class BranchRoles
{
    public static bool CanAccessAll(string? role) => TenantRoles.CanAccessAllBranches(role);
}
