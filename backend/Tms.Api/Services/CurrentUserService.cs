using System.Security.Claims;

namespace Tms.Api.Services;

/// <summary>Resolves the authenticated actor for audit stamps (CBy / MBy).</summary>
public interface ICurrentUser
{
    bool IsAuthenticated { get; }
    string? UserId { get; }
    string? Username { get; }
    /// <summary>Display name for audit columns (FullName). Never empty — falls back to username then "system".</summary>
    string DisplayName { get; }
}

/// <summary>Reads JWT claims via <see cref="IHttpContextAccessor"/> (safe as singleton).</summary>
public sealed class CurrentUserService(IHttpContextAccessor http) : ICurrentUser
{
    public bool IsAuthenticated => http.HttpContext?.User?.Identity?.IsAuthenticated == true;

    public string? UserId
    {
        get
        {
            var v = http.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            return string.IsNullOrWhiteSpace(v) ? null : v.Trim();
        }
    }

    public string? Username
    {
        get
        {
            var user = http.HttpContext?.User;
            if (user == null) return null;
            var v = user.FindFirstValue("username")
                ?? user.Identity?.Name
                ?? user.FindFirstValue(ClaimTypes.Name);
            return string.IsNullOrWhiteSpace(v) ? null : v.Trim();
        }
    }

    public string DisplayName
    {
        get
        {
            var user = http.HttpContext?.User;
            if (user?.Identity?.IsAuthenticated != true)
                return "system";

            // Prefer explicit display-name claims from login JWT.
            foreach (var type in new[] { "full_name", ClaimTypes.GivenName, "name" })
            {
                var v = user.FindFirstValue(type);
                if (!string.IsNullOrWhiteSpace(v))
                    return v.Trim();
            }

            var username = Username;
            if (!string.IsNullOrWhiteSpace(username))
                return username;

            return UserId ?? "system";
        }
    }
}
