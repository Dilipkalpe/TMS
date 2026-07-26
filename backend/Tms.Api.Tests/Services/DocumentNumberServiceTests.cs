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
        var no = DocumentNumberService.FormatNumber(cfg, "ABC", "PUN", "2026-27", 1);
        no.Should().Be("ABC/PUN/2026-27/BKG/00001");
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
        DocumentNumberService.FormatNumber(cfg, "XYZ", "MUM", "2026-27", 12)
            .Should().Be("XYZ/MUM/2026-27/LR/012");
    }
}
