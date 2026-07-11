using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;
using Tms.Api.Services;

namespace Tms.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/fuel")]
public class FuelController(TmsDbContext db, FuelService fuelService, ITenantContext tenants, IBranchContext branches) : ControllerBase
{
    [HttpGet("entries")]
    public async Task<IActionResult> Entries([FromQuery] string? vehicleId, [FromQuery] bool? suspicious)
    {
        var q = TenantScope.FuelEntries(db, tenants).Include(e => e.Vehicle).AsQueryable();
        if (!string.IsNullOrEmpty(vehicleId)) q = q.Where(e => e.VehicleId == vehicleId);
        if (suspicious == true) q = q.Where(e => e.IsSuspicious);
        var items = await q.OrderByDescending(e => e.FilledAt).Take(200)
            .Select(e => new
            {
                e.Id, e.VehicleId, e.Liters, e.CostPerLiter, e.TotalCost, e.Odometer, e.MileageKmpl,
                e.StationName, e.FilledAt, e.IsSuspicious,
                vehicle = new { registrationNo = e.Vehicle!.Number },
            }).ToListAsync();
        return Ok(items);
    }

    public record CreateFuelEntry(string VehicleId, decimal Liters, decimal CostPerLiter, int? Odometer, string? StationName, DateTime? FilledAt, string? BookingId);

    [HttpPost("entries")]
    public async Task<IActionResult> CreateEntry([FromBody] CreateFuelEntry body)
    {
        var vehicle = await TenantScope.FindVehicleAsync(db, tenants, branches, body.VehicleId);
        if (vehicle == null) return NotFound(new { message = "Vehicle not found" });

        var totalCost = body.Liters * body.CostPerLiter;
        decimal? mileageKmpl = null;
        if (body.Odometer != null)
        {
            var prev = await TenantScope.FuelEntries(db, tenants)
                .Where(e => e.VehicleId == body.VehicleId && e.Odometer != null)
                .OrderByDescending(e => e.FilledAt).FirstOrDefaultAsync();
            if (prev?.Odometer != null && body.Odometer > prev.Odometer)
            {
                var distanceKm = body.Odometer.Value - prev.Odometer.Value;
                mileageKmpl = Math.Round(distanceKm / body.Liters, 2);
            }
            vehicle.Odometer = body.Odometer.Value;
            vehicle.UpdatedAt = DateTime.UtcNow;
        }

        var isSuspicious = await fuelService.DetectSuspiciousAsync(body.VehicleId, body.Liters, body.Odometer, mileageKmpl);
        var entry = new FuelEntry
        {
            Id = Guid.NewGuid(),
            VehicleId = body.VehicleId,
            BookingId = body.BookingId,
            Liters = body.Liters,
            CostPerLiter = body.CostPerLiter,
            TotalCost = totalCost,
            Odometer = body.Odometer,
            MileageKmpl = mileageKmpl,
            StationName = body.StationName,
            FilledAt = body.FilledAt ?? DateTime.UtcNow,
            IsSuspicious = isSuspicious,
            CreatedAt = DateTime.UtcNow,
        };
        db.FuelEntries.Add(entry);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Entries), new { id = entry.Id }, new { entry.Id, entry.TotalCost, entry.IsSuspicious, vehicle = new { registrationNo = vehicle.Number } });
    }

    [HttpGet("analytics")]
    public async Task<IActionResult> Analytics()
    {
        var entries = await TenantScope.FuelEntries(db, tenants).AsNoTracking()
            .Include(e => e.Vehicle)
            .OrderByDescending(e => e.FilledAt)
            .Take(5000)
            .ToListAsync();
        var totalLiters = entries.Sum(e => e.Liters);
        var totalCost = entries.Sum(e => e.TotalCost);
        var withMileage = entries.Where(e => e.MileageKmpl > 0).ToList();
        var avgMileage = withMileage.Count > 0 ? withMileage.Average(e => e.MileageKmpl!.Value) : 0;

        var byVehicle = entries.GroupBy(e => e.VehicleId).Select(g => new
        {
            vehicleId = g.Key,
            registrationNo = g.First().Vehicle?.Number,
            liters = g.Sum(x => x.Liters),
            cost = g.Sum(x => x.TotalCost),
            fills = g.Count(),
        });

        var byMonth = entries.GroupBy(e => e.FilledAt.ToString("yyyy-MM")).Select(g => new
        {
            month = g.Key,
            liters = g.Sum(x => x.Liters),
            cost = g.Sum(x => x.TotalCost),
        }).OrderBy(x => x.month).TakeLast(6);

        return Ok(new
        {
            totalLiters = Math.Round(totalLiters, 2),
            totalCost = Math.Round(totalCost, 2),
            avgMileageKmpl = Math.Round(avgMileage, 2),
            suspiciousCount = entries.Count(e => e.IsSuspicious),
            entryCount = entries.Count,
            byVehicle,
            byMonth,
        });
    }

    [HttpGet("suspicious")]
    public async Task<IActionResult> Suspicious([FromQuery] int limit = 200) =>
        Ok(await TenantScope.FuelEntries(db, tenants).Include(e => e.Vehicle).Where(e => e.IsSuspicious)
            .OrderByDescending(e => e.FilledAt).Take(Math.Min(limit, 500)).Select(e => new
            {
                e.Id, e.Liters, e.TotalCost, e.FilledAt,
                vehicle = new { registrationNo = e.Vehicle!.Number },
            }).ToListAsync());
}

