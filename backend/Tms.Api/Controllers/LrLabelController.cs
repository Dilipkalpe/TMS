using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tms.Api.Services;

namespace Tms.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/lr")]
public class LrLabelController(LrLabelService labels) : ControllerBase
{
    [HttpGet("{lrNumber}/label-data")]
    public async Task<ActionResult<object>> GetLabelData(string lrNumber, CancellationToken ct)
    {
        var (lr, error, status) = await labels.LoadLrAsync(lrNumber, ct);
        if (lr == null) return StatusCode(status, new { message = error });

        var packages = labels.ExpandPackages(lr);
        if (packages.Count == 0)
            return BadRequest(new { message = "This LR has no package details. Add package quantity on the LR before printing labels." });

        var baseFields = await labels.BuildBaseFieldsAsync(lr, ct);
        return Ok(new
        {
            lrNumber = lr.LrNumber,
            bookingNo = lr.BookingId,
            packageCount = packages.Count,
            packages = packages.Select(p => new
            {
                p.PackageNo,
                p.TotalPackages,
                p.PackageId,
                p.PackageDisplay,
                p.PackageType,
                p.Weight,
            }),
            fields = baseFields,
        });
    }

    [HttpPost("{lrNumber}/generate-label")]
    public async Task<ActionResult<object>> GenerateLabel(
        string lrNumber,
        [FromBody] GenerateLabelRequest? body,
        CancellationToken ct)
    {
        var (lr, error, status) = await labels.LoadLrAsync(lrNumber, ct);
        if (lr == null) return StatusCode(status, new { message = error });

        var suggestedPackageCount = labels.ExpandPackages(lr).Count;
        var packageCount = body?.PackageCount is > 0
            ? Math.Min(body.PackageCount.Value, 500)
            : (suggestedPackageCount > 0 ? suggestedPackageCount : (int?)null);
        var packages = labels.ExpandPackages(lr, packageCount);
        if (packages.Count == 0)
            return BadRequest(new { message = "Enter number of packages (or add package quantity on the LR) before printing labels." });

        var template = await labels.ResolveTemplateAsync(lr.CompanyId, body?.TemplateId, ct);
        if (template == null)
            return BadRequest(new { message = LrLabelService.NoTemplateMessage });

        var copies = body?.Copies is > 0 ? Math.Min(body.Copies.Value, 20) : 1;
        var baseFields = await labels.BuildBaseFieldsAsync(lr, ct);

        var labelRows = new List<object>();
        foreach (var pkg in packages)
        {
            for (var c = 0; c < copies; c++)
            {
                var fields = new Dictionary<string, string>(baseFields, StringComparer.OrdinalIgnoreCase)
                {
                    ["PackageNo"] = pkg.PackageNo.ToString(),
                    ["TotalPackages"] = pkg.TotalPackages.ToString(),
                    ["PackageId"] = pkg.PackageId,
                    ["PackageDisplay"] = pkg.PackageDisplay,
                    ["PackageType"] = string.IsNullOrWhiteSpace(pkg.PackageType) ? baseFields.GetValueOrDefault("PackageType", "") : pkg.PackageType,
                    ["Weight"] = string.IsNullOrWhiteSpace(pkg.Weight) ? baseFields.GetValueOrDefault("Weight", "") : pkg.Weight,
                };
                labelRows.Add(new { packageId = pkg.PackageId, packageNo = pkg.PackageNo, copy = c + 1, fields });
            }
        }

        return Ok(new
        {
            lrNumber = lr.LrNumber,
            packageCount = packages.Count,
            suggestedPackageCount,
            labelCount = labelRows.Count,
            template = labels.MapTemplate(template),
            labels = labelRows,
        });
    }
}

public class GenerateLabelRequest
{
    public Guid? TemplateId { get; set; }
    public int? Copies { get; set; }
    /// <summary>Override how many package labels to generate (1..500).</summary>
    public int? PackageCount { get; set; }
}
