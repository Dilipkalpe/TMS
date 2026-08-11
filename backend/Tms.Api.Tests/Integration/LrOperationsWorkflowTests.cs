using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Tms.Api.Data;
using Tms.Api.Models;
using Tms.Api.Tests.Infrastructure;

namespace Tms.Api.Tests.Integration;

[Collection("Integration")]
public class LrOperationsWorkflowTests(TmsWebApplicationFactory factory)
{
    readonly HttpClient _client = factory.CreateClient();

    async Task<HttpClient> AuthedClientAsync()
    {
        var login = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            username = "admin",
            password = TmsWebApplicationFactory.AdminPassword,
        });
        login.EnsureSuccessStatusCode();
        var token = (await login.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("token").GetString()!;

        var authed = factory.CreateClient();
        authed.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        authed.DefaultRequestHeaders.Add("X-Company-Id", TmsWebApplicationFactory.TestCompanyId.ToString());
        authed.DefaultRequestHeaders.Add("X-Branch-Id", WorkflowTestSeed.TestBranchId.ToString());
        return authed;
    }

    static string Enc(string lr) => lr.Replace('/', '~');

    [Fact]
    public async Task GetProcess_returns_sample_flow_entities_for_in_transit_lr()
    {
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TmsDbContext>();
            WorkflowTestSeed.SeedInTransitLr(db);
        }

        var client = await AuthedClientAsync();
        var lr = WorkflowTestSeed.FlowLrNumber;
        var response = await client.GetAsync($"/api/lr/{Enc(lr)}/process");
        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.Should().Be(HttpStatusCode.OK, because: body);

        var json = JsonDocument.Parse(body).RootElement;
        json.GetProperty("status").GetString().Should().Be(LrStatuses.InTransit);
        json.GetProperty("loadingSheet").GetProperty("sheetNumber").GetString().Should().Be(WorkflowTestSeed.LoadingSheetNo);
        json.GetProperty("transitPass").GetProperty("passNumber").GetString().Should().Be(WorkflowTestSeed.TransitPassNo);
        json.GetProperty("deliverySheet").GetProperty("shipmentStatus").GetString().Should().Be("In Transit");
        json.GetProperty("deliverySheet").GetProperty("dispatchNo").GetString().Should().Be(WorkflowTestSeed.DispatchNo);
    }

    [Fact]
    public async Task AddCheckpoint_appends_to_in_transit_delivery_sheet()
    {
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TmsDbContext>();
            WorkflowTestSeed.SeedInTransitLr(db);
        }

        var client = await AuthedClientAsync();
        var lr = WorkflowTestSeed.FlowLrNumber;
        var response = await client.PostAsJsonAsync($"/api/lr/{Enc(lr)}/checkpoints", new
        {
            location = "Lonavala",
            date = "2026-08-08",
            time = "14:30",
            km = 1250,
            status = "Passed",
            remarks = "On time",
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var sheet = await response.Content.ReadFromJsonAsync<JsonElement>();
        sheet.GetProperty("checkpoints").GetArrayLength().Should().Be(1);
        sheet.GetProperty("checkpoints")[0].GetProperty("location").GetString().Should().Be("Lonavala");
        sheet.GetProperty("extendedData").GetProperty("dispatch").GetProperty("dispatchNo").GetString()
            .Should().Be(WorkflowTestSeed.DispatchNo);
    }

    [Fact]
    public async Task SaveDeliverySheet_completes_delivery_and_preserves_dispatch_metadata()
    {
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TmsDbContext>();
            WorkflowTestSeed.SeedInTransitLr(db);
        }

        var client = await AuthedClientAsync();
        var lr = WorkflowTestSeed.FlowLrNumber;
        var response = await client.PostAsJsonAsync($"/api/lr/{Enc(lr)}/delivery-sheet", new
        {
            shipmentStatus = "Delivered",
            deliveryDate = "2026-08-08",
            deliveryTime = "16:00",
            packagesTotal = 10,
            packagesReceived = 10,
            packagesDamaged = 0,
            receiverName = "Sample Consignee",
            extendedData = new { deliveryOutcome = "Delivered" },
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var sheet = await response.Content.ReadFromJsonAsync<JsonElement>();
        sheet.GetProperty("shipmentStatus").GetString().Should().Be("Delivered");
        sheet.GetProperty("extendedData").GetProperty("dispatch").GetProperty("dispatchNo").GetString()
            .Should().Be(WorkflowTestSeed.DispatchNo);
        sheet.GetProperty("extendedData").GetProperty("deliveryOutcome").GetString().Should().Be("Delivered");

        var processBody = await (await client.GetAsync($"/api/lr/{Enc(lr)}/process")).Content.ReadAsStringAsync();
        var process = JsonDocument.Parse(processBody).RootElement;
        process.GetProperty("status").GetString().Should().Be(LrStatuses.DeliveryCompleted);
    }

    [Fact]
    public async Task VerifyPod_marks_lr_pod_uploaded_after_delivery_complete()
    {
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TmsDbContext>();
            WorkflowTestSeed.SeedDeliveredLr(db);
        }

        var client = await AuthedClientAsync();
        var lr = WorkflowTestSeed.FlowLrNumber;
        var response = await client.PatchAsync($"/api/lr/{Enc(lr)}/pod/verify", null);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var sheet = await response.Content.ReadFromJsonAsync<JsonElement>();
        sheet.GetProperty("shipmentStatus").GetString().Should().Be("POD Received");
        sheet.GetProperty("podVerificationStatus").GetString().Should().Be("Verified");

        var processBody = await (await client.GetAsync($"/api/lr/{Enc(lr)}/process")).Content.ReadAsStringAsync();
        var process = JsonDocument.Parse(processBody).RootElement;
        process.GetProperty("status").GetString().Should().Be(LrStatuses.PodUploaded);
    }

    [Fact]
    public async Task SaveDeliverySheet_rejects_in_transit_downgrade_from_delivered_lr()
    {
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TmsDbContext>();
            WorkflowTestSeed.SeedDeliveredLr(db);
        }

        var client = await AuthedClientAsync();
        var lr = WorkflowTestSeed.FlowLrNumber;
        var response = await client.PostAsJsonAsync($"/api/lr/{Enc(lr)}/delivery-sheet", new
        {
            shipmentStatus = "In Transit",
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
