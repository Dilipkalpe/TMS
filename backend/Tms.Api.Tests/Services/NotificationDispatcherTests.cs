using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Tms.Api.Data;
using Tms.Api.Models;
using Tms.Api.Services;

namespace Tms.Api.Tests.Services;

public class NotificationDispatcherTests : IDisposable
{
    readonly TmsDbContext _db;
    readonly Guid _companyId = Guid.Parse("00000000-0000-4000-8000-000000000001");

    public NotificationDispatcherTests()
    {
        var options = new DbContextOptionsBuilder<TmsDbContext>()
            .UseInMemoryDatabase($"DispatcherTests_{Guid.NewGuid():N}")
            .Options;
        _db = new TmsDbContext(options);
        SeedData();
    }

    void SeedData()
    {
        _db.Companies.Add(new Company
        {
            Id = _companyId, Code = "T1", Name = "Test Co",
            Email = "company@test.com", IsActive = true,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        });
        _db.NotificationChannelSettings.Add(new NotificationChannelSettings
        {
            CompanyId = _companyId, SmsEnabled = true, WhatsappEnabled = false,
            AdminPhone = "9876543210", DefaultCountryCode = "91", UpdatedAt = DateTime.UtcNow,
        });
        _db.NotificationTemplates.Add(new NotificationTemplate
        {
            Id = Guid.NewGuid(), CompanyId = _companyId, Code = "TEST_EVENT",
            Channel = "SMS", BodyTemplate = "Hello {{name}}, your booking {{bookingId}} is confirmed.",
            IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        });
        _db.SaveChanges();
    }

    IConfiguration Config() => new ConfigurationBuilder()
        .AddInMemoryCollection(new Dictionary<string, string?>()).Build();

    NotificationDispatcher CreateDispatcher()
    {
        var tenant = new FixedTenantContext(_companyId);
        return new NotificationDispatcher(_db, Config(), tenant);
    }

    [Fact]
    public async Task DispatchAsync_creates_in_app_notification()
    {
        var dispatcher = CreateDispatcher();
        await dispatcher.DispatchAsync(new DispatchNotificationRequest
        {
            CompanyId = _companyId,
            EventCode = "TEST_EVENT",
            Title = "Test Title",
            Variables = new() { ["name"] = "John", ["bookingId"] = "BK-001" },
        });
        await _db.SaveChangesAsync();

        var notifications = await _db.Notifications.ToListAsync();
        notifications.Should().ContainSingle();
        notifications[0].Channel.Should().Be("IN_APP");
        notifications[0].Title.Should().Be("Test Title");
        notifications[0].Status.Should().Be("UNREAD");
    }

    [Fact]
    public async Task DispatchAsync_with_sms_enabled_queues_outbox_entry()
    {
        var dispatcher = CreateDispatcher();
        await dispatcher.DispatchAsync(new DispatchNotificationRequest
        {
            CompanyId = _companyId,
            EventCode = "TEST_EVENT",
            Title = "SMS Test",
            SmsPhone = "9988776655",
            Variables = new() { ["name"] = "Jane", ["bookingId"] = "BK-002" },
        });
        await _db.SaveChangesAsync();

        var outbox = await _db.NotificationOutbox.ToListAsync();
        outbox.Should().HaveCountGreaterOrEqualTo(1);
        outbox.Should().Contain(o => o.Channel == "SMS" && o.Status == "PENDING");
    }

    [Fact]
    public async Task DispatchAsync_skips_duplicate_within_window()
    {
        var dispatcher = CreateDispatcher();
        var request = new DispatchNotificationRequest
        {
            CompanyId = _companyId,
            EventCode = "TEST_EVENT",
            Title = "Dupe Test",
            SmsPhone = "9988776655",
            Variables = new() { ["name"] = "Test", ["bookingId"] = "BK-003" },
        };

        await dispatcher.DispatchAsync(request);
        await _db.SaveChangesAsync();
        var count1 = await _db.NotificationOutbox.CountAsync();

        await dispatcher.DispatchAsync(request);
        await _db.SaveChangesAsync();
        var count2 = await _db.NotificationOutbox.CountAsync();

        count2.Should().Be(count1, "duplicate within window should be skipped");
    }

    [Fact]
    public async Task DispatchAsync_respects_channel_preference()
    {
        _db.NotificationPreferences.Add(new NotificationPreference
        {
            Id = Guid.NewGuid(), CompanyId = _companyId,
            EntityType = "SYSTEM", EntityId = "default",
            EventCode = "DISABLED_EVENT", Channel = "SMS", Enabled = false,
        });
        await _db.SaveChangesAsync();

        var dispatcher = CreateDispatcher();
        await dispatcher.DispatchAsync(new DispatchNotificationRequest
        {
            CompanyId = _companyId,
            EventCode = "DISABLED_EVENT",
            Title = "Should not send SMS",
            SmsPhone = "9988776655",
        });
        await _db.SaveChangesAsync();

        var outbox = await _db.NotificationOutbox.Where(o => o.TemplateCode == "DISABLED_EVENT").ToListAsync();
        outbox.Should().NotContain(o => o.Channel == "SMS");
    }

    public void Dispose() => _db.Dispose();
}
