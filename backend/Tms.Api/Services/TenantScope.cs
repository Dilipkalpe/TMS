using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

/// <summary>Helpers for consistent multi-tenant query scoping and entity access checks.</summary>
public static class TenantScope
{
    public static IQueryable<T> ForBranch<T>(this IQueryable<T> query, ITenantContext tenants, IBranchContext branches)
        where T : class, IBranchScoped
        => tenants.Filter(branches.Filter(query));

    public static IQueryable<T> ForTenant<T>(this IQueryable<T> query, ITenantContext tenants)
        where T : class, ITenantScoped
        => tenants.Filter(query);

    public static IQueryable<Vehicle> Vehicles(TmsDbContext db, ITenantContext tenants, IBranchContext? branches = null)
    {
        var q = tenants.Filter(db.Vehicles.AsQueryable());
        return branches != null ? branches.Filter(q) : q;
    }

    public static IQueryable<Driver> Drivers(TmsDbContext db, ITenantContext tenants, IBranchContext? branches = null)
    {
        var q = tenants.Filter(db.Drivers.AsQueryable());
        return branches != null ? branches.Filter(q) : q;
    }

    public static IQueryable<Customer> Customers(TmsDbContext db, ITenantContext tenants, IBranchContext? branches = null)
    {
        var q = tenants.Filter(db.Customers.AsQueryable());
        return branches != null ? branches.Filter(q) : q;
    }

    public static IQueryable<Vendor> Vendors(TmsDbContext db, ITenantContext tenants) =>
        tenants.Filter(db.Vendors.AsQueryable());

    public static IQueryable<Broker> Brokers(TmsDbContext db, ITenantContext tenants) =>
        tenants.Filter(db.Brokers.AsQueryable());

    public static IQueryable<Booking> Bookings(TmsDbContext db, ITenantContext tenants, IBranchContext? branches = null)
    {
        var q = tenants.Filter(db.Bookings.AsQueryable());
        return branches != null ? branches.Filter(q) : q;
    }

    public static IQueryable<Document> Documents(TmsDbContext db, ITenantContext tenants) =>
        tenants.Filter(db.Documents.AsQueryable());

    public static IQueryable<MarketplaceListing> MarketplaceListings(TmsDbContext db, ITenantContext tenants) =>
        tenants.Filter(db.MarketplaceListings.AsQueryable());

    public static IQueryable<IotDevice> IotDevices(TmsDbContext db, ITenantContext tenants) =>
        tenants.Filter(db.IotDevices.AsQueryable());

    public static IQueryable<ForecastSnapshot> ForecastSnapshots(TmsDbContext db, ITenantContext tenants) =>
        tenants.Filter(db.ForecastSnapshots.AsQueryable());

    public static IQueryable<AiChatSession> AiChatSessions(TmsDbContext db, ITenantContext tenants) =>
        tenants.Filter(db.AiChatSessions.AsQueryable());

    public static IQueryable<GpsTrack> GpsTracks(TmsDbContext db, ITenantContext tenants)
    {
        var companyId = tenants.EffectiveCompanyId;
        if (companyId == null) return db.GpsTracks.Where(_ => false);
        return db.GpsTracks.Where(t => db.Vehicles.Any(v => v.Id == t.VehicleId && v.CompanyId == companyId));
    }

    public static IQueryable<GeofenceEvent> GeofenceEvents(TmsDbContext db, ITenantContext tenants)
    {
        var companyId = tenants.EffectiveCompanyId;
        if (companyId == null) return db.GeofenceEvents.Where(_ => false);
        return db.GeofenceEvents.Where(e => db.Vehicles.Any(v => v.Id == e.VehicleId && v.CompanyId == companyId));
    }

    public static IQueryable<MaintenanceRecord> MaintenanceRecords(TmsDbContext db, ITenantContext tenants)
    {
        var companyId = tenants.EffectiveCompanyId;
        if (companyId == null) return db.MaintenanceRecords.Where(_ => false);
        return db.MaintenanceRecords.Where(m => db.Vehicles.Any(v => v.Id == m.VehicleId && v.CompanyId == companyId));
    }

    public static IQueryable<MaintenanceSchedule> MaintenanceSchedules(TmsDbContext db, ITenantContext tenants)
    {
        var companyId = tenants.EffectiveCompanyId;
        if (companyId == null) return db.MaintenanceSchedules.Where(_ => false);
        return db.MaintenanceSchedules.Where(m => db.Vehicles.Any(v => v.Id == m.VehicleId && v.CompanyId == companyId));
    }

    public static IQueryable<MaintenanceWorkOrder> MaintenanceWorkOrders(TmsDbContext db, ITenantContext tenants)
    {
        var companyId = tenants.EffectiveCompanyId;
        if (companyId == null) return db.MaintenanceWorkOrders.Where(_ => false);
        return db.MaintenanceWorkOrders.Where(m => db.Vehicles.Any(v => v.Id == m.VehicleId && v.CompanyId == companyId));
    }

    public static IQueryable<FuelEntry> FuelEntries(TmsDbContext db, ITenantContext tenants)
    {
        var companyId = tenants.EffectiveCompanyId;
        if (companyId == null) return db.FuelEntries.Where(_ => false);
        return db.FuelEntries.Where(f => db.Vehicles.Any(v => v.Id == f.VehicleId && v.CompanyId == companyId));
    }

    public static IQueryable<Trip> Trips(TmsDbContext db, ITenantContext tenants, IBranchContext? branches = null)
    {
        var q = tenants.Filter(db.Trips.AsQueryable());
        return branches != null ? branches.Filter(q) : q;
    }

