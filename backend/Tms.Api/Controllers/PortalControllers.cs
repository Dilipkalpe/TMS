using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
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

public record PortalLoginResponse(string Token, string Name, string Scope, string? CustomerId, string? BookingId, Guid? CompanyId);
public record PortalLoginRequest(string Phone, string Pin);
public record PortalTrackLoginRequest(string BookingId, string Phone);
public record PortalEnableRequest(bool Enabled, string? Pin, string? Phone);

[ApiController]
[Route("api/portal/auth")]
public class PortalAuthController(TmsDbContext db, IConfiguration config, IHostEnvironment env) : ControllerBase
{
    bool DemoEnabled => AppOptions.IsDemoDataEnabled(config, env);

    [HttpGet("demo-logins")]
    [AllowAnonymous]
    public async Task<IActionResult> DemoLogins()
    {
        if (!DemoEnabled) return NotFound();
        var rows = await db.Customers.AsNoTracking()
            .Include(c => c.Branch)
            .Where(c => c.CompanyId == TenantContext.DefaultCompanyId && c.PortalEnabled && c.PortalPinHash != null)
            .OrderBy(c => c.Branch!.Code)
            .ToListAsync();

        return Ok(rows.Select(c => new
        {
            branchCode = c.Branch?.Code ?? "—",
            branchName = c.Branch?.Name ?? "All branches",
            customerName = c.Name,
            customerId = c.Id,
            phone = c.PortalPhone ?? c.Phone,
            pin = DemoPinFor(c.Id),
            sampleBooking = SampleBookingFor(c.Id),
        }));
    }

    static string? DemoPinFor(string customerId) => customerId switch
    {
        "C-001" => "123456",
        "C-004" => "234567",
        "C-002" => "345678",
        _ => null,
    };

    static string? SampleBookingFor(string customerId) => customerId switch
    {
        "C-001" => "BK-1042",
        "C-004" => "BK-1039",
        "C-002" => "BK-1041",
        _ => null,
    };

    [AllowAnonymous]
    [EnableRateLimiting(AuthRateLimiting.PolicyName)]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] PortalLoginRequest body)
    {
        if (string.IsNullOrWhiteSpace(body.Phone) || string.IsNullOrWhiteSpace(body.Pin))
            return BadRequest(new { message = "Phone and PIN required" });

        var normalized = NotificationTemplateRenderer.NormalizePhone(body.Phone);
        var candidates = await PortalAuthHelper
            .WherePortalPhoneMayMatch(
                db.Customers.AsNoTracking().Where(c => c.PortalEnabled && c.PortalPinHash != null),
                normalized)
            .OrderBy(c => c.Id)
            .Take(20)
            .ToListAsync();
        var verified = candidates
            .Where(c => PortalAuthHelper.PhoneMatches(c.PortalPhone ?? c.Phone, normalized) &&
                        BCrypt.Net.BCrypt.Verify(body.Pin, c.PortalPinHash!))
            .ToList();

        if (verified.Count == 0)
            return Unauthorized(new { message = "Invalid phone or PIN" });
        if (verified.Count > 1)
            return Conflict(new { message = "Multiple accounts match this phone. Contact your transport company." });

        var customer = verified[0];
        var token = GenerateToken(customer.Name, "Customer", "customer", customer.Id, null, customer.CompanyId);
        return Ok(new PortalLoginResponse(token, customer.Name, "customer", customer.Id, null, customer.CompanyId));
    }

    [AllowAnonymous]
    [EnableRateLimiting(AuthRateLimiting.PolicyName)]
    [HttpPost("track")]
    public async Task<IActionResult> TrackLogin([FromBody] PortalTrackLoginRequest body)
    {
        if (string.IsNullOrWhiteSpace(body.BookingId) || string.IsNullOrWhiteSpace(body.Phone))
            return BadRequest(new { message = "Booking ID and phone required" });

        var booking = await db.Bookings.AsNoTracking().FirstOrDefaultAsync(b => b.Id == body.BookingId.Trim());
        var normalized = NotificationTemplateRenderer.NormalizePhone(body.Phone);
        if (booking == null || !await PhoneMatchesBookingAsync(booking, normalized))
            return NotFound(new { message = "Booking not found or phone does not match" });

        var token = GenerateToken(booking.CustomerName, "Customer", "booking", booking.CustomerId, booking.Id, booking.CompanyId);
        return Ok(new PortalLoginResponse(token, booking.CustomerName, "booking", booking.CustomerId, booking.Id, booking.CompanyId));
    }

    [Authorize(Policy = AuthorizationPolicies.PortalUser)]
    [HttpGet("me")]
    public IActionResult Me()
    {
        var ctx = PortalUserContext.Parse(User);
        return Ok(new { ctx.Name, ctx.Scope, ctx.CustomerId, ctx.BookingId, ctx.CompanyId, role = ctx.Role });
    }

    async Task<bool> PhoneMatchesBookingAsync(Booking booking, string normalizedPhone)
    {
        if (booking.CustomerId != null)
        {
            var customer = await db.Customers.FindAsync(booking.CustomerId);
            if (customer != null && PortalAuthHelper.PhoneMatches(customer.PortalPhone ?? customer.Phone, normalizedPhone))
                return true;
        }

        var suffix = PortalAuthHelper.PhoneSuffix(normalizedPhone);
        var head = suffix.Length >= 5 ? suffix[..5] : suffix;
        var tail = suffix.Length > 5 ? suffix[5..] : "";
        var byName = await db.Customers.AsNoTracking()
            .Where(c => c.CompanyId == booking.CompanyId && c.Name == booking.CustomerName)
            .Where(c =>
                (c.PortalPhone != null && (c.PortalPhone.Contains(suffix) ||
                    (tail != "" && c.PortalPhone.Contains(head) && c.PortalPhone.Contains(tail)))) ||
                (c.Phone != null && (c.Phone.Contains(suffix) ||
                    (tail != "" && c.Phone.Contains(head) && c.Phone.Contains(tail)))))
            .FirstOrDefaultAsync();
        return byName != null && PortalAuthHelper.PhoneMatches(byName.PortalPhone ?? byName.Phone, normalizedPhone);
    }

    string GenerateToken(string name, string role, string scope, string? customerId, string? bookingId, Guid companyId)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(AppConfiguration.ResolveJwtKey(config)));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, name),
            new(ClaimTypes.Role, role),
            new("portal_scope", scope),
            new("name", name),
            new("company_id", companyId.ToString()),
        };
        if (customerId != null) claims.Add(new Claim("customer_id", customerId));
        if (bookingId != null) claims.Add(new Claim("booking_id", bookingId));

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(config.GetValue("Portal:TokenExpireHours", 24)),
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

