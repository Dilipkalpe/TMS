using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public sealed class LrLabelService(TmsDbContext db, ITenantContext tenants, IBranchContext branches)
{
    public const string NoTemplateMessage =
        "No active label template is configured. Please configure a label template first.";

    public async Task<(LorryReceipt? Lr, string? Error, int Status)> LoadLrAsync(string lrNumber, CancellationToken ct)
    {
        lrNumber = DocumentCodeRules.DecodePathId(lrNumber);
        var lr = await db.LorryReceipts.AsNoTracking()
            .Include(x => x.Branch)
            .FirstOrDefaultAsync(x => x.LrNumber == lrNumber, ct);
        if (lr == null || !TenantScope.CanAccessBranchEntity(tenants, branches, lr))
            return (null, "LR not found.", 404);
        return (lr, null, 200);
    }

    public async Task<LabelTemplate?> ResolveTemplateAsync(Guid companyId, Guid? templateId, CancellationToken ct)
    {
        await LabelTemplateSchemaMigrator.EnsureCompanyDefaultAsync(db, companyId, ct);

        if (templateId is Guid tid && tid != Guid.Empty)
        {
            return await db.LabelTemplates.AsNoTracking()
                .FirstOrDefaultAsync(t =>
                    t.Id == tid
                    && t.CompanyId == companyId
                    && t.TemplateType == LabelTemplateSchemaMigrator.TemplateTypeLrPackage
                    && t.IsActive, ct);
        }

        var def = await db.LabelTemplates.AsNoTracking()
            .Where(t =>
                t.CompanyId == companyId
                && t.TemplateType == LabelTemplateSchemaMigrator.TemplateTypeLrPackage
                && t.IsActive
                && t.IsDefault)
            .OrderByDescending(t => t.UpdatedAt ?? t.CreatedAt)
            .FirstOrDefaultAsync(ct);
        if (def != null) return def;

        return await db.LabelTemplates.AsNoTracking()
            .Where(t =>
                t.CompanyId == companyId
                && t.TemplateType == LabelTemplateSchemaMigrator.TemplateTypeLrPackage
                && t.IsActive)
            .OrderByDescending(t => t.IsDefault)
            .ThenByDescending(t => t.UpdatedAt ?? t.CreatedAt)
            .FirstOrDefaultAsync(ct);
    }

    public List<LrLabelPackage> ExpandPackages(LorryReceipt lr, int? packageCountOverride = null)
    {
        var meta = ParseLrMeta(lr.Remarks);
        var items = meta?.Items ?? [];
        var qtyFromItems = items.Sum(i => Math.Max(0, ParseIntLoose(i.Qty)));
        var fromLr = qtyFromItems > 0
            ? qtyFromItems
            : ParsePackageCount(lr.Quantity);

        var total = packageCountOverride is > 0
            ? packageCountOverride.Value
            : fromLr;

        if (total <= 0) return [];

        // Cap runaway counts from bad data / user entry
        total = Math.Min(total, 500);

        var weightTotal = ParseWeight(lr.Quantity);
        var weightEach = total > 0 && weightTotal > 0
            ? Math.Round(weightTotal / total, 3)
            : 0m;
        var packageType = items.FirstOrDefault(i => !string.IsNullOrWhiteSpace(i.PackageType))?.PackageType
            ?? items.FirstOrDefault()?.Description
            ?? lr.Material
            ?? "";

        var list = new List<LrLabelPackage>(total);
        var pad = Math.Max(2, total.ToString(CultureInfo.InvariantCulture).Length);
        for (var i = 1; i <= total; i++)
        {
            var no = i.ToString(CultureInfo.InvariantCulture).PadLeft(pad, '0');
            list.Add(new LrLabelPackage
            {
                PackageNo = i,
                TotalPackages = total,
                PackageId = $"{lr.LrNumber}-PKG-{no}",
                PackageDisplay = $"{no} / {total.ToString(CultureInfo.InvariantCulture).PadLeft(pad, '0')}",
                PackageType = packageType ?? "",
                Weight = weightEach > 0 ? $"{weightEach.ToString("0.###", CultureInfo.InvariantCulture)} KG" : (lr.Quantity ?? ""),
            });
        }
        return list;
    }

    public async Task<Dictionary<string, string>> BuildBaseFieldsAsync(LorryReceipt lr, CancellationToken ct)
    {
        var settings = await db.CompanySettings.AsNoTracking()
            .FirstOrDefaultAsync(s => s.CompanyId == lr.CompanyId, ct);
        var company = await db.Companies.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == lr.CompanyId, ct);
        var meta = ParseLrMeta(lr.Remarks);

        var companyName = settings?.CompanyName ?? company?.Name ?? "TMS Pro";
        var companyAddress = JoinLines(
            settings?.Address,
            JoinParts(settings?.Phone, settings?.Email));
        var fromCity = FirstNonEmpty(meta?.PickupCity, lr.FromCity);
        var fromBlock = JoinLines(
            lr.Consignor,
            meta?.PickupAddress,
            fromCity,
            JoinParts(meta?.BillingPartyPhone, meta?.BillingParty));
        var toBlock = JoinLines(
            lr.Consignee,
            meta?.DeliveryBranch,
            lr.ToCity,
            lr.CustomerName != null && !string.Equals(lr.CustomerName, lr.Consignee, StringComparison.OrdinalIgnoreCase)
                ? $"c/o {lr.CustomerName}"
                : null);

        if (string.IsNullOrWhiteSpace(fromBlock))
            fromBlock = JoinLines(companyName, fromCity, lr.Branch?.Name);
        if (string.IsNullOrWhiteSpace(toBlock))
            toBlock = JoinLines(lr.Consignee, lr.ToCity);

        return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["CompanyLogo"] = settings?.LogoUrl ?? "",
            ["CompanyName"] = companyName,
            ["CompanyAddress"] = companyAddress,
            ["CompanyPhone"] = settings?.Phone ?? "",
            ["LRNo"] = lr.LrNumber,
            ["BookingNo"] = lr.BookingId ?? "",
            ["Consignor"] = lr.Consignor ?? "",
            ["Consignee"] = lr.Consignee ?? "",
            ["From"] = fromCity ?? "",
            ["To"] = lr.ToCity ?? "",
            ["Destination"] = lr.ToCity ?? "",
            ["FromBlock"] = fromBlock,
            ["ToBlock"] = toBlock,
            ["FromBranch"] = lr.Branch?.Name ?? lr.Branch?.Code ?? "",
            ["ToBranch"] = meta?.DeliveryBranch ?? lr.ToCity ?? "",
            ["Branch"] = lr.Branch?.Name ?? lr.Branch?.Code ?? "",
            ["VehicleNo"] = lr.VehicleNumber ?? "",
            ["Driver"] = lr.DriverName ?? "",
            ["Weight"] = lr.Quantity ?? "",
            ["PackageType"] = FirstNonEmpty(
                meta?.Items?.FirstOrDefault(i => !string.IsNullOrWhiteSpace(i.PackageType))?.PackageType,
                lr.Material) ?? "",
            ["Contents"] = lr.Material ?? "",
            ["DateTime"] = lr.LrDate.ToString("dd-MMM-yyyy", CultureInfo.InvariantCulture),
            ["Customer"] = lr.CustomerName ?? "",
            ["SpecialInstructions"] = meta?.ServiceType ?? "",
        };
    }

    static string JoinLines(params string?[] parts)
        => string.Join("\n", parts.Where(p => !string.IsNullOrWhiteSpace(p)).Select(p => p!.Trim()));

    static string JoinParts(params string?[] parts)
        => string.Join(" · ", parts.Where(p => !string.IsNullOrWhiteSpace(p)).Select(p => p!.Trim()));

    static string? FirstNonEmpty(params string?[] parts)
        => parts.FirstOrDefault(p => !string.IsNullOrWhiteSpace(p));

    public object MapTemplate(LabelTemplate t) => new
    {
        id = t.Id,
        templateName = t.TemplateName,
        templateType = t.TemplateType,
        paperWidth = t.PaperWidth,
        paperHeight = t.PaperHeight,
        templateJson = ParseJsonObject(t.TemplateJson),
        isDefault = t.IsDefault,
        isActive = t.IsActive,
        createdAt = t.CreatedAt,
        updatedAt = t.UpdatedAt,
    };

    static object ParseJsonObject(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new { };
        try
        {
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.Clone();
        }
        catch
        {
            return new { };
        }
    }

    static LrMetaPayload? ParseLrMeta(string? remarks)
    {
        if (string.IsNullOrWhiteSpace(remarks)) return null;
        var marker = "__lr_meta__:";
        var idx = remarks.IndexOf(marker, StringComparison.Ordinal);
        if (idx < 0) return null;
        var json = remarks[(idx + marker.Length)..].Trim();
        try
        {
            return JsonSerializer.Deserialize<LrMetaPayload>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
            });
        }
        catch
        {
            return null;
        }
    }

    static int ParsePackageCount(string? quantity)
    {
        if (string.IsNullOrWhiteSpace(quantity)) return 0;
        // "12 pkgs / 45.000 kg" or "12" or "12 packages"
        var m = Regex.Match(quantity, @"(\d+)\s*(pkgs?|packages?|pkg)?", RegexOptions.IgnoreCase);
        if (m.Success && int.TryParse(m.Groups[1].Value, out var n) && n > 0)
            return n;
        return 0;
    }

    static decimal ParseWeight(string? quantity)
    {
        if (string.IsNullOrWhiteSpace(quantity)) return 0;
        var m = Regex.Match(quantity, @"([\d.]+)\s*kg", RegexOptions.IgnoreCase);
        if (m.Success && decimal.TryParse(m.Groups[1].Value, NumberStyles.Any, CultureInfo.InvariantCulture, out var w))
            return w;
        return 0;
    }

    sealed class LrMetaPayload
    {
        public List<LrMetaItem> Items { get; set; } = [];
        public string? PickupAddress { get; set; }
        public string? PickupCity { get; set; }
        public string? DeliveryBranch { get; set; }
        public string? BillingParty { get; set; }
        public string? BillingPartyPhone { get; set; }
        public string? ServiceType { get; set; }
    }

    sealed class LrMetaItem
    {
        public string? Description { get; set; }
        public string? PackageType { get; set; }
        public JsonElement Qty { get; set; }
        public JsonElement Weight { get; set; }
    }

    static int ParseIntLoose(JsonElement el)
    {
        if (el.ValueKind == JsonValueKind.Number && el.TryGetInt32(out var n)) return n;
        if (el.ValueKind == JsonValueKind.Number && el.TryGetDouble(out var d)) return (int)Math.Round(d);
        if (el.ValueKind == JsonValueKind.String && int.TryParse(el.GetString(), out var s)) return s;
        return 0;
    }
}

public sealed class LrLabelPackage
{
    public int PackageNo { get; set; }
    public int TotalPackages { get; set; }
    public string PackageId { get; set; } = "";
    public string PackageDisplay { get; set; } = "";
    public string PackageType { get; set; } = "";
    public string Weight { get; set; } = "";
}
