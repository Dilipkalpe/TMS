using FluentAssertions;
using Tms.Api.Services;

namespace Tms.Api.Tests.Services;

public class NotificationTemplateRendererTests
{
    [Fact]
    public void Render_replaces_template_variables()
    {
        var result = NotificationTemplateRenderer.Render(
            "Hello {{name}}, booking {{bookingId}} is {{status}}.",
            new Dictionary<string, string>
            {
                ["name"] = "Raj",
                ["bookingId"] = "BK-100",
                ["status"] = "Delivered",
            });

        result.Should().Be("Hello Raj, booking BK-100 is Delivered.");
    }

    [Theory]
    [InlineData("9876543210", "91", "919876543210")]
    [InlineData("09876543210", "91", "919876543210")]
    [InlineData("+91 98765 43210", "91", "919876543210")]
    [InlineData("919876543210", "91", "919876543210")]
    public void NormalizePhone_formats_indian_numbers(string input, string cc, string expected)
    {
        NotificationTemplateRenderer.NormalizePhone(input, cc).Should().Be(expected);
    }
}
