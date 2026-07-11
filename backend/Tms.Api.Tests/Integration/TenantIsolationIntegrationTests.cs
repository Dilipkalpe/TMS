using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Tms.Api.Data;
using Tms.Api.Models;
using Tms.Api.Services;
using Tms.Api.Tests.Infrastructure;

namespace Tms.Api.Tests.Integration;

[Collection("Integration")]
public class TenantIsolationIntegrationTests(TmsWebApplicationFactory factory)
{
    static readonly Guid CompanyA = Guid.Parse("00000000-0000-4000-8000-000000000001");
    static readonly Guid CompanyB = Guid.Parse("00000000-0000-4000-8000-000000000002");

    readonly HttpClient _client = factory.CreateClient();

    async Task<string> LoginAsTenantUserAsync(Guid companyId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TmsDbContext>();
        var username = companyId == CompanyA ? "tenant_a_user" : "tenant_b_user";
        if (!await db.Users.AnyAsync(u => u.Username == username))
        {
            db.Users.Add(new User
            {
                Id = companyId == CompanyA
                    ? Guid.Parse("00000000-0000-4000-8000-0000000000a1")
                    : Guid.Parse("00000000-0000-4000-8000-0000000000b1"),
                Username = username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("tenant123"),
                FullName = companyId == CompanyA ? "Tenant A User" : "Tenant B User",
                Role = TenantRoles.CompanyAdmin,
                CompanyId = companyId,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
            });
            await db.SaveChangesAsync();
        }

        var response = await _client.PostAsJsonAsync("/api/auth/login", new { username, password = "tenant123" });
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("token").GetString()!;
    }

