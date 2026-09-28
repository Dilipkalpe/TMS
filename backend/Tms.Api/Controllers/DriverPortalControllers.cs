using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Tms.Api.Data;
using Tms.Api.Models;
using Tms.Api.Services;

namespace Tms.Api.Controllers;

public record DriverPortalLoginRequest(string Phone, string Pin);
public record DriverPortalLoginResponse(string Token, string Name, string DriverId, Guid? CompanyId);
public record DriverStatusBody(string Status);
public record DriverLocationBody(
    Guid SessionId,
    decimal Latitude,
    decimal Longitude,
    decimal? Accuracy,
    decimal? Speed,
    decimal? Heading,
    DateTime? GpsTimestamp);

[ApiController]
[Route("api/driver/auth")]
public class DriverPortalAuthController(TmsDbContext db, IConfiguration config) : ControllerBase
{
    [AllowAnonymous]
    [EnableRateLimiting(AuthRateLimiting.PolicyName)]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] DriverPortalLoginRequest body)
    {
        if (string.IsNullOrWhiteSpace(body.Phone) || string.IsNullOrWhiteSpace(body.Pin))
            return BadRequest(new { message = "Phone and PIN required" });

        var normalized = NotificationTemplateRenderer.NormalizePhone(body.Phone);
        var candidates = await PortalAuthHelper
            .WhereDriverPortalPhoneMayMatch(
                db.Drivers.AsNoTracking().Where(d => d.PortalEnabled && d.PortalPinHash != null && d.Status == "Active"),
                normalized)
            .OrderBy(d => d.Id)
            .Take(20)
            .ToListAsync();

        var verified = candidates
            .Where(d => PortalAuthHelper.PhoneMatches(d.PortalPhone ?? d.Phone, normalized) &&
                        BCrypt.Net.BCrypt.Verify(body.Pin, d.PortalPinHash!))
            .ToList();

        if (verified.Count == 0)
            return Unauthorized(new { message = "Invalid phone or PIN" });
        if (verified.Count > 1)
            return Conflict(new { message = "Multiple driver accounts match this phone. Contact your company." });

        var driver = verified[0];
        var token = GenerateToken(driver);
        return Ok(new DriverPortalLoginResponse(token, driver.Name, driver.Id, driver.CompanyId));
    }

    [Authorize(Policy = AuthorizationPolicies.DriverPortal)]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var ctx = DriverPortalUserContext.Parse(User);
        if (ctx.DriverId == null) return Unauthorized();
        var driver = await db.Drivers.AsNoTracking().FirstOrDefaultAsync(d => d.Id == ctx.DriverId);
        if (driver == null || !driver.PortalEnabled) return Unauthorized();
        return Ok(new
        {
            name = driver.Name,
            driverId = driver.Id,
            phone = driver.PortalPhone ?? driver.Phone,
            companyId = driver.CompanyId,
            role = "Driver",
        });
    }

    string GenerateToken(Driver driver)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(AppConfiguration.ResolveJwtKey(config)));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, driver.Name),
            new(ClaimTypes.Role, "Driver"),
            new("portal_scope", "driver"),
            new("driver_id", driver.Id),
            new("full_name", driver.Name),
            new("name", driver.Name),
            new("company_id", driver.CompanyId.ToString()),
        };

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(config.GetValue("DriverPortal:TokenExpireHours", 12)),
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

[Authorize(Policy = AuthorizationPolicies.DriverPortal)]
[EnableRateLimiting(AuthRateLimiting.PortalPolicyName)]
[ApiController]
[Route("api/driver")]
public class DriverPortalController(TmsDbContext db, DriverTripService trips) : ControllerBase
{
    DriverPortalUserContext Access => DriverPortalUserContext.Parse(User);

    [HttpGet("trip")]
    public async Task<IActionResult> GetAssignedTrip()
    {
        if (Access.DriverId == null || Access.CompanyId == null) return Forbid();
        var trip = await trips.GetOrSyncActiveTripAsync(Access.DriverId, Access.CompanyId.Value);
        if (trip == null) return Ok(new { trip = (object?)null, message = "No active trip assigned" });
        return Ok(new { trip });
    }

