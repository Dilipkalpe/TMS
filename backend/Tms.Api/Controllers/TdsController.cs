using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.DTOs;
using Tms.Api.Models;
using Tms.Api.Services;

namespace Tms.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/tds")]
public class TdsController(
    TmsDbContext db,
    ITenantContext tenants,
    IBranchContext branches,
    TdsService tds) : ControllerBase
{
    Guid CompanyId => TenantScope.ResolveCompanyId(tenants);

    // ── Settings ──────────────────────────────────────────────
    [HttpGet("settings")]
    public async Task<ActionResult<object>> GetSettings()
    {
        var s = await tds.GetOrCreateSettingsAsync();
        return Ok(new
        {
            enabled = s.Enabled,
            tdsPayableLedgerName = s.TdsPayableLedgerName,
            tdsReceivableLedgerName = s.TdsReceivableLedgerName,
            roundOff = s.RoundOff,
            autoPostVoucher = s.AutoPostVoucher,
        });
    }

    [HttpPut("settings")]
    public async Task<ActionResult<object>> UpdateSettings([FromBody] Dictionary<string, object?> body)
    {
        var s = await tds.GetOrCreateSettingsAsync();
        if (body.ContainsKey("enabled")) s.Enabled = body["enabled"]?.ToString()?.Equals("true", StringComparison.OrdinalIgnoreCase) == true
            || body["enabled"] is bool b && b;
        if (body.ContainsKey("tdsPayableLedgerName")) s.TdsPayableLedgerName = body["tdsPayableLedgerName"]?.ToString() ?? s.TdsPayableLedgerName;
        if (body.ContainsKey("tdsReceivableLedgerName")) s.TdsReceivableLedgerName = body["tdsReceivableLedgerName"]?.ToString() ?? s.TdsReceivableLedgerName;
        if (body.ContainsKey("roundOff")) s.RoundOff = body["roundOff"]?.ToString() ?? s.RoundOff;
        if (body.ContainsKey("autoPostVoucher")) s.AutoPostVoucher = body["autoPostVoucher"]?.ToString()?.Equals("true", StringComparison.OrdinalIgnoreCase) == true
            || body["autoPostVoucher"] is bool ab && ab;
        s.UpdatedAt = DateTime.UtcNow;
        s.UpdatedBy = User.Identity?.Name;
        await db.SaveChangesAsync();
        return await GetSettings();
    }

    // ── Sections ──────────────────────────────────────────────
    [HttpGet("sections")]
    public async Task<ActionResult<object>> ListSections([FromQuery] bool activeOnly = false)
    {
        var q = db.TdsSections.AsNoTracking().Where(s => s.CompanyId == CompanyId);
        if (activeOnly) q = q.Where(s => s.IsActive);
        var rows = await q.OrderBy(s => s.SectionCode).ToListAsync();
        return Ok(rows.Select(s => new
        {
            id = s.Id, sectionCode = s.SectionCode, name = s.Name,
            natureOfPayment = s.NatureOfPayment, partyType = s.PartyType, isActive = s.IsActive,
        }));
    }

    [HttpPost("sections")]
    public async Task<ActionResult<object>> CreateSection([FromBody] Dictionary<string, object?> body)
    {
        var code = body.GetValueOrDefault("sectionCode")?.ToString()?.Trim().ToUpperInvariant()
            ?? throw new InvalidOperationException("sectionCode required");
        var s = new TdsSection
        {
            Id = Guid.NewGuid(),
            CompanyId = CompanyId,
            SectionCode = code,
            Name = body.GetValueOrDefault("name")?.ToString() ?? code,
            NatureOfPayment = body.GetValueOrDefault("natureOfPayment")?.ToString(),
            PartyType = body.GetValueOrDefault("partyType")?.ToString() ?? "BOTH",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.TdsSections.Add(s);
        await db.SaveChangesAsync();
        return Ok(new { id = s.Id, sectionCode = s.SectionCode, name = s.Name });
    }

    [HttpPut("sections/{id:guid}")]
    public async Task<ActionResult<object>> UpdateSection(Guid id, [FromBody] Dictionary<string, object?> body)
    {
        var s = await db.TdsSections.FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == CompanyId);
        if (s == null) return NotFound();
        if (body.ContainsKey("name")) s.Name = body["name"]?.ToString() ?? s.Name;
        if (body.ContainsKey("natureOfPayment")) s.NatureOfPayment = body["natureOfPayment"]?.ToString();
        if (body.ContainsKey("partyType")) s.PartyType = body["partyType"]?.ToString() ?? s.PartyType;
        if (body.ContainsKey("isActive")) s.IsActive = body["isActive"]?.ToString()?.Equals("true", StringComparison.OrdinalIgnoreCase) == true
            || body["isActive"] is bool b && b;
        s.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { id = s.Id, sectionCode = s.SectionCode, name = s.Name, isActive = s.IsActive });
    }

    // ── Rates ─────────────────────────────────────────────────
    [HttpGet("rates")]
    public async Task<ActionResult<object>> ListRates([FromQuery] Guid? sectionId = null)
    {
        var q = db.TdsRates.AsNoTracking().Include(r => r.Section).Where(r => r.CompanyId == CompanyId);
        if (sectionId != null) q = q.Where(r => r.SectionId == sectionId);
        var rows = await q.OrderByDescending(r => r.EffectiveFrom).ToListAsync();
        return Ok(rows.Select(r => new
        {
            id = r.Id, sectionId = r.SectionId, sectionCode = r.Section?.SectionCode,
            ratePercent = r.RatePercent, rateWithoutPanPercent = r.RateWithoutPanPercent,
            thresholdAmount = r.ThresholdAmount, thresholdType = r.ThresholdType,
            effectiveFrom = r.EffectiveFrom.ToString("yyyy-MM-dd"),
            effectiveTo = r.EffectiveTo?.ToString("yyyy-MM-dd"),
            isActive = r.IsActive,
        }));
    }

    [HttpPost("rates")]
    public async Task<ActionResult<object>> CreateRate([FromBody] Dictionary<string, object?> body)
    {
        if (!Guid.TryParse(body.GetValueOrDefault("sectionId")?.ToString(), out var sectionId))
            return BadRequest(new ApiError("sectionId required"));
        var r = new TdsRate
        {
            Id = Guid.NewGuid(),
            CompanyId = CompanyId,
            SectionId = sectionId,
            RatePercent = decimal.TryParse(body.GetValueOrDefault("ratePercent")?.ToString(), out var rp) ? rp : 0,
            RateWithoutPanPercent = decimal.TryParse(body.GetValueOrDefault("rateWithoutPanPercent")?.ToString(), out var rwp) ? rwp : 20,
            ThresholdAmount = decimal.TryParse(body.GetValueOrDefault("thresholdAmount")?.ToString(), out var th) ? th : 0,
            ThresholdType = body.GetValueOrDefault("thresholdType")?.ToString() ?? "TRANSACTION",
            EffectiveFrom = DateOnly.TryParse(body.GetValueOrDefault("effectiveFrom")?.ToString(), out var ef) ? ef : DateOnly.FromDateTime(DateTime.UtcNow),
            EffectiveTo = DateOnly.TryParse(body.GetValueOrDefault("effectiveTo")?.ToString(), out var et) ? et : null,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.TdsRates.Add(r);
        await db.SaveChangesAsync();
        return Ok(new { id = r.Id });
    }

    [HttpPut("rates/{id:guid}")]
    public async Task<ActionResult<object>> UpdateRate(Guid id, [FromBody] Dictionary<string, object?> body)
    {
        var r = await db.TdsRates.FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == CompanyId);
        if (r == null) return NotFound();
        if (body.ContainsKey("ratePercent") && decimal.TryParse(body["ratePercent"]?.ToString(), out var rp)) r.RatePercent = rp;
        if (body.ContainsKey("rateWithoutPanPercent") && decimal.TryParse(body["rateWithoutPanPercent"]?.ToString(), out var rwp)) r.RateWithoutPanPercent = rwp;
        if (body.ContainsKey("thresholdAmount") && decimal.TryParse(body["thresholdAmount"]?.ToString(), out var th)) r.ThresholdAmount = th;
        if (body.ContainsKey("thresholdType")) r.ThresholdType = body["thresholdType"]?.ToString() ?? r.ThresholdType;
        if (body.ContainsKey("effectiveFrom") && DateOnly.TryParse(body["effectiveFrom"]?.ToString(), out var ef)) r.EffectiveFrom = ef;
        if (body.ContainsKey("effectiveTo"))
            r.EffectiveTo = DateOnly.TryParse(body["effectiveTo"]?.ToString(), out var et) ? et : null;
        if (body.ContainsKey("isActive")) r.IsActive = body["isActive"]?.ToString()?.Equals("true", StringComparison.OrdinalIgnoreCase) == true
            || body["isActive"] is bool b && b;
        r.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { id = r.Id });
    }

    // ── Exemptions ────────────────────────────────────────────
    [HttpGet("exemptions")]
    public async Task<ActionResult<object>> ListExemptions()
    {
        var rows = await db.TdsExemptions.AsNoTracking().Include(e => e.Section)
            .Where(e => e.CompanyId == CompanyId)
            .OrderByDescending(e => e.ValidFrom).ToListAsync();
        return Ok(rows.Select(e => new
        {
            id = e.Id, partyType = e.PartyType, partyId = e.PartyId,
            sectionId = e.SectionId, sectionCode = e.Section?.SectionCode,
            certificateNo = e.CertificateNo, lowerRatePercent = e.LowerRatePercent,
            validFrom = e.ValidFrom.ToString("yyyy-MM-dd"),
            validTo = e.ValidTo?.ToString("yyyy-MM-dd"),
            remarks = e.Remarks, isActive = e.IsActive,
        }));
    }

    [HttpPost("exemptions")]
    public async Task<ActionResult<object>> CreateExemption([FromBody] Dictionary<string, object?> body)
    {
        var e = new TdsExemption
        {
            Id = Guid.NewGuid(),
            CompanyId = CompanyId,
            PartyType = body.GetValueOrDefault("partyType")?.ToString() ?? "VENDOR",
            PartyId = body.GetValueOrDefault("partyId")?.ToString() ?? "",
            SectionId = Guid.TryParse(body.GetValueOrDefault("sectionId")?.ToString(), out var sid) ? sid : null,
            CertificateNo = body.GetValueOrDefault("certificateNo")?.ToString(),
            LowerRatePercent = decimal.TryParse(body.GetValueOrDefault("lowerRatePercent")?.ToString(), out var lr) ? lr : null,
            ValidFrom = DateOnly.TryParse(body.GetValueOrDefault("validFrom")?.ToString(), out var vf) ? vf : DateOnly.FromDateTime(DateTime.UtcNow),
            ValidTo = DateOnly.TryParse(body.GetValueOrDefault("validTo")?.ToString(), out var vt) ? vt : null,
            Remarks = body.GetValueOrDefault("remarks")?.ToString(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        if (string.IsNullOrWhiteSpace(e.PartyId)) return BadRequest(new ApiError("partyId required"));
        db.TdsExemptions.Add(e);
        await db.SaveChangesAsync();
        return Ok(new { id = e.Id });
    }

    [HttpPut("exemptions/{id:guid}")]
    public async Task<ActionResult<object>> UpdateExemption(Guid id, [FromBody] Dictionary<string, object?> body)
    {
        var e = await db.TdsExemptions.FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == CompanyId);
        if (e == null) return NotFound();
        if (body.ContainsKey("certificateNo")) e.CertificateNo = body["certificateNo"]?.ToString();
        if (body.ContainsKey("lowerRatePercent"))
            e.LowerRatePercent = decimal.TryParse(body["lowerRatePercent"]?.ToString(), out var lr) ? lr : null;
        if (body.ContainsKey("validFrom") && DateOnly.TryParse(body["validFrom"]?.ToString(), out var vf)) e.ValidFrom = vf;
        if (body.ContainsKey("validTo"))
            e.ValidTo = DateOnly.TryParse(body["validTo"]?.ToString(), out var vt) ? vt : null;
        if (body.ContainsKey("remarks")) e.Remarks = body["remarks"]?.ToString();
        if (body.ContainsKey("isActive")) e.IsActive = body["isActive"]?.ToString()?.Equals("true", StringComparison.OrdinalIgnoreCase) == true
            || body["isActive"] is bool b && b;
        e.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { id = e.Id });
    }

    // ── Calculate / Vendor payment / Transactions ─────────────
    [HttpPost("calculate")]
    public async Task<ActionResult<object>> Calculate([FromBody] Dictionary<string, object?> body)
    {
        try
        {
            var sectionId = Guid.TryParse(body.GetValueOrDefault("sectionId")?.ToString(), out var sid) ? sid : (Guid?)null;
            var baseAmount = decimal.TryParse(body.GetValueOrDefault("baseAmount")?.ToString(), out var ba) ? ba : 0;
            var date = DateOnly.TryParse(body.GetValueOrDefault("date")?.ToString(), out var d) ? d : DateOnly.FromDateTime(DateTime.UtcNow);
            var partyType = body.GetValueOrDefault("partyType")?.ToString() ?? "VENDOR";
            var partyId = body.GetValueOrDefault("partyId")?.ToString();
            var pan = body.GetValueOrDefault("pan")?.ToString();
            var result = await tds.PreviewAsync(sectionId, baseAmount, date, partyType, partyId, pan);
            return Ok(new
            {
                result.BaseAmount, result.AppliedRatePercent, result.TdsAmount, result.NetAmount,
                result.BelowThreshold, result.UsedWithoutPanRate, result.UsedExemption, result.Warning,
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiError(ex.Message));
        }
    }

    [HttpPost("vendor-payments")]
    public async Task<ActionResult<object>> CreateVendorPayment([FromBody] Dictionary<string, object?> body)
    {
        try
        {
            var result = await tds.CreateVendorPaymentAsync(body);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiError(ex.Message));
        }
    }

    [HttpGet("vendor-payments")]
    public async Task<ActionResult<object>> ListVendorPayments(
        [FromQuery] string? vendorId,
        [FromQuery] string? from,
        [FromQuery] string? to)
    {
        var q = db.VendorPayments.AsNoTracking().Where(p => p.CompanyId == CompanyId);
        if (!string.IsNullOrWhiteSpace(vendorId)) q = q.Where(p => p.VendorId == vendorId);
        if (DateOnly.TryParse(from, out var f)) q = q.Where(p => p.PaymentDate >= f);
        if (DateOnly.TryParse(to, out var t)) q = q.Where(p => p.PaymentDate <= t);
        var rows = await q.OrderByDescending(p => p.PaymentDate).Take(500).ToListAsync();
        var sectionIds = rows.Where(p => p.TdsSectionId != null).Select(p => p.TdsSectionId!.Value).Distinct().ToList();
        var sectionCodes = sectionIds.Count == 0
            ? new Dictionary<Guid, string>()
            : await db.TdsSections.AsNoTracking()
                .Where(s => sectionIds.Contains(s.Id))
                .ToDictionaryAsync(s => s.Id, s => s.SectionCode);
        return Ok(rows.Select(p => TdsService.MapVendorPayment(
            p,
            p.TdsSectionId != null && sectionCodes.TryGetValue(p.TdsSectionId.Value, out var code) ? code : null)));
    }

    [HttpGet("transactions")]
    public async Task<ActionResult<object>> ListTransactions(
        [FromQuery] string? direction,
        [FromQuery] string? partyId,
        [FromQuery] string? financialYear,
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] string? status,
        [FromQuery] Guid? sectionId)
    {
        var q = db.TdsTransactions.AsNoTracking().Include(t => t.Section).Where(t => t.CompanyId == CompanyId);
        if (!string.IsNullOrWhiteSpace(direction)) q = q.Where(t => t.Direction == direction);
        if (!string.IsNullOrWhiteSpace(partyId)) q = q.Where(t => t.PartyId == partyId);
        if (!string.IsNullOrWhiteSpace(financialYear)) q = q.Where(t => t.FinancialYear == financialYear);
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(t => t.Status == status);
        if (sectionId != null) q = q.Where(t => t.SectionId == sectionId);
        if (DateOnly.TryParse(from, out var f)) q = q.Where(t => t.TransactionDate >= f);
        if (DateOnly.TryParse(to, out var tto)) q = q.Where(t => t.TransactionDate <= tto);
        var rows = await q.OrderByDescending(t => t.TransactionDate).ThenByDescending(t => t.CreatedAt).Take(1000).ToListAsync();
        return Ok(rows.Select(TdsService.MapTxn));
    }

    [HttpPost("transactions/{id:guid}/reverse")]
    public async Task<ActionResult<object>> Reverse(Guid id, [FromBody] Dictionary<string, object?>? body)
    {
        try
        {
            var result = await tds.ReverseAsync(id, body?.GetValueOrDefault("remarks")?.ToString());
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiError(ex.Message));
        }
    }

    // ── Reports ───────────────────────────────────────────────
    [HttpGet("reports/details")]
    public Task<ActionResult<object>> ReportDetails(
        [FromQuery] string? financialYear,
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] string? direction,
        [FromQuery] string? partyId,
        [FromQuery] Guid? sectionId) =>
        ListTransactions(direction, partyId, financialYear, from, to, null, sectionId);

    [HttpGet("reports/vendor-wise")]
    public async Task<ActionResult<object>> ReportVendorWise(
        [FromQuery] string? financialYear,
        [FromQuery] string? from,
        [FromQuery] string? to)
    {
        var q = db.TdsTransactions.AsNoTracking()
            .Where(t => t.CompanyId == CompanyId && t.Direction == TdsDirections.Payable && t.PartyType == "VENDOR");
        if (!string.IsNullOrWhiteSpace(financialYear)) q = q.Where(t => t.FinancialYear == financialYear);
        if (DateOnly.TryParse(from, out var f)) q = q.Where(t => t.TransactionDate >= f);
        if (DateOnly.TryParse(to, out var tto)) q = q.Where(t => t.TransactionDate <= tto);
        var rows = await q.ToListAsync();
        var summary = rows
            .GroupBy(t => new { t.PartyId, t.PartyName })
            .Select(g => new
            {
                partyId = g.Key.PartyId,
                partyName = g.Key.PartyName,
                baseAmount = g.Sum(x => x.BaseAmount),
                tdsAmount = g.Sum(x => x.TdsAmount),
                count = g.Count(),
            })
            .OrderByDescending(x => x.tdsAmount)
            .ToList();
        return Ok(summary);
    }

    [HttpGet("reports/summary")]
    public async Task<ActionResult<object>> ReportSummary(
        [FromQuery] string? financialYear,
        [FromQuery] string? from,
        [FromQuery] string? to)
    {
        var q = db.TdsTransactions.AsNoTracking().Where(t => t.CompanyId == CompanyId);
        if (!string.IsNullOrWhiteSpace(financialYear)) q = q.Where(t => t.FinancialYear == financialYear);
        if (DateOnly.TryParse(from, out var f)) q = q.Where(t => t.TransactionDate >= f);
        if (DateOnly.TryParse(to, out var tto)) q = q.Where(t => t.TransactionDate <= tto);
        var rows = await q.ToListAsync();
        return Ok(new
        {
            payable = rows.Where(t => t.Direction == TdsDirections.Payable).Sum(t => t.TdsAmount),
            receivable = rows.Where(t => t.Direction == TdsDirections.Receivable).Sum(t => t.TdsAmount),
            postedCount = rows.Count(t => t.Status == TdsTxnStatuses.Posted),
            reversedCount = rows.Count(t => t.Status == TdsTxnStatuses.Reversed),
            financialYear = financialYear ?? TdsCalculationService.FinancialYear(DateOnly.FromDateTime(DateTime.UtcNow)),
        });
    }
}
