using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;
using Tms.Api.Services;

namespace Tms.Api.Tests.Services;

public class VehicleLedgerReportTests
{
    static readonly Guid CompanyId = Guid.Parse("00000000-0000-4000-8000-000000000099");

    static TmsDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<TmsDbContext>()
            .UseInMemoryDatabase($"VehicleLedger_{Guid.NewGuid():N}")
            .Options;
        var db = new TmsDbContext(options);
        db.Database.EnsureCreated();
        return db;
    }

    static ITenantContext Tenant() => new FixedTenantContext(CompanyId);

    [Fact]
    public async Task BuildVehicleLedgerAsync_aggregates_in_batch_not_per_vehicle()
    {
        await using var db = CreateDb();
        db.Vehicles.AddRange(
            new Vehicle { Id = "V1", CompanyId = CompanyId, Number = "MH01AA1111", Type = "Truck", Status = "Active", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Vehicle { Id = "V2", CompanyId = CompanyId, Number = "MH01BB2222", Type = "Truck", Status = "Active", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        db.Bookings.AddRange(
            new Booking { Id = "BK-1", CompanyId = CompanyId, CustomerName = "A", FromCity = "Pune", ToCity = "Mumbai", VehicleNumber = "MH01AA1111", VehicleId = "V1", Freight = 10000, BookingDate = DateOnly.FromDateTime(DateTime.UtcNow), Status = "Delivered", Payment = "Paid", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Booking { Id = "BK-2", CompanyId = CompanyId, CustomerName = "B", FromCity = "Nashik", ToCity = "Pune", VehicleNumber = "MH01BB2222", VehicleId = "V2", Freight = 8000, BookingDate = DateOnly.FromDateTime(DateTime.UtcNow), Status = "Delivered", Payment = "Paid", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        db.Expenses.AddRange(
            new Expense { Id = "EX-1", CompanyId = CompanyId, Category = "Fuel", VehicleNumber = "MH01AA1111", VehicleId = "V1", Amount = 1500, ExpenseDate = DateOnly.FromDateTime(DateTime.UtcNow), Status = "Approved", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Expense { Id = "EX-2", CompanyId = CompanyId, Category = "Maintenance", VehicleNumber = "MH01BB2222", VehicleId = "V2", Amount = 500, ExpenseDate = DateOnly.FromDateTime(DateTime.UtcNow), Status = "Approved", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        db.BookingExpenses.Add(new BookingExpense
        {
            Id = Guid.NewGuid(),
            CompanyId = CompanyId,
            BookingId = "BK-1",
            Category = "Toll",
            Amount = 300,
            ExpenseDate = DateOnly.FromDateTime(DateTime.UtcNow),
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        var rows = await AccountingReportService.BuildVehicleLedgerAsync(db, Tenant());

        rows.Should().HaveCount(2);
        var v1 = rows.Cast<dynamic>().First(r => (string)r.GetType().GetProperty("vehicle")!.GetValue(r)! == "MH01AA1111");
        ((decimal)v1.GetType().GetProperty("fuel")!.GetValue(v1)!).Should().Be(1500);
        ((decimal)v1.GetType().GetProperty("bookingExpenses")!.GetValue(v1)!).Should().Be(300);
        ((decimal)v1.GetType().GetProperty("tripIncome")!.GetValue(v1)!).Should().Be(10000);
        ((decimal)v1.GetType().GetProperty("netProfit")!.GetValue(v1)!).Should().Be(8200);
    }

    [Fact]
    public async Task BuildVehicleLedgerAsync_skips_vehicles_with_no_activity()
    {
        await using var db = CreateDb();
        db.Vehicles.Add(new Vehicle { Id = "V1", CompanyId = CompanyId, Number = "MH01AA1111", Type = "Truck", Status = "Active", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        db.Vehicles.Add(new Vehicle { Id = "V2", CompanyId = CompanyId, Number = "MH01BB2222", Type = "Truck", Status = "Idle", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        db.Bookings.Add(new Booking { Id = "BK-1", CompanyId = CompanyId, CustomerName = "A", FromCity = "Pune", ToCity = "Mumbai", VehicleNumber = "MH01AA1111", VehicleId = "V1", Freight = 5000, BookingDate = DateOnly.FromDateTime(DateTime.UtcNow), Status = "Delivered", Payment = "Paid", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();

        var rows = await AccountingReportService.BuildVehicleLedgerAsync(db, Tenant());

        rows.Should().HaveCount(1);
        ((string)rows[0].GetType().GetProperty("vehicle")!.GetValue(rows[0])!).Should().Be("MH01AA1111");
    }
}
