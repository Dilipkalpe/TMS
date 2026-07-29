using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Tms.Api.Tests.Infrastructure;

namespace Tms.Api.Tests.Integration;

[Collection("Integration")]
public class PortalEndpointTests(TmsWebApplicationFactory factory)
{
    readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Portal_shipments_requires_auth()
    {
        var response = await _client.GetAsync("/api/portal/shipments");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Portal_shipments_with_customer_token_returns_paginated()
    {
        var token = PortalTestAuth.CreateCustomerToken(factory, TmsWebApplicationFactory.TestCompanyId, "C-001");
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/portal/shipments?page=1&pageSize=10");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(req);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.TryGetProperty("rows", out _).Should().BeTrue();
        json.TryGetProperty("total", out _).Should().BeTrue();
    }

    [Fact]
    public async Task Portal_invoices_with_customer_token_returns_paginated()
    {
        var token = PortalTestAuth.CreateCustomerToken(factory, TmsWebApplicationFactory.TestCompanyId, "C-001");
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/portal/invoices?page=1&pageSize=10");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(req);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.TryGetProperty("rows", out _).Should().BeTrue();
        json.TryGetProperty("total", out _).Should().BeTrue();
    }

    [Fact]
    public async Task Portal_auth_login_rejects_empty_body()
    {
        var response = await _client.PostAsJsonAsync("/api/portal/auth/login", new { phone = "", pin = "" });
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Portal_auth_track_rejects_empty_body()
    {
        var response = await _client.PostAsJsonAsync("/api/portal/auth/track", new { bookingId = "", phone = "" });
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
