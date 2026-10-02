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
public class SettingsController(
    TmsDbContext db,
    ITenantContext tenants,
    IWebHostEnvironment env,
    DocumentFlowService documentFlow,
    CompanyDataPurgeService dataPurge) : ControllerBase
{
    private static readonly string[] AllowedLogoExtensions = [".png", ".jpg", ".jpeg", ".svg", ".webp"];
    private const long MaxLogoBytes = 2 * 1024 * 1024;

    [HttpGet]
    public async Task<ActionResult<object>> Get(CancellationToken ct)
    {
        var flow = await documentFlow.GetFlowAsync(ct);
        var companyId = tenants.AssignCompanyId ?? TenantContext.DefaultCompanyId;
        var company = await db.Companies.AsNoTracking().FirstOrDefaultAsync(c => c.Id == companyId, ct);
        var s = await FindSettingsAsync(ct);
        if (s == null)
        {
            return Ok(new
            {
                companyName = "TMS Pro Logistics Pvt Ltd",
                companyCode = company?.Code ?? "01",
                financialYear = "2025-26",
                gstRate = 18,
                documentFlow = flow,
                documentFlowLabel = DocumentFlow.DisplayLabel(flow),
            });
        }

        return Ok(new
        {
            companyName = s.CompanyName,
            companyCode = company?.Code ?? "",
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
            updatedAt = s.UpdatedAt,
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

        string? savedCompanyCode = null;
        if (body.ContainsKey("companyCode"))
        {
            var code = DocumentCodeRules.Normalize(body["companyCode"]?.ToString());
            if (!DocumentCodeRules.IsValid(code))
                return BadRequest(new { message = "Company code must be exactly 2 characters (A–Z / 0–9), e.g. 01 or PN." });

            var companyId = tenants.AssignCompanyId ?? TenantContext.DefaultCompanyId;
            var company = await db.Companies.FirstOrDefaultAsync(c => c.Id == companyId, ct);
            if (company == null)
                return BadRequest(new { message = "Company record not found." });

            var taken = await db.Companies.AnyAsync(c => c.Code == code && c.Id != companyId, ct);
            if (taken)
                return BadRequest(new { message = $"Company code '{code}' is already used." });

            company.Code = code;
            company.UpdatedAt = DateTime.UtcNow;
            savedCompanyCode = code;
        }

        s.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok(new
        {
            message = "Settings saved successfully.",
            logoUrl = s.LogoUrl,
            companyCode = savedCompanyCode,
            documentFlow = DocumentFlow.Normalize(s.DocumentFlow),
        });
    }

    /// <summary>
    /// Streams the current tenant company logo (auth required).
    /// Used by SPA sidebar/settings because &lt;img src&gt; cannot send Bearer tokens to /uploads reliably in all deploys.
    /// </summary>
    [HttpGet("logo-file")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> GetLogoFile(CancellationToken ct)
    {
        var s = await FindSettingsAsync(ct);
        var webRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        var path = ResolveLogoFilePath(webRoot, s?.LogoUrl);
        if (path == null)
            return NotFound();

        var contentType = Path.GetExtension(path).ToLowerInvariant() switch
        {
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".svg" => "image/svg+xml",
            ".webp" => "image/webp",
            _ => "application/octet-stream",
        };
        return PhysicalFile(path, contentType);
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

        // Per-tenant file so platform company switches do not overwrite each other
        var companyId = tenants.EffectiveCompanyId ?? tenants.AssignCompanyId ?? TenantContext.DefaultCompanyId;
        var fileName = $"company-logo-{companyId:N}{ext}";
        var fullPath = Path.Combine(uploadsDir, fileName);

        foreach (var old in Directory.GetFiles(uploadsDir, $"company-logo-{companyId:N}.*"))
        {
            if (!old.Equals(fullPath, StringComparison.OrdinalIgnoreCase))
            {
                try { System.IO.File.Delete(old); } catch { /* ignore */ }
            }
        }

        // Remove legacy shared filename if present
        foreach (var old in Directory.GetFiles(uploadsDir, "company-logo.*"))
        {
            try { System.IO.File.Delete(old); } catch { /* ignore */ }
        }

        await using (var stream = System.IO.File.Create(fullPath))
            await file.CopyToAsync(stream, ct);

        var logoUrl = $"/uploads/{fileName}";
        var s = await GetOrCreateSettings();
        s.LogoUrl = logoUrl;
        s.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        return Ok(new { message = "Company logo uploaded.", logoUrl, updatedAt = s.UpdatedAt });
    }

    [HttpDelete("logo")]
    public async Task<ActionResult<object>> DeleteLogo(CancellationToken ct)
    {
        var s = await FindSettingsAsync(ct);
        if (s?.LogoUrl != null)
        {
            var webRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
            var path = ResolveLogoFilePath(webRoot, s.LogoUrl);
            if (path != null)
            {
                try { System.IO.File.Delete(path); } catch { /* ignore */ }
            }
            s.LogoUrl = null;
            s.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
        }
        return Ok(new { message = "Logo removed." });
    }

    static string? ResolveLogoFilePath(string webRoot, string? logoUrl)
    {
        if (!string.IsNullOrWhiteSpace(logoUrl) &&
            !logoUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
            !logoUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase) &&
            !logoUrl.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
        {
            var relative = logoUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
            var path = Path.Combine(webRoot, relative);
            if (System.IO.File.Exists(path))
                return path;
        }

        // Legacy shared upload name (pre per-tenant filenames)
        var uploadsDir = Path.Combine(webRoot, "uploads");
        if (!Directory.Exists(uploadsDir)) return null;
        return Directory.GetFiles(uploadsDir, "company-logo.*")
            .OrderByDescending(System.IO.File.GetLastWriteTimeUtc)
            .FirstOrDefault();
    }

    /// <summary>
    /// Deletes transaction + master data for the current company. Keeps configuration
    /// (company settings, users, branches, numbering config, print templates, COA, notification templates).
    /// </summary>
    [HttpPost("purge-data")]
    public async Task<ActionResult<object>> PurgeData([FromBody] PurgeDataRequest body, CancellationToken ct)
    {
        var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
        if (!TenantRoles.CanManageUsers(role) && !tenants.IsPlatformAdmin)
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only company Admin can purge data." });

        if (!string.Equals(body?.ConfirmText?.Trim(), CompanyDataPurgeService.ConfirmPhrase, StringComparison.Ordinal))
        {
            return BadRequest(new
            {
                message = $"Type {CompanyDataPurgeService.ConfirmPhrase} to confirm.",
                confirmPhrase = CompanyDataPurgeService.ConfirmPhrase,
            });
        }

        if (tenants.EffectiveCompanyId == null)
            return BadRequest(new { message = "Select a company before purging data." });

        try
        {
            var result = await dataPurge.PurgeAsync(ct);
            return Ok(new
            {
                success = result.Success,
                message = result.Message,
                deleted = result.DeletedCounts,
                preserved = new[]
                {
                    "Company settings", "Users & roles", "Branches", "Document numbering config",
                    "Print templates", "Chart of accounts", "Notification templates & channel settings",
                    "Subscription / plan", "HR departments, designations, leave types, holidays",
                },
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
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

public record PurgeDataRequest(string? ConfirmText);

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
