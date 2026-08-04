using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public static class PartyMasterHelper
{
    public static void ApplyConsignorBody(Consignor c, Dictionary<string, object?> body)
    {
        if (body.ContainsKey("name")) c.Name = ApiParseHelper.BodyString(body, "name") ?? c.Name;
        if (body.ContainsKey("companyName")) c.CompanyName = ApiParseHelper.BodyString(body, "companyName");
        if (body.ContainsKey("contact")) c.Contact = ApiParseHelper.BodyString(body, "contact");
        if (body.ContainsKey("phone")) c.Phone = ApiParseHelper.BodyString(body, "phone");
        if (body.ContainsKey("email")) c.Email = ApiParseHelper.BodyString(body, "email");
        if (body.ContainsKey("gst")) c.Gst = ApiParseHelper.BodyString(body, "gst");
        if (body.ContainsKey("pan")) c.Pan = ApiParseHelper.BodyString(body, "pan");
        if (body.ContainsKey("address")) c.Address = ApiParseHelper.BodyString(body, "address");
        if (body.ContainsKey("city")) c.City = ApiParseHelper.BodyString(body, "city");
        if (body.ContainsKey("state")) c.State = ApiParseHelper.BodyString(body, "state");
        if (body.ContainsKey("pincode")) c.Pincode = ApiParseHelper.BodyString(body, "pincode");
        if (body.ContainsKey("defaultFromLocation"))
            c.DefaultFromLocation = ApiParseHelper.BodyString(body, "defaultFromLocation");
        if (body.ContainsKey("status")) c.Status = ApiParseHelper.BodyString(body, "status") ?? c.Status;
    }

    public static void ApplyConsigneeBody(Consignee c, Dictionary<string, object?> body)
    {
        if (body.ContainsKey("name")) c.Name = ApiParseHelper.BodyString(body, "name") ?? c.Name;
        if (body.ContainsKey("companyName")) c.CompanyName = ApiParseHelper.BodyString(body, "companyName");
        if (body.ContainsKey("contact")) c.Contact = ApiParseHelper.BodyString(body, "contact");
        if (body.ContainsKey("phone")) c.Phone = ApiParseHelper.BodyString(body, "phone");
        if (body.ContainsKey("email")) c.Email = ApiParseHelper.BodyString(body, "email");
        if (body.ContainsKey("gst")) c.Gst = ApiParseHelper.BodyString(body, "gst");
        if (body.ContainsKey("pan")) c.Pan = ApiParseHelper.BodyString(body, "pan");
        if (body.ContainsKey("address")) c.Address = ApiParseHelper.BodyString(body, "address");
        if (body.ContainsKey("city")) c.City = ApiParseHelper.BodyString(body, "city");
        if (body.ContainsKey("state")) c.State = ApiParseHelper.BodyString(body, "state");
        if (body.ContainsKey("pincode")) c.Pincode = ApiParseHelper.BodyString(body, "pincode");
        if (body.ContainsKey("defaultToLocation"))
            c.DefaultToLocation = ApiParseHelper.BodyString(body, "defaultToLocation");
        if (body.ContainsKey("status")) c.Status = ApiParseHelper.BodyString(body, "status") ?? c.Status;
    }

    public static string DisplayName(string name, string? companyName) =>
        !string.IsNullOrWhiteSpace(companyName) ? companyName.Trim() : name.Trim();

    public static async Task<(Consignor? Entity, string? Error)> ResolveActiveConsignorAsync(
        TmsDbContext db, ITenantContext tenants, IBranchContext branches,
        string? id, string? fallbackName, CancellationToken ct = default)
    {
        if (!string.IsNullOrWhiteSpace(id))
        {
            var row = await db.Consignors.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id, ct);
            if (row == null || !TenantScope.CanAccessBranchEntity(tenants, branches, row))
                return (null, "Consignor not found.");
            if (!string.Equals(row.Status, "Active", StringComparison.OrdinalIgnoreCase))
                return (null, "Selected consignor is inactive.");
            return (row, null);
        }

        if (string.IsNullOrWhiteSpace(fallbackName))
            return (null, "Consignor is required.");

        return (null, null);
    }

    public static async Task<(Consignee? Entity, string? Error)> ResolveActiveConsigneeAsync(
        TmsDbContext db, ITenantContext tenants, IBranchContext branches,
        string? id, string? fallbackName, CancellationToken ct = default)
    {
        if (!string.IsNullOrWhiteSpace(id))
        {
            var row = await db.Consignees.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id, ct);
            if (row == null || !TenantScope.CanAccessBranchEntity(tenants, branches, row))
                return (null, "Consignee not found.");
            if (!string.Equals(row.Status, "Active", StringComparison.OrdinalIgnoreCase))
                return (null, "Selected consignee is inactive.");
            return (row, null);
        }

        if (string.IsNullOrWhiteSpace(fallbackName))
            return (null, "Consignee is required.");

        return (null, null);
    }
}
