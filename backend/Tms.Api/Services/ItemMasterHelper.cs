using Tms.Api.Models;

namespace Tms.Api.Services;

public static class ItemMasterHelper
{
    public static void ApplyBody(ItemMaster item, Dictionary<string, object?> body)
    {
        if (body.ContainsKey("name")) item.Name = ApiParseHelper.BodyString(body, "name") ?? item.Name;
        if (body.ContainsKey("hsn")) item.Hsn = ApiParseHelper.BodyString(body, "hsn");
        if (body.ContainsKey("defaultPackageType"))
            item.DefaultPackageType = ApiParseHelper.BodyString(body, "defaultPackageType") ?? item.DefaultPackageType;
        if (body.ContainsKey("unit")) item.Unit = ApiParseHelper.BodyString(body, "unit") ?? item.Unit;
        if (body.ContainsKey("remarks")) item.Remarks = ApiParseHelper.BodyString(body, "remarks");
        if (body.ContainsKey("status")) item.Status = ApiParseHelper.BodyString(body, "status") ?? item.Status;
    }
}
