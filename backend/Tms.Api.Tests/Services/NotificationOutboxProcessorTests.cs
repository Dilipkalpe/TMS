using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using Tms.Api.Data;
using Tms.Api.Models;
using Tms.Api.Services;

namespace Tms.Api.Tests.Services;

public class NotificationOutboxProcessorTests
{
    static IConfiguration Config(int maxAttempts = 3) => new ConfigurationBuilder()
        .AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Notifications:Enabled"] = "true",
            ["Notifications:MaxAttempts"] = maxAttempts.ToString(),
            ["Notifications:BatchSize"] = "10",
            ["Notifications:MaintenanceAlertsEnabled"] = "false",
        }).Build();

    static (IServiceScopeFactory scopeFactory, TmsDbContext db) CreateScopeFactory(string? dbName = null)
    {
        dbName ??= $"OutboxTests_{Guid.NewGuid():N}";
        var services = new ServiceCollection();
        services.AddDbContext<TmsDbContext>(opt => opt.UseInMemoryDatabase(dbName));
        services.AddScoped<NotificationDispatcher>();
        services.AddScoped<ITenantContext>(_ => new FixedTenantContext(Guid.Empty));
        var sp = services.BuildServiceProvider();
        var db = sp.GetRequiredService<TmsDbContext>();
        return (sp.GetRequiredService<IServiceScopeFactory>(), db);
    }

    [Fact]
    public async Task ProcessPending_sends_pending_items()
    {
        var (scopeFactory, db) = CreateScopeFactory();
        db.NotificationOutbox.Add(new NotificationOutbox
        {
            Id = Guid.NewGuid(), CompanyId = Guid.Empty,
            TemplateCode = "TEST", Channel = "SMS",
            RecipientPhone = "919876543210", MessageBody = "Hello",
            Status = "PENDING", CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        var stubSender = new Msg91NotificationSender(Config(), Mock.Of<IHttpClientFactory>(), Mock.Of<ILogger<Msg91NotificationSender>>());
        var router = new NotificationChannelRouter(new INotificationChannelSender[] { stubSender });
        var processor = new NotificationOutboxProcessor(scopeFactory, router, Config(), Mock.Of<ILogger<NotificationOutboxProcessor>>());

        await processor.ProcessPendingAsync();

        // Detach tracked entities and reload from the shared in-memory store
        foreach (var e in db.ChangeTracker.Entries().ToList()) e.State = EntityState.Detached;
        var item = await db.NotificationOutbox.FirstAsync();
        item.Status.Should().Be("SENT");
        item.AttemptCount.Should().Be(1);
        item.ProviderMessageId.Should().StartWith("STUB-");
    }

    [Fact]
    public async Task ProcessPending_marks_failed_after_max_attempts()
    {
        var (scopeFactory, db) = CreateScopeFactory();
        db.NotificationOutbox.Add(new NotificationOutbox
        {
            Id = Guid.NewGuid(), CompanyId = Guid.Empty,
            TemplateCode = "TEST", Channel = "SMS",
            RecipientPhone = "919876543210", MessageBody = "Hello",
            Status = "PENDING", AttemptCount = 2,
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        var failingSender = new Mock<INotificationChannelSender>();
        failingSender.Setup(s => s.SupportsChannel(It.IsAny<string>())).Returns(true);
        failingSender.Setup(s => s.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new NotificationSendResult(false, null, "Network error", "TEST"));
        var router = new NotificationChannelRouter(new[] { failingSender.Object });
        var processor = new NotificationOutboxProcessor(scopeFactory, router, Config(maxAttempts: 3), Mock.Of<ILogger<NotificationOutboxProcessor>>());

        await processor.ProcessPendingAsync();

        foreach (var e in db.ChangeTracker.Entries().ToList()) e.State = EntityState.Detached;
        var item = await db.NotificationOutbox.FirstAsync();
        item.Status.Should().Be("FAILED");
        item.AttemptCount.Should().Be(3);
    }

    [Fact]
    public async Task ProcessPending_disabled_does_nothing()
    {
        var (scopeFactory, db) = CreateScopeFactory();
        db.NotificationOutbox.Add(new NotificationOutbox
        {
            Id = Guid.NewGuid(), CompanyId = Guid.Empty,
            TemplateCode = "TEST", Channel = "SMS",
            RecipientPhone = "919876543210", MessageBody = "Hello",
            Status = "PENDING", CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        var disabledConfig = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Notifications:Enabled"] = "false" }).Build();
        var router = new NotificationChannelRouter(Array.Empty<INotificationChannelSender>());
        var processor = new NotificationOutboxProcessor(scopeFactory, router, disabledConfig, Mock.Of<ILogger<NotificationOutboxProcessor>>());

        await processor.ProcessPendingAsync();

        var item = await db.NotificationOutbox.FirstAsync();
        item.Status.Should().Be("PENDING");
    }

    [Fact]
    public async Task ProcessPending_respects_exponential_backoff()
    {
        var (scopeFactory, db) = CreateScopeFactory();
        db.NotificationOutbox.Add(new NotificationOutbox
        {
            Id = Guid.NewGuid(), CompanyId = Guid.Empty,
            TemplateCode = "TEST", Channel = "SMS",
            RecipientPhone = "919876543210", MessageBody = "Hello",
            Status = "PENDING", AttemptCount = 1,
            SentAt = DateTime.UtcNow.AddSeconds(-10),
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        var stubSender = new Msg91NotificationSender(Config(), Mock.Of<IHttpClientFactory>(), Mock.Of<ILogger<Msg91NotificationSender>>());
        var router = new NotificationChannelRouter(new INotificationChannelSender[] { stubSender });
        var processor = new NotificationOutboxProcessor(scopeFactory, router, Config(), Mock.Of<ILogger<NotificationOutboxProcessor>>());

        await processor.ProcessPendingAsync();

        var item = await db.NotificationOutbox.FirstAsync();
        // Backoff for attempt 1 = 2^1 * 30 = 60s, but only 10s elapsed, so it should still be PENDING
        item.Status.Should().Be("PENDING");
        item.AttemptCount.Should().Be(1);
    }
}
