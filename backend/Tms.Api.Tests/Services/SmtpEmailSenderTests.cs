using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Tms.Api.Services;

namespace Tms.Api.Tests.Services;

public class SmtpEmailSenderTests
{
    static IConfiguration EmptyConfig() => new ConfigurationBuilder()
        .AddInMemoryCollection(new Dictionary<string, string?>()).Build();

    [Fact]
    public async Task SendAsync_without_host_returns_stub_and_logs_warning()
    {
        var logger = new Mock<ILogger<SmtpEmailNotificationSender>>();
        var sender = new SmtpEmailNotificationSender(EmptyConfig(), logger.Object);

        var result = await sender.SendAsync("test@example.com", "Hello world");

        result.Success.Should().BeTrue();
        result.Provider.Should().Be("STUB-EMAIL");
        result.ProviderMessageId.Should().StartWith("STUB-EMAIL-");
        logger.Verify(
            x => x.Log(LogLevel.Warning, It.IsAny<EventId>(), It.Is<It.IsAnyType>((v, t) => true),
                It.IsAny<Exception?>(), It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Theory]
    [InlineData("EMAIL", true)]
    [InlineData("SMS", false)]
    [InlineData("WHATSAPP", false)]
    [InlineData("email", true)]
    public void SupportsChannel_email_only(string channel, bool expected)
    {
        var sender = new SmtpEmailNotificationSender(EmptyConfig(), Mock.Of<ILogger<SmtpEmailNotificationSender>>());
        sender.SupportsChannel(channel).Should().Be(expected);
    }

    [Fact]
    public void ProviderName_is_SMTP()
    {
        var sender = new SmtpEmailNotificationSender(EmptyConfig(), Mock.Of<ILogger<SmtpEmailNotificationSender>>());
        sender.ProviderName.Should().Be("SMTP");
    }

    [Fact]
    public async Task SendAsync_with_invalid_host_returns_failure()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Notifications:Smtp:Host"] = "127.0.0.1",
                ["Notifications:Smtp:Port"] = "1",
            }).Build();
        var logger = new Mock<ILogger<SmtpEmailNotificationSender>>();
        var sender = new SmtpEmailNotificationSender(config, logger.Object);

        var result = await sender.SendAsync("test@example.com", "Test message");

        result.Success.Should().BeFalse();
        result.Provider.Should().Be("SMTP");
        result.Error.Should().NotBeNullOrEmpty();
    }
}
