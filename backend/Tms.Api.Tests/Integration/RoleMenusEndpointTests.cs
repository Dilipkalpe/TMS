using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Tms.Api.Data;
using Tms.Api.Models;
using Tms.Api.Services;
using Tms.Api.Tests.Infrastructure;

namespace Tms.Api.Tests.Integration;

[Collection("Integration")]
public class RoleMenusEndpointTests(TmsWebApplicationFactory factory)
{
    readonly HttpClient _client = factory.CreateClient();

    async Task<(string Token, JsonElement Body)> LoginAsync(string username, string password)
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new { username, password });
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        return (json.GetProperty("token").GetString()!, json);
    }

    [Fact]
    public async Task Admin_can_load_and_save_matrix_hiding_expenses_for_operator()
    {
        var (adminToken, _) = await LoginAsync("tenant_user", "tenant123");

        var getReq = new HttpRequestMessage(HttpMethod.Get, "/api/role-menus");
        getReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var getRes = await _client.SendAsync(getReq);
        getRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var matrixJson = await getRes.Content.ReadFromJsonAsync<JsonElement>();
        matrixJson.GetProperty("matrix").TryGetProperty("Operator", out _).Should().BeTrue();

        // Operator defaults include Expenses — hide expense hub cards to prove persistence overrides defaults
        var operatorItems = matrixJson.GetProperty("matrix").GetProperty("Operator").EnumerateArray()
            .Select(i =>
            {
                var key = i.GetProperty("menuKey").GetString()!;
                var group = i.TryGetProperty("group", out var g) ? g.GetString() : null;
                var hideExpenses = string.Equals(group, "Expenses hub", StringComparison.OrdinalIgnoreCase)
                    || key.Equals("/expenses", StringComparison.OrdinalIgnoreCase);
                return new
                {
                    menuKey = key,
                    isVisible = hideExpenses ? false : i.GetProperty("isVisible").GetBoolean(),
                };
            })
            .ToList();

        var putReq = new HttpRequestMessage(HttpMethod.Put, "/api/role-menus")
        {
            Content = JsonContent.Create(new { role = "Operator", items = operatorItems }),
        };
        putReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var putRes = await _client.SendAsync(putReq);
        putRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // Seed operator user in the same test DB
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TmsDbContext>();
            if (!db.Users.Any(u => u.Username == "op_menu"))
            {
                db.Users.Add(new User
                {
                    Id = Guid.Parse("00000000-0000-4000-8000-000000000041"),
                    Username = "op_menu",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("op123"),
                    FullName = "Menu Operator",
                    Role = TenantRoles.Operator,
                    CompanyId = TmsWebApplicationFactory.TestCompanyId,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                });
                db.SaveChanges();
            }
        }

        var (_, opLogin) = await LoginAsync("op_menu", "op123");
        opLogin.TryGetProperty("menuKeys", out var menuKeys).Should().BeTrue();
        menuKeys.ValueKind.Should().Be(JsonValueKind.Array);
        var keys = menuKeys.EnumerateArray().Select(x => x.GetString()!).ToHashSet(StringComparer.OrdinalIgnoreCase);
        keys.Should().Contain("/");
        keys.Should().Contain("/shipment-management");
        keys.Should().NotContain("/expenses");
        keys.Should().NotContain("/reports");
        keys.Should().NotContain("/accounting");
    }

    [Fact]
    public async Task Non_admin_cannot_manage_role_menus()
    {
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TmsDbContext>();
            if (!db.Users.Any(u => u.Username == "acct_menu"))
            {
                db.Users.Add(new User
                {
                    Id = Guid.Parse("00000000-0000-4000-8000-000000000042"),
                    Username = "acct_menu",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("acct123"),
                    FullName = "Menu Accountant",
                    Role = TenantRoles.Accountant,
                    CompanyId = TmsWebApplicationFactory.TestCompanyId,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                });
                db.SaveChanges();
            }
        }

        var (token, login) = await LoginAsync("acct_menu", "acct123");
        login.TryGetProperty("menuKeys", out var menuKeys).Should().BeTrue();
        var keys = menuKeys.EnumerateArray().Select(x => x.GetString()!).ToHashSet(StringComparer.OrdinalIgnoreCase);
        keys.Should().Contain("/accounting");
        keys.Should().Contain("/accounting/outstanding");

        var getReq = new HttpRequestMessage(HttpMethod.Get, "/api/role-menus");
        getReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var getRes = await _client.SendAsync(getReq);
        getRes.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}
