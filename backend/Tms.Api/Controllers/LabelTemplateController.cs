using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using Tms.Api.Data;
using Tms.Api.Models;
using Tms.Api.Services;

namespace Tms.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/label-templates")]
public class LabelTemplateController(
    TmsDbContext db,
    ITenantContext tenants,
    ICurrentUser currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<object>> List([FromQuery] string? type, CancellationToken ct)
    {
        var companyId = tenants.AssignCompanyId ?? TenantContext.DefaultCompanyId;
        await LabelTemplateSchemaMigrator.EnsureCompanyDefaultAsync(db, companyId, ct);

        var q = db.LabelTemplates.AsNoTracking().Where(t => t.CompanyId == companyId);
        if (!string.IsNullOrWhiteSpace(type))
            q = q.Where(t => t.TemplateType == type.Trim());

        var rows = await q
            .OrderByDescending(t => t.IsDefault)
            .ThenBy(t => t.TemplateName)
            .ToListAsync(ct);

        return Ok(new
        {
            items = rows.Select(Map).ToList(),
        });
    }

    [HttpGet("default")]
    public async Task<ActionResult<object>> GetDefault([FromQuery] string type = LabelTemplateSchemaMigrator.TemplateTypeLrPackage, CancellationToken ct = default)
    {
        var companyId = tenants.AssignCompanyId ?? TenantContext.DefaultCompanyId;
        await LabelTemplateSchemaMigrator.EnsureCompanyDefaultAsync(db, companyId, ct);

        var tpl = await db.LabelTemplates.AsNoTracking()
            .Where(t => t.CompanyId == companyId && t.TemplateType == type && t.IsActive)
            .OrderByDescending(t => t.IsDefault)
            .ThenByDescending(t => t.UpdatedAt ?? t.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (tpl == null)
            return NotFound(new { message = LrLabelService.NoTemplateMessage });

        return Ok(Map(tpl));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<object>> Get(Guid id, CancellationToken ct)
    {
        var companyId = tenants.AssignCompanyId ?? TenantContext.DefaultCompanyId;
        var tpl = await db.LabelTemplates.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id && t.CompanyId == companyId, ct);
        if (tpl == null) return NotFound(new { message = "Label template not found." });
        return Ok(Map(tpl));
    }

    [HttpPost]
    public async Task<ActionResult<object>> Create([FromBody] LabelTemplateSaveRequest body, CancellationToken ct)
    {
        var companyId = tenants.AssignCompanyId ?? TenantContext.DefaultCompanyId;
        if (string.IsNullOrWhiteSpace(body.TemplateName))
            return BadRequest(new { message = "Template name is required." });
        if (!TryNormalizeJson(body.TemplateJson, out var json, out var jsonError))
            return BadRequest(new { message = jsonError });

        var now = DateTime.UtcNow;
        var actor = currentUser.DisplayName;
        var type = string.IsNullOrWhiteSpace(body.TemplateType)
            ? LabelTemplateSchemaMigrator.TemplateTypeLrPackage
            : body.TemplateType.Trim();

        var makeDefault = body.IsDefault == true;
        if (makeDefault)
            await ClearDefaultAsync(companyId, type, ct);

        var row = new LabelTemplate
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            TemplateName = body.TemplateName.Trim(),
            TemplateType = type,
            PaperWidth = body.PaperWidth > 0 ? body.PaperWidth : 100,
            PaperHeight = body.PaperHeight > 0 ? body.PaperHeight : 150,
            TemplateJson = json,
            IsDefault = makeDefault,
            IsActive = body.IsActive ?? true,
            CreatedBy = actor,
            CreatedAt = now,
            UpdatedBy = actor,
            UpdatedAt = now,
        };
        db.LabelTemplates.Add(row);
        await db.SaveChangesAsync(ct);
        return Ok(Map(row));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<object>> Update(Guid id, [FromBody] LabelTemplateSaveRequest body, CancellationToken ct)
    {
        var companyId = tenants.AssignCompanyId ?? TenantContext.DefaultCompanyId;
        var row = await db.LabelTemplates.FirstOrDefaultAsync(t => t.Id == id && t.CompanyId == companyId, ct);
        if (row == null) return NotFound(new { message = "Label template not found." });

        if (!string.IsNullOrWhiteSpace(body.TemplateName))
            row.TemplateName = body.TemplateName.Trim();
        if (!string.IsNullOrWhiteSpace(body.TemplateType))
            row.TemplateType = body.TemplateType.Trim();
        if (body.PaperWidth > 0) row.PaperWidth = body.PaperWidth;
        if (body.PaperHeight > 0) row.PaperHeight = body.PaperHeight;
        if (body.TemplateJson != null)
        {
            if (!TryNormalizeJson(body.TemplateJson, out var json, out var jsonError))
                return BadRequest(new { message = jsonError });
            row.TemplateJson = json;
        }
        if (body.IsActive.HasValue) row.IsActive = body.IsActive.Value;

        if (body.IsDefault == true)
        {
            await ClearDefaultAsync(companyId, row.TemplateType, ct, exceptId: row.Id);
            row.IsDefault = true;
            row.IsActive = true;
        }
        else if (body.IsDefault == false)
        {
            row.IsDefault = false;
        }

        row.UpdatedBy = currentUser.DisplayName;
        row.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok(Map(row));
    }

    [HttpPost("{id:guid}/set-default")]
    public async Task<ActionResult<object>> SetDefault(Guid id, CancellationToken ct)
    {
        var companyId = tenants.AssignCompanyId ?? TenantContext.DefaultCompanyId;
        var row = await db.LabelTemplates.FirstOrDefaultAsync(t => t.Id == id && t.CompanyId == companyId, ct);
        if (row == null) return NotFound(new { message = "Label template not found." });

        await ClearDefaultAsync(companyId, row.TemplateType, ct, exceptId: row.Id);
        row.IsDefault = true;
        row.IsActive = true;
        row.UpdatedBy = currentUser.DisplayName;
        row.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok(Map(row));
    }

    async Task ClearDefaultAsync(Guid companyId, string type, CancellationToken ct, Guid? exceptId = null)
    {
        var q = db.LabelTemplates.Where(t =>
            t.CompanyId == companyId && t.TemplateType == type && t.IsDefault);
        if (exceptId.HasValue)
            q = q.Where(t => t.Id != exceptId.Value);
        var rows = await q.ToListAsync(ct);
        foreach (var r in rows)
        {
            r.IsDefault = false;
            r.UpdatedAt = DateTime.UtcNow;
        }
    }

    static bool TryNormalizeJson(object? raw, out string json, out string? error)
    {
        json = "{}";
        error = null;
        if (raw == null)
        {
            error = "templateJson is required.";
            return false;
        }
        try
        {
            if (raw is JsonElement el)
            {
                json = el.GetRawText();
            }
            else if (raw is string s)
            {
                using var doc = JsonDocument.Parse(s);
                json = doc.RootElement.GetRawText();
            }
            else
            {
                json = JsonSerializer.Serialize(raw);
            }
            using var check = JsonDocument.Parse(json);
            return true;
        }
        catch (Exception ex)
        {
            error = $"Invalid templateJson: {ex.Message}";
            return false;
        }
    }

    static object Map(LabelTemplate t)
    {
        object templateJson;
        try
        {
            using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(t.TemplateJson) ? "{}" : t.TemplateJson);
            templateJson = doc.RootElement.Clone();
        }
        catch
        {
            templateJson = new { };
        }

        return new
        {
            id = t.Id,
            templateName = t.TemplateName,
            templateType = t.TemplateType,
            paperWidth = t.PaperWidth,
            paperHeight = t.PaperHeight,
            templateJson,
            isDefault = t.IsDefault,
            isActive = t.IsActive,
            createdBy = t.CreatedBy,
            createdAt = t.CreatedAt,
            updatedBy = t.UpdatedBy,
            updatedAt = t.UpdatedAt,
        };
    }
}

public class LabelTemplateSaveRequest
{
    public string? TemplateName { get; set; }
    public string? TemplateType { get; set; }
    public decimal PaperWidth { get; set; }
    public decimal PaperHeight { get; set; }
    public object? TemplateJson { get; set; }
    public bool? IsDefault { get; set; }
    public bool? IsActive { get; set; }
}
