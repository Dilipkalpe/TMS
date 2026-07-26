using System.Security.Claims;
using Tms.Api.Models;

namespace Tms.Api.Services;

public interface IBranchContext
{
    Guid? EffectiveBranchId { get; }
    bool CanAccessAllBranches { get; }
    Guid? AssignBranchId { get; }
    IReadOnlyList<Guid> AllowedBranchIds { get; }
    IQueryable<T> Filter<T>(IQueryable<T> query) where T : class, IBranchScoped;
}

public class BranchContext : IBranchContext
{
    public Guid? EffectiveBranchId { get; }
    public bool CanAccessAllBranches { get; }
    public Guid? AssignBranchId { get; }
    public IReadOnlyList<Guid> AllowedBranchIds { get; } = [];

    public BranchContext(IHttpContextAccessor http)
    {
        var ctx = http.HttpContext;
        var user = ctx?.User;
        if (user?.Identity?.IsAuthenticated != true) return;

        // RoleClaimType / inbound mapping can leave role under "role" or ClaimTypes.Role.
        var role = user.FindFirstValue(ClaimTypes.Role)
            ?? user.FindFirstValue("role")
            ?? "";
        CanAccessAllBranches = TenantRoles.CanAccessAllBranches(role);

        Guid? userBranch = Guid.TryParse(user.FindFirstValue("branch_id"), out var ub) ? ub : null;
        var allowed = ParseAllowed(user.FindFirstValue("allowed_branch_ids"));
        if (allowed.Count == 0 && userBranch.HasValue)
            allowed.Add(userBranch.Value);
        AllowedBranchIds = allowed;

        var header = ctx?.Request.Headers["X-Branch-Id"].FirstOrDefault();
        Guid? headerBranch = null;
        if (!string.IsNullOrWhiteSpace(header)
            && !string.Equals(header, "all", StringComparison.OrdinalIgnoreCase)
            && Guid.TryParse(header, out var selected))
            headerBranch = selected;

        // Prefer explicit UI branch for document numbering / writes.
        if (headerBranch.HasValue)
        {
            var headerAllowed = CanAccessAllBranches
                || AllowedBranchIds.Count == 0
                || AllowedBranchIds.Contains(headerBranch.Value);
            if (headerAllowed)
            {
                EffectiveBranchId = headerBranch;
                AssignBranchId = headerBranch;
                return;
            }
        }

        if (CanAccessAllBranches)
            return;

        if (AllowedBranchIds.Count == 1)
        {
            EffectiveBranchId = AllowedBranchIds[0];
            AssignBranchId = AllowedBranchIds[0];
            return;
        }

        if (AllowedBranchIds.Count > 1)
        {
            AssignBranchId = AllowedBranchIds[0];
            return;
        }

        EffectiveBranchId = userBranch;
        AssignBranchId = userBranch;
    }

    public IQueryable<T> Filter<T>(IQueryable<T> query) where T : class, IBranchScoped
    {
        if (CanAccessAllBranches && EffectiveBranchId == null)
            return query;

        if (EffectiveBranchId != null)
        {
            var id = EffectiveBranchId.Value;
            return query.Where(x => x.BranchId == id);
        }

        if (!CanAccessAllBranches && AllowedBranchIds.Count > 0)
        {
            var ids = AllowedBranchIds.ToList();
            return query.Where(x => x.BranchId != null && ids.Contains(x.BranchId.Value));
        }

        return query.Where(_ => false);
    }

    static List<Guid> ParseAllowed(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return [];
        return raw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(s => Guid.TryParse(s, out var g) ? g : Guid.Empty)
            .Where(g => g != Guid.Empty)
            .Distinct()
            .ToList();
    }
}

public static class BranchRoles
{
    public static bool CanAccessAll(string? role) => TenantRoles.CanAccessAllBranches(role);
}
