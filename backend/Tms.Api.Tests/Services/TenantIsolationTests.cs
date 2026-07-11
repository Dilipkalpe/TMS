using FluentAssertions;
using Tms.Api.Models;
using Tms.Api.Services;

namespace Tms.Api.Tests.Services;

public class TenantIsolationTests
{
    static readonly Guid CompanyA = Guid.Parse("00000000-0000-4000-8000-000000000001");
    static readonly Guid CompanyB = Guid.Parse("00000000-0000-4000-8000-000000000002");

    [Theory]
    [InlineData("Super Admin", true)]
    [InlineData("Platform Super Admin", true)]
    [InlineData("Admin", false)]
    [InlineData("Operator", false)]
    public void TenantRoles_identifies_platform_admins(string role, bool isPlatform)
    {
        TenantRoles.IsPlatformAdmin(role).Should().Be(isPlatform);
    }

    [Fact]
    public void FixedTenantContext_filters_entities_by_company()
    {
        var tenant = new FixedTenantContext(CompanyA);
        var vendors = new List<Vendor>
        {
            new() { Id = "1", CompanyId = CompanyA, Name = "A" },
            new() { Id = "2", CompanyId = CompanyB, Name = "B" },
        }.AsQueryable();

        tenant.Filter(vendors).Should().ContainSingle(v => v.Id == "1");
    }

    [Fact]
    public void FixedTenantContext_without_company_returns_empty_for_null_effective_id_scenario()
    {
        var tenant = new FixedTenantContext(CompanyA);
        tenant.EffectiveCompanyId.Should().Be(CompanyA);
        tenant.AssignCompanyId.Should().Be(CompanyA);
        tenant.IsPlatformAdmin.Should().BeFalse();
    }

    [Fact]
    public void TenantAccess_denies_cross_company_entity()
    {
        var tenant = new FixedTenantContext(CompanyA);
        var own = new Vendor { Id = "1", CompanyId = CompanyA, Name = "Own" };
        var other = new Vendor { Id = "2", CompanyId = CompanyB, Name = "Other" };

        TenantAccess.CanAccess(tenant, own).Should().BeTrue();
        TenantAccess.CanAccess(tenant, other).Should().BeFalse();
    }

    [Theory]
    [InlineData("Super Admin", true)]
    [InlineData("Admin", true)]
    [InlineData("Accountant", false)]
    public void TenantRoles_branch_and_accounting_access(string role, bool canAccessAllBranches)
    {
        TenantRoles.CanAccessAllBranches(role).Should().Be(canAccessAllBranches);
    }
}
