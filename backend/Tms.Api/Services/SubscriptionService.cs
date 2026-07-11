using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public class SubscriptionService(TmsDbContext db)
{
    public async Task<CompanySubscription?> GetActiveSubscriptionAsync(Guid companyId, CancellationToken ct = default) =>
        await db.CompanySubscriptions
            .Include(s => s.Plan)
            .Where(s => s.CompanyId == companyId && s.Status == "active")
            .OrderByDescending(s => s.StartedAt)
            .FirstOrDefaultAsync(ct);

    public async Task<IReadOnlyList<string>> GetFeaturesAsync(Guid companyId, CancellationToken ct = default)
    {
        var sub = await GetActiveSubscriptionAsync(companyId, ct);
        if (sub?.Plan == null) return [];
        return ParseFeatures(sub.Plan.FeaturesJson);
    }

    public async Task<bool> HasFeatureAsync(Guid companyId, string feature, CancellationToken ct = default)
    {
        var features = await GetFeaturesAsync(companyId, ct);
        return features.Contains(feature, StringComparer.OrdinalIgnoreCase)
            || features.Contains("unlimited_users", StringComparer.OrdinalIgnoreCase) && feature == "unlimited_users";
    }

    public async Task EnsureCanCreateBookingAsync(Guid companyId, CancellationToken ct = default)
    {
        var sub = await GetActiveSubscriptionAsync(companyId, ct);
        if (sub?.Plan?.MaxBookingsMonth is not int limit) return;

        var monthStart = new DateOnly(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var count = await db.Bookings.CountAsync(
            b => b.CompanyId == companyId && b.BookingDate >= monthStart, ct);
        if (count >= limit)
            throw new InvalidOperationException($"Monthly booking limit reached ({limit}). Upgrade your plan.");
    }

    public async Task EnsureCanAddUserAsync(Guid companyId, CancellationToken ct = default)
    {
        var sub = await GetActiveSubscriptionAsync(companyId, ct);
        if (sub?.Plan?.MaxUsers is not int limit) return;

        var count = await db.Users.CountAsync(u => u.CompanyId == companyId && u.IsActive, ct);
        if (count >= limit)
            throw new InvalidOperationException($"User limit reached ({limit}). Upgrade your plan.");
    }

    public async Task IncrementBookingUsageAsync(Guid companyId, CancellationToken ct = default)
    {
        var monthStart = new DateOnly(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var usage = await db.CompanyUsages.FindAsync([companyId, monthStart], ct);
        if (usage == null)
        {
            usage = new CompanyUsage { CompanyId = companyId, UsageMonth = monthStart, BookingsCount = 1, UsersCount = 0 };
            db.CompanyUsages.Add(usage);
        }
        else
        {
            usage.BookingsCount++;
        }
        await db.SaveChangesAsync(ct);
    }

    public static IReadOnlyList<string> ParseFeatures(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? [];
        }
        catch
        {
            return [];
        }
    }
}