[Authorize]
[ApiController]
[Route("api/pod")]
public class PodController(TmsDbContext db, NotificationDispatcher notifications, IConfiguration config, IHostEnvironment env, ITenantContext tenants, IBranchContext branches) : ControllerBase
{
    [HttpPost("{bookingId}/send-otp")]
    public async Task<IActionResult> SendOtp(string bookingId)
    {
        var booking = await TenantScope.FindBookingAsync(db, tenants, branches, bookingId);
        if (booking == null) return NotFound(new { message = "Booking not found" });

        var otp = Random.Shared.Next(100000, 999999).ToString();
        var pod = await TenantScope.FindPodForBookingAsync(db, tenants, bookingId);
        if (pod == null)
        {
            pod = new ProofOfDelivery { Id = Guid.NewGuid(), CompanyId = booking.CompanyId, BookingId = bookingId, OtpCode = otp, CreatedAt = DateTime.UtcNow };
            db.ProofOfDeliveries.Add(pod);
        }
        else
        {
            pod.OtpCode = otp;
            pod.OtpVerified = false;
        }
        await db.SaveChangesAsync();
        if (AppOptions.IsDemoDataEnabled(config, env))
            return Ok(new { message = "OTP generated", demoOtp = otp, bookingId });
        return Ok(new { message = "OTP sent", bookingId });
    }

    public record ConfirmPod(string OtpCode, string RecipientName, decimal? DeliveryLat, decimal? DeliveryLng, string? SignatureUrl, string? PhotoUrl);

    [HttpPost("{bookingId}/confirm")]
    public async Task<IActionResult> Confirm(string bookingId, [FromBody] ConfirmPod body)
    {
        var booking = await TenantScope.FindBookingAsync(db, tenants, branches, bookingId);
        if (booking == null) return NotFound(new { message = "Booking not found" });

        var pod = await TenantScope.FindPodForBookingAsync(db, tenants, bookingId);
        if (pod?.OtpCode == null) return BadRequest(new { message = "Generate OTP first" });
        if (pod.OtpCode != body.OtpCode) return BadRequest(new { message = "Invalid OTP" });

        pod.OtpVerified = true;
        pod.RecipientName = body.RecipientName;
        pod.DeliveryLat = body.DeliveryLat;
        pod.DeliveryLng = body.DeliveryLng;
        pod.SignatureUrl = body.SignatureUrl;
        pod.PhotoUrl = body.PhotoUrl;
        pod.ConfirmedBy = User.Identity?.Name;
        pod.DeliveredAt = DateTime.UtcNow;

        booking.Status = "Delivered";
        booking.UpdatedAt = DateTime.UtcNow;
        var customer = booking.CustomerId != null
            ? await TenantScope.FindCustomerAsync(db, tenants, branches, booking.CustomerId)
            : await TenantScope.FindCustomerByNameAsync(db, tenants, branches, booking.CustomerName);

        await notifications.DispatchAsync(new DispatchNotificationRequest
        {
            EventCode = "SHIPMENT_DELIVERED",
            Title = $"Delivered: {booking.Id}",
            Variables = new Dictionary<string, string>
            {
                ["bookingId"] = booking.Id,
                ["recipientName"] = body.RecipientName,
                ["origin"] = booking.FromCity,
                ["destination"] = booking.ToCity,
            },
            SmsPhone = customer?.Phone,
            WhatsAppPhone = customer?.Phone,
            RecipientName = customer?.Name ?? booking.CustomerName,
        });

        await db.SaveChangesAsync();
        return Ok(new { message = "Delivery confirmed", pod });
    }

    [HttpGet("{bookingId}")]
    public async Task<IActionResult> Get(string bookingId)
    {
        var booking = await TenantScope.FindBookingAsync(db, tenants, branches, bookingId);
        if (booking == null) return NotFound();

        var pod = await TenantScope.FindPodForBookingAsync(db, tenants, bookingId);
        return pod == null ? NotFound() : Ok(pod);
    }
}
