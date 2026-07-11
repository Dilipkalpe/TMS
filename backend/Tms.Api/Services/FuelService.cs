using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public class FuelService(TmsDbContext db)
{
    public async Task<bool> DetectSuspiciousAsync(string vehicleId, decimal liters, int? odometer, decimal? mileageKmpl)
    {
        const decimal thresholdPct = 15;
        var recent = await db.FuelEntries
            .Where(e => e.VehicleId == vehicleId)
            .OrderByDescending(e => e.FilledAt)
            .Take(10)
            .ToListAsync();

        var withMileage = recent.Where(e => e.MileageKmpl > 0).ToList();
        var avgMileage = withMileage.Count > 0 ? withMileage.Average(e => e.MileageKmpl!.Value) : 0;

        if (mileageKmpl != null && avgMileage > 0 && mileageKmpl < avgMileage * 0.5m) return true;

        if (odometer != null && recent.Count > 0 && recent[0].Odometer != null)
        {
            var distanceKm = odometer.Value - recent[0].Odometer!.Value;
            if (distanceKm > 0 && avgMileage > 0)
            {
                var expectedLiters = distanceKm / avgMileage;
                if (expectedLiters > 0)
                {
                    var excessPct = (liters - expectedLiters) / expectedLiters * 100;
                    if (excessPct > thresholdPct) return true;
                }
            }
        }

        return liters > 400;
    }
}