[Authorize(Policy = AuthorizationPolicies.PortalUser)]
[ApiController]
[Route("api/portal")]
public class PortalController(TmsDbContext db, CustomerTrackingService tracking, ITenantContext tenants) : ControllerBase
{
    PortalUserContext Access => PortalUserContext.Parse(User);

    Guid? ResolveCompanyId()
    {
        if (Access.CompanyId != null) return Access.CompanyId;
        return tenants.EffectiveCompanyId;
    }

    [HttpGet("shipments")]
    public async Task<IActionResult> Shipments()
    {
        if (!Access.CanUsePortal) return Forbid();
        var companyId = ResolveCompanyId();
        if (companyId == null) return Forbid();

        if (Access.IsStaff && Access.CustomerId == null && Access.BookingId == null
            && Access.Role is not ("Super Admin" or "Admin" or "Platform Super Admin"))
            return Forbid();

        var rows = await tracking.ListShipmentsAsync(companyId, Access.CustomerId, Access.BookingId);
        return Ok(rows);
    }

    [HttpGet("shipments/{id}/tracking")]
    public async Task<IActionResult> Tracking(string id)
    {
        if (!Access.CanUsePortal) return Forbid();
        var companyId = ResolveCompanyId();
        if (companyId == null) return Forbid();

        var data = await tracking.GetTrackingAsync(id, companyId, Access.CustomerId, Access.BookingId);
        return data == null ? NotFound() : Ok(data);
    }

    [HttpGet("invoices")]
    public async Task<IActionResult> Invoices()
    {
        if (!Access.CanUsePortal) return Forbid();
        var companyId = ResolveCompanyId();
        if (companyId == null) return Forbid();

        if (Access.IsStaff && Access.CustomerId == null && Access.BookingId == null
            && Access.Role is not ("Super Admin" or "Admin" or "Platform Super Admin"))
            return Forbid();

        var q = db.Invoices.AsNoTracking().Include(i => i.Customer).Include(i => i.Lines)
            .Where(i => i.CompanyId == companyId);
        if (Access.CustomerId != null)
            q = q.Where(i => i.CustomerId == Access.CustomerId);
        if (Access.BookingId != null)
            q = q.Where(i => i.BookingId == Access.BookingId);

        var rows = await q.OrderByDescending(i => i.IssuedAt).Take(50).ToListAsync();
        return Ok(rows.Select(PortalInvoiceMapper.Map));
    }

    [HttpGet("invoices/{id:guid}")]
    public async Task<IActionResult> InvoiceDetail(Guid id)
    {
        if (!Access.CanUsePortal) return Forbid();
        var companyId = ResolveCompanyId();
        if (companyId == null) return Forbid();

        var inv = await db.Invoices.AsNoTracking().Include(i => i.Customer).Include(i => i.Lines)
            .FirstOrDefaultAsync(i => i.Id == id && i.CompanyId == companyId);
        if (inv == null) return NotFound();
        if (Access.CustomerId != null && inv.CustomerId != Access.CustomerId) return NotFound();
        if (Access.BookingId != null && inv.BookingId != Access.BookingId) return NotFound();

        var company = await db.CompanySettings.AsNoTracking()
            .FirstOrDefaultAsync(c => c.CompanyId == companyId);
        return Ok(new { invoice = PortalInvoiceMapper.Map(inv), company });
    }

