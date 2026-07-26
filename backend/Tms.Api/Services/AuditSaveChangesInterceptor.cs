using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Tms.Api.Models;

namespace Tms.Api.Services;

/// <summary>Stamps CreatedAt/By and UpdatedAt/By on IAuditable entities during SaveChanges.</summary>
public sealed class AuditSaveChangesInterceptor(IHttpContextAccessor http) : SaveChangesInterceptor
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
        var actor = ResolveActor();

        foreach (var entry in db.ChangeTracker.Entries<IAuditable>())
        {
            if (entry.State == EntityState.Added)
            {
                if (entry.Entity.CreatedAt == default)
                    entry.Entity.CreatedAt = now;
                entry.Entity.UpdatedAt = now;
                entry.Entity.CreatedBy ??= actor;
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

    string ResolveActor()
    {
        var user = http.HttpContext?.User;
        if (user?.Identity?.IsAuthenticated != true)
            return "system";

        // Prefer username for list display (CBy / ModBy); fall back to user id.
        var username = user.Identity?.Name ?? user.FindFirstValue(ClaimTypes.Name);
        if (!string.IsNullOrWhiteSpace(username))
            return username;

        var uid = user.FindFirstValue(ClaimTypes.NameIdentifier);
        return string.IsNullOrWhiteSpace(uid) ? "system" : uid;
    }
}
