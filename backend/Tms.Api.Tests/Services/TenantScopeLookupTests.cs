using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;
using Tms.Api.Services;

namespace Tms.Api.Tests.Services;

public class TenantScopeLookupTests
{
    static readonly Guid CompanyA = Guid.Parse("00000000-0000-4000-8000-000000000001");
    static readonly Guid CompanyB = Guid.Parse("00000000-0000-4000-8000-000000000002");

    static TmsDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<TmsDbContext>()
            .UseInMemoryDatabase($"TenantScopeLookup_{Guid.NewGuid():N}")
            .Options;
        var db = new TmsDbContext(options);
        db.Database.EnsureCreated();
        return db;
    }

    [Fact]
    public async Task FindVehicleByRefAsync_returns_own_company_vehicle()
    {
        await using var db = CreateDb();
        db.Vehicles.AddRange(
            new Vehicle { Id = "V-A", CompanyId = CompanyA, Number = "MH01AA1111", Type = "Truck", Status = "Active", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Vehicle { Id = "V-B", CompanyId = CompanyB, Number = "MH01AA1111", Type = "Truck", Status = "Active", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();

        var result = await TenantScope.FindVehicleByRefAsync(db, new FixedTenantContext(CompanyA), null, "MH01AA1111");
        result!.Id.Should().Be("V-A");
    }

    [Fact]
    public async Task ValidateVehicleIdsAsync_rejects_foreign_vehicle()
    {
        await using var db = CreateDb();
        db.Vehicles.AddRange(
            new Vehicle { Id = "V-A", CompanyId = CompanyA, Number = "MH01AA1111", Type = "Truck", Status = "Active", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Vehicle { Id = "V-B", CompanyId = CompanyB, Number = "MH02BB2222", Type = "Truck", Status = "Active", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();

        (await TenantScope.ValidateVehicleIdsAsync(db, new FixedTenantContext(CompanyA), ["V-A"])).Should().BeTrue();
        (await TenantScope.ValidateVehicleIdsAsync(db, new FixedTenantContext(CompanyA), ["V-B"])).Should().BeFalse();
    }

    [Fact]
    public async Task SyncBrokerOutstandingAsync_scopes_by_company()
    {
        await using var db = CreateDb();
        db.Brokers.AddRange(
            new Broker { Id = "BR-A", CompanyId = CompanyA, Name = "Broker X", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Broker { Id = "BR-B", CompanyId = CompanyB, Name = "Broker X", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        db.BookingBrokerCharges.AddRange(
            new BookingBrokerCharge { Id = Guid.NewGuid(), CompanyId = CompanyA, BookingId = "BK-1", BrokerId = "BR-A", BrokerName = "Broker X", Amount = 100, CreatedAt = DateTime.UtcNow },
            new BookingBrokerCharge { Id = Guid.NewGuid(), CompanyId = CompanyB, BookingId = "BK-2", BrokerId = "BR-B", BrokerName = "Broker X", Amount = 900, CreatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();

        await BookingFinanceService.SyncBrokerOutstandingAsync(db, CompanyA, "Broker X");

        (await db.Brokers.FindAsync("BR-A"))!.Outstanding.Should().Be(100);
        (await db.Brokers.FindAsync("BR-B"))!.Outstanding.Should().Be(0);
    }
}
