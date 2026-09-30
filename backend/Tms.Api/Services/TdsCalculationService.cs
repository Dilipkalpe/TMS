using Tms.Api.Models;

namespace Tms.Api.Services;

public record TdsCalcInput(
    decimal BaseAmount,
    decimal RatePercent,
    decimal RateWithoutPanPercent,
    bool HasPan,
    decimal ThresholdAmount,
    string ThresholdType,
    string RoundOff,
    decimal? ExemptionLowerRatePercent,
    bool ExemptionApplies);

public record TdsCalcResult(
    decimal BaseAmount,
    decimal AppliedRatePercent,
    decimal TdsAmount,
    decimal NetAmount,
    bool BelowThreshold,
    bool UsedWithoutPanRate,
    bool UsedExemption,
    string? Warning);

/// <summary>Pure TDS math — configurable rates/thresholds/rounding (unit-testable).</summary>
public static class TdsCalculationService
{
    public static TdsCalcResult Calculate(TdsCalcInput input)
    {
        var baseAmt = Math.Round(input.BaseAmount, 2, MidpointRounding.AwayFromZero);
        if (baseAmt <= 0)
            return new TdsCalcResult(baseAmt, 0, 0, 0, false, false, false, "Base amount must be greater than zero.");

        var belowThreshold = string.Equals(input.ThresholdType, "TRANSACTION", StringComparison.OrdinalIgnoreCase)
            && input.ThresholdAmount > 0
            && baseAmt < input.ThresholdAmount;

        if (belowThreshold)
            return new TdsCalcResult(baseAmt, 0, 0, baseAmt, true, false, false,
                $"Below transaction threshold of {input.ThresholdAmount:0.##}; TDS not deducted.");

        decimal rate;
        var usedWithoutPan = false;
        var usedExemption = false;
        string? warning = null;

        if (input.ExemptionApplies)
        {
            usedExemption = true;
            if (input.ExemptionLowerRatePercent == null)
                return new TdsCalcResult(baseAmt, 0, 0, baseAmt, false, false, true, "Full TDS exemption applied.");
            rate = input.ExemptionLowerRatePercent.Value;
            warning = "Lower TDS rate from exemption certificate applied.";
        }
        else if (!input.HasPan)
        {
            rate = input.RateWithoutPanPercent;
            usedWithoutPan = true;
            warning = "PAN missing — higher TDS rate without PAN applied.";
        }
        else
        {
            rate = input.RatePercent;
        }

        if (rate < 0) rate = 0;
        var raw = baseAmt * rate / 100m;
        var tds = RoundAmount(raw, input.RoundOff);
        if (tds > baseAmt) tds = baseAmt;
        var net = Math.Round(baseAmt - tds, 2, MidpointRounding.AwayFromZero);
        return new TdsCalcResult(baseAmt, rate, tds, net, false, usedWithoutPan, usedExemption, warning);
    }

    public static decimal RoundAmount(decimal value, string? roundOff) =>
        (roundOff?.ToUpperInvariant()) switch
        {
            TdsRoundOffModes.Up => Math.Ceiling(value),
            TdsRoundOffModes.Down => Math.Floor(value),
            _ => Math.Round(value, 0, MidpointRounding.AwayFromZero), // NEAREST rupee (common TDS practice)
        };

    public static string FinancialYear(DateOnly date) => DocumentNumberService.GetFinancialYear(date);
}
