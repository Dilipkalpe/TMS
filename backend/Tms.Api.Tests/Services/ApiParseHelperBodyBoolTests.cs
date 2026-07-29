using System.Text.Json;
using Tms.Api.Services;

namespace Tms.Api.Tests.Services;

public class ApiParseHelperBodyBoolTests
{
    static Dictionary<string, object?> Parse(string json) =>
        JsonSerializer.Deserialize<Dictionary<string, object?>>(json)!;

    [Fact]
    public void BodyBool_true_returns_true()
    {
        var body = Parse("""{"active": true}""");
        ApiParseHelper.BodyBool(body, "active").Should().BeTrue();
    }

    [Fact]
    public void BodyBool_false_returns_false()
    {
        var body = Parse("""{"active": false}""");
        ApiParseHelper.BodyBool(body, "active").Should().BeFalse();
    }

    [Fact]
    public void BodyBool_missing_returns_null()
    {
        var body = Parse("""{"other": 1}""");
        ApiParseHelper.BodyBool(body, "active").Should().BeNull();
    }

    [Fact]
    public void BodyBool_null_value_returns_null()
    {
        var body = Parse("""{"active": null}""");
        ApiParseHelper.BodyBool(body, "active").Should().BeNull();
    }
}
