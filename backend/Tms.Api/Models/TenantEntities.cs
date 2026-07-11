namespace Tms.Api.Models;

public interface ITenantScoped
{
    Guid CompanyId { get; set; }
}

public class Company
{
    public Guid Id { get; set; }
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public string? LegalName { get; set; }
    public string? Gstin { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class SubscriptionPlan
{
    public Guid Id { get; set; }
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public decimal PriceInr { get; set; }
    public string BillingCycle { get; set; } = "monthly";
    public int? MaxUsers { get; set; }
    public int? MaxBookingsMonth { get; set; }
    public string FeaturesJson { get; set; } = "[]";
    public bool IsCustom { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CompanySubscription
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Company? Company { get; set; }
    public Guid PlanId { get; set; }
    public SubscriptionPlan? Plan { get; set; }
    public string Status { get; set; } = "active";
    public DateOnly StartedAt { get; set; }
    public DateOnly? ExpiresAt { get; set; }
    public decimal AmountInr { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CompanyUsage
{
    public Guid CompanyId { get; set; }
    public DateOnly UsageMonth { get; set; }
    public int BookingsCount { get; set; }
    public int UsersCount { get; set; }
}

public static class PlanFeatures
{
    public const string Booking = "booking";
    public const string Lr = "lr";
    public const string Billing = "billing";
    public const string Outstanding = "outstanding";
    public const string Accounting = "accounting";
    public const string Dashboard = "dashboard";
    public const string ProfitLoss = "profit_loss";
    public const string BalanceSheet = "balance_sheet";
    public const string Gst = "gst";
    public const string Export = "export";
    public const string MultiBranch = "multi_branch";
    public const string Api = "api";
    public const string Whatsapp = "whatsapp";
    public const string MobileApp = "mobile_app";
    public const string PrioritySupport = "priority_support";
}
