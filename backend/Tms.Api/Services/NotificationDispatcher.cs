using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public class DispatchNotificationRequest
{
    public string EventCode { get; set; } = "";
    public string Title { get; set; } = "";
    public string? Body { get; set; }
    public Dictionary<string, string> Variables { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public string? Metadata { get; set; }
    public Guid? UserId { get; set; }
    public string? SmsPhone { get; set; }
    public string? WhatsAppPhone { get; set; }
    public string? RecipientName { get; set; }
    public Guid? CompanyId { get; set; }
}

public class NotificationDispatcher(TmsDbContext db, IConfiguration config, ITenantContext tenants)
{
    Guid ResolveCompanyId(DispatchNotificationRequest request) =>
        request.CompanyId ?? tenants.AssignCompanyId ?? TenantContext.DefaultCompanyId;

    public async Task DispatchAsync(DispatchNotificationRequest request, CancellationToken ct = default)
    {
        var companyId = ResolveCompanyId(request);
        var settings = await GetChannelSettingsAsync(companyId, ct);
        var now = DateTime.UtcNow;

        var inAppBody = request.Body ?? await RenderTemplateAsync(request.EventCode, "IN_APP", request.Variables, companyId, ct)
            ?? request.Title;

        db.Notifications.Add(new Notification
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            UserId = request.UserId,
            Channel = "IN_APP",
            Title = request.Title,
            Body = inAppBody,
            Status = "UNREAD",
            Metadata = request.Metadata,
            SentAt = now,
        });

        if (settings.SmsEnabled && await IsChannelEnabledAsync(request.EventCode, "SMS", companyId, ct))
        {
            var phone = request.SmsPhone ?? settings.AdminPhone ?? await GetCompanyPhoneAsync(companyId, ct);
            if (!string.IsNullOrWhiteSpace(phone))
                await QueueExternalAsync(request, "SMS", phone, settings, companyId, ct);
        }

        if (settings.WhatsappEnabled && await IsChannelEnabledAsync(request.EventCode, "WHATSAPP", companyId, ct))
        {
            var phone = request.WhatsAppPhone ?? request.SmsPhone ?? settings.AdminPhone ?? await GetCompanyPhoneAsync(companyId, ct);
            if (!string.IsNullOrWhiteSpace(phone))
                await QueueExternalAsync(request, "WHATSAPP", phone, settings, companyId, ct);
        }
    }

    async Task QueueExternalAsync(
        DispatchNotificationRequest request, string channel, string phone,
        NotificationChannelSettings settings, Guid companyId, CancellationToken ct)
    {
        var rendered = await RenderTemplateAsync(request.EventCode, channel, request.Variables, companyId, ct)
            ?? request.Body ?? request.Title;

        if (await WasRecentlyQueuedAsync(request.EventCode, channel, phone, rendered, settings.DefaultCountryCode, companyId, ct))
            return;

        db.NotificationOutbox.Add(new NotificationOutbox
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            TemplateCode = request.EventCode,
            Channel = channel,
            RecipientPhone = NotificationTemplateRenderer.NormalizePhone(phone, settings.DefaultCountryCode),
            RecipientName = request.RecipientName,
            MessageBody = rendered,
            Payload = request.Metadata,
            Status = "PENDING",
            CreatedAt = DateTime.UtcNow,
        });
    }

    async Task<bool> WasRecentlyQueuedAsync(string eventCode, string channel, string phone, string body, string countryCode, Guid companyId, CancellationToken ct)
    {
        var normalized = NotificationTemplateRenderer.NormalizePhone(phone, countryCode);
        var since = DateTime.UtcNow.AddMinutes(-config.GetValue("Notifications:DuplicateWindowMinutes", 5));
        return await db.NotificationOutbox.AnyAsync(o =>
            o.CompanyId == companyId &&
            o.TemplateCode == eventCode &&
            o.Channel == channel &&
            o.RecipientPhone == normalized &&
            o.MessageBody == body &&
            o.CreatedAt >= since, ct);
    }

    async Task<string?> RenderTemplateAsync(string eventCode, string channel, Dictionary<string, string> vars, Guid companyId, CancellationToken ct)
    {
        var tpl = await db.NotificationTemplates.AsNoTracking()
            .FirstOrDefaultAsync(t => t.CompanyId == companyId && t.Code == eventCode && t.Channel == channel && t.IsActive, ct);
        return tpl == null ? null : NotificationTemplateRenderer.Render(tpl.BodyTemplate, vars);
    }

    async Task<bool> IsChannelEnabledAsync(string eventCode, string channel, Guid companyId, CancellationToken ct)
    {
        var pref = await db.NotificationPreferences.AsNoTracking()
            .FirstOrDefaultAsync(p =>
                p.CompanyId == companyId &&
                p.EntityType == "SYSTEM" && p.EntityId == "default" &&
                p.EventCode == eventCode && p.Channel == channel, ct);
        return pref?.Enabled ?? true;
    }

    async Task<NotificationChannelSettings> GetChannelSettingsAsync(Guid companyId, CancellationToken ct)
    {
        var s = await db.NotificationChannelSettings.FirstOrDefaultAsync(x => x.CompanyId == companyId, ct);
        if (s != null) return s;
        s = new NotificationChannelSettings { CompanyId = companyId, UpdatedAt = DateTime.UtcNow };
        db.NotificationChannelSettings.Add(s);
        await db.SaveChangesAsync(ct);
        return s;
    }

    async Task<string?> GetCompanyPhoneAsync(Guid companyId, CancellationToken ct)
    {
        var company = await db.CompanySettings.AsNoTracking().FirstOrDefaultAsync(c => c.CompanyId == companyId, ct);
        return company?.Phone;
    }
}

