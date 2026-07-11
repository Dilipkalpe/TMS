using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;
using Tms.Api.Services;

namespace Tms.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/notifications")]
public class NotificationsController(TmsDbContext db, ITenantContext tenants) : ControllerBase
{
    Guid RequireCompanyId() =>
        tenants.EffectiveCompanyId ?? throw new InvalidOperationException("Company context required.");

    async Task<Guid?> CurrentUserId()
    {
        var username = User.Identity?.Name;
        if (username == null) return null;
        return (await db.Users.FirstOrDefaultAsync(u => u.Username == username))?.Id;
    }

    async Task<NotificationChannelSettings> GetOrCreateChannelSettingsAsync(CancellationToken ct = default)
    {
        var companyId = RequireCompanyId();
        var s = await db.NotificationChannelSettings.FirstOrDefaultAsync(x => x.CompanyId == companyId, ct);
        if (s != null) return s;
        s = new NotificationChannelSettings { CompanyId = companyId, UpdatedAt = DateTime.UtcNow };
        db.NotificationChannelSettings.Add(s);
        await db.SaveChangesAsync(ct);
        return s;
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var uid = await CurrentUserId();
        var q = tenants.Filter(db.Notifications.AsQueryable());
        if (uid != null) q = q.Where(n => n.UserId == null || n.UserId == uid);
        return Ok(await q.OrderByDescending(n => n.SentAt).Take(50).ToListAsync());
    }

    [HttpPatch("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        var n = await tenants.Filter(db.Notifications.AsQueryable()).FirstOrDefaultAsync(x => x.Id == id);
        if (n == null) return NotFound();
        n.Status = "READ";
        n.ReadAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("templates")]
    public async Task<IActionResult> Templates() =>
        Ok(await tenants.Filter(db.NotificationTemplates.AsQueryable())
            .OrderBy(t => t.Code).ThenBy(t => t.Channel).ToListAsync());

    [HttpPut("templates/{id:guid}")]
    public async Task<IActionResult> UpdateTemplate(Guid id, [FromBody] UpdateTemplateBody body)
    {
        var t = await tenants.Filter(db.NotificationTemplates.AsQueryable()).FirstOrDefaultAsync(x => x.Id == id);
        if (t == null) return NotFound();
        if (body.BodyTemplate != null) t.BodyTemplate = body.BodyTemplate;
        if (body.Subject != null) t.Subject = body.Subject;
        if (body.IsActive != null) t.IsActive = body.IsActive.Value;
        t.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(t);
    }

    [HttpGet("outbox")]
    public async Task<IActionResult> Outbox([FromQuery] string? status, [FromQuery] int limit = 50)
    {
        var q = tenants.Filter(db.NotificationOutbox.AsQueryable());
        if (!string.IsNullOrEmpty(status)) q = q.Where(o => o.Status == status.ToUpperInvariant());
        return Ok(await q.OrderByDescending(o => o.CreatedAt).Take(Math.Min(limit, 200)).ToListAsync());
    }

    [HttpGet("channel-settings")]
    public async Task<IActionResult> ChannelSettings() =>
        Ok(await GetOrCreateChannelSettingsAsync());

    [HttpPut("channel-settings")]
    public async Task<IActionResult> UpdateChannelSettings([FromBody] UpdateChannelSettingsBody body)
    {
        var s = await GetOrCreateChannelSettingsAsync();
        if (body.SmsEnabled != null) s.SmsEnabled = body.SmsEnabled.Value;
        if (body.WhatsappEnabled != null) s.WhatsappEnabled = body.WhatsappEnabled.Value;
        if (body.AdminPhone != null) s.AdminPhone = body.AdminPhone;
        if (body.DefaultCountryCode != null) s.DefaultCountryCode = body.DefaultCountryCode;
        s.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(s);
    }

    [HttpGet("preferences")]
    public async Task<IActionResult> Preferences() =>
        Ok(await tenants.Filter(db.NotificationPreferences.AsQueryable())
            .OrderBy(p => p.EventCode).ThenBy(p => p.Channel).ToListAsync());

    [HttpPut("preferences")]
    public async Task<IActionResult> SavePreferences([FromBody] List<PreferenceItem> items)
    {
        var companyId = RequireCompanyId();
        foreach (var item in items)
        {
            var existing = await tenants.Filter(db.NotificationPreferences.AsQueryable()).FirstOrDefaultAsync(p =>
                p.EntityType == "SYSTEM" && p.EntityId == "default" &&
                p.EventCode == item.EventCode && p.Channel == item.Channel);
            if (existing == null)
            {
                db.NotificationPreferences.Add(new NotificationPreference
                {
                    Id = Guid.NewGuid(),
                    CompanyId = companyId,
                    EntityType = "SYSTEM",
                    EntityId = "default",
                    EventCode = item.EventCode,
                    Channel = item.Channel,
                    Enabled = item.Enabled,
                });
            }
            else existing.Enabled = item.Enabled;
        }
        await db.SaveChangesAsync();
        return Ok(await tenants.Filter(db.NotificationPreferences.AsQueryable()).ToListAsync());
    }

    [HttpPost("send-test")]
    public async Task<IActionResult> SendTest([FromBody] SendTestBody body, [FromServices] NotificationOutboxProcessor processor)
    {
        if (string.IsNullOrWhiteSpace(body.Phone) || string.IsNullOrWhiteSpace(body.Message))
            return BadRequest(new { message = "Phone and message required" });

        var companyId = RequireCompanyId();
        var settings = await GetOrCreateChannelSettingsAsync();
        db.NotificationOutbox.Add(new NotificationOutbox
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            TemplateCode = "TEST",
            Channel = body.Channel?.ToUpperInvariant() ?? "SMS",
            RecipientPhone = NotificationTemplateRenderer.NormalizePhone(body.Phone, settings.DefaultCountryCode),
            MessageBody = body.Message,
            Status = "PENDING",
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
        await processor.ProcessPendingAsync();
        var latest = await tenants.Filter(db.NotificationOutbox.AsQueryable())
            .OrderByDescending(o => o.CreatedAt).FirstAsync();
        return Ok(new { latest.Status, latest.ProviderMessageId, latest.ErrorMessage });
    }

    public record UpdateTemplateBody(string? Subject, string? BodyTemplate, bool? IsActive);
    public record UpdateChannelSettingsBody(bool? SmsEnabled, bool? WhatsappEnabled, string? AdminPhone, string? DefaultCountryCode);
    public record PreferenceItem(string EventCode, string Channel, bool Enabled);
    public record SendTestBody(string Phone, string Message, string? Channel);
}