    [HttpPost("trip/{sessionId:guid}/start")]
    public async Task<IActionResult> StartTrip(Guid sessionId)
    {
        if (Access.DriverId == null || Access.CompanyId == null) return Forbid();
        try
        {
            var trip = await trips.StartTripAsync(Access.DriverId, Access.CompanyId.Value, sessionId);
            return Ok(new { trip });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPatch("trip/{sessionId:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid sessionId, [FromBody] DriverStatusBody body)
    {
        if (Access.DriverId == null || Access.CompanyId == null) return Forbid();
        if (string.IsNullOrWhiteSpace(body.Status))
            return BadRequest(new { message = "Status required" });
        try
        {
            var trip = await trips.UpdateStatusAsync(Access.DriverId, Access.CompanyId.Value, sessionId, body.Status);
            return Ok(new { trip });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("location")]
    public async Task<IActionResult> SubmitLocation([FromBody] DriverLocationBody body)
    {
        if (Access.DriverId == null || Access.CompanyId == null) return Forbid();
        try
        {
            var result = await trips.SubmitLocationAsync(
                Access.DriverId,
                Access.CompanyId.Value,
                new DriverLocationSubmit(
                    body.SessionId, body.Latitude, body.Longitude,
                    body.Accuracy, body.Speed, body.Heading, body.GpsTimestamp));
            return Ok(result);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("location/current")]
    public async Task<IActionResult> CurrentLocation([FromQuery] Guid sessionId)
    {
        if (Access.DriverId == null || Access.CompanyId == null) return Forbid();
        var session = await db.DriverTripSessions.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.CompanyId == Access.CompanyId);
        if (session == null) return NotFound();
        if (!string.Equals(session.DriverId, Access.DriverId, StringComparison.OrdinalIgnoreCase))
            return Forbid();

        var pos = await db.VehicleLastPositions.AsNoTracking()
            .FirstOrDefaultAsync(p => p.VehicleId == session.VehicleId);
        if (pos == null) return Ok(new { location = (object?)null });

        var staleMinutes = 15;
        var isStale = pos.RecordedAt < DateTime.UtcNow.AddMinutes(-staleMinutes);
        return Ok(new
        {
            location = new
            {
                vehicleId = pos.VehicleId,
                driverId = pos.DriverId,
                sessionId = session.Id,
                loadingSlipId = pos.LoadingSlipId,
                latitude = pos.Lat,
                longitude = pos.Lng,
                accuracy = pos.AccuracyMeters,
                speed = pos.SpeedKmh,
                heading = pos.Heading,
                gpsDateTime = pos.RecordedAt,
                serverReceivedDateTime = pos.UpdatedAt,
                trackingStatus = isStale ? "STALE" : pos.TrackingStatus,
                isStale,
                source = pos.Source,
            },
        });
    }

    [HttpGet("location/history")]
    public async Task<IActionResult> LocationHistory([FromQuery] Guid sessionId, [FromQuery] int? limit)
    {
        if (Access.DriverId == null || Access.CompanyId == null) return Forbid();
        var session = await db.DriverTripSessions.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.CompanyId == Access.CompanyId);
        if (session == null) return NotFound();
        if (!string.Equals(session.DriverId, Access.DriverId, StringComparison.OrdinalIgnoreCase))
            return Forbid();

        var take = Math.Clamp(limit ?? 200, 1, 2000);
        var points = await db.GpsTracks.AsNoTracking()
            .Where(t => t.VehicleId == session.VehicleId
                        && (session.LoadingSlipId == null || t.LoadingSlipId == session.LoadingSlipId)
                        && t.RecordedAt >= (session.StartedAt ?? session.CreatedAt))
            .OrderByDescending(t => t.RecordedAt)
            .Take(take)
            .Select(t => new
            {
                t.Id,
                t.VehicleId,
                t.DriverId,
                t.LoadingSlipId,
                latitude = t.Lat,
                longitude = t.Lng,
                accuracy = t.AccuracyMeters,
                speed = t.SpeedKmh,
                heading = t.Heading,
                gpsDateTime = t.RecordedAt,
                serverReceivedDateTime = t.CreatedAt,
                source = t.Source,
            })
            .ToListAsync();

        return Ok(new { sessionId, points });
    }
}

class DriverPortalUserContext
{
    public string Name { get; init; } = "";
    public string? DriverId { get; init; }
    public Guid? CompanyId { get; init; }

    public static DriverPortalUserContext Parse(ClaimsPrincipal user)
    {
        Guid? companyId = Guid.TryParse(user.FindFirst("company_id")?.Value, out var cid) ? cid : null;
        return new DriverPortalUserContext
        {
            Name = user.FindFirst("name")?.Value ?? user.Identity?.Name ?? "",
            DriverId = user.FindFirst("driver_id")?.Value,
            CompanyId = companyId,
        };
    }
}
