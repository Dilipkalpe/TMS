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
[Route("api/[controller]")]
public class BookingsController(TmsDbContext db, NotificationDispatcher notifications, IBranchContext branches, ITenantContext tenants, SubscriptionService subscriptions, DriverSyncService driverSync, DocumentFlowService documentFlow) : ControllerBase
{
    async Task<Driver?> ResolveDriverAsync(string? driverName, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(driverName)) return null;
        var driver = await TenantScope.FindDriverByRefAsync(db, tenants, branches, driverName, ct);
        return driver ?? await driverSync.EnsureDriverByNameAsync(driverName, ct: ct);
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<BookingDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true)
    {
        var q = tenants.Filter(branches.Filter(db.Bookings.AsNoTracking()));
        if (!string.IsNullOrWhiteSpace(status) && status != "(All)") q = q.Where(b => b.Status == status);
        q = SearchHelper.Filter(q, search);
        q = q.OrderByDescending(b => b.BookingDate).ThenByDescending(b => b.Id);
        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize);
        var (items, total, hasMore, approx) = await q.ToPagedListAsync(p, size, includeTotal);
        return Ok(new PagedResult<BookingDto>(
            items.Select(EntityMappers.ToDto).ToList(), total, p, size, hasMore, approx));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<BookingDto>> Get(string id)
    {
        var b = await db.Bookings.FindAsync(id);
        if (b == null || !TenantAccess.CanAccess(tenants, b) || !BranchAccess.CanAccess(branches, b)) return NotFound();
        return Ok(EntityMappers.ToDto(b));
    }

    [HttpPost]
    public async Task<ActionResult<BookingDto>> Create([FromBody] CreateBookingRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Customer))
            return BadRequest(new ApiError("Customer is required."));
        if (string.IsNullOrWhiteSpace(req.From) || string.IsNullOrWhiteSpace(req.To))
            return BadRequest(new ApiError("From and To cities are required."));

        try
        {
            var companyId = tenants.AssignCompanyId ?? TenantContext.DefaultCompanyId;
            await documentFlow.EnsureCanCreateBookingAsync(req.LrNumber, ct);
            await subscriptions.EnsureCanCreateBookingAsync(companyId);

            var id = await IdGenerator.NextBookingId(db);
            var vehicle = !string.IsNullOrEmpty(req.Vehicle)
                ? await TenantScope.FindVehicleByRefAsync(db, tenants, branches, req.Vehicle) : null;
            var driver = !string.IsNullOrEmpty(req.Driver)
                ? await ResolveDriverAsync(req.Driver, ct) : null;
            var customer = await TenantScope.FindCustomerByNameAsync(db, tenants, branches, req.Customer);

            if (!ApiParseHelper.TryParseDate(req.Date, out var bookingDate))
                return BadRequest(new ApiError("Invalid booking date. Use YYYY-MM-DD."));

            LorryReceipt? linkedLr = null;
            if (!string.IsNullOrWhiteSpace(req.LrNumber))
            {
                linkedLr = await tenants.Filter(db.LorryReceipts)
                    .FirstOrDefaultAsync(l => l.LrNumber == req.LrNumber, ct);
                if (linkedLr == null)
                    return BadRequest(new ApiError($"LR '{req.LrNumber}' was not found in your company."));
                if (!string.IsNullOrEmpty(linkedLr.BookingId))
                    return BadRequest(new ApiError($"LR '{req.LrNumber}' is already linked to booking '{linkedLr.BookingId}'."));
            }

            var balance = req.Freight - req.Advance;
            var booking = new Booking
            {
                Id = id,
                BookingDate = bookingDate,
                CustomerId = customer?.Id,
                CustomerName = req.Customer,
                Consignor = req.Consignor,
                Consignee = req.Consignee,
                FromCity = req.From,
                ToCity = req.To,
                Material = req.Material,
                Quantity = req.Quantity,
                VehicleId = vehicle?.Id,
                VehicleNumber = vehicle?.Number ?? req.Vehicle,
                DriverId = driver?.Id,
                DriverName = driver?.Name ?? req.Driver,
                Freight = req.Freight,
                Status = req.Status,
                Payment = req.Payment,
                Advance = req.Advance,
                Balance = balance,
                Remarks = req.Remarks,
                CompanyId = companyId,
                BranchId = branches.AssignBranchId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            db.Bookings.Add(booking);
            if (linkedLr != null)
            {
                linkedLr.BookingId = id;
                linkedLr.UpdatedAt = DateTime.UtcNow;
            }
            await CustomerTrackingService.RecordStatusAsync(db, booking.Id, booking.Status, "Booking created");
            await db.SaveChangesAsync();
            await subscriptions.IncrementBookingUsageAsync(companyId);
            return CreatedAtAction(nameof(Get), new { id }, EntityMappers.ToDto(booking));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiError(ex.Message));
        }
        catch (DbUpdateException ex)
        {
            var inner = ex.InnerException?.Message ?? ex.Message;
            if (inner.Contains("duplicate key", StringComparison.OrdinalIgnoreCase))
                return Conflict(new ApiError("Booking ID already exists. Refresh and try again."));
            return StatusCode(500, new ApiError($"Could not save booking: {inner}"));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ApiError($"Could not save booking: {ex.Message}"));
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<BookingDto>> Update(string id, [FromBody] CreateBookingRequest req)
    {
        var booking = await db.Bookings.FindAsync(id);
        if (booking == null || !TenantScope.CanAccessBranchEntity(tenants, branches, booking)) return NotFound();

        if (string.IsNullOrWhiteSpace(req.Customer))
            return BadRequest(new ApiError("Customer is required."));
        if (string.IsNullOrWhiteSpace(req.From) || string.IsNullOrWhiteSpace(req.To))
            return BadRequest(new ApiError("From and To cities are required."));

        var customer = await TenantScope.FindCustomerByNameAsync(db, tenants, branches, req.Customer);

        var vehicle = !string.IsNullOrEmpty(req.Vehicle)
            ? await TenantScope.FindVehicleByRefAsync(db, tenants, branches, req.Vehicle) : null;
        var driver = !string.IsNullOrEmpty(req.Driver)
            ? await ResolveDriverAsync(req.Driver) : null;

        var prevStatus = booking.Status;

        if (!ApiParseHelper.TryParseDate(req.Date, out var bookingDate))
            return BadRequest(new ApiError("Invalid booking date. Use YYYY-MM-DD."));

        booking.BookingDate = bookingDate;
        booking.CustomerId = customer?.Id;
        booking.CustomerName = req.Customer;
        booking.Consignor = req.Consignor;
        booking.Consignee = req.Consignee;
        booking.FromCity = req.From;
        booking.ToCity = req.To;
        booking.Material = req.Material;
        booking.Quantity = req.Quantity;
        booking.VehicleId = vehicle?.Id;
        booking.VehicleNumber = vehicle?.Number ?? req.Vehicle;
        booking.DriverId = driver?.Id;
        booking.DriverName = driver?.Name ?? req.Driver;
        booking.Freight = req.Freight;
        booking.Status = req.Status;
        booking.Payment = req.Payment;
        booking.Advance = req.Advance;
        booking.Balance = req.Freight - req.Advance;
        booking.Remarks = req.Remarks;
        booking.UpdatedAt = DateTime.UtcNow;

        if (prevStatus != req.Status && IsDispatchStatus(req.Status))
        {
            var notifyCustomer = booking.CustomerId != null
                ? await TenantScope.FindCustomerAsync(db, tenants, branches, booking.CustomerId)
                : customer;

            await notifications.DispatchAsync(new DispatchNotificationRequest
            {
                EventCode = "SHIPMENT_DISPATCHED",
                Title = $"Shipment {booking.Id}: {req.Status}",
                Variables = new Dictionary<string, string>
                {
                    ["bookingId"] = booking.Id,
                    ["origin"] = booking.FromCity,
                    ["destination"] = booking.ToCity,
                    ["status"] = req.Status,
                },
                SmsPhone = notifyCustomer?.Phone,
                WhatsAppPhone = notifyCustomer?.Phone,
                RecipientName = notifyCustomer?.Name ?? booking.CustomerName,
            });
        }

        if (prevStatus != req.Status)
            await CustomerTrackingService.RecordStatusAsync(db, booking.Id, req.Status);

        await db.SaveChangesAsync();
        return Ok(EntityMappers.ToDto(booking));
    }

    static bool IsDispatchStatus(string status) =>
        status is "In Transit" or "On Trip" or "Dispatched" or "Delivered";

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var booking = await db.Bookings.FindAsync(id);
        if (booking == null || !TenantScope.CanAccessBranchEntity(tenants, branches, booking)) return NotFound();

        var linkedLrs = await db.LorryReceipts.Where(l => l.BookingId == id).ToListAsync();
        foreach (var lr in linkedLrs)
            lr.BookingId = null;

        db.Bookings.Remove(booking);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
