using Microsoft.EntityFrameworkCore;
using Tms.Api.DTOs;
using Tms.Api.Models;

namespace Tms.Api.Services;

public static class EntityMappers
{
    public static BookingDto ToDto(Booking b) => new(
        b.Id,
        b.BookingDate.ToString("yyyy-MM-dd"),
        b.CustomerName,
        b.Consignor, b.Consignee,
        b.FromCity, b.ToCity,
        b.Material, b.Quantity,
        b.VehicleNumber, b.DriverName,
        b.Freight, b.Status, b.Payment,
        b.Advance, b.Balance, b.Remarks);

    public static VehicleDto ToDto(Vehicle v) => new(
        v.Id, v.Number, v.Type, v.Model, v.Capacity, v.Owner, v.Status,
        v.Insurance?.ToString("yyyy-MM-dd"),
        v.Fitness?.ToString("yyyy-MM-dd"),
        v.Permit?.ToString("yyyy-MM-dd"),
        v.Puc?.ToString("yyyy-MM-dd"),
        v.LastMaintenance?.ToString("yyyy-MM-dd"),
        v.Trips, v.Revenue);

    public static DriverDto ToDto(Driver d) => new(
        d.Id, d.Name, d.License,
        d.LicenseExpiry?.ToString("yyyy-MM-dd"),
        d.Phone, d.Email, d.Address,
        d.Salary, d.Advance, d.Status, d.Trips, d.Rating);

    public static CustomerDto ToDto(Customer c) => new(
        c.Id, c.Name, c.Contact, c.Phone, c.Email, c.Gst, c.Address,
        c.Outstanding, c.CreditLimit, c.TotalTrips, c.LedgerBalance,
        c.PortalEnabled, c.PortalPhone ?? c.Phone, c.PortalPinHash != null,
        c.BranchId, c.Branch?.Name, c.Branch?.Code);

    public static VendorDto ToDto(Vendor v) => new(
        v.Id, v.Name, v.Contact, v.Phone, v.Email, v.Gst, v.Address,
        v.Outstanding, v.Category, v.TotalBills);

    public static ExpenseDto ToDto(Expense e) => new(
        e.Id,
        e.ExpenseDate.ToString("yyyy-MM-dd"),
        e.Category, e.Description,
        e.VehicleNumber, e.VendorName,
        e.Amount, e.PaymentMode, e.Status);

    public static LrDto ToDto(LorryReceipt l) => new(
        l.LrNumber,
        l.LrDate.ToString("yyyy-MM-dd"),
        l.Consignor, l.Consignee,
        l.FromCity, l.ToCity,
        l.VehicleNumber, l.DriverName,
        l.Material, l.Quantity,
        l.Freight, l.Gst, l.Balance, l.PaymentType,
        l.BookingId, l.Hamali, l.LoadingCharges, l.UnloadingCharges,
        l.Insurance, l.Advance, l.Remarks);
}

public static class IdGenerator
{
    static int MaxNumericSuffixFromIds(IEnumerable<string> ids, string prefix, int defaultIfEmpty)
    {
        return ids
            .Select(id =>
            {
                if (!id.StartsWith(prefix, StringComparison.Ordinal) || id.Length <= prefix.Length)
                    return 0;
                return int.TryParse(id.AsSpan(prefix.Length), out var n) ? n : 0;
            })
            .DefaultIfEmpty(defaultIfEmpty)
            .Max();
    }

    static async Task<int> MaxBookingNumberFallbackAsync(Data.TmsDbContext db, int defaultIfEmpty)
    {
        const string prefix = "BK-";
        var ids = await db.Bookings.AsNoTracking()
            .Where(b => b.Id.StartsWith(prefix))
            .Select(b => b.Id)
            .ToListAsync();
        return MaxNumericSuffixFromIds(ids, prefix, defaultIfEmpty);
    }

    public static async Task<string> NextBookingId(Data.TmsDbContext db)
    {
        const string prefix = "BK-";
        // Only numeric BK-1043 style IDs (perf seeds use BK-P* which must not break MAX/CAST).
        try
        {
            var max = await db.Database.SqlQueryRaw<int>(
                "SELECT sp_next_booking_number() AS \"Value\"")
                .FirstAsync();
            return $"{prefix}{max + 1}";
        }
        catch (Exception)
        {
            var max = await MaxBookingNumberFallbackAsync(db, 1042);
            return $"{prefix}{max + 1}";
        }
    }

    public static async Task<string> NextLrNumber(Data.TmsDbContext db)
    {
        var year = DateTime.UtcNow.Year;
        var prefix = $"LR-{year}-";
        var ids = await db.LorryReceipts.AsNoTracking()
            .Where(l => l.LrNumber.StartsWith(prefix))
            .Select(l => l.LrNumber)
            .ToListAsync();
        var max = MaxNumericSuffixFromIds(ids, prefix, 892);
        return $"{prefix}{max + 1:D4}";
    }

    public static async Task<string> NextExpenseId(Data.TmsDbContext db)
    {
        const string prefix = "EXP-";
        var ids = await db.Expenses.AsNoTracking()
            .Where(e => e.Id.StartsWith(prefix))
            .Select(e => e.Id)
            .ToListAsync();
        var max = MaxNumericSuffixFromIds(ids, prefix, 5);
        return $"{prefix}{max + 1:D3}";
    }

    public static async Task<string> NextBrokerId(Data.TmsDbContext db)
    {
        const string prefix = "BR-";
        var ids = await db.Brokers.AsNoTracking()
            .Where(b => b.Id.StartsWith(prefix))
            .Select(b => b.Id)
            .ToListAsync();
        var max = MaxNumericSuffixFromIds(ids, prefix, 0);
        return $"{prefix}{max + 1:D3}";
    }

    public static async Task<string> NextCustomerId(Data.TmsDbContext db)
    {
        var count = await db.Customers.CountAsync();
        return $"C-{(count + 1):D3}";
    }

    public static async Task<string> NextVendorId(Data.TmsDbContext db)
    {
        var count = await db.Vendors.CountAsync();
        return $"VN-{(count + 1):D3}";
    }

    public static async Task<string> NextDriverId(Data.TmsDbContext db)
    {
        var count = await db.Drivers.CountAsync();
        return $"D-{(count + 1):D3}";
    }

    public static async Task<string> NextVehicleId(Data.TmsDbContext db)
    {
        var count = await db.Vehicles.CountAsync();
        return $"V-{(count + 1):D3}";
    }
}
