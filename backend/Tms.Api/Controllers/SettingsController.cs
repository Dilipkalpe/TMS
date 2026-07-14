using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;
using Tms.Api.Services;

namespace Tms.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/settings")]
public class SettingsController(TmsDbContext db, ITenantContext tenants, IWebHostEnvironment env, DocumentFlowService documentFlow) : ControllerBase
{
    private static readonly string[] AllowedLogoExtensions = [".png", ".jpg", ".jpeg", ".svg", ".webp"];
    private const long MaxLogoBytes = 2 * 1024 * 1024;

    [HttpGet]
    public async Task<ActionResult<object>> Get(CancellationToken ct)
    {
        var flow = await documentFlow.GetFlowAsync(ct);
        var s = await FindSettingsAsync(ct);
        if (s == null)
        {
            return Ok(new
            {
                companyName = "TMS Pro Logistics Pvt Ltd",
                financialYear = "2025-26",
                gstRate = 18,
                documentFlow = flow,
                documentFlowLabel = DocumentFlow.DisplayLabel(flow),
            });
        }

        return Ok(new
        {
            companyName = s.CompanyName,
            address = s.Address,
            gstin = s.Gstin,
            pan = s.Pan,
            financialYear = s.FinancialYear,
            gstRate = s.GstRate,
            logoUrl = s.LogoUrl,
            phone = s.Phone ?? "+91 22 1234 5678",
            email = s.Email ?? "info@tmstransport.com",
            transportLicenseNo = s.TransportLicenseNo,
            fleetSize = s.FleetSize,
            documentFlow = DocumentFlow.Normalize(s.DocumentFlow),
            documentFlowLabel = DocumentFlow.DisplayLabel(s.DocumentFlow),
            gstType = "Regular",
            stateCode = "27 - Maharashtra",
            yearStart = "2025-04-01",
            yearEnd = "2026-03-31"
        });
    }

    [HttpGet("document-flow")]
    public async Task<ActionResult<object>> GetDocumentFlow(CancellationToken ct)
    {
        var flow = await documentFlow.GetFlowAsync(ct);
        return Ok(new
        {
            documentFlow = flow,
            documentFlowLabel = DocumentFlow.DisplayLabel(flow),
            options = new[]
            {
                new { value = DocumentFlow.FirstLRThenBooking, label = DocumentFlow.DisplayLabel(DocumentFlow.FirstLRThenBooking) },
                new { value = DocumentFlow.FirstBookingThenLR, label = DocumentFlow.DisplayLabel(DocumentFlow.FirstBookingThenLR) },
            },
        });
    }

