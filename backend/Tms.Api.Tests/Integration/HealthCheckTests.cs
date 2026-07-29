using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Tms.Api.Tests.Infrastructure;

namespace Tms.Api.Tests.Integration;

[Collection("Integration")]
public class HealthCheckTests(TmsWebApplicationFactory factory)
{
    readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Health_endpoint_returns_ok_with_notification_status()
    {
        var response = await _client.GetAsync("/api/health");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.GetProperty("status").GetString().Should().Be("healthy");
        json.GetProperty("service").GetString().Should().Contain("TMS");
        json.TryGetProperty("notifications", out var notifications).Should().BeTrue();
        notifications.TryGetProperty("sms", out _).Should().BeTrue();
        notifications.TryGetProperty("email", out _).Should().BeTrue();
    }
}
