using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Tms.Api.Tests.Infrastructure;

namespace Tms.Api.Tests.Integration;

[CollectionDefinition("Integration")]
public sealed class IntegrationTestCollection : ICollectionFixture<TmsWebApplicationFactory>;

[Collection("Integration")]
public class HealthEndpointTests(TmsWebApplicationFactory factory)
{
    readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Health_returns_ok_with_in_memory_database()
    {
        var response = await _client.GetAsync("/api/health");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.GetProperty("status").GetString().Should().Be("healthy");
        json.GetProperty("service").GetString().Should().Be("TMS Pro API");
    }
}

[Collection("Integration")]
public class AuthEndpointTests(TmsWebApplicationFactory factory)
{
    readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Login_rejects_invalid_credentials()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new { username = "admin", password = "wrong" });
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Login_returns_token_for_valid_admin()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            username = "admin",
            password = TmsWebApplicationFactory.AdminPassword,
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.GetProperty("token").GetString().Should().NotBeNullOrWhiteSpace();
    }
}

[Collection("Integration")]
public class TenantApiIsolationTests(TmsWebApplicationFactory factory)
{
    readonly HttpClient _client = factory.CreateClient();

    async Task<string> LoginAsAdminAsync()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            username = "admin",
            password = TmsWebApplicationFactory.AdminPassword,
        });
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("token").GetString()!;
    }

    [Fact]
    public async Task Platform_admin_without_company_gets_403_on_maintenance()
    {
        var token = await LoginAsAdminAsync();
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/maintenance/spare-parts");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Platform_admin_with_company_header_can_load_maintenance_spare_parts()
    {
        var token = await LoginAsAdminAsync();
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/maintenance/spare-parts");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Headers.Add("X-Company-Id", TmsWebApplicationFactory.TestCompanyId.ToString());

        var response = await _client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var parts = await response.Content.ReadFromJsonAsync<JsonElement>();
        parts.ValueKind.Should().Be(JsonValueKind.Array);
        parts.GetArrayLength().Should().Be(1);
        parts[0].GetProperty("sku").GetString().Should().Be("OIL-001");
    }

    [Fact]
    public async Task Tenant_user_sees_only_own_company_vendors()
    {
        var login = await _client.PostAsJsonAsync("/api/auth/login", new { username = "tenant_user", password = "tenant123" });
        login.EnsureSuccessStatusCode();
        var token = (await login.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("token").GetString()!;

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/vendors");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var vendors = await response.Content.ReadFromJsonAsync<JsonElement>();
        vendors.GetProperty("items").GetArrayLength().Should().Be(1);
        vendors.GetProperty("items")[0].GetProperty("name").GetString().Should().Be("Vendor A");
    }
}
