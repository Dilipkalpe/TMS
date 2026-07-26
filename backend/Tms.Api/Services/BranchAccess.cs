using Tms.Api.Models;

namespace Tms.Api.Services;

public static class BranchAccess
{
    /// <summary>Returns true if the caller may access this branch-scoped entity.</summary>
    public static bool CanAccess(IBranchContext branches, IBranchScoped? entity)
    {
        if (entity == null) return false;
        if (branches.CanAccessAllBranches && branches.EffectiveBranchId == null)
            return true;
        if (branches.EffectiveBranchId != null)
            return entity.BranchId == branches.EffectiveBranchId;
        if (!branches.CanAccessAllBranches && branches.AllowedBranchIds.Count > 0)
            return entity.BranchId != null && branches.AllowedBranchIds.Contains(entity.BranchId.Value);
        return false;
    }

    public static bool DenyScopedUserWithoutBranch(IBranchContext branches) =>
        !branches.CanAccessAllBranches
        && branches.EffectiveBranchId == null
        && branches.AllowedBranchIds.Count == 0;

    /// <summary>Lookup dropdowns: include company-wide (null branch) rows plus the active branch(es).</summary>
    public static IQueryable<T> FilterForLookup<T>(IBranchContext branches, IQueryable<T> query)
        where T : class, IBranchScoped
    {
        if (branches.CanAccessAllBranches && branches.EffectiveBranchId == null)
            return query;
        if (branches.EffectiveBranchId != null)
        {
            var branchId = branches.EffectiveBranchId.Value;
            return query.Where(x => x.BranchId == null || x.BranchId == branchId);
        }
        if (!branches.CanAccessAllBranches && branches.AllowedBranchIds.Count > 0)
        {
            var ids = branches.AllowedBranchIds.ToList();
            return query.Where(x => x.BranchId == null || (x.BranchId != null && ids.Contains(x.BranchId.Value)));
        }
        return query.Where(x => x.BranchId == null);
    }
}
