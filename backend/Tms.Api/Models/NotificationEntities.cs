namespace Tms.Api.Models;

public class NotificationTemplate : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string Code { get; set; } = "";
    public string Channel { get; set; } = "";
    public string Language { get; set; } = "en";
    public string? Subject { get; set; }
    public string BodyTemplate { get; set; } = "";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class NotificationOutbox : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string? TemplateCode { get; set; }
    public string Channel { get; set; } = "";
    public string RecipientPhone { get; set; } = "";
    public string? RecipientName { get; set; }
    public string MessageBody { get; set; } = "";
    public string? Payload { get; set; }
    public string Status { get; set; } = "PENDING";
    public string? Provider { get; set; }
    public string? ProviderMessageId { get; set; }
    public string? ErrorMessage { get; set; }
    public int AttemptCount { get; set; }
    public DateTime? SentAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class NotificationPreference : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string EntityType { get; set; } = "SYSTEM";
    public string EntityId { get; set; } = "default";
    public string EventCode { get; set; } = "";
    public string Channel { get; set; } = "";
    public bool Enabled { get; set; } = true;
}

public class NotificationChannelSettings : ITenantScoped
{
    public int Id { get; set; } = 1;
    public Guid CompanyId { get; set; }
    public bool SmsEnabled { get; set; } = true;
    public bool WhatsappEnabled { get; set; } = true;
    public string? AdminPhone { get; set; }
    public string DefaultCountryCode { get; set; } = "91";
    public DateTime UpdatedAt { get; set; }
}
