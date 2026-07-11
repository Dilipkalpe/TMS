namespace Tms.Api.Services;

public static class NotificationTemplateRenderer
{
    public static string Render(string template, IReadOnlyDictionary<string, string> variables)
    {
        var result = template;
        foreach (var (key, value) in variables)
            result = result.Replace("{{" + key + "}}", value ?? "", StringComparison.OrdinalIgnoreCase);
        return result;
    }

    public static string NormalizePhone(string phone, string defaultCountryCode = "91")
    {
        var digits = new string(phone.Where(char.IsDigit).ToArray());
        if (digits.StartsWith("0")) digits = digits[1..];
        if (digits.Length == 10) return defaultCountryCode + digits;
        if (digits.StartsWith(defaultCountryCode)) return digits;
        return digits;
    }
}

public record NotificationSendResult(bool Success, string? ProviderMessageId, string? Error, string Provider);

public interface INotificationChannelSender
{
    string ProviderName { get; }
    bool SupportsChannel(string channel);
    Task<NotificationSendResult> SendAsync(string normalizedPhone, string message, CancellationToken ct = default);
}

public class Msg91NotificationSender(IConfiguration config, IHttpClientFactory httpFactory, ILogger<Msg91NotificationSender> logger) : INotificationChannelSender
{
    public string ProviderName => "MSG91";

    public bool SupportsChannel(string channel) =>
        channel.Equals("SMS", StringComparison.OrdinalIgnoreCase) ||
        channel.Equals("WHATSAPP", StringComparison.OrdinalIgnoreCase);

    public async Task<NotificationSendResult> SendAsync(string normalizedPhone, string message, CancellationToken ct = default)
    {
        var authKey = config["Notifications:Msg91:AuthKey"];
        if (string.IsNullOrWhiteSpace(authKey))
            return StubSend(normalizedPhone, message);

        var sender = config["Notifications:Msg91:SenderId"] ?? "TMSPro";
        var route = config["Notifications:Msg91:Route"] ?? "4";

        try
        {
            var client = httpFactory.CreateClient("Msg91");
            var url =
                $"https://control.msg91.com/api/sendhttp.php?authkey={Uri.EscapeDataString(authKey)}&mobiles={normalizedPhone}&message={Uri.EscapeDataString(message)}&sender={Uri.EscapeDataString(sender)}&route={route}&country=0";
            var response = await client.GetStringAsync(url, ct);
            var trimmed = response.Trim();
            if (trimmed.Contains("error", StringComparison.OrdinalIgnoreCase) ||
                trimmed.Contains("invalid", StringComparison.OrdinalIgnoreCase))
            {
                logger.LogWarning("MSG91 send failed: {Response}", trimmed);
                return new NotificationSendResult(false, null, trimmed, ProviderName);
            }
            return new NotificationSendResult(true, trimmed, null, ProviderName);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "MSG91 HTTP error");
            return new NotificationSendResult(false, null, ex.Message, ProviderName);
        }
    }

    static NotificationSendResult StubSend(string phone, string message) =>
        new(true, $"STUB-{Guid.NewGuid():N}"[..20], null, "STUB");
}

public class NotificationChannelRouter(IEnumerable<INotificationChannelSender> senders)
{
    public INotificationChannelSender Resolve(string channel) =>
        senders.FirstOrDefault(s => s.SupportsChannel(channel))
        ?? senders.First();
}