    [HttpGet("pod/{bookingId}")]
    public async Task<IActionResult> Pod(string bookingId)
    {
        if (!Access.CanUsePortal) return Forbid();
        if (Access.BookingId != null && Access.BookingId != bookingId) return NotFound();

        var companyId = ResolveCompanyId();
        if (companyId == null) return Forbid();

        var booking = await db.Bookings.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == bookingId && b.CompanyId == companyId);
        if (booking == null) return NotFound();
        if (Access.CustomerId != null && booking.CustomerId != Access.CustomerId) return NotFound();

        var pod = await db.ProofOfDeliveries.AsNoTracking()
            .FirstOrDefaultAsync(p => p.BookingId == bookingId && p.CompanyId == companyId);
        if (pod == null) return NotFound(new { message = "POD not available yet" });

        return Ok(new
        {
            shipment = new { booking.Id, booking.FromCity, booking.ToCity, booking.CustomerName },
            pod = new { pod.RecipientName, pod.OtpVerified, pod.DeliveredAt, pod.DeliveryLat, pod.DeliveryLng, pod.SignatureUrl, pod.PhotoUrl },
        });
    }

    [HttpPost("shipments/{id}/share-link")]
    public async Task<IActionResult> CreateShareLink(string id)
    {
        if (!Access.IsStaff && Access.BookingId != null && Access.BookingId != id)
            return Forbid();

        var companyId = ResolveCompanyId();
        if (companyId == null) return Forbid();

        var booking = await db.Bookings.FirstOrDefaultAsync(b => b.Id == id && b.CompanyId == companyId);
        if (booking == null) return NotFound();
        if (Access.CustomerId != null && booking.CustomerId != Access.CustomerId) return NotFound();

        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(24)).ToLowerInvariant();
        var row = new BookingTrackingToken
        {
            Id = Guid.NewGuid(),
            BookingId = id,
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
        };
        db.BookingTrackingTokens.Add(row);
        await db.SaveChangesAsync();
        return Ok(new { token, expiresAt = row.ExpiresAt, path = $"/portal/shared/{id}?token={token}" });
    }
}

[ApiController]
[Route("api/portal/public")]
public class PortalPublicController(TmsDbContext db, CustomerTrackingService tracking) : ControllerBase
{
    [HttpGet("track/{bookingId}")]
    public async Task<IActionResult> PublicTrack(string bookingId, [FromQuery] string token)
    {
        if (string.IsNullOrWhiteSpace(token)) return BadRequest(new { message = "Token required" });

        var link = await db.BookingTrackingTokens.FirstOrDefaultAsync(t =>
            t.BookingId == bookingId && t.Token == token && t.ExpiresAt > DateTime.UtcNow);
        if (link == null) return Unauthorized(new { message = "Invalid or expired tracking link" });

        var booking = await db.Bookings.AsNoTracking().FirstOrDefaultAsync(b => b.Id == bookingId);
        if (booking == null) return NotFound();

        var data = await tracking.GetTrackingAsync(bookingId, booking.CompanyId, null, bookingId);
        return data == null ? NotFound() : Ok(data);
    }
}

class PortalUserContext
{
    public string Name { get; init; } = "";
    public string Role { get; init; } = "";
    public string Scope { get; init; } = "";
    public string? CustomerId { get; init; }
    public string? BookingId { get; init; }
    public Guid? CompanyId { get; init; }
    public bool IsStaff => Role is not "Customer";
    public bool CanUsePortal => IsStaff || Scope is "customer" or "booking";

    public static PortalUserContext Parse(System.Security.Claims.ClaimsPrincipal user)
    {
        var role = user.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "";
        Guid? companyId = Guid.TryParse(user.FindFirst("company_id")?.Value, out var cid) ? cid : null;
        return new PortalUserContext
        {
            Name = user.FindFirst("name")?.Value ?? user.Identity?.Name ?? "",
            Role = role,
            Scope = user.FindFirst("portal_scope")?.Value ?? (role == "Customer" ? "customer" : "staff"),
            CustomerId = user.FindFirst("customer_id")?.Value,
            BookingId = user.FindFirst("booking_id")?.Value,
            CompanyId = companyId,
        };
    }
}

static class PortalInvoiceMapper
{
    public static object Map(Invoice i) => new
    {
        i.Id, i.InvoiceNo, i.CustomerId, i.BookingId, i.Status,
        i.Amount, i.TaxAmount, i.TotalAmount, i.IssuedAt, i.DueAt, i.PaidAt,
        customer = i.Customer == null ? null : new { i.Customer.Id, i.Customer.Name, i.Customer.Gst, i.Customer.Address },
        lines = i.Lines.Select(l => new { l.Id, l.Description, l.Quantity, l.UnitPrice, l.Amount }).ToList(),
    };
}
