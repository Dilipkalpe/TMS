using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Tms.Api.Services;

namespace Tms.Api.Tests.Services;

public class ApiParseHelperTests
{
    [Theory]
    [InlineData("2026-06-15", true)]
    [InlineData("", false)]
    [InlineData(null, false)]
    [InlineData("not-a-date", false)]
    public void TryParseDate_parses_valid_dates(string? input, bool expected)
    {
        var ok = ApiParseHelper.TryParseDate(input, out var date);
        ok.Should().Be(expected);
        if (expected) date.Should().Be(new DateOnly(2026, 6, 15));
    }

    [Fact]
    public void JwtExpireHours_uses_config_or_default()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Jwt:ExpireHours"] = "24" })
            .Build();
        ApiParseHelper.JwtExpireHours(config).Should().Be(24);

        var empty = new ConfigurationBuilder().Build();
        ApiParseHelper.JwtExpireHours(empty).Should().Be(12);
    }

    [Fact]
    public void BodyString_reads_json_element_values()
    {
        var body = new Dictionary<string, object?>
        {
            ["name"] = JsonSerializer.SerializeToElement("Acme"),
            ["count"] = JsonSerializer.SerializeToElement(42),
            ["active"] = JsonSerializer.SerializeToElement(true),
        };

        ApiParseHelper.BodyString(body, "name").Should().Be("Acme");
        ApiParseHelper.BodyString(body, "count").Should().Be("42");
        ApiParseHelper.BodyString(body, "active").Should().Be("true");
        ApiParseHelper.BodyString(body, "missing").Should().BeNull();
    }

    [Fact]
    public void BodyDecimal_and_BodyDate_apply_defaults()
    {
        var body = new Dictionary<string, object?>
        {
            ["amount"] = JsonSerializer.SerializeToElement("1250.50"),
            ["when"] = JsonSerializer.SerializeToElement("2026-01-10"),
        };

        ApiParseHelper.BodyDecimal(body, "amount").Should().Be(1250.50m);
        ApiParseHelper.BodyDecimal(body, "missing", 9).Should().Be(9);
        ApiParseHelper.BodyDate(body, "when", new DateOnly(2020, 1, 1)).Should().Be(new DateOnly(2026, 1, 10));
    }
}
