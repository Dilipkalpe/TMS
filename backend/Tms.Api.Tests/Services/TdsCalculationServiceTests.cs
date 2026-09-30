using Tms.Api.Services;

namespace Tms.Api.Tests.Services;

public class TdsCalculationServiceTests
{
    static TdsCalcInput Base(
        decimal amount = 100000,
        decimal rate = 1,
        decimal withoutPan = 20,
        bool hasPan = true,
        decimal threshold = 0,
        string round = "NEAREST",
        decimal? exemption = null,
        bool exemptionApplies = false) =>
        new(amount, rate, withoutPan, hasPan, threshold, "TRANSACTION", round, exemption, exemptionApplies);

    [Fact]
    public void Calculate_with_pan_applies_normal_rate()
    {
        var r = TdsCalculationService.Calculate(Base(100000, 1));
        r.TdsAmount.Should().Be(1000);
        r.NetAmount.Should().Be(99000);
        r.UsedWithoutPanRate.Should().BeFalse();
        r.BaseAmount.Should().Be(r.NetAmount + r.TdsAmount);
    }

    [Fact]
    public void Calculate_without_pan_uses_higher_rate()
    {
        var r = TdsCalculationService.Calculate(Base(100000, 1, 20, hasPan: false));
        r.UsedWithoutPanRate.Should().BeTrue();
        r.AppliedRatePercent.Should().Be(20);
        r.TdsAmount.Should().Be(20000);
        r.Warning.Should().Contain("PAN");
    }

    [Fact]
    public void Calculate_full_exemption_zero_tds()
    {
        var r = TdsCalculationService.Calculate(Base(exemptionApplies: true, exemption: null));
        r.UsedExemption.Should().BeTrue();
        r.TdsAmount.Should().Be(0);
        r.NetAmount.Should().Be(100000);
    }

    [Fact]
    public void Calculate_lower_exemption_rate()
    {
        var r = TdsCalculationService.Calculate(Base(100000, 10, exemptionApplies: true, exemption: 2));
        r.UsedExemption.Should().BeTrue();
        r.AppliedRatePercent.Should().Be(2);
        r.TdsAmount.Should().Be(2000);
    }

    [Fact]
    public void Calculate_below_threshold_zero_tds()
    {
        var r = TdsCalculationService.Calculate(Base(25000, 1, threshold: 30000));
        r.BelowThreshold.Should().BeTrue();
        r.TdsAmount.Should().Be(0);
        r.NetAmount.Should().Be(25000);
    }

    [Theory]
    [InlineData("NEAREST", 1000.4, 1000)]
    [InlineData("NEAREST", 1000.5, 1001)]
    [InlineData("UP", 1000.1, 1001)]
    [InlineData("DOWN", 1000.9, 1000)]
    public void RoundAmount_modes(string mode, decimal raw, decimal expected)
    {
        TdsCalculationService.RoundAmount(raw, mode).Should().Be(expected);
    }

    [Fact]
    public void Gross_equals_net_plus_tds()
    {
        var r = TdsCalculationService.Calculate(Base(55555, 2));
        (r.NetAmount + r.TdsAmount).Should().Be(r.BaseAmount);
    }
}
