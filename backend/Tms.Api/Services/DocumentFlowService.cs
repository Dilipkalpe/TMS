using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

/// <summary>Company-level LR ↔ Booking workflow preference.</summary>
public static class DocumentFlow
{
    public const string FirstLRThenBooking = "FirstLRThenBooking";
    public const string FirstBookingThenLR = "FirstBookingThenLR";
    public const string Default = FirstBookingThenLR;

    public static readonly string[] All = [FirstLRThenBooking, FirstBookingThenLR];

    public static bool IsValid(string? value) =>
        !string.IsNullOrWhiteSpace(value)
        && All.Contains(value, StringComparer.OrdinalIgnoreCase);

    public static string Normalize(string? value)
    {
        if (string.Equals(value, FirstLRThenBooking, StringComparison.OrdinalIgnoreCase))
            return FirstLRThenBooking;
        if (string.Equals(value, FirstBookingThenLR, StringComparison.OrdinalIgnoreCase))
            return FirstBookingThenLR;
        return Default;
    }

    public static string DisplayLabel(string flow) => Normalize(flow) switch
    {
        FirstLRThenBooking => "First LR → Next Booking",
        _ => "First Booking → Next LR",
    };
}

/// <summary>Centralized company document-flow reads and create/update validation.</summary>
public class DocumentFlowService(TmsDbContext db, ITenantContext tenants)
{
    public async Task<string> GetFlowAsync(CancellationToken ct = default)
    {
        var companyId = tenants.EffectiveCompanyId;
        if (companyId == null)
            return DocumentFlow.Default;

        var flow = await db.CompanySettings.AsNoTracking()
            .Where(s => s.CompanyId == companyId.Value)
            .Select(s => s.DocumentFlow)
            .FirstOrDefaultAsync(ct);

        return DocumentFlow.Normalize(flow);
    }

    public async Task SetFlowAsync(string flow, CancellationToken ct = default)
    {
        var normalized = DocumentFlow.Normalize(flow);
        if (!DocumentFlow.IsValid(normalized))
            throw new InvalidOperationException(
                $"Invalid document flow. Use '{DocumentFlow.FirstLRThenBooking}' or '{DocumentFlow.FirstBookingThenLR}'.");

        var settings = await GetOrCreateSettingsAsync(ct);
        settings.DocumentFlow = normalized;
        settings.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// One settings row per company. Adopts a legacy singleton / unassigned row when present
    /// so we never INSERT id=1 on top of an existing company_settings primary key
    /// (legacy schema used DEFAULT 1 CHECK (id = 1)).
    /// </summary>
    public async Task<CompanySettings> GetOrCreateSettingsAsync(CancellationToken ct = default)
    {
        var companyId = TenantScope.ResolveCompanyId(tenants);
        var settings = await db.CompanySettings.FirstOrDefaultAsync(s => s.CompanyId == companyId, ct);
        if (settings != null) return settings;

        // Legacy unassigned row (company_id NULL → Guid.Empty).
        settings = await db.CompanySettings
            .Where(s => s.CompanyId == Guid.Empty)
            .OrderBy(s => s.Id)
            .FirstOrDefaultAsync(ct);

        // Classic singleton id=1, or the only row in the table (pre-multi-tenant installs).
        if (settings == null)
        {
            settings = await db.CompanySettings.FirstOrDefaultAsync(s => s.Id == 1, ct);
            if (settings != null && settings.CompanyId != Guid.Empty && settings.CompanyId != companyId)
                settings = null;
        }

        if (settings == null)
        {
            var total = await db.CompanySettings.CountAsync(ct);
            if (total == 1)
                settings = await db.CompanySettings.OrderBy(s => s.Id).FirstAsync(ct);
        }

        if (settings != null)
        {
            settings.CompanyId = companyId;
            if (string.IsNullOrWhiteSpace(settings.DocumentFlow))
                settings.DocumentFlow = DocumentFlow.Default;
            return settings;
        }

        // New row: leave Id unset so SERIAL / sequence assigns it (never hardcode 1).
        settings = new CompanySettings
        {
            CompanyId = companyId,
            DocumentFlow = DocumentFlow.Default,
            UpdatedAt = DateTime.UtcNow,
        };
        db.CompanySettings.Add(settings);
        return settings;
    }

    /// <summary>
    /// FirstBookingThenLR: LR must reference a booking.
    /// FirstLRThenBooking: LR may be created independently (booking comes later).
    /// </summary>
    public async Task EnsureCanCreateLrAsync(string? bookingId, CancellationToken ct = default)
    {
        var flow = await GetFlowAsync(ct);
        if (flow == DocumentFlow.FirstBookingThenLR
            && string.IsNullOrWhiteSpace(bookingId))
        {
            throw new InvalidOperationException(
                "Company Document Flow is set to First Booking → Next LR. Create a Booking first, then generate the LR linked to that Booking.");
        }
    }

    /// <summary>
    /// FirstLRThenBooking: Booking must reference an existing unlinked LR.
    /// FirstBookingThenLR: Booking may be created independently.
    /// </summary>
    public async Task EnsureCanCreateBookingAsync(string? lrNumber, CancellationToken ct = default)
    {
        var flow = await GetFlowAsync(ct);
        if (flow != DocumentFlow.FirstLRThenBooking)
            return;

        if (string.IsNullOrWhiteSpace(lrNumber))
        {
            throw new InvalidOperationException(
                "Company Document Flow is set to First LR → Next Booking. Create an LR first, then create the Booking linked to that LR.");
        }

        var lr = await tenants.Filter(db.LorryReceipts.AsQueryable())
            .FirstOrDefaultAsync(l => l.LrNumber == lrNumber, ct)
            ?? throw new InvalidOperationException($"LR '{lrNumber}' was not found in your company.");

        if (!string.IsNullOrEmpty(lr.BookingId))
        {
            throw new InvalidOperationException(
                $"LR '{lrNumber}' is already linked to booking '{lr.BookingId}'. Select an unlinked LR.");
        }
    }

    public async Task EnsureCanClearLrBookingLinkAsync(CancellationToken ct = default)
    {
        var flow = await GetFlowAsync(ct);
        if (flow == DocumentFlow.FirstBookingThenLR)
        {
            throw new InvalidOperationException(
                "Company Document Flow requires every LR to stay linked to a Booking. Clearing the booking link is not allowed.");
        }
    }

    /// <summary>
    /// Pending count for dashboards/reports:
    /// FirstBookingThenLR → bookings without an LR.
    /// FirstLRThenBooking → LRs without a booking.
    /// </summary>
    public async Task<(int Count, string Label, string Message)> GetPendingDocumentCountAsync(
        CancellationToken ct = default)
    {
        var flow = await GetFlowAsync(ct);
        var companyId = tenants.EffectiveCompanyId;

        if (flow == DocumentFlow.FirstLRThenBooking)
        {
            var q = tenants.Filter(db.LorryReceipts.AsNoTracking())
                .Where(l => l.BookingId == null || l.BookingId == "");
            var count = await q.CountAsync(ct);
            return (count, "Pending booking", $"{count} LR(s) without booking");
        }

        var bookings = tenants.Filter(db.Bookings.AsNoTracking());
        var countPending = companyId == null
            ? await bookings.CountAsync(b =>
                !db.LorryReceipts.AsNoTracking().Any(l => l.BookingId == b.Id), ct)
            : await bookings.CountAsync(b =>
                !db.LorryReceipts.AsNoTracking().Any(l =>
                    l.BookingId == b.Id && l.CompanyId == companyId.Value), ct);

        return (countPending, "Pending LR", $"{countPending} booking(s) without LR");
    }
}
