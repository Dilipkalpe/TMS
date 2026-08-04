using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public static partial class LrBusinessTypeService
{
    [GeneratedRegex(@"[\d,.]+", RegexOptions.CultureInvariant)]
    private static partial Regex QuantityNumberRegex();

    public static decimal? ParseQuantityToTons(string? quantityText)
    {
        if (string.IsNullOrWhiteSpace(quantityText)) return null;

        var text = quantityText.Trim().ToUpperInvariant();
        var match = QuantityNumberRegex().Match(text);
        if (!match.Success) return null;

        var numText = match.Value.Replace(",", "");
        if (!decimal.TryParse(numText, NumberStyles.Number, CultureInfo.InvariantCulture, out var value))
            return null;

        if (text.Contains("KG") || text.Contains("KGS"))
            return Math.Round(value / 1000m, 3);

        return Math.Round(value, 3);
    }

    public static async Task<(string? CustomerId, string? CustomerName)> ResolveLrCustomerAsync(
        TmsDbContext db, LorryReceipt lr, CancellationToken ct = default)
    {
        if (!string.IsNullOrWhiteSpace(lr.CustomerId))
            return (lr.CustomerId, lr.CustomerName);

        if (!string.IsNullOrWhiteSpace(lr.BookingId))
        {
            var booking = await db.Bookings.AsNoTracking()
                .FirstOrDefaultAsync(b => b.Id == lr.BookingId, ct);
            if (booking != null)
                return (booking.CustomerId, booking.CustomerName);
        }

        return (null, lr.Consignor?.Trim());
    }

    public static string CustomerKey(string? customerId, string? customerName) =>
        !string.IsNullOrWhiteSpace(customerId)
            ? $"id:{customerId}"
            : $"name:{(customerName ?? "").Trim().ToUpperInvariant()}";

    public static async Task<decimal?> ResolveVehicleCapacityTonsAsync(
        TmsDbContext db, ITenantContext tenants, IBranchContext branches,
        string? vehicleId, string? vehicleNumber, CancellationToken ct = default)
    {
        Vehicle? vehicle = null;
        if (!string.IsNullOrWhiteSpace(vehicleId))
            vehicle = await TenantScope.FindVehicleByRefAsync(db, tenants, branches, vehicleId, ct);
        if (vehicle == null && !string.IsNullOrWhiteSpace(vehicleNumber))
            vehicle = await TenantScope.FindVehicleByRefAsync(db, tenants, branches, vehicleNumber, ct);

        return vehicle == null ? null : ParseQuantityToTons(vehicle.Capacity);
    }

    public sealed class LoadingValidationResult
    {
        public bool Ok { get; init; }
        public string? Error { get; init; }
        public decimal TotalQuantityTons { get; init; }
        public decimal? CapacityLimitTons { get; init; }
        public IReadOnlyList<string> LrNumbers { get; init; } = [];
    }

    public static async Task<LoadingValidationResult> ValidateLoadingSheetAsync(
        TmsDbContext db,
        ITenantContext tenants,
        IBranchContext branches,
        string businessType,
        IReadOnlyList<LorryReceipt> lrs,
        string? vehicleId,
        string? vehicleNumber,
        CancellationToken ct = default)
    {
        if (lrs.Count == 0)
            return new LoadingValidationResult { Ok = false, Error = "Select at least one LR for the loading sheet." };

        var bt = LrBusinessTypes.Normalize(businessType);
        if (lrs.Any(l => LrBusinessTypes.Normalize(l.BusinessType) != bt))
            return new LoadingValidationResult { Ok = false, Error = "All LRs must have the same business type (FTL or PTL)." };

        var lrNumbers = lrs.Select(l => l.LrNumber).ToList();
        var alreadyLoaded = await db.LrLoadingSheetItems.AsNoTracking()
            .Where(i => lrNumbers.Contains(i.LrNumber))
            .Join(db.LrLoadingSheets.AsNoTracking(),
                i => i.LoadingSheetId,
                s => s.Id,
                (i, s) => new { i.LrNumber, s.LoadingStatus })
            .Where(x => x.LoadingStatus == "Completed")
            .Select(x => x.LrNumber)
            .Distinct()
            .ToListAsync(ct);

        if (alreadyLoaded.Count > 0)
            return new LoadingValidationResult
            {
                Ok = false,
                Error = $"LR(s) already on a completed loading sheet: {string.Join(", ", alreadyLoaded)}.",
            };

        var customerKeys = new HashSet<string>();
        decimal totalTons = 0;
        var hasQty = false;

        foreach (var lr in lrs)
        {
            var (cid, cname) = await ResolveLrCustomerAsync(db, lr, ct);
            customerKeys.Add(CustomerKey(cid, cname));

            var tons = ParseQuantityToTons(lr.Quantity);
            if (tons.HasValue)
            {
                totalTons += tons.Value;
                hasQty = true;
            }
        }

        if (bt == LrBusinessTypes.FTL)
        {
            if (customerKeys.Count > 1)
                return new LoadingValidationResult
                {
                    Ok = false,
                    Error = "FTL loading sheet requires all LRs to belong to the same customer.",
                    LrNumbers = lrNumbers,
                };
        }
        else
        {
            var capacity = await ResolveVehicleCapacityTonsAsync(db, tenants, branches, vehicleId, vehicleNumber, ct);
            if (capacity.HasValue && hasQty && totalTons > capacity.Value)
                return new LoadingValidationResult
                {
                    Ok = false,
                    Error = $"Total load ({totalTons:N2} MT) exceeds vehicle capacity ({capacity.Value:N2} MT).",
                    TotalQuantityTons = totalTons,
                    CapacityLimitTons = capacity,
                    LrNumbers = lrNumbers,
                };

            return new LoadingValidationResult
            {
                Ok = true,
                TotalQuantityTons = totalTons,
                CapacityLimitTons = capacity,
                LrNumbers = lrNumbers,
            };
        }

        return new LoadingValidationResult
        {
            Ok = true,
            TotalQuantityTons = totalTons,
            LrNumbers = lrNumbers,
        };
    }
}
