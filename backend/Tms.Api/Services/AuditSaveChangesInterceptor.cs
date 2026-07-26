using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Tms.Api.Models;

namespace Tms.Api.Services;

/// <summary>
/// Stamps CreatedAt/By and UpdatedAt/By on IAuditable entities during SaveChanges.
/// Actor always comes from auth context — never from request body.
/// </summary>
public sealed class AuditSaveChangesInterceptor(ICurrentUser currentUser) : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        Stamp(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        Stamp(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    void Stamp(DbContext? db)
    {
        if (db == null) return;
        var now = DateTime.UtcNow;
        // Display name (FullName) for CBy / MBy list columns.
        var actor = currentUser.DisplayName;

        foreach (var entry in db.ChangeTracker.Entries<IAuditable>())
        {
            if (entry.State == EntityState.Added)
            {
                if (entry.Entity.CreatedAt == default)
                    entry.Entity.CreatedAt = now;
                entry.Entity.UpdatedAt = now;
                // Always overwrite — do not accept client-supplied CreatedBy/UpdatedBy.
                entry.Entity.CreatedBy = actor;
                entry.Entity.UpdatedBy = actor;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = now;
                entry.Entity.UpdatedBy = actor;
                entry.Property(x => x.CreatedAt).IsModified = false;
                entry.Property(x => x.CreatedBy).IsModified = false;
            }
        }
    }
}
