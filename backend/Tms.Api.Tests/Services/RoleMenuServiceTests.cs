using FluentAssertions;
using Tms.Api.Services;

namespace Tms.Api.Tests.Services;

public class RoleMenuServiceTests
{
    [Fact]
    public void Admin_defaults_include_all_catalog_and_locked_settings()
    {
        var keys = RoleMenuService.GetDefaultVisibleKeys(TenantRoles.CompanyAdmin);
        keys.Should().BeEquivalentTo(RoleMenuService.AllCatalogKeys);
        foreach (var locked in RoleMenuService.AdminLockedKeys)
            keys.Should().Contain(locked);
    }

    [Fact]
    public void Operator_defaults_hide_accounts_and_reports()
    {
        var keys = RoleMenuService.GetDefaultVisibleKeys(TenantRoles.Operator);
        keys.Should().Contain("/");
        keys.Should().Contain("/shipment-management");
        keys.Should().Contain("/operations");
        keys.Should().NotContain("/accounting");
        keys.Should().NotContain("/reports");
        keys.Should().NotContain("/accounting/outstanding");
    }

    [Fact]
    public void Accountant_defaults_include_finance_hubs()
    {
        var keys = RoleMenuService.GetDefaultVisibleKeys(TenantRoles.Accountant);
        keys.Should().Contain("/");
        keys.Should().Contain("/accounting");
        keys.Should().Contain("/accounting/outstanding");
        keys.Should().Contain("/reports");
        keys.Should().Contain("/settings/general");
        keys.Should().NotContain("/shipment-management");
        keys.Should().NotContain("/settings/users");
    }

    [Fact]
    public void Operator_defaults_include_lr_list()
    {
        var keys = RoleMenuService.GetDefaultVisibleKeys(TenantRoles.Operator);
        keys.Should().Contain("/lr/list");
        keys.Should().Contain("/shipment-management");
    }

    [Fact]
    public void RoleTypeCatalog_lists_four_user_role_types()
    {
        RoleMenuService.RoleTypeCatalog.Should().HaveCount(4);
        RoleMenuService.ManageRoles.Should().BeEquivalentTo(new[]
        {
            TenantRoles.CompanyAdmin,
            TenantRoles.BranchManager,
            TenantRoles.Accountant,
            TenantRoles.Operator,
        });
    }
}
