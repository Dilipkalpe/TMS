using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Tms.Api.Services;

namespace Tms.Api.Tests.Services;

public class NotificationChannelSenderTests
{
    static IConfiguration EmptyConfig() => new ConfigurationBuilder()
        .AddInMemoryCollection(new Dictionary<string, string?>()).Build();

    [Fact]
    public async Task Msg91_without_key_returns_stub()
    {
        var logger = new Mock<ILogger<Msg91NotificationSender>>();
        var httpFactory = new Mock<IHttpClientFactory>();
        var sender = new Msg91NotificationSender(EmptyConfig(), httpFactory.Object, logger.Object);

        var result = await sender.SendAsync("919876543210", "Test message");

        result.Success.Should().BeTrue();
        result.Provider.Should().Be("STUB");
        result.ProviderMessageId.Should().StartWith("STUB-");
    }

    [Fact]
    public async Task Msg91_without_key_logs_warning()
    {
        var logger = new Mock<ILogger<Msg91NotificationSender>>();
        var httpFactory = new Mock<IHttpClientFactory>();
        var sender = new Msg91NotificationSender(EmptyConfig(), httpFactory.Object, logger.Object);

        await sender.SendAsync("919876543210", "Test message");

        logger.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => true),
                It.IsAny<Exception?>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Theory]
    [InlineData("SMS", true)]
    [InlineData("WHATSAPP", true)]
    [InlineData("EMAIL", false)]
    [InlineData("PUSH", false)]
    public void Msg91_supports_correct_channels(string channel, bool expected)
    {
        var sender = new Msg91NotificationSender(EmptyConfig(), Mock.Of<IHttpClientFactory>(), Mock.Of<ILogger<Msg91NotificationSender>>());
        sender.SupportsChannel(channel).Should().Be(expected);
    }

    [Fact]
    public async Task Smtp_without_host_returns_stub()
    {
        var logger = new Mock<ILogger<SmtpEmailNotificationSender>>();
        var sender = new SmtpEmailNotificationSender(EmptyConfig(), logger.Object);

        var result = await sender.SendAsync("test@example.com", "Hello");

        result.Success.Should().BeTrue();
        result.Provider.Should().Be("STUB-EMAIL");
        result.ProviderMessageId.Should().StartWith("STUB-EMAIL-");
    }

    [Theory]
    [InlineData("EMAIL", true)]
    [InlineData("SMS", false)]
    [InlineData("WHATSAPP", false)]
    public void Smtp_supports_correct_channels(string channel, bool expected)
    {
        var sender = new SmtpEmailNotificationSender(EmptyConfig(), Mock.Of<ILogger<SmtpEmailNotificationSender>>());
        sender.SupportsChannel(channel).Should().Be(expected);
    }

    [Fact]
    public void Router_resolve_sms_returns_msg91_sender()
    {
        var msg91 = new Msg91NotificationSender(EmptyConfig(), Mock.Of<IHttpClientFactory>(), Mock.Of<ILogger<Msg91NotificationSender>>());
        var router = new NotificationChannelRouter(new INotificationChannelSender[] { msg91 });

        var resolved = router.Resolve("SMS");
        resolved.Should().Be(msg91);
    }

    [Fact]
    public void Router_resolve_email_returns_smtp_sender()
    {
        var msg91 = new Msg91NotificationSender(EmptyConfig(), Mock.Of<IHttpClientFactory>(), Mock.Of<ILogger<Msg91NotificationSender>>());
        var smtp = new SmtpEmailNotificationSender(EmptyConfig(), Mock.Of<ILogger<SmtpEmailNotificationSender>>());
        var router = new NotificationChannelRouter(new INotificationChannelSender[] { msg91, smtp });

        var resolved = router.Resolve("EMAIL");
        resolved.Should().Be(smtp);
    }

    [Fact]
    public void Router_resolve_unknown_returns_first()
    {
        var msg91 = new Msg91NotificationSender(EmptyConfig(), Mock.Of<IHttpClientFactory>(), Mock.Of<ILogger<Msg91NotificationSender>>());
        var router = new NotificationChannelRouter(new INotificationChannelSender[] { msg91 });

        var resolved = router.Resolve("PUSH");
        resolved.Should().Be(msg91);
    }
}
