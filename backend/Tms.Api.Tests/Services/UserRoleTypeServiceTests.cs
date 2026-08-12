using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Services;

namespace Tms.Api.Tests.Services;

public class UserRoleTypeServiceTests
{
    static readonly Guid CompanyId = Guid.Parse("00000000-0000-4000-8000-000000000055");

    static TmsDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<TmsDbContext>()
            .UseInMemoryDatabase($"UserRoleTypes_{Guid.NewGuid():N}")
            .Options;
        var db = new TmsDbContext(options);
        db.Database.EnsureCreated();
        return db;
    }

    [Fact]
    public async Task Create_succeeds_and_appears_in_list()
    {
        await using var db = CreateDb();
        var svc = new UserRoleTypeService(db);

        var created = await svc.CreateAsync(CompanyId, "Dispatcher", "Dispatch desk");
        created.Should().NotBeNull();

        var names = await svc.ListNamesAsync(CompanyId);
        names.Should().Contain("Dispatcher");
        names.Should().Contain(TenantRoles.Operator);
        names.Should().Contain(TenantRoles.CompanyAdmin);

        (await svc.ExistsAsync(CompanyId, "Dispatcher")).Should().BeTrue();
    }

    [Fact]
    public async Task Create_rejects_empty_name()
    {
        await using var db = CreateDb();
        var svc = new UserRoleTypeService(db);

        var act = () => svc.CreateAsync(CompanyId, "   ", null);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*required*");
    }

    [Fact]
    public async Task Create_rejects_duplicate_case_insensitive()
    {
        await using var db = CreateDb();
        var svc = new UserRoleTypeService(db);

        await svc.CreateAsync(CompanyId, "Dispatcher", null);

        var act = () => svc.CreateAsync(CompanyId, "dispatcher", null);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*already exists*");
    }

    [Fact]
    public async Task Create_rejects_duplicate_of_system_role()
    {
        await using var db = CreateDb();
        var svc = new UserRoleTypeService(db);
        await svc.EnsureSystemRolesAsync(CompanyId);

        var act = () => svc.CreateAsync(CompanyId, "operator", null);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*already exists*");
    }

    [Fact]
    public async Task List_includes_newly_added_role_for_selection()
    {
        await using var db = CreateDb();
        var svc = new UserRoleTypeService(db);

        await svc.CreateAsync(CompanyId, "Yard Supervisor", "Yard ops");
        var names = await svc.ListNamesAsync(CompanyId);
        names.Should().Contain("Yard Supervisor");
        (await svc.ExistsAsync(CompanyId, "yard supervisor")).Should().BeTrue();
    }
}