    static async Task SeedCrossTenantDataAsync(TmsWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TmsDbContext>();

        if (await db.Invoices.AnyAsync(i => i.InvoiceNo == "INV-TENANT-TEST-A")) return;

        db.Invoices.AddRange(
            new Invoice
            {
                Id = Guid.Parse("00000000-0000-4000-8000-000000000011"),
                CompanyId = CompanyA,
                InvoiceNo = "INV-TENANT-TEST-A",
                Amount = 1000,
                TotalAmount = 1000,
                IssuedAt = DateOnly.FromDateTime(DateTime.UtcNow),
                Status = "PENDING",
                CreatedAt = DateTime.UtcNow,
            },
            new Invoice
            {
                Id = Guid.Parse("00000000-0000-4000-8000-000000000012"),
                CompanyId = CompanyB,
                InvoiceNo = "INV-TENANT-TEST-B",
                Amount = 5000,
                TotalAmount = 5000,
                IssuedAt = DateOnly.FromDateTime(DateTime.UtcNow),
                Status = "PENDING",
                CreatedAt = DateTime.UtcNow,
            });

        db.MarketplaceListings.AddRange(
            new MarketplaceListing { Id = Guid.Parse("00000000-0000-4000-8000-000000000021"), CompanyId = CompanyA, Origin = "Pune", Destination = "Mumbai", IsActive = true, CreatedAt = DateTime.UtcNow },
            new MarketplaceListing { Id = Guid.Parse("00000000-0000-4000-8000-000000000022"), CompanyId = CompanyB, Origin = "Delhi", Destination = "Jaipur", IsActive = true, CreatedAt = DateTime.UtcNow });

        db.IotDevices.AddRange(
            new IotDevice { Id = Guid.Parse("00000000-0000-4000-8000-000000000031"), CompanyId = CompanyA, DeviceType = "GPS", DeviceSerial = "IOT-A-001", CreatedAt = DateTime.UtcNow },
            new IotDevice { Id = Guid.Parse("00000000-0000-4000-8000-000000000032"), CompanyId = CompanyB, DeviceType = "GPS", DeviceSerial = "IOT-B-001", CreatedAt = DateTime.UtcNow });

        db.Documents.AddRange(
            new Document { Id = Guid.Parse("00000000-0000-4000-8000-000000000041"), CompanyId = CompanyA, EntityType = "Office", EntityId = "HQ", DocType = "License", Title = "Company A License", ExpiresAt = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(10)), CreatedAt = DateTime.UtcNow },
            new Document { Id = Guid.Parse("00000000-0000-4000-8000-000000000042"), CompanyId = CompanyB, EntityType = "Office", EntityId = "HQ", DocType = "License", Title = "Company B License", ExpiresAt = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(10)), CreatedAt = DateTime.UtcNow });

        db.ForecastSnapshots.AddRange(
            new ForecastSnapshot { Id = Guid.Parse("00000000-0000-4000-8000-000000000051"), CompanyId = CompanyA, ForecastType = "REVENUE", PeriodStart = DateOnly.FromDateTime(DateTime.UtcNow), PeriodEnd = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(1)), PredictedValue = 100000, CreatedAt = DateTime.UtcNow },
            new ForecastSnapshot { Id = Guid.Parse("00000000-0000-4000-8000-000000000052"), CompanyId = CompanyB, ForecastType = "REVENUE", PeriodStart = DateOnly.FromDateTime(DateTime.UtcNow), PeriodEnd = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(1)), PredictedValue = 200000, CreatedAt = DateTime.UtcNow });

        db.Vehicles.Add(new Vehicle { Id = "VH-COMP-B", CompanyId = CompanyB, Number = "MH99ZZ9999", Type = "Truck", Status = "Active", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        db.Vehicles.Add(new Vehicle { Id = "VH-COMP-A", CompanyId = CompanyA, Number = "MH11AA1111", Type = "Truck", Status = "Active", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });

        db.Geofences.Add(new Geofence
        {
            Id = Guid.Parse("00000000-0000-4000-8000-000000000061"),
            CompanyId = CompanyB,
            Name = "Company B Zone",
            ShapeType = "CIRCLE",
            CenterLat = 18.5204m,
            CenterLng = 73.8567m,
            RadiusMeters = 500,
            AlertOnEnter = true,
            AlertOnExit = true,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });

        db.Geofences.Add(new Geofence
        {
            Id = Guid.Parse("00000000-0000-4000-8000-000000000062"),
            CompanyId = CompanyA,
            Name = "Company A Zone",
            ShapeType = "CIRCLE",
            CenterLat = 19.0760m,
            CenterLng = 72.8777m,
            RadiusMeters = 500,
            AlertOnEnter = true,
            AlertOnExit = true,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });

        db.AccountingReportJobs.Add(new AccountingReportJob
        {
            Id = Guid.Parse("00000000-0000-4000-8000-000000000071"),
            CompanyId = CompanyB,
            ReportType = "journal",
            Status = "Completed",
            CreatedAt = DateTime.UtcNow,
            CompletedAt = DateTime.UtcNow,
            ResultJson = "{\"rows\":[]}",
        });

        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task Finance_invoices_only_return_own_company_rows()
    {
        await SeedCrossTenantDataAsync(factory);
        var token = await LoginAsTenantUserAsync(CompanyA);
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/finance/invoices");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var items = json.GetProperty("items").EnumerateArray();
        items.Select(i => i.GetProperty("invoiceNo").GetString())
            .Should().Contain("INV-TENANT-TEST-A").And.NotContain("INV-TENANT-TEST-B");
    }

    [Fact]
    public async Task Marketplace_listings_are_tenant_scoped()
    {
        await SeedCrossTenantDataAsync(factory);
        var token = await LoginAsTenantUserAsync(CompanyA);
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/marketplace/listings");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.EnumerateArray().Should().OnlyContain(i => i.GetProperty("origin").GetString() == "Pune");
    }

    [Fact]
    public async Task Iot_devices_are_tenant_scoped()
    {
        await SeedCrossTenantDataAsync(factory);
        var token = await LoginAsTenantUserAsync(CompanyA);
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/iot/devices");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.EnumerateArray().Select(d => d.GetProperty("deviceSerial").GetString())
            .Should().Contain("IOT-A-001").And.NotContain("IOT-B-001");
    }

    [Fact]
    public async Task Documents_expiring_are_tenant_scoped()
    {
        await SeedCrossTenantDataAsync(factory);
        var token = await LoginAsTenantUserAsync(CompanyA);
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/documents/expiring?days=30");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var docs = json.GetProperty("documents");
        docs.EnumerateArray().Select(d => d.GetProperty("title").GetString())
            .Should().Contain("Company A License").And.NotContain("Company B License");
    }

    [Fact]
    public async Task Ai_forecasts_are_tenant_scoped()
    {
        await SeedCrossTenantDataAsync(factory);
        var token = await LoginAsTenantUserAsync(CompanyA);
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/ai/forecasts");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.EnumerateArray().Should().OnlyContain(f => f.GetProperty("predictedValue").GetDecimal() == 100000);
    }

    [Fact]
    public async Task Booking_create_does_not_link_other_company_vehicle()
    {
        await SeedCrossTenantDataAsync(factory);
        var token = await LoginAsTenantUserAsync(CompanyA);
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/bookings")
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", token) },
            Content = JsonContent.Create(new
            {
                customer = "Test Customer A",
                from = "Pune",
                to = "Mumbai",
                date = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                vehicle = "MH99ZZ9999",
                freight = 10000,
                advance = 0,
                status = "Pending",
                payment = "Unpaid",
            }),
        };

        var response = await _client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var bookingId = json.GetProperty("id").GetString();
        json.GetProperty("vehicle").GetString().Should().Be("MH99ZZ9999");

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TmsDbContext>();
            var booking = await db.Bookings.FindAsync(bookingId);
            booking.Should().NotBeNull();
            booking!.VehicleId.Should().BeNull("cross-tenant vehicle must not be linked by id");
        }
    }

    [Fact]
    public async Task Marketplace_bid_rejects_other_company_listing()
    {
        await SeedCrossTenantDataAsync(factory);
        var token = await LoginAsTenantUserAsync(CompanyA);
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/marketplace/listings/00000000-0000-4000-8000-000000000022/bid")
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", token) },
            Content = JsonContent.Create(new { bidderName = "Hacker", amount = 1 }),
        };

        var response = await _client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Geofence_list_excludes_other_company_zones()
    {
        await SeedCrossTenantDataAsync(factory);
        var token = await LoginAsTenantUserAsync(CompanyA);
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/geofences");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.EnumerateArray().Select(g => g.GetProperty("name").GetString())
            .Should().Contain("Company A Zone").And.NotContain("Company B Zone");
    }

    [Fact]
    public async Task Geofence_get_other_company_returns_not_found()
    {
        await SeedCrossTenantDataAsync(factory);
        var token = await LoginAsTenantUserAsync(CompanyA);
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/geofences/00000000-0000-4000-8000-000000000061");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Geofence_assignment_rejects_cross_company_vehicle()
    {
        await SeedCrossTenantDataAsync(factory);
        var token = await LoginAsTenantUserAsync(CompanyA);
        var request = new HttpRequestMessage(HttpMethod.Put, "/api/geofences/00000000-0000-4000-8000-000000000062/assignments")
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", token) },
            Content = JsonContent.Create(new { appliesToAll = false, vehicleIds = new[] { "VH-COMP-B" } }),
        };

        var response = await _client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Portal_invoices_only_return_own_company_rows()
    {
        await SeedCrossTenantDataAsync(factory);
        var token = PortalTestAuth.CreateCustomerToken(factory, CompanyA);
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/portal/invoices");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.EnumerateArray().Select(i => i.GetProperty("invoiceNo").GetString())
            .Should().Contain("INV-TENANT-TEST-A").And.NotContain("INV-TENANT-TEST-B");
    }

    [Fact]
    public async Task Portal_invoice_detail_other_company_returns_not_found()
    {
        await SeedCrossTenantDataAsync(factory);
        var token = PortalTestAuth.CreateCustomerToken(factory, CompanyA);
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/portal/invoices/00000000-0000-4000-8000-000000000012");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Accounting_register_job_status_hidden_for_other_company()
    {
        await SeedCrossTenantDataAsync(factory);
        var token = await LoginAsTenantUserAsync(CompanyA);
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/accounting/register-jobs/00000000-0000-4000-8000-000000000071");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Warehouses_are_tenant_scoped()
    {
        await SeedCrossTenantDataAsync(factory);
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TmsDbContext>();
            if (!await db.Warehouses.AnyAsync(w => w.Name == "Warehouse A"))
            {
                db.Warehouses.AddRange(
                    new Warehouse { Id = Guid.Parse("00000000-0000-4000-8000-000000000081"), CompanyId = CompanyA, Name = "Warehouse A", CreatedAt = DateTime.UtcNow },
                    new Warehouse { Id = Guid.Parse("00000000-0000-4000-8000-000000000082"), CompanyId = CompanyB, Name = "Warehouse B", CreatedAt = DateTime.UtcNow });
                await db.SaveChangesAsync();
            }
        }

        var token = await LoginAsTenantUserAsync(CompanyA);
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/warehouses");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.EnumerateArray().Select(w => w.GetProperty("name").GetString())
            .Should().Contain("Warehouse A").And.NotContain("Warehouse B");
    }
}