public class NotificationOutboxProcessor(
    IServiceScopeFactory scopeFactory,
    NotificationChannelRouter router,
    IConfiguration config,
    ILogger<NotificationOutboxProcessor> logger)
{
    static DateTime _lastMaintenanceCheck = DateTime.UtcNow;

    public async Task ProcessPendingAsync(CancellationToken ct = default)
    {
        if (!config.GetValue("Notifications:Enabled", true)) return;

        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TmsDbContext>();
        var maxAttempts = config.GetValue("Notifications:MaxAttempts", 3);
        var batchSize = config.GetValue("Notifications:BatchSize", 20);

        var pending = await db.NotificationOutbox
            .Where(o => o.Status == "PENDING" && o.AttemptCount < maxAttempts)
            .OrderBy(o => o.CreatedAt)
            .Take(batchSize)
            .ToListAsync(ct);

        foreach (var item in pending)
        {
            item.AttemptCount++;
            var sender = router.Resolve(item.Channel);
            var result = await sender.SendAsync(item.RecipientPhone, item.MessageBody, ct);

            if (result.Success)
            {
                item.Status = "SENT";
                item.Provider = result.Provider;
                item.ProviderMessageId = result.ProviderMessageId;
                item.SentAt = DateTime.UtcNow;
                item.ErrorMessage = null;
            }
            else
            {
                item.ErrorMessage = result.Error;
                item.Status = item.AttemptCount >= maxAttempts ? "FAILED" : "PENDING";
            }
        }

        if (pending.Count > 0)
        {
            await db.SaveChangesAsync(ct);
            var failed = pending.Count(o => o.Status == "FAILED" || (o.Status == "PENDING" && o.AttemptCount > 1));
            if (failed > 0)
                logger.LogWarning("Notification outbox: {Failed} of {Total} items need retry or failed", failed, pending.Count);
        }

        await ProcessMaintenanceAlertsAsync(scope, ct);
    }

    async Task ProcessMaintenanceAlertsAsync(IServiceScope scope, CancellationToken ct)
    {
        if (!config.GetValue("Notifications:MaintenanceAlertsEnabled", true)) return;

        var intervalHours = config.GetValue("Notifications:MaintenanceCheckIntervalHours", 6);
        if (DateTime.UtcNow - _lastMaintenanceCheck < TimeSpan.FromHours(intervalHours))
            return;
        _lastMaintenanceCheck = DateTime.UtcNow;

        var db = scope.ServiceProvider.GetRequiredService<TmsDbContext>();
        var dispatcher = scope.ServiceProvider.GetRequiredService<NotificationDispatcher>();

        var companyIds = await db.Companies.AsNoTracking().Select(c => c.Id).ToListAsync(ct);
        var anyAlerts = false;

        foreach (var companyId in companyIds)
        {
            var tenant = new FixedTenantContext(companyId);
            var maintenance = new MaintenanceService(db, tenant);

            var predictions = await maintenance.ComputePredictionsAsync(ct);
            foreach (var p in predictions.Where(x => x.RiskLevel == "HIGH").Take(3))
            {
                await dispatcher.DispatchAsync(new DispatchNotificationRequest
                {
                    CompanyId = companyId,
                    EventCode = "MAINT_HIGH_RISK",
                    Title = $"High maintenance risk: {p.RegistrationNo}",
                    Variables = new Dictionary<string, string>
                    {
                        ["vehicleNo"] = p.RegistrationNo,
                        ["riskScore"] = p.RiskScore.ToString(),
                        ["factors"] = string.Join("; ", p.Factors.Take(3)),
                    },
                }, ct);
                anyAlerts = true;
            }

            var horizon = DateTime.UtcNow.AddDays(7);
            var due = await TenantScope.MaintenanceSchedules(db, tenant)
                .Include(s => s.Vehicle)
                .Where(s => s.IsActive && s.NextDueAt != null && s.NextDueAt <= horizon)
                .OrderBy(s => s.NextDueAt)
                .Take(5)
                .ToListAsync(ct);

            foreach (var s in due)
            {
                await dispatcher.DispatchAsync(new DispatchNotificationRequest
                {
                    CompanyId = companyId,
                    EventCode = "MAINT_DUE",
                    Title = $"Service due: {s.Vehicle?.Number}",
                    Variables = new Dictionary<string, string>
                    {
                        ["vehicleNo"] = s.Vehicle?.Number ?? s.VehicleId,
                        ["serviceType"] = s.ServiceType,
                        ["dueDate"] = s.NextDueAt?.ToLocalTime().ToString("dd MMM yyyy") ?? "soon",
                    },
                }, ct);
                anyAlerts = true;
            }
        }

        if (anyAlerts)
            await db.SaveChangesAsync(ct);
    }
}

public class NotificationOutboxWorker(
    IServiceScopeFactory scopeFactory,
    IConfiguration config,
    ILogger<NotificationOutboxWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = TimeSpan.FromSeconds(config.GetValue("Notifications:ProcessIntervalSeconds", 30));
        logger.LogInformation("Notification outbox worker started (interval {Interval}s)", interval.TotalSeconds);

        // Let the API accept HTTP requests before the first background batch.
        await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var processor = scope.ServiceProvider.GetRequiredService<NotificationOutboxProcessor>();
                await processor.ProcessPendingAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Notification outbox processing failed");
            }
            await Task.Delay(interval, stoppingToken);
        }
    }
}
