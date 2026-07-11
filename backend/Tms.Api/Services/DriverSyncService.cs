using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;
using Tms.Api.Services;

namespace Tms.Api.Services;

/// <summary>Keeps the legacy drivers table in sync with HR Driver employees for bookings/LR.</summary>
public class DriverSyncService(TmsDbContext db, IBranchContext branches, ITenantContext tenants)
{
    public async Task<Driver?> EnsureDriverByNameAsync(
        string name, string? phone = null, string? license = null, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(name)) return null;
        var trimmed = name.Trim();

        var driver = await BranchAccess.FilterForLookup(branches, tenants.Filter(db.Drivers.AsQueryable()))
            .FirstOrDefaultAsync(d => d.Name.ToLower() == trimmed.ToLower(), ct);
        if (driver != null)
        {
            var changed = false;
            if (!string.IsNullOrWhiteSpace(phone) && driver.Phone != phone) { driver.Phone = phone; changed = true; }
            if (!string.IsNullOrWhiteSpace(license) && driver.License != license) { driver.License = license; changed = true; }
            if (changed)
            {
                driver.UpdatedAt = DateTime.UtcNow;
                await db.SaveChangesAsync(ct);
            }
            return driver;
        }

        driver = new Driver
        {
            Id = await IdGenerator.NextDriverId(db),
            Name = trimmed,
            Phone = phone,
            License = license,
            Status = "Active",
            BranchId = branches.AssignBranchId,
            CompanyId = TenantScope.ResolveCompanyId(tenants),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Drivers.Add(driver);
        await db.SaveChangesAsync(ct);
        return driver;
    }
}
