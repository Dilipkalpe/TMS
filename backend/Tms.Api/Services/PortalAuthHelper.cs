using Tms.Api.Models;

namespace Tms.Api.Services;

/// <summary>Portal auth helpers — SQL phone pre-filter before BCrypt verification.</summary>
public static class PortalAuthHelper
{
    public static string PhoneSuffix(string normalizedPhone) =>
        normalizedPhone.Length >= 10 ? normalizedPhone[^10..] : normalizedPhone;

    /// <summary>Reduces portal login candidates in SQL using last-10-digit suffix match.</summary>
    public static IQueryable<Customer> WherePortalPhoneMayMatch(IQueryable<Customer> query, string normalizedPhone)
    {
        var suffix = PhoneSuffix(normalizedPhone);
        var head = suffix.Length >= 5 ? suffix[..5] : suffix;
        var tail = suffix.Length > 5 ? suffix[5..] : "";

        return query.Where(c =>
            (c.PortalPhone != null && (c.PortalPhone.Contains(suffix) ||
                (tail != "" && c.PortalPhone.Contains(head) && c.PortalPhone.Contains(tail)))) ||
            (c.Phone != null && (c.Phone.Contains(suffix) ||
                (tail != "" && c.Phone.Contains(head) && c.Phone.Contains(tail)))));
    }

    /// <summary>Driver portal phone pre-filter (same last-10 digit heuristic as customers).</summary>
    public static IQueryable<Driver> WhereDriverPortalPhoneMayMatch(IQueryable<Driver> query, string normalizedPhone)
    {
        var suffix = PhoneSuffix(normalizedPhone);
        var head = suffix.Length >= 5 ? suffix[..5] : suffix;
        var tail = suffix.Length > 5 ? suffix[5..] : "";

        return query.Where(d =>
            (d.PortalPhone != null && (d.PortalPhone.Contains(suffix) ||
                (tail != "" && d.PortalPhone.Contains(head) && d.PortalPhone.Contains(tail)))) ||
            (d.Phone != null && (d.Phone.Contains(suffix) ||
                (tail != "" && d.Phone.Contains(head) && d.Phone.Contains(tail)))));
    }

    public static bool PhoneMatches(string? stored, string normalized) =>
        stored != null && NotificationTemplateRenderer.NormalizePhone(stored) == normalized;
}
