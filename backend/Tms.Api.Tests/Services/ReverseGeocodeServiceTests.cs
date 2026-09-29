using System.Text.Json;
using Tms.Api.Services;

namespace Tms.Api.Tests.Services;

public class ReverseGeocodeServiceTests
{
    static JsonElement Address(object anon)
    {
        var json = JsonSerializer.Serialize(anon);
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.Clone();
    }

    [Fact]
    public void FormatIndianAddress_returns_area_city_state()
    {
        var address = Address(new { suburb = "Narhe", city = "Pune", state = "Maharashtra" });
        ReverseGeocodeService.FormatIndianAddress(address).Should().Be("Narhe, Pune, Maharashtra");
    }

    [Fact]
    public void FormatIndianAddress_falls_back_to_city_state_when_area_missing()
    {
        var address = Address(new { city = "Pune", state = "Maharashtra" });
        ReverseGeocodeService.FormatIndianAddress(address).Should().Be("Pune, Maharashtra");
    }

    [Fact]
    public void FormatIndianAddress_uses_village_when_suburb_absent()
    {
        var address = Address(new { village = "Chakan", town = "Pune", state = "Maharashtra" });
        ReverseGeocodeService.FormatIndianAddress(address).Should().Be("Chakan, Pune, Maharashtra");
    }

    [Fact]
    public void FormatIndianAddress_returns_null_when_empty()
    {
        var address = Address(new { country = "India" });
        ReverseGeocodeService.FormatIndianAddress(address).Should().BeNull();
    }

    [Fact]
    public void DistanceMeters_near_zero_for_same_point()
    {
        ReverseGeocodeService.DistanceMeters(18.4575m, 73.8072m, 18.4575m, 73.8072m)
            .Should().BeApproximately(0, 0.01);
    }

    [Fact]
    public void DistanceMeters_detects_meaningful_move()
    {
        // ~1 km north of Narhe-ish coordinates
        var meters = ReverseGeocodeService.DistanceMeters(18.4575m, 73.8072m, 18.4665m, 73.8072m);
        meters.Should().BeGreaterThan(250);
        meters.Should().BeLessThan(1500);
    }

    [Fact]
    public void MasterLiveLocation_FormatLocation_never_returns_lat_lng()
    {
        MasterLiveLocationService.FormatLocation("Narhe, Pune, Maharashtra")
            .Should().Be("Narhe, Pune, Maharashtra");
        MasterLiveLocationService.FormatLocation(null).Should().Be("");
        MasterLiveLocationService.FormatLocation("  ").Should().Be("");
    }
}
