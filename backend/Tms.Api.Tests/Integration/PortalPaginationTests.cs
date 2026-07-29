using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Tms.Api.Tests.Infrastructure;

namespace Tms.Api.Tests.Integration;

[Collection("Integration")]
public class PortalPaginationTests(TmsWebApplicationFactory factory)
{
    readonly HttpClient _client = factory.CreateClient();

    HttpRequestMessage PortalAuthRequest(string url)
    {
        var token = PortalTestAuth.CreateCustomerToken(factory, TmsWebApplicationFactory.TestCompanyId, "C-001");
        var req = new HttpRequestMessage(HttpMethod.Get, url);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return req;
    }

    [Theory]
    [InlineData("/api/portal/shipments?page=1&pageSize=5")]
    [InlineData("/api/portal/shipments?page=1&pageSize=10&search=mumbai")]
    [InlineData("/api/portal/shipments?page=1&pageSize=10&status=Delivered")]
    [InlineData("/api/portal/shipments?page=1&pageSize=10&sort=date_asc")]
    public async Task Shipments_with_query_params_returns_paginated(string url)
    {
        var req = PortalAuthRequest(url);
        var response = await _client.SendAsync(req);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.TryGetProperty("rows", out _).Should().BeTrue();
        json.TryGetProperty("total", out _).Should().BeTrue();
        json.TryGetProperty("page", out _).Should().BeTrue();
        json.TryGetProperty("pageSize", out _).Should().BeTrue();
    }

    [Theory]
    [InlineData("/api/portal/invoices?page=1&pageSize=5")]
    [InlineData("/api/portal/invoices?page=1&pageSize=10&search=INV")]
    [InlineData("/api/portal/invoices?page=1&pageSize=10&status=Paid")]
    public async Task Invoices_with_query_params_returns_paginated(string url)
    {
        var req = PortalAuthRequest(url);
        var response = await _client.SendAsync(req);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.TryGetProperty("rows", out _).Should().BeTrue();
        json.TryGetProperty("total", out _).Should().BeTrue();
    }

    [Fact]
    public async Task Shipments_page_size_clamped_to_max_100()
    {
        var req = PortalAuthRequest("/api/portal/shipments?page=1&pageSize=500");
        var response = await _client.SendAsync(req);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.GetProperty("pageSize").GetInt32().Should().BeLessOrEqualTo(100);
    }
}
