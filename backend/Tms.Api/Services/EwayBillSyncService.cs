using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public static class EwayBillStatuses
{
    public const string Draft = "Draft";
    public const string Active = "Active";
    public const string Expiring = "Expiring";
    public const string Expired = "Expired";
    public const string Cancelled = "Cancelled";
}

public class EwayBillSyncService(TmsDbContext db)
{
    const string MetaMarker = "__lr_meta__:";

    public static string? ExtractEwayBillNoFromRemarks(string? remarks)
    {
        if (string.IsNullOrWhiteSpace(remarks)) return null;
        var idx = remarks.IndexOf(MetaMarker, StringComparison.Ordinal);
        if (idx < 0) return null;
        var json = remarks[(idx + MetaMarker.Length)..].Trim();
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("ewayBillNo", out var prop))
            {
                var v = prop.GetString();
                return string.IsNullOrWhiteSpace(v) ? null : v.Trim();
            }
        }
        catch
        {
            /* ignore malformed meta */
        }
        return null;
    }

    public static string MergeEwayIntoRemarks(string? remarks, string? ewayBillNo)
    {
        var text = remarks ?? "";
        var idx = text.IndexOf(MetaMarker, StringComparison.Ordinal);
        string baseRemarks = text;
        JsonObject meta = new();

        if (idx >= 0)
        {
            baseRemarks = text[..idx].TrimEnd();
            var json = text[(idx + MetaMarker.Length)..].Trim();
            try
            {
                meta = JsonNode.Parse(json) as JsonObject ?? new JsonObject();
            }
            catch
            {
                meta = new JsonObject();
            }
        }

        if (string.IsNullOrWhiteSpace(ewayBillNo))
            meta.Remove("ewayBillNo");
        else
            meta["ewayBillNo"] = ewayBillNo.Trim();

        var metaJson = meta.ToJsonString(new JsonSerializerOptions { WriteIndented = false });
        return string.IsNullOrWhiteSpace(baseRemarks)
            ? $"{MetaMarker}{metaJson}"
            : $"{baseRemarks}\n{MetaMarker}{metaJson}";
    }

    public static string ResolveDisplayStatus(string status, DateOnly? validUpto, DateOnly today, int expiringDays = 3)
    {
        if (string.Equals(status, EwayBillStatuses.Cancelled, StringComparison.OrdinalIgnoreCase))
            return EwayBillStatuses.Cancelled;
        if (string.Equals(status, EwayBillStatuses.Draft, StringComparison.OrdinalIgnoreCase))
            return EwayBillStatuses.Draft;
        if (validUpto is null)
            return string.IsNullOrWhiteSpace(status) ? EwayBillStatuses.Draft : status;
        if (validUpto < today) return EwayBillStatuses.Expired;
        if (validUpto <= today.AddDays(expiringDays)) return EwayBillStatuses.Expiring;
        return EwayBillStatuses.Active;
    }

    /// <summary>Upsert eway_bills from LR remarks meta / vehicle when an e-way number is present.</summary>
    public async Task SyncFromLrAsync(LorryReceipt lr, CancellationToken ct = default)
    {
        var ewayNo = ExtractEwayBillNoFromRemarks(lr.Remarks);
        if (string.IsNullOrWhiteSpace(ewayNo)) return;

        var existing = await db.EwayBills
            .Where(e => e.CompanyId == lr.CompanyId && e.LrNumber == lr.LrNumber && e.Status != EwayBillStatuses.Cancelled)
            .OrderByDescending(e => e.UpdatedAt)
            .FirstOrDefaultAsync(ct);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (existing == null)
        {
            db.EwayBills.Add(new EwayBill
            {
                Id = Guid.NewGuid(),
                CompanyId = lr.CompanyId,
                BranchId = lr.BranchId,
                LrNumber = lr.LrNumber,
                EwayBillNo = ewayNo,
                EwayBillDate = lr.LrDate,
                ValidUpto = lr.LrDate.AddDays(1),
                VehicleNo = lr.VehicleNumber,
                FromPlace = lr.FromCity,
                ToPlace = lr.ToCity,
                DocumentValue = lr.Freight + lr.Gst,
                Status = EwayBillStatuses.Active,
                Source = "Manual",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
        }
        else
        {
            existing.EwayBillNo = ewayNo;
            existing.VehicleNo ??= lr.VehicleNumber;
            existing.FromPlace ??= lr.FromCity;
            existing.ToPlace ??= lr.ToCity;
            if (existing.Status != EwayBillStatuses.Cancelled)
                existing.Status = ResolveDisplayStatus(existing.Status, existing.ValidUpto, today);
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);
    }

    public async Task WriteEwayToLrRemarksAsync(EwayBill bill, CancellationToken ct = default)
    {
        var lr = await db.LorryReceipts.FirstOrDefaultAsync(l => l.LrNumber == bill.LrNumber && l.CompanyId == bill.CompanyId, ct);
        if (lr == null) return;
        lr.Remarks = MergeEwayIntoRemarks(lr.Remarks, bill.EwayBillNo);
        lr.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }
}
