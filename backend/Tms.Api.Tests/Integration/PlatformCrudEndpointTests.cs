using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Tms.Api.Tests.Infrastructure;

namespace Tms.Api.Tests.Integration;

[Collection("Integration")]
public class PlatformCrudEndpointTests(TmsWebApplicationFactory factory)
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
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("token").GetString()!;
    }

    HttpRequestMessage AuthRequest(HttpMethod method, string url, string token)
    {
        var req = new HttpRequestMessage(method, url);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return req;
    }

    [Fact]
    public async Task Create_then_update_company()
    {
        var token = await LoginAsAdminAsync();
        var createReq = new HttpRequestMessage(HttpMethod.Post, "/api/platform/companies")
        {
            Content = JsonContent.Create(new
            {
                code = "ZZ",
                name = "Test CRUD Co",
                email = "test@crud.com",
                city = "Mumbai",
            }),
        };
        createReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var createRes = await _client.SendAsync(createReq);
        if (createRes.StatusCode != HttpStatusCode.OK)
        {
            var errBody = await createRes.Content.ReadAsStringAsync();
            createRes.StatusCode.Should().Be(HttpStatusCode.OK, $"Create company failed: {errBody}");
        }
        var created = await createRes.Content.ReadFromJsonAsync<JsonElement>();
        var companyId = created.GetProperty("companyId").GetString()!;

        var updateReq = new HttpRequestMessage(HttpMethod.Put, $"/api/platform/companies/{companyId}")
        {
            Content = JsonContent.Create(new { name = "Updated CRUD Co", city = "Delhi" }),
        };
        updateReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var updateRes = await _client.SendAsync(updateReq);
        updateRes.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Toggle_company_status()
    {
        var token = await LoginAsAdminAsync();
        var createReq = new HttpRequestMessage(HttpMethod.Post, "/api/platform/companies")
        {
            Content = JsonContent.Create(new { code = "YY", name = "Toggle Co" }),
        };
        createReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var createRes = await _client.SendAsync(createReq);
        createRes.EnsureSuccessStatusCode();
        var created = await createRes.Content.ReadFromJsonAsync<JsonElement>();
        var companyId = created.GetProperty("companyId").GetString()!;

        var deactivateReq = new HttpRequestMessage(HttpMethod.Patch, $"/api/platform/companies/{companyId}/status")
        {
            Content = JsonContent.Create(new { isActive = false }),
        };
        deactivateReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var deactivateRes = await _client.SendAsync(deactivateReq);
        deactivateRes.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Company_search_filters_results()
    {
        var token = await LoginAsAdminAsync();
        var createReq = new HttpRequestMessage(HttpMethod.Post, "/api/platform/companies")
        {
            Content = JsonContent.Create(new { code = "QQ", name = "Searchable Logistics" }),
        };
        createReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        await _client.SendAsync(createReq);

        var searchReq = AuthRequest(HttpMethod.Get, "/api/platform/companies?search=Searchable", token);
        var res = await _client.SendAsync(searchReq);
        res.StatusCode.Should().Be(HttpStatusCode.OK);

        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        json.TryGetProperty("rows", out var rows).Should().BeTrue();
        rows.GetArrayLength().Should().BeGreaterOrEqualTo(1);
    }

    [Fact]
    public async Task Billing_with_status_filter()
    {
        var token = await LoginAsAdminAsync();
        var req = AuthRequest(HttpMethod.Get, "/api/platform/billing?status=all", token);
        var res = await _client.SendAsync(req);
        res.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Update_nonexistent_company_returns_404()
    {
        var token = await LoginAsAdminAsync();
        var req = new HttpRequestMessage(HttpMethod.Put, $"/api/platform/companies/{Guid.NewGuid()}")
        {
            Content = JsonContent.Create(new { name = "Nonexistent" }),
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var res = await _client.SendAsync(req);
        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
