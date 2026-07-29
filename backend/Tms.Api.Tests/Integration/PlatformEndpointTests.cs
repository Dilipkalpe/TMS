using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Tms.Api.Tests.Infrastructure;

namespace Tms.Api.Tests.Integration;

[Collection("Integration")]
public class PlatformEndpointTests(TmsWebApplicationFactory factory)
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

    HttpRequestMessage AuthRequest(HttpMethod method, string url, string token)
    {
        var req = new HttpRequestMessage(method, url);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return req;
    }

    [Fact]
    public async Task Platform_companies_requires_auth()
    {
        var response = await _client.GetAsync("/api/platform/companies");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Platform_companies_returns_paginated_result()
    {
        var token = await LoginAsAdminAsync();
        var req = AuthRequest(HttpMethod.Get, "/api/platform/companies?page=1&pageSize=10", token);
        var response = await _client.SendAsync(req);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.TryGetProperty("rows", out _).Should().BeTrue();
        json.TryGetProperty("total", out _).Should().BeTrue();
        json.TryGetProperty("page", out _).Should().BeTrue();
    }

    [Fact]
    public async Task Platform_plans_returns_list()
    {
        var token = await LoginAsAdminAsync();
        var req = AuthRequest(HttpMethod.Get, "/api/platform/plans", token);
        var response = await _client.SendAsync(req);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task Platform_billing_returns_list()
    {
        var token = await LoginAsAdminAsync();
        var req = AuthRequest(HttpMethod.Get, "/api/platform/billing", token);
        var response = await _client.SendAsync(req);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Tenant_user_cannot_access_platform()
    {
        var login = await _client.PostAsJsonAsync("/api/auth/login", new { username = "tenant_user", password = "tenant123" });
        var token = (await login.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("token").GetString()!;

        var req = AuthRequest(HttpMethod.Get, "/api/platform/companies", token);
        var response = await _client.SendAsync(req);
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}