    public static IQueryable<RouteOptimizationJob> RouteOptimizationJobs(TmsDbContext db, ITenantContext tenants) =>
        tenants.Filter(db.RouteOptimizationJobs.AsQueryable());

    public static async Task<Vehicle?> FindVehicleAsync(
        TmsDbContext db, ITenantContext tenants, IBranchContext? branches, string vehicleId, CancellationToken ct = default)
    {
        var v = await db.Vehicles.FindAsync([vehicleId], ct);
        if (v == null || !TenantAccess.CanAccess(tenants, v)) return null;
        if (branches != null && !BranchAccess.CanAccess(branches, v)) return null;
        return v;
    }

    public static async Task<Vehicle?> FindVehicleByRefAsync(
        TmsDbContext db, ITenantContext tenants, IBranchContext? branches, string? vehicleRef, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(vehicleRef)) return null;
        var trimmed = vehicleRef.Trim();
        return await Vehicles(db, tenants, branches)
            .AsNoTracking()
            .FirstOrDefaultAsync(v => v.Number == trimmed || v.Id == trimmed, ct);
    }

    public static async Task<Driver?> FindDriverByRefAsync(
        TmsDbContext db, ITenantContext tenants, IBranchContext? branches, string? driverRef, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(driverRef)) return null;
        var trimmed = driverRef.Trim();
        return await Drivers(db, tenants, branches)
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Name == trimmed || d.Id == trimmed, ct);
    }

    public static async Task<Customer?> FindCustomerByNameAsync(
        TmsDbContext db, ITenantContext tenants, IBranchContext? branches, string? name, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(name)) return null;
        return await Customers(db, tenants, branches)
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Name == name.Trim(), ct);
    }

    public static async Task<Customer?> FindCustomerAsync(
        TmsDbContext db, ITenantContext tenants, IBranchContext? branches, string customerId, CancellationToken ct = default)
    {
        var c = await db.Customers.FindAsync([customerId], ct);
        return CanAccessBranchEntity(tenants, branches, c) ? c : null;
    }

    public static async Task<Vendor?> FindVendorByRefAsync(
        TmsDbContext db, ITenantContext tenants, string? vendorRef, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(vendorRef)) return null;
        var trimmed = vendorRef.Trim();
        return await Vendors(db, tenants)
            .AsNoTracking()
            .FirstOrDefaultAsync(v => v.Name == trimmed || v.Id == trimmed, ct);
    }

    public static async Task<Broker?> FindBrokerByNameAsync(
        TmsDbContext db, ITenantContext tenants, string brokerName, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(brokerName)) return null;
        return await Brokers(db, tenants)
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Name == brokerName.Trim(), ct);
    }

    public static async Task<Booking?> FindBookingAsync(
        TmsDbContext db, ITenantContext tenants, IBranchContext branches, string bookingId, CancellationToken ct = default)
    {
        var b = await db.Bookings.FindAsync([bookingId], ct);
        return CanAccessBranchEntity(tenants, branches, b) ? b : null;
    }

    public static async Task<Booking?> FindBookingByIdAsync(
        TmsDbContext db, ITenantContext tenants, string bookingId, CancellationToken ct = default)
    {
        var b = await db.Bookings.FindAsync([bookingId], ct);
        return CanAccessTenantEntity(tenants, b) ? b : null;
    }

    public static async Task<ProofOfDelivery?> FindPodForBookingAsync(
        TmsDbContext db, ITenantContext tenants, string bookingId, CancellationToken ct = default)
    {
        var booking = await FindBookingByIdAsync(db, tenants, bookingId, ct);
        if (booking == null) return null;
        return await tenants.Filter(db.ProofOfDeliveries.AsQueryable())
            .FirstOrDefaultAsync(p => p.BookingId == bookingId, ct);
    }

    public static async Task<IotDevice?> FindIotDeviceAsync(
        TmsDbContext db, ITenantContext tenants, Guid deviceId, CancellationToken ct = default)
    {
        var d = await db.IotDevices.FindAsync([deviceId], ct);
        return CanAccessTenantEntity(tenants, d) ? d : null;
    }

    public static async Task<MarketplaceListing?> FindMarketplaceListingAsync(
        TmsDbContext db, ITenantContext tenants, Guid listingId, CancellationToken ct = default)
    {
        var l = await db.MarketplaceListings.FindAsync([listingId], ct);
        if (l == null || !CanAccessTenantEntity(tenants, l) || !l.IsActive) return null;
        return l;
    }

    public static async Task<bool> ValidateVehicleIdsAsync(
        TmsDbContext db, ITenantContext tenants, IEnumerable<string>? vehicleIds, CancellationToken ct = default)
    {
        var ids = vehicleIds?.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList() ?? [];
        if (ids.Count == 0) return true;

        var scopedCount = await Vehicles(db, tenants)
            .Where(v => ids.Contains(v.Id))
            .CountAsync(ct);
        return scopedCount == ids.Count;
    }

    public static bool CanAccessBranchEntity(ITenantContext tenants, IBranchContext? branches, IBranchScoped? entity)
    {
        if (entity == null || !TenantAccess.CanAccess(tenants, entity)) return false;
        return branches == null || BranchAccess.CanAccess(branches, entity);
    }

    public static bool CanAccessTenantEntity(ITenantContext tenants, ITenantScoped? entity) =>
        entity != null && TenantAccess.CanAccess(tenants, entity);

    public static Guid ResolveCompanyId(ITenantContext tenants) =>
        tenants.AssignCompanyId ?? TenantContext.DefaultCompanyId;
}
