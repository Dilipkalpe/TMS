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
        if (branches.EffectiveBranchId == null)
            return false;
        return entity.BranchId == branches.EffectiveBranchId;
    }

    public static bool DenyScopedUserWithoutBranch(IBranchContext branches) =>
        !branches.CanAccessAllBranches && branches.EffectiveBranchId == null;

    /// <summary>Lookup dropdowns: include company-wide (null branch) rows plus the active branch.</summary>
    public static IQueryable<T> FilterForLookup<T>(IBranchContext branches, IQueryable<T> query)
        where T : class, IBranchScoped
    {
        if (branches.CanAccessAllBranches && branches.EffectiveBranchId == null)
            return query;
        if (branches.EffectiveBranchId == null)
            return query.Where(x => x.BranchId == null);
        var branchId = branches.EffectiveBranchId.Value;
        return query.Where(x => x.BranchId == null || x.BranchId == branchId);
    }
}
