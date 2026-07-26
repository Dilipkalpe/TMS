using Tms.Api.Models;
using Tms.Api.Services;

namespace Tms.Api.Tests.Services;

public class DocumentNumberServiceTests
{
    [Theory]
    [InlineData(2026, 7, 26, "2026-27")]
    [InlineData(2026, 4, 1, "2026-27")]
    [InlineData(2026, 3, 31, "2025-26")]
    [InlineData(2027, 5, 1, "2027-28")]
    [InlineData(2025, 1, 15, "2024-25")]
    public void GetFinancialYear_uses_indian_apr_mar(int y, int m, int d, string expected)
    {
        DocumentNumberService.GetFinancialYear(new DateOnly(y, m, d)).Should().Be(expected);
    }

    [Fact]
    public void FormatNumber_builds_standard_pattern()
    {
        var cfg = new DocumentNumberConfig
        {
            Prefix = "BKG",
            FormatPattern = DocumentNumberService.DefaultFormatPattern,
            RunningNumberLength = 5,
        };
        DocumentNumberService.FormatNumber(cfg, "01", "PN", "2026-27", 1).Should().Be("01/PN/2026-27/BKG/00001");
    }

    [Fact]
    public void FormatNumber_respects_pad_length()
    {
        var cfg = new DocumentNumberConfig
        {
            Prefix = "LR",
            FormatPattern = DocumentNumberService.DefaultFormatPattern,
            RunningNumberLength = 3,
        };
        DocumentNumberService.FormatNumber(cfg, "01", "MU", "2026-27", 12)
            .Should().Be("01/MU/2026-27/LR/012");
    }

    [Fact]
    public void DecodePathId_restores_slashes()
    {
        DocumentCodeRules.DecodePathId("01~PN~2026-27~BKG~00001").Should().Be("01/PN/2026-27/BKG/00001");
        DocumentCodeRules.DecodePathId("BK-100").Should().Be("BK-100");
    }

    [Theory]
    [InlineData("01", true)]
    [InlineData("PN", true)]
    [InlineData("A", false)]
    [InlineData("PUN", false)]
    [InlineData("abc", false)]
    public void DocumentCodeRules_requires_two_chars(string code, bool ok)
    {
        DocumentCodeRules.IsValid(code).Should().Be(ok);
    }
}
