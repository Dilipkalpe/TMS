using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Tms.Api.Tests.Infrastructure;

namespace Tms.Api.Tests.Integration;

[Collection("Integration")]
public class UserRoleTypesEndpointTests(TmsWebApplicationFactory factory)
{
    readonly HttpClient _client = factory.CreateClient();

    async Task<string> LoginAdminAsync()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new { username = "tenant_user", password = "tenant123" });
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("token").GetString()!;
    }

    [Fact]
    public async Task Admin_can_create_list_and_select_new_role_type()
    {
        var token = await LoginAdminAsync();
        var unique = $"Dispatcher_{Guid.NewGuid():N}"[..20];

        var createReq = new HttpRequestMessage(HttpMethod.Post, "/api/user-role-types")
        {
            Content = JsonContent.Create(new { name = unique, description = "Test role" }),
        };
        createReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var createRes = await _client.SendAsync(createReq);
        createRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var created = await createRes.Content.ReadFromJsonAsync<JsonElement>();
        created.GetProperty("code").GetString().Should().Be(unique);

        var listReq = new HttpRequestMessage(HttpMethod.Get, "/api/user-role-types?activeOnly=true");
        listReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var listRes = await _client.SendAsync(listReq);
        listRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var listJson = await listRes.Content.ReadFromJsonAsync<JsonElement>();
        var codes = listJson.GetProperty("roleTypes").EnumerateArray()
            .Select(x => x.GetProperty("code").GetString())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        codes.Should().Contain(unique);
        codes.Should().Contain("Operator");
        codes.Should().Contain("Admin");

        var matrixReq = new HttpRequestMessage(HttpMethod.Get, "/api/role-menus");
        matrixReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var matrixRes = await _client.SendAsync(matrixReq);
        matrixRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var matrixJson = await matrixRes.Content.ReadFromJsonAsync<JsonElement>();
        matrixJson.GetProperty("matrix").TryGetProperty(unique, out _).Should().BeTrue();
    }

    [Fact]
    public async Task Create_rejects_empty_role_type()
    {
        var token = await LoginAdminAsync();
        var req = new HttpRequestMessage(HttpMethod.Post, "/api/user-role-types")
        {
            Content = JsonContent.Create(new { name = "  " }),
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var res = await _client.SendAsync(req);
        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_rejects_duplicate_case_insensitive()
    {
        var token = await LoginAdminAsync();
        var unique = $"DupRole_{Guid.NewGuid():N}"[..18];

        var first = new HttpRequestMessage(HttpMethod.Post, "/api/user-role-types")
        {
            Content = JsonContent.Create(new { name = unique }),
        };
        first.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        (await _client.SendAsync(first)).StatusCode.Should().Be(HttpStatusCode.OK);

        var second = new HttpRequestMessage(HttpMethod.Post, "/api/user-role-types")
        {
            Content = JsonContent.Create(new { name = unique.ToUpperInvariant() }),
        };
        second.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var res = await _client.SendAsync(second);
        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
