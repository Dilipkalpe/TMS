using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Tms.Api.Data;
using Tms.Api.Models;
using Tms.Api.Services;

namespace Tms.Api.Tests.Infrastructure;

public class TmsWebApplicationFactory : WebApplicationFactory<Program>
{
    public static readonly Guid TestCompanyId = Guid.Parse("00000000-0000-4000-8000-000000000099");
    public const string AdminPassword = "admin123";

    readonly string _databaseName = $"TmsIntegrationTests_{Guid.NewGuid():N}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureServices(services =>
        {
            var descriptors = services
                .Where(d => d.ServiceType == typeof(DbContextOptions<TmsDbContext>)
                    || d.ServiceType == typeof(TmsDbContext))
                .ToList();
            foreach (var d in descriptors)
                services.Remove(d);

            services.AddDbContext<TmsDbContext>(opt =>
                opt.UseInMemoryDatabase(_databaseName));
        });
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        var host = base.CreateHost(builder);
        using var scope = host.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TmsDbContext>();
        db.Database.EnsureCreated();
        SeedTestData(db);
        return host;
    }

    static void SeedTestData(TmsDbContext db)
    {
        db.Users.Add(new User
        {
            Id = Guid.Parse("00000000-0000-4000-8000-000000000010"),
            Username = "admin",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(AdminPassword),
            FullName = "Test Admin",
            Role = TenantRoles.SuperAdmin,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        });

        db.Users.Add(new User
        {
            Id = Guid.Parse("00000000-0000-4000-8000-000000000011"),
            Username = "tenant_user",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("tenant123"),
            FullName = "Tenant User",
            Role = TenantRoles.CompanyAdmin,
            CompanyId = TestCompanyId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        });

        db.Vendors.AddRange(
            new Vendor { Id = "V-T1", CompanyId = TestCompanyId, Name = "Vendor A", Category = "Fuel", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Vendor { Id = "V-T2", CompanyId = Guid.Parse("00000000-0000-4000-8000-000000000088"), Name = "Other Co Vendor", Category = "Parts", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });

        db.SpareParts.Add(new SparePart
        {
            Id = Guid.Parse("00000000-0000-4000-8000-000000000020"),
            CompanyId = TestCompanyId,
            Sku = "OIL-001",
            Name = "Engine Oil",
            UnitCost = 500,
            StockQty = 10,
            MinStock = 5,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });

        db.Vehicles.Add(new Vehicle
        {
            Id = "VH-TEST",
            CompanyId = TestCompanyId,
            Number = "MH12AB1234",
            Type = "Truck",
            Status = "Active",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });

        db.SaveChanges();
    }
}
