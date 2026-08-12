using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public class UserRoleTypeService(TmsDbContext db)
{
    public static readonly (string Name, string Description)[] SystemRoleSeeds =
    [
        (TenantRoles.CompanyAdmin, "Full company access including users and role menus"),
        (TenantRoles.BranchManager, "Branch operations with limited settings"),
        (TenantRoles.Accountant, "Accounts, finance reports, and customer/vendor masters"),
        (TenantRoles.Operator, "Shipment, delivery, billing, and day-to-day operations"),
    ];

    public async Task EnsureSystemRolesAsync(Guid companyId, CancellationToken ct = default)
    {
        var existing = await db.UserRoleTypes.AsNoTracking()
            .Where(r => r.CompanyId == companyId)
            .Select(r => r.Name)
            .ToListAsync(ct);
        var existingSet = existing.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var now = DateTime.UtcNow;
        var added = false;
        foreach (var (name, description) in SystemRoleSeeds)
        {
            if (existingSet.Contains(name)) continue;
            db.UserRoleTypes.Add(new UserRoleType
            {
                Id = Guid.NewGuid(),
                CompanyId = companyId,
                Name = name,
                Description = description,
                IsSystem = true,
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now,
            });
            added = true;
        }
        if (added) await db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<object>> ListAsync(Guid companyId, bool activeOnly = true, CancellationToken ct = default)
    {
        await EnsureSystemRolesAsync(companyId, ct);
        var q = db.UserRoleTypes.AsNoTracking().Where(r => r.CompanyId == companyId);
        if (activeOnly) q = q.Where(r => r.IsActive);
        var rows = await q.OrderBy(r => r.IsSystem ? 0 : 1).ThenBy(r => r.Name).ToListAsync(ct);
        return rows.Select(Map).ToList();
    }

    public async Task<IReadOnlyList<string>> ListNamesAsync(Guid companyId, bool activeOnly = true, CancellationToken ct = default)
    {
        await EnsureSystemRolesAsync(companyId, ct);
        var q = db.UserRoleTypes.AsNoTracking().Where(r => r.CompanyId == companyId);
        if (activeOnly) q = q.Where(r => r.IsActive);
        return await q.OrderBy(r => r.IsSystem ? 0 : 1).ThenBy(r => r.Name).Select(r => r.Name).ToListAsync(ct);
    }

    public async Task<bool> ExistsAsync(Guid companyId, string name, CancellationToken ct = default)
    {
        var n = NormalizeName(name);
        if (n.Length == 0) return false;
        return await db.UserRoleTypes.AsNoTracking()
            .AnyAsync(r => r.CompanyId == companyId && r.Name.ToLower() == n.ToLower(), ct);
    }

    public async Task<object> CreateAsync(Guid companyId, string name, string? description, CancellationToken ct = default)
    {
        await EnsureSystemRolesAsync(companyId, ct);

        var normalized = NormalizeName(name);
        if (normalized.Length == 0)
            throw new InvalidOperationException("User Role Type is required.");
        if (normalized.Length > 50)
            throw new InvalidOperationException("User Role Type must be 50 characters or fewer.");
        if (TenantRoles.IsPlatformAdmin(normalized))
            throw new InvalidOperationException("That User Role Type name is reserved.");

        if (await ExistsAsync(companyId, normalized, ct))
            throw new InvalidOperationException($"User Role Type '{normalized}' already exists.");

        var now = DateTime.UtcNow;
        var row = new UserRoleType
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            Name = normalized,
            Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim(),
            IsSystem = false,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.UserRoleTypes.Add(row);
        await db.SaveChangesAsync(ct);
        return Map(row);
    }

    public static string NormalizeName(string? name) =>
        string.IsNullOrWhiteSpace(name) ? "" : name.Trim();

    static object Map(UserRoleType r) => new
    {
        id = r.Id,
        code = r.Name,
        name = r.Name,
        label = r.Name,
        description = r.Description,
        isSystem = r.IsSystem,
        isActive = r.IsActive,
        createdAt = r.CreatedAt,
    };
}
