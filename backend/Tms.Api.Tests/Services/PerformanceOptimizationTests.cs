using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Tms.Api.Data;
using Tms.Api.Models;
using Tms.Api.Services;

namespace Tms.Api.Tests.Services;

public class WarehouseTenantIsolationTests
{
    static readonly Guid CompanyA = Guid.Parse("00000000-0000-4000-8000-000000000001");
    static readonly Guid CompanyB = Guid.Parse("00000000-0000-4000-8000-000000000002");

    static TmsDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<TmsDbContext>()
            .UseInMemoryDatabase($"WarehouseTenant_{Guid.NewGuid():N}")
            .Options;
        var db = new TmsDbContext(options);
        db.Database.EnsureCreated();
        return db;
    }

    [Fact]
    public async Task Tenant_filter_excludes_other_company_warehouses()
    {
        await using var db = CreateDb();
        var whA = Guid.Parse("00000000-0000-4000-8000-0000000000a1");
        var whB = Guid.Parse("00000000-0000-4000-8000-0000000000b1");
        db.Warehouses.AddRange(
            new Warehouse { Id = whA, CompanyId = CompanyA, Name = "WH-A", CreatedAt = DateTime.UtcNow },
            new Warehouse { Id = whB, CompanyId = CompanyB, Name = "WH-B", CreatedAt = DateTime.UtcNow });
        db.WarehouseInventories.AddRange(
            new WarehouseInventory { Id = Guid.NewGuid(), CompanyId = CompanyA, WarehouseId = whA, Sku = "SKU-A", Quantity = 1, WeightKg = 1 },
            new WarehouseInventory { Id = Guid.NewGuid(), CompanyId = CompanyB, WarehouseId = whB, Sku = "SKU-B", Quantity = 2, WeightKg = 2 });
        await db.SaveChangesAsync();

        var tenantA = new FixedTenantContext(CompanyA);
        var rows = await tenantA.Filter(db.Warehouses.AsNoTracking()).Select(w => w.Name).ToListAsync();

        rows.Should().ContainSingle().Which.Should().Be("WH-A");
    }
}

public class AccountingRegisterJobServiceTests
{
    static readonly Guid CompanyId = Guid.Parse("00000000-0000-4000-8000-000000000099");

    static (TmsDbContext Db, AccountingRegisterJobService Service) Create()
    {
        var options = new DbContextOptionsBuilder<TmsDbContext>()
            .UseInMemoryDatabase($"AcctRegister_{Guid.NewGuid():N}")
            .Options;
        var db = new TmsDbContext(options);
        db.Database.EnsureCreated();
        var cache = new MemoryCache(new MemoryCacheOptions());
        var config = new ConfigurationBuilder().AddInMemoryCollection().Build();
        var accountingRead = new AccountingReadService(config, NullLogger<AccountingReadService>.Instance);
        var service = new AccountingRegisterJobService(
            db,
            new FixedTenantContext(CompanyId),
            cache,
            new FixedScopeFactory(db, accountingRead),
            accountingRead,
            NullLogger<AccountingRegisterJobService>.Instance);
        return (db, service);
    }

    sealed class FixedScopeFactory(TmsDbContext db, AccountingReadService accountingRead) : IServiceScopeFactory
    {
        public IServiceScope CreateScope() => new FixedScope(db, accountingRead);
    }

    sealed class FixedScope(TmsDbContext db, AccountingReadService accountingRead) : IServiceScope
    {
        public IServiceProvider ServiceProvider { get; } = new FixedProvider(db, accountingRead);
        public void Dispose() { }
    }

    sealed class FixedProvider(TmsDbContext db, AccountingReadService accountingRead) : IServiceProvider
    {
        public object? GetService(Type serviceType)
        {
            if (serviceType == typeof(TmsDbContext)) return db;
            if (serviceType == typeof(AccountingReadService)) return accountingRead;
            return null;
        }
    }

    [Fact]
    public async Task GetRegisterAsync_returns_journal_vouchers_for_tenant()
    {
        var (db, service) = Create();
        db.Vouchers.Add(new Voucher
        {
            Id = Guid.NewGuid(),
            CompanyId = CompanyId,
            VoucherNo = "JRN-001",
            VoucherDate = DateOnly.FromDateTime(DateTime.UtcNow),
            VoucherType = "Journal",
            TotalAmount = 1000,
            CreatedAt = DateTime.UtcNow,
        });
        db.Vouchers.Add(new Voucher
        {
            Id = Guid.NewGuid(),
            CompanyId = Guid.Parse("00000000-0000-4000-8000-000000000088"),
            VoucherNo = "JRN-OTHER",
            VoucherDate = DateOnly.FromDateTime(DateTime.UtcNow),
            VoucherType = "Journal",
            TotalAmount = 5000,
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        var result = await service.GetRegisterAsync("journal");
        var list = result as System.Collections.IList;
        list.Should().NotBeNull();
        list!.Count.Should().Be(1);
    }

    [Fact]
    public async Task ProcessPendingAsync_completes_job_and_caches_result()
    {
        var (db, service) = Create();
        db.Vouchers.Add(new Voucher
        {
            Id = Guid.NewGuid(),
            CompanyId = CompanyId,
            VoucherNo = "RCP-001",
            VoucherDate = DateOnly.FromDateTime(DateTime.UtcNow),
            VoucherType = "Receipt",
            PartyName = "Customer A",
            TotalAmount = 2500,
            CreatedAt = DateTime.UtcNow,
        });
        db.AccountingReportJobs.Add(new AccountingReportJob
        {
            Id = Guid.NewGuid(),
            CompanyId = CompanyId,
            ReportType = "receipt",
            Status = "Pending",
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        await service.ProcessPendingAsync();

        var job = db.AccountingReportJobs.Single();
        job.Status.Should().Be("Completed");
        job.ResultJson.Should().NotBeNullOrWhiteSpace();
    }
}

public class TenantCacheServiceTests
{
    [Fact]
    public void DashboardKey_includes_section_company_and_branch()
    {
        var companyId = Guid.Parse("00000000-0000-4000-8000-000000000001");
        var branchId = Guid.Parse("00000000-0000-4000-8000-000000000002");

        TenantCacheService.DashboardKey("chart:monthly-revenue", companyId, branchId)
            .Should().Be($"dashboard:chart:monthly-revenue:{companyId}:{branchId}");
        TenantCacheService.DashboardKey("chart:fleet-gauge", companyId, null)
            .Should().Be("dashboard:chart:fleet-gauge:00000000-0000-4000-8000-000000000001:all");
    }
}
