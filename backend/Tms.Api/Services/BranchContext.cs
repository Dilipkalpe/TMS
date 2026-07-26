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

        var role = user.FindFirst(ClaimTypes.Role)?.Value ?? "";
        CanAccessAllBranches = TenantRoles.CanAccessAllBranches(role);

        Guid? userBranch = Guid.TryParse(user.FindFirst("branch_id")?.Value, out var ub) ? ub : null;
        var allowed = ParseAllowed(user.FindFirst("allowed_branch_ids")?.Value);
        if (allowed.Count == 0 && userBranch.HasValue)
            allowed.Add(userBranch.Value);
        AllowedBranchIds = allowed;

        var header = ctx?.Request.Headers["X-Branch-Id"].FirstOrDefault();
        Guid? headerBranch = null;
        if (!string.IsNullOrWhiteSpace(header)
            && !string.Equals(header, "all", StringComparison.OrdinalIgnoreCase)
            && Guid.TryParse(header, out var selected))
            headerBranch = selected;

        if (CanAccessAllBranches)
        {
            if (headerBranch.HasValue)
            {
                EffectiveBranchId = headerBranch;
                AssignBranchId = headerBranch;
            }
            return;
        }

        // Scoped users: header must be in allowed set; otherwise use single branch or multi IN-filter.
        if (headerBranch.HasValue && AllowedBranchIds.Contains(headerBranch.Value))
        {
            EffectiveBranchId = headerBranch;
            AssignBranchId = headerBranch;
            return;
        }

        if (AllowedBranchIds.Count == 1)
        {
            EffectiveBranchId = AllowedBranchIds[0];
            AssignBranchId = AllowedBranchIds[0];
            return;
        }

        if (AllowedBranchIds.Count > 1)
        {
            // All assigned branches (no single EffectiveBranchId).
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
