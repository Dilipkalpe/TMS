using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Tms.Api.Data;
using Tms.Api.Models;
using Tms.Api.Services;

namespace Tms.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/eway-bills")]
public class EwayBillsController(
    TmsDbContext db,
    ITenantContext tenants,
    IBranchContext branches,
    EwayBillSyncService sync) : ControllerBase
{
    public record EwayBillDto(
        Guid Id,
        string LrNumber,
        string? EwayBillNo,
        DateOnly? EwayBillDate,
        DateOnly? ValidUpto,
        string? VehicleNo,
        string? FromPlace,
        string? ToPlace,
        decimal? DocumentValue,
        string Status,
        string Source,
        string? PortalRef,
        string? Notes,
        DateTime CreatedAt,
        DateTime UpdatedAt);

    public record SaveEwayBillBody(
        string LrNumber,
        string? EwayBillNo,
        DateOnly? EwayBillDate,
        DateOnly? ValidUpto,
        string? VehicleNo,
        string? FromPlace,
        string? ToPlace,
        decimal? DocumentValue,
        string? Status,
        string? Notes);

    static EwayBillDto ToDto(EwayBill e, DateOnly today) => new(
        e.Id,
        e.LrNumber,
        e.EwayBillNo,
        e.EwayBillDate,
        e.ValidUpto,
        e.VehicleNo,
        e.FromPlace,
        e.ToPlace,
        e.DocumentValue,
        EwayBillSyncService.ResolveDisplayStatus(e.Status, e.ValidUpto, today),
        e.Source,
        e.PortalRef,
        e.Notes,
        e.CreatedAt,
        e.UpdatedAt);

    IQueryable<EwayBill> Scoped() => TenantScope.EwayBills(db, tenants, branches);

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? status,
        [FromQuery] string? lrNumber,
        [FromQuery] string? search,
        [FromQuery] int? expiringWithinDays,
        [FromQuery] int limit = 200)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var take = Math.Min(Math.Max(limit, 1), 500);
        var q = Scoped().AsNoTracking();

        if (!string.IsNullOrWhiteSpace(lrNumber))
            q = q.Where(e => e.LrNumber == lrNumber.Trim());
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(e =>
                e.LrNumber.ToLower().Contains(s)
                || (e.EwayBillNo != null && e.EwayBillNo.ToLower().Contains(s))
                || (e.VehicleNo != null && e.VehicleNo.ToLower().Contains(s)));
        }

        var rows = await q.OrderByDescending(e => e.UpdatedAt).Take(take).ToListAsync();
        var dtos = rows.Select(e => ToDto(e, today)).ToList();

        if (!string.IsNullOrWhiteSpace(status))
            dtos = dtos.Where(d => d.Status.Equals(status, StringComparison.OrdinalIgnoreCase)).ToList();
        if (expiringWithinDays is > 0)
        {
            var horizon = today.AddDays(expiringWithinDays.Value);
            dtos = dtos.Where(d => d.ValidUpto != null && d.ValidUpto >= today && d.ValidUpto <= horizon
                && !d.Status.Equals(EwayBillStatuses.Cancelled, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        var allForKpi = await Scoped().AsNoTracking().ToListAsync();
        var kpiDtos = allForKpi.Select(e => ToDto(e, today)).ToList();
        var lrWithEway = allForKpi.Select(e => e.LrNumber).Distinct().ToHashSet(StringComparer.OrdinalIgnoreCase);
        var recentLrCount = await TenantScope.LorryReceipts(db, tenants, branches).AsNoTracking().CountAsync();
        var missing = Math.Max(0, recentLrCount - lrWithEway.Count);

        return Ok(new
        {
            items = dtos,
            kpis = new
            {
                total = kpiDtos.Count,
                active = kpiDtos.Count(d => d.Status == EwayBillStatuses.Active),
                expiring = kpiDtos.Count(d => d.Status == EwayBillStatuses.Expiring),
                expired = kpiDtos.Count(d => d.Status == EwayBillStatuses.Expired),
                cancelled = kpiDtos.Count(d => d.Status == EwayBillStatuses.Cancelled),
                draft = kpiDtos.Count(d => d.Status == EwayBillStatuses.Draft),
                missingLrs = missing,
            },
            portal = new { configured = false, message = "GST e-way portal (NIC/GSP) is not configured." },
        });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var row = await Scoped().AsNoTracking().FirstOrDefaultAsync(e => e.Id == id);
        if (row == null) return NotFound();
        return Ok(ToDto(row, DateOnly.FromDateTime(DateTime.UtcNow)));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SaveEwayBillBody body)
    {
        if (string.IsNullOrWhiteSpace(body.LrNumber))
            return BadRequest(new { message = "LR number is required." });

        var lr = await TenantScope.LorryReceipts(db, tenants, branches)
            .FirstOrDefaultAsync(l => l.LrNumber == body.LrNumber.Trim());
        if (lr == null) return BadRequest(new { message = "LR not found in your company/branch." });

        var companyId = lr.CompanyId;
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var status = string.IsNullOrWhiteSpace(body.Status) ? EwayBillStatuses.Active : body.Status!.Trim();
        var bill = new EwayBill
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            BranchId = lr.BranchId,
            LrNumber = lr.LrNumber,
            EwayBillNo = body.EwayBillNo?.Trim(),
            EwayBillDate = body.EwayBillDate ?? lr.LrDate,
            ValidUpto = body.ValidUpto,
            VehicleNo = body.VehicleNo?.Trim() ?? lr.VehicleNumber,
            FromPlace = body.FromPlace?.Trim() ?? lr.FromCity,
            ToPlace = body.ToPlace?.Trim() ?? lr.ToCity,
            DocumentValue = body.DocumentValue ?? (lr.Freight + lr.Gst),
            Status = status,
            Source = "Manual",
            Notes = body.Notes,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        bill.Status = EwayBillSyncService.ResolveDisplayStatus(bill.Status, bill.ValidUpto, today);
        db.EwayBills.Add(bill);
        await db.SaveChangesAsync();
        await sync.WriteEwayToLrRemarksAsync(bill);
        return Ok(ToDto(bill, today));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] SaveEwayBillBody body)
    {
        var bill = await Scoped().FirstOrDefaultAsync(e => e.Id == id);
        if (bill == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(body.LrNumber) && !body.LrNumber.Equals(bill.LrNumber, StringComparison.OrdinalIgnoreCase))
        {
            var lr = await TenantScope.LorryReceipts(db, tenants, branches)
                .FirstOrDefaultAsync(l => l.LrNumber == body.LrNumber.Trim());
            if (lr == null) return BadRequest(new { message = "LR not found." });
            bill.LrNumber = lr.LrNumber;
            bill.BranchId = lr.BranchId;
        }

        if (body.EwayBillNo != null) bill.EwayBillNo = body.EwayBillNo.Trim();
        if (body.EwayBillDate != null) bill.EwayBillDate = body.EwayBillDate;
        if (body.ValidUpto != null) bill.ValidUpto = body.ValidUpto;
        if (body.VehicleNo != null) bill.VehicleNo = body.VehicleNo.Trim();
        if (body.FromPlace != null) bill.FromPlace = body.FromPlace.Trim();
        if (body.ToPlace != null) bill.ToPlace = body.ToPlace.Trim();
        if (body.DocumentValue != null) bill.DocumentValue = body.DocumentValue;
        if (body.Notes != null) bill.Notes = body.Notes;
        if (!string.IsNullOrWhiteSpace(body.Status)) bill.Status = body.Status.Trim();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (!string.Equals(bill.Status, EwayBillStatuses.Cancelled, StringComparison.OrdinalIgnoreCase))
            bill.Status = EwayBillSyncService.ResolveDisplayStatus(bill.Status, bill.ValidUpto, today);
        bill.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await sync.WriteEwayToLrRemarksAsync(bill);
        return Ok(ToDto(bill, today));
    }

    [HttpPost("{id:guid}/generate")]
    public async Task<IActionResult> Generate(Guid id)
    {
        var bill = await Scoped().AsNoTracking().FirstOrDefaultAsync(e => e.Id == id);
        if (bill == null) return NotFound();
        return StatusCode(StatusCodes.Status501NotImplemented, new
        {
            configured = false,
            message = "GST e-way portal (NIC/GSP) is not configured. Register the bill number manually, or configure portal credentials in E-Way Settings later.",
            id = bill.Id,
            lrNumber = bill.LrNumber,
        });
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> CancelPortal(Guid id)
    {
        var bill = await Scoped().AsNoTracking().FirstOrDefaultAsync(e => e.Id == id);
        if (bill == null) return NotFound();
        return StatusCode(StatusCodes.Status501NotImplemented, new
        {
            configured = false,
            message = "GST e-way portal cancel is not configured. Use Edit to mark status as Cancelled manually.",
            id = bill.Id,
            lrNumber = bill.LrNumber,
        });
    }

    [HttpPost("{id:guid}/mark-cancelled")]
    public async Task<IActionResult> MarkCancelled(Guid id)
    {
        var bill = await Scoped().FirstOrDefaultAsync(e => e.Id == id);
        if (bill == null) return NotFound();
        bill.Status = EwayBillStatuses.Cancelled;
        bill.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(ToDto(bill, DateOnly.FromDateTime(DateTime.UtcNow)));
    }
}
