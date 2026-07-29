using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Tms.Api.Tests.Infrastructure;

namespace Tms.Api.Tests.Integration;

[Collection("Integration")]
public class NotificationEndpointTests(TmsWebApplicationFactory factory)
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

    [Fact]
    public async Task Notifications_list_requires_auth()
    {
        var response = await _client.GetAsync("/api/notifications");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Notifications_templates_returns_list()
    {
        var token = await LoginAsAdminAsync();
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/notifications/templates");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        req.Headers.Add("X-Company-Id", TmsWebApplicationFactory.TestCompanyId.ToString());

        var response = await _client.SendAsync(req);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task Notifications_preferences_returns_list()
    {
        var token = await LoginAsAdminAsync();
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/notifications/preferences");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        req.Headers.Add("X-Company-Id", TmsWebApplicationFactory.TestCompanyId.ToString());

        var response = await _client.SendAsync(req);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task Notifications_channel_settings_returns_ok()
    {
        var token = await LoginAsAdminAsync();
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/notifications/channel-settings");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        req.Headers.Add("X-Company-Id", TmsWebApplicationFactory.TestCompanyId.ToString());

        var response = await _client.SendAsync(req);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
