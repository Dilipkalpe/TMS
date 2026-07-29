using System.Net.Http.Json;

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
        {
            logger.LogWarning("MSG91 AuthKey not configured — notification to {Phone} sent as STUB (not actually delivered). Set Notifications:Msg91:AuthKey to enable real SMS/WhatsApp.", normalizedPhone);
            return StubSend(normalizedPhone, message);
        }

        var sender = config["Notifications:Msg91:SenderId"] ?? "TMSPro";
        var route = config["Notifications:Msg91:Route"] ?? "4";
        var flowId = config["Notifications:Msg91:FlowId"];
        var useFlowApi = !string.IsNullOrWhiteSpace(flowId);

        try
        {
            var client = httpFactory.CreateClient("Msg91");

            if (useFlowApi)
            {
                var payload = new
                {
                    flow_id = flowId,
                    sender,
                    mobiles = normalizedPhone,
                    VAR1 = message,
                };
                var request = new HttpRequestMessage(HttpMethod.Post, "https://control.msg91.com/api/v5/flow/")
                {
                    Content = JsonContent.Create(payload),
                };
                request.Headers.Add("authkey", authKey);
                var resp = await client.SendAsync(request, ct);
                var body = await resp.Content.ReadAsStringAsync(ct);
                if (!resp.IsSuccessStatusCode)
                {
                    logger.LogWarning("MSG91 Flow API failed ({StatusCode}): {Body}", resp.StatusCode, body);
                    return new NotificationSendResult(false, null, body, ProviderName);
                }
                logger.LogInformation("MSG91 Flow API sent to {Phone}: {Response}", normalizedPhone, body);
                return new NotificationSendResult(true, body.Trim(), null, ProviderName);
            }

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
            logger.LogError(ex, "MSG91 HTTP error sending to {Phone}", normalizedPhone);
            return new NotificationSendResult(false, null, ex.Message, ProviderName);
        }
    }

    static NotificationSendResult StubSend(string phone, string message) =>
        new(true, $"STUB-{Guid.NewGuid():N}"[..20], null, "STUB");
}

public class SmtpEmailNotificationSender(IConfiguration config, ILogger<SmtpEmailNotificationSender> logger) : INotificationChannelSender
{
    public string ProviderName => "SMTP";

    public bool SupportsChannel(string channel) =>
        channel.Equals("EMAIL", StringComparison.OrdinalIgnoreCase);

    public async Task<NotificationSendResult> SendAsync(string recipient, string message, CancellationToken ct = default)
    {
        var host = config["Notifications:Smtp:Host"];
        if (string.IsNullOrWhiteSpace(host))
        {
            logger.LogWarning("SMTP Host not configured — email to {Recipient} sent as STUB. Set Notifications:Smtp:Host to enable real email delivery.", recipient);
            return new NotificationSendResult(true, $"STUB-EMAIL-{Guid.NewGuid():N}"[..24], null, "STUB-EMAIL");
        }

        var port = config.GetValue("Notifications:Smtp:Port", 587);
        var username = config["Notifications:Smtp:Username"] ?? "";
        var password = config["Notifications:Smtp:Password"] ?? "";
        var fromAddress = config["Notifications:Smtp:From"] ?? "noreply@tmspro.in";
        var fromName = config["Notifications:Smtp:FromName"] ?? "TMS Pro";
        var useSsl = config.GetValue("Notifications:Smtp:UseSsl", true);

        try
        {
            using var client = new System.Net.Mail.SmtpClient(host, port)
            {
                Credentials = string.IsNullOrWhiteSpace(username) ? null : new System.Net.NetworkCredential(username, password),
                EnableSsl = useSsl,
                Timeout = 15_000,
            };
            var from = new System.Net.Mail.MailAddress(fromAddress, fromName);
            var to = new System.Net.Mail.MailAddress(recipient);
            using var mail = new System.Net.Mail.MailMessage(from, to)
            {
                Subject = ExtractSubject(message),
                Body = message,
                IsBodyHtml = message.Contains('<'),
            };
            await client.SendMailAsync(mail, ct);
            var messageId = $"SMTP-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid():N}"[..30];
            logger.LogInformation("Email sent to {Recipient} via SMTP ({Host}:{Port})", recipient, host, port);
            return new NotificationSendResult(true, messageId, null, ProviderName);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SMTP send failed to {Recipient}", recipient);
            return new NotificationSendResult(false, null, ex.Message, ProviderName);
        }
    }

    static string ExtractSubject(string message)
    {
        if (message.StartsWith("Subject:", StringComparison.OrdinalIgnoreCase))
        {
            var nlIdx = message.IndexOfAny(['\r', '\n']);
            return nlIdx > 8 ? message[8..nlIdx].Trim() : message[8..].Trim();
        }
        return message.Length > 80 ? message[..77] + "..." : message;
    }
}

public class NotificationChannelRouter(IEnumerable<INotificationChannelSender> senders)
{
    public INotificationChannelSender Resolve(string channel) =>
        senders.FirstOrDefault(s => s.SupportsChannel(channel))
        ?? senders.First();
}
