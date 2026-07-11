using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Moq;
using Tms.Api.Data;
using Tms.Api.Models;
using Tms.Api.Services;
using Tms.Api.Tests.Infrastructure;

namespace Tms.Api.Tests.Services;

public class TenantScopeQueryTests
{
    [Fact]
    public async Task TenantScope_Vehicles_and_SpareParts_respect_company()
    {
        var options = new DbContextOptionsBuilder<TmsDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var db = new TmsDbContext(options);
        db.Database.EnsureCreated();

        db.Vehicles.AddRange(
            new Vehicle { Id = "V1", CompanyId = TmsWebApplicationFactory.TestCompanyId, Number = "MH01", Type = "Truck", Status = "Active", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Vehicle { Id = "V2", CompanyId = Guid.NewGuid(), Number = "DL02", Type = "Truck", Status = "Active", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        db.SpareParts.AddRange(
            new SparePart { Id = Guid.NewGuid(), CompanyId = TmsWebApplicationFactory.TestCompanyId, Sku = "A", Name = "Part A", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new SparePart { Id = Guid.NewGuid(), CompanyId = Guid.NewGuid(), Sku = "B", Name = "Part B", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();

        var tenant = new FixedTenantContext(TmsWebApplicationFactory.TestCompanyId);

        (await TenantScope.Vehicles(db, tenant).CountAsync()).Should().Be(1);
        (await tenant.Filter(db.SpareParts.AsQueryable()).CountAsync()).Should().Be(1);
    }
}

public class TenantScopeMiddlewareTests
{
    static async Task<int> InvokeAsync(string path, bool isPlatformAdmin, Guid? companyId)
    {
        var called = false;
        var middleware = new TenantScopeMiddleware(_ =>
        {
            called = true;
            return Task.CompletedTask;
        });

        var context = new DefaultHttpContext();
        context.Request.Path = path;
        context.Response.Body = new MemoryStream();
        context.User = new System.Security.Claims.ClaimsPrincipal(
            new System.Security.Claims.ClaimsIdentity([new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Role, "Super Admin")], "test"));

        var tenants = new Mock<ITenantContext>();
        tenants.Setup(t => t.IsPlatformAdmin).Returns(isPlatformAdmin);
        tenants.Setup(t => t.EffectiveCompanyId).Returns(companyId);

        await middleware.InvokeAsync(context, tenants.Object);
        return called ? 0 : context.Response.StatusCode;
    }

    [Fact]
    public async Task Blocks_platform_admin_without_company_on_tenant_api()
    {
        var status = await InvokeAsync("/api/maintenance/overview", true, null);
        status.Should().Be(StatusCodes.Status403Forbidden);
    }

    [Fact]
    public async Task Allows_platform_admin_with_company_header_context()
    {
        var status = await InvokeAsync("/api/maintenance/overview", true, TmsWebApplicationFactory.TestCompanyId);
        status.Should().Be(0);
    }

    [Fact]
    public async Task Allows_auth_and_health_without_company()
    {
        (await InvokeAsync("/api/auth/login", true, null)).Should().Be(0);
        (await InvokeAsync("/api/health", true, null)).Should().Be(0);
    }
}