    [HttpPut("document-flow")]
    public async Task<ActionResult<object>> PutDocumentFlow([FromBody] DocumentFlowRequest body, CancellationToken ct)
    {
        try
        {
            await documentFlow.SetFlowAsync(body.DocumentFlow, ct);
            var flow = await documentFlow.GetFlowAsync(ct);
            return Ok(new
            {
                message = "Document flow preference saved.",
                documentFlow = flow,
                documentFlowLabel = DocumentFlow.DisplayLabel(flow),
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut]
    public async Task<ActionResult<object>> Update([FromBody] Dictionary<string, object?> body, CancellationToken ct)
    {
        var s = await GetOrCreateSettings();
        if (body.ContainsKey("companyName")) s.CompanyName = body["companyName"]?.ToString();
        if (body.ContainsKey("address")) s.Address = body["address"]?.ToString();
        if (body.ContainsKey("gstin")) s.Gstin = body["gstin"]?.ToString();
        if (body.ContainsKey("pan")) s.Pan = body["pan"]?.ToString();
        if (body.ContainsKey("phone")) s.Phone = body["phone"]?.ToString();
        if (body.ContainsKey("email")) s.Email = body["email"]?.ToString();
        if (body.ContainsKey("transportLicenseNo")) s.TransportLicenseNo = body["transportLicenseNo"]?.ToString();
        if (body.ContainsKey("financialYear")) s.FinancialYear = body["financialYear"]?.ToString();
        if (body.TryGetValue("fleetSize", out var fs) && int.TryParse(fs?.ToString(), out var fleet)) s.FleetSize = fleet;
        if (body.TryGetValue("gstRate", out var gr) && decimal.TryParse(gr?.ToString(), out var rate)) s.GstRate = rate;
        if (body.ContainsKey("logoUrl")) s.LogoUrl = body["logoUrl"]?.ToString();
        if (body.ContainsKey("documentFlow"))
        {
            var raw = body["documentFlow"]?.ToString();
            if (!DocumentFlow.IsValid(raw))
                return BadRequest(new { message = $"Invalid documentFlow. Use '{DocumentFlow.FirstLRThenBooking}' or '{DocumentFlow.FirstBookingThenLR}'." });
            s.DocumentFlow = DocumentFlow.Normalize(raw);
        }
        s.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok(new
        {
            message = "Settings saved successfully.",
            logoUrl = s.LogoUrl,
            documentFlow = DocumentFlow.Normalize(s.DocumentFlow),
        });
    }

    [HttpPost("logo")]
    [RequestSizeLimit(MaxLogoBytes)]
    public async Task<ActionResult<object>> UploadLogo(IFormFile? file, CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded." });
        if (file.Length > MaxLogoBytes)
            return BadRequest(new { message = "Logo must be 2 MB or smaller." });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedLogoExtensions.Contains(ext))
            return BadRequest(new { message = "Use PNG, JPG, SVG, or WebP format." });

        var webRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        var uploadsDir = Path.Combine(webRoot, "uploads");
        Directory.CreateDirectory(uploadsDir);

        var fileName = $"company-logo{ext}";
        var fullPath = Path.Combine(uploadsDir, fileName);

        foreach (var old in Directory.GetFiles(uploadsDir, "company-logo.*"))
        {
            if (!old.Equals(fullPath, StringComparison.OrdinalIgnoreCase))
            {
                try { System.IO.File.Delete(old); } catch { /* ignore */ }
            }
        }

        await using (var stream = System.IO.File.Create(fullPath))
            await file.CopyToAsync(stream, ct);

        var logoUrl = $"/uploads/{fileName}";
        var s = await GetOrCreateSettings();
        s.LogoUrl = logoUrl;
        s.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        return Ok(new { message = "Company logo uploaded.", logoUrl });
    }

    [HttpDelete("logo")]
    public async Task<ActionResult<object>> DeleteLogo(CancellationToken ct)
    {
        var s = await FindSettingsAsync(ct);
        if (s?.LogoUrl != null)
        {
            var webRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
            var path = Path.Combine(webRoot, s.LogoUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            if (System.IO.File.Exists(path))
            {
                try { System.IO.File.Delete(path); } catch { /* ignore */ }
            }
            s.LogoUrl = null;
            s.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
        }
        return Ok(new { message = "Logo removed." });
    }

    async Task<CompanySettings?> FindSettingsAsync(CancellationToken ct = default)
    {
        if (tenants.EffectiveCompanyId == null) return null;
        var companyId = tenants.EffectiveCompanyId.Value;
        var s = await db.CompanySettings.FirstOrDefaultAsync(x => x.CompanyId == companyId, ct);
        if (s != null) return s;

        // Show legacy singleton / unassigned row until it is claimed on save.
        s = await db.CompanySettings
            .Where(x => x.CompanyId == Guid.Empty)
            .OrderBy(x => x.Id)
            .FirstOrDefaultAsync(ct);
        if (s != null) return s;

        s = await db.CompanySettings.FirstOrDefaultAsync(x => x.Id == 1, ct);
        if (s != null && (s.CompanyId == Guid.Empty || s.CompanyId == companyId))
            return s;
        return null;
    }

    private Task<CompanySettings> GetOrCreateSettings() =>
        documentFlow.GetOrCreateSettingsAsync();
}

public record DocumentFlowRequest(string DocumentFlow);

/// <summary>Alias route matching product API: GET /api/company/settings/document-flow</summary>
[Authorize]
[ApiController]
[Route("api/company/settings")]
public class CompanyDocumentFlowController(DocumentFlowService documentFlow) : ControllerBase
{
    [HttpGet("document-flow")]
    public async Task<ActionResult<object>> Get(CancellationToken ct)
    {
        var flow = await documentFlow.GetFlowAsync(ct);
        return Ok(new { documentFlow = flow });
    }

    [HttpPut("document-flow")]
    public async Task<ActionResult<object>> Put([FromBody] DocumentFlowRequest body, CancellationToken ct)
    {
        try
        {
            await documentFlow.SetFlowAsync(body.DocumentFlow, ct);
            return Ok(new { documentFlow = await documentFlow.GetFlowAsync(ct) });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
