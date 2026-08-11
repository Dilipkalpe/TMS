using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;
using Tms.Api.Services;

namespace Tms.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/print-templates")]
public class PrintTemplateController(
    TmsDbContext db,
    ITenantContext tenants,
    ICurrentUser currentUser) : ControllerBase
{
    public static readonly string[] ModuleCodes =
    [
        "LR_LIST", "LOADING_SLIP", "TRANSIT_PASS", "DISPATCH",
        "IN_TRANSIT", "DELIVERY_COMPLETE", "POD", "BILLING",
    ];

    public static readonly string[] TemplateCodes = ["T1", "T2", "T3", "T4", "T5"];

    static readonly Dictionary<string, string> ModuleLabels = new(StringComparer.OrdinalIgnoreCase)
    {
        ["LR_LIST"] = "Lorry Receipt / Consignment Note",
        ["LOADING_SLIP"] = "Loading Slip",
        ["TRANSIT_PASS"] = "Transit Pass / Memo",
        ["DISPATCH"] = "Dispatch / Gate-Out Slip",
        ["IN_TRANSIT"] = "In-Transit Status Sheet",
        ["DELIVERY_COMPLETE"] = "Delivery Confirmation",
        ["POD"] = "Proof of Delivery (POD)",
        ["BILLING"] = "Freight Bill / Tax Invoice",
    };

    [HttpGet]
    public async Task<ActionResult<object>> GetAll(CancellationToken ct)
    {
        var companyId = tenants.AssignCompanyId ?? TenantContext.DefaultCompanyId;
        var userId = ParseUserId(currentUser.UserId);

        var rows = await db.PrintTemplateConfigurations.AsNoTracking()
            .Where(x => x.CompanyId == companyId && x.IsActive)
            .Where(x => x.UserId == null || x.UserId == userId)
            .ToListAsync(ct);

        var modules = ModuleCodes.Select(code =>
        {
            var userRow = userId != null
                ? rows.FirstOrDefault(r => r.ModuleCode == code && r.UserId == userId)
                : null;
            var companyRow = rows.FirstOrDefault(r => r.ModuleCode == code && r.UserId == null);
            var selected = userRow?.TemplateCode ?? companyRow?.TemplateCode ?? "T1";
            return new
            {
                moduleCode = code,
                moduleName = ModuleLabels.GetValueOrDefault(code, code),
                availableTemplates = TemplateCodes,
                templateCode = selected,
                source = userRow != null ? "user" : companyRow != null ? "company" : "default",
            };
        }).ToList();

        return Ok(new { modules, templateCodes = TemplateCodes });
    }

    [HttpPut]
    public async Task<ActionResult<object>> Save([FromBody] SavePrintTemplateRequest body, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(body.ModuleCode) || !ModuleCodes.Contains(body.ModuleCode, StringComparer.OrdinalIgnoreCase))
            return BadRequest(new { message = "Invalid module code." });
        if (string.IsNullOrWhiteSpace(body.TemplateCode) || !TemplateCodes.Contains(body.TemplateCode, StringComparer.OrdinalIgnoreCase))
            return BadRequest(new { message = "Invalid template code." });

        var companyId = tenants.AssignCompanyId ?? TenantContext.DefaultCompanyId;
        var userId = ParseUserId(currentUser.UserId);
        if (userId == null) return Unauthorized();

        var moduleCode = body.ModuleCode.ToUpperInvariant();
        var templateCode = body.TemplateCode.ToUpperInvariant();
        var now = DateTime.UtcNow;
        var actor = currentUser.DisplayName;

        var existing = await db.PrintTemplateConfigurations
            .FirstOrDefaultAsync(x =>
                x.CompanyId == companyId
                && x.UserId == userId
                && x.ModuleCode == moduleCode
                && x.IsActive, ct);

        if (existing != null)
        {
            existing.TemplateCode = templateCode;
            existing.ModifiedBy = actor;
            existing.ModifiedAt = now;
        }
        else
        {
            db.PrintTemplateConfigurations.Add(new PrintTemplateConfiguration
            {
                CompanyId = companyId,
                UserId = userId,
                ModuleCode = moduleCode,
                TemplateCode = templateCode,
                IsActive = true,
                CreatedBy = actor,
                CreatedAt = now,
                ModifiedBy = actor,
                ModifiedAt = now,
            });
        }

        await db.SaveChangesAsync(ct);
        return Ok(new { moduleCode, templateCode, saved = true });
    }

    [HttpPut("bulk")]
    public async Task<ActionResult<object>> SaveBulk([FromBody] BulkSavePrintTemplateRequest body, CancellationToken ct)
    {
        if (body.Configs == null || body.Configs.Count == 0)
            return BadRequest(new { message = "No configurations provided." });

        var companyId = tenants.AssignCompanyId ?? TenantContext.DefaultCompanyId;
        var userId = ParseUserId(currentUser.UserId);
        if (userId == null) return Unauthorized();

        var now = DateTime.UtcNow;
        var actor = currentUser.DisplayName;

        foreach (var item in body.Configs)
        {
            if (string.IsNullOrWhiteSpace(item.ModuleCode) || !ModuleCodes.Contains(item.ModuleCode, StringComparer.OrdinalIgnoreCase))
                return BadRequest(new { message = $"Invalid module code: {item.ModuleCode}" });
            if (string.IsNullOrWhiteSpace(item.TemplateCode) || !TemplateCodes.Contains(item.TemplateCode, StringComparer.OrdinalIgnoreCase))
                return BadRequest(new { message = $"Invalid template code: {item.TemplateCode}" });

            var moduleCode = item.ModuleCode.ToUpperInvariant();
            var templateCode = item.TemplateCode.ToUpperInvariant();

            var existing = await db.PrintTemplateConfigurations
                .FirstOrDefaultAsync(x =>
                    x.CompanyId == companyId
                    && x.UserId == userId
                    && x.ModuleCode == moduleCode
                    && x.IsActive, ct);

            if (existing != null)
            {
                existing.TemplateCode = templateCode;
                existing.ModifiedBy = actor;
                existing.ModifiedAt = now;
            }
            else
            {
                db.PrintTemplateConfigurations.Add(new PrintTemplateConfiguration
                {
                    CompanyId = companyId,
                    UserId = userId,
                    ModuleCode = moduleCode,
                    TemplateCode = templateCode,
                    IsActive = true,
                    CreatedBy = actor,
                    CreatedAt = now,
                    ModifiedBy = actor,
                    ModifiedAt = now,
                });
            }
        }

        await db.SaveChangesAsync(ct);
        return await GetAll(ct);
    }

    static Guid? ParseUserId(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        return Guid.TryParse(raw, out var id) ? id : null;
    }
}

public class SavePrintTemplateRequest
{
    public string ModuleCode { get; set; } = "";
    public string TemplateCode { get; set; } = "T1";
}

public class BulkSavePrintTemplateRequest
{
    public List<SavePrintTemplateRequest> Configs { get; set; } = [];
}
