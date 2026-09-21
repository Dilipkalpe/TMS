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
public class BookingsController(TmsDbContext db, NotificationDispatcher notifications, IBranchContext branches, ITenantContext tenants, SubscriptionService subscriptions, DriverSyncService driverSync, DocumentFlowService documentFlow, DocumentNumberService documentNumbers, FieldConfigurationService fieldConfig) : ControllerBase
{
    async Task<Driver?> ResolveDriverAsync(string? driverName, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(driverName)) return null;
        var driver = await TenantScope.FindDriverByRefAsync(db, tenants, branches, driverName, ct);
        return driver ?? await driverSync.EnsureDriverByNameAsync(driverName, ct: ct);
    }

    async Task<string?> ValidateBookingFieldsAsync(CreateBookingRequest req, CancellationToken ct)
    {
        var map = await fieldConfig.GetMapAsync(FieldConfigurationCatalog.ModuleBooking, ct);

        map.TryGetValue("From", out var fromField);
        map.TryGetValue("To", out var toField);
        map.TryGetValue("Date", out var dateField);
        map.TryGetValue("Consignor", out var consignorField);
        map.TryGetValue("Consignee", out var consigneeField);
        map.TryGetValue("Material", out var materialField);
        map.TryGetValue("Quantity", out var quantityField);
        map.TryGetValue("Vehicle", out var vehicleField);
        map.TryGetValue("Driver", out var driverField);
        map.TryGetValue("Payment", out var paymentField);
        map.TryGetValue("Remarks", out var remarksField);
        map.TryGetValue("Freight", out var freightField);
        map.TryGetValue("Advance", out var advanceField);

        if (FieldConfigurationService.MustValidate(fromField) && FieldConfigurationService.IsMissing(req.From))
            return FieldConfigurationService.RequiredMessage(fromField, "From");
        if (FieldConfigurationService.MustValidate(toField) && FieldConfigurationService.IsMissing(req.To))
            return FieldConfigurationService.RequiredMessage(toField, "To");
        if (FieldConfigurationService.MustValidate(dateField) && FieldConfigurationService.IsMissing(req.Date))
            return FieldConfigurationService.RequiredMessage(dateField, "Booking Date");
        if (FieldConfigurationService.MustValidate(consignorField)
            && FieldConfigurationService.IsMissing(req.Consignor) && FieldConfigurationService.IsMissing(req.ConsignorId))
            return FieldConfigurationService.RequiredMessage(consignorField, "Consignor");
        if (FieldConfigurationService.MustValidate(consigneeField)
            && FieldConfigurationService.IsMissing(req.Consignee) && FieldConfigurationService.IsMissing(req.ConsigneeId))
            return FieldConfigurationService.RequiredMessage(consigneeField, "Consignee");
        if (FieldConfigurationService.MustValidate(materialField)
            && FieldConfigurationService.IsMissing(req.Material) && FieldConfigurationService.IsMissing(req.MaterialId))
            return FieldConfigurationService.RequiredMessage(materialField, "Material");
        if (FieldConfigurationService.MustValidate(quantityField) && FieldConfigurationService.IsMissing(req.Quantity))
            return FieldConfigurationService.RequiredMessage(quantityField, "Quantity");
        if (FieldConfigurationService.MustValidate(vehicleField) && FieldConfigurationService.IsMissing(req.Vehicle))
            return FieldConfigurationService.RequiredMessage(vehicleField, "Vehicle");
        if (FieldConfigurationService.MustValidate(driverField) && FieldConfigurationService.IsMissing(req.Driver))
            return FieldConfigurationService.RequiredMessage(driverField, "Driver");
        if (FieldConfigurationService.MustValidate(paymentField) && FieldConfigurationService.IsMissing(req.Payment))
            return FieldConfigurationService.RequiredMessage(paymentField, "Payment Status");
        if (FieldConfigurationService.MustValidate(remarksField) && FieldConfigurationService.IsMissing(req.Remarks))
            return FieldConfigurationService.RequiredMessage(remarksField, "Remarks");
        // Non-nullable decimals deserialize as 0 when omitted — treat <= 0 as missing when required.
        if (FieldConfigurationService.MustValidate(freightField) && req.Freight <= 0)
            return FieldConfigurationService.RequiredMessage(freightField, "Freight");
        if (FieldConfigurationService.MustValidate(advanceField) && req.Advance < 0)
            return FieldConfigurationService.RequiredMessage(advanceField, "Advance");

        return null;
    }

    static bool Visible(IReadOnlyDictionary<string, FieldConfigurationDto> map, string key) =>
        !map.TryGetValue(key, out var f) || FieldConfigurationService.IsVisible(f);

    async Task<(string? Id, string? Name)> ResolveMaterialAsync(string? materialId, string? materialName, CancellationToken ct)
    {
        if (!string.IsNullOrWhiteSpace(materialId))
        {
            var item = await tenants.Filter(branches.Filter(db.Items.AsNoTracking()))
                .FirstOrDefaultAsync(i => i.Id == materialId, ct);
            if (item != null) return (item.Id, item.Name);
        }
        return (null, string.IsNullOrWhiteSpace(materialName) ? null : materialName.Trim());
    }

    /// <summary>
    /// customer_name remains NOT NULL for legacy finance/reports.
    /// Prefer explicit customer, else consignor, else consignee.
    /// </summary>
  static string ResolveLegacyCustomerName(string? customer, string? consignor, string? consignee)
  {
    foreach (var candidate in new[] { customer, consignor, consignee })
    {
      if (!string.IsNullOrWhiteSpace(candidate))
        return candidate.Trim();
    }
    return "";
  }


    [HttpGet]
    public async Task<ActionResult<PagedResult<BookingDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = QueryExtensions.DefaultPageSize,
        [FromQuery] bool includeTotal = true)
    {
        var q = tenants.Filter(branches.Filter(db.Bookings.AsNoTracking().Include(b => b.Branch)));
        if (!string.IsNullOrWhiteSpace(status) && status != "(All)") q = q.Where(b => b.Status == status);
        q = SearchHelper.Filter(q, search);
        q = q.OrderByDescending(b => b.BookingDate).ThenByDescending(b => b.Id);
        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize);
        var (items, total, hasMore, approx) = await q.ToPagedListAsync(p, size, includeTotal);
        var lrByBooking = await ResolveLrNumbersAsync(items.Select(b => b.Id).ToList());
        return Ok(new PagedResult<BookingDto>(
            items.Select(b => EntityMappers.ToDto(b, lrByBooking.GetValueOrDefault(b.Id))).ToList(),
            total, p, size, hasMore, approx));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<BookingDto>> Get(string id)
    {
        id = DocumentCodeRules.DecodePathId(id);
        var b = await db.Bookings.AsNoTracking().Include(x => x.Branch).FirstOrDefaultAsync(x => x.Id == id);
        if (b == null || !TenantAccess.CanAccess(tenants, b) || !BranchAccess.CanAccess(branches, b)) return NotFound();
        var lrNumber = await ResolveLrNumberAsync(id);
        return Ok(EntityMappers.ToDto(b, lrNumber));
    }

    [HttpPost]
    public async Task<ActionResult<BookingDto>> Create([FromBody] CreateBookingRequest req, CancellationToken ct)
    {
        var validationError = await ValidateBookingFieldsAsync(req, ct);
        if (validationError != null)
            return BadRequest(new ApiError(validationError));

        try
        {
            var companyId = tenants.AssignCompanyId ?? TenantContext.DefaultCompanyId;
            await documentFlow.EnsureCanCreateBookingAsync(req.LrNumber, ct);
            await subscriptions.EnsureCanCreateBookingAsync(companyId);

            var fieldMap = await fieldConfig.GetMapAsync(FieldConfigurationCatalog.ModuleBooking, ct);
            DateOnly bookingDate;
            if (Visible(fieldMap, "Date"))
            {
                if (!ApiParseHelper.TryParseDate(req.Date, out bookingDate))
                    return BadRequest(new ApiError("Invalid booking date. Use YYYY-MM-DD."));
            }
            else
            {
                bookingDate = DateOnly.FromDateTime(DateTime.UtcNow);
            }

            var branchId = await documentNumbers.ResolveBranchIdForNumberingAsync(tenants, branches, ct: ct);
            var id = await documentNumbers.NextAsync(DocumentNumberTypes.Booking, companyId, branchId, bookingDate, ct);
            var vehicle = Visible(fieldMap, "Vehicle") && !string.IsNullOrEmpty(req.Vehicle)
                ? await TenantScope.FindVehicleByRefAsync(db, tenants, branches, req.Vehicle) : null;
            var driver = Visible(fieldMap, "Driver") && !string.IsNullOrEmpty(req.Driver)
                ? await ResolveDriverAsync(req.Driver, ct) : null;

            string? consignorId = null;
            string? consignorName = null;
            if (Visible(fieldMap, "Consignor"))
            {
                var requireConsignor = FieldConfigurationService.MustValidate(fieldMap.GetValueOrDefault("Consignor"));
                var (row, err) = await PartyMasterHelper.ResolveActiveConsignorAsync(
                    db, tenants, branches, req.ConsignorId, req.Consignor, ct, requireValue: requireConsignor);
                if (err != null) return BadRequest(new ApiError(err));
                consignorId = row?.Id ?? req.ConsignorId;
                consignorName = row != null
                    ? PartyMasterHelper.DisplayName(row.Name, row.CompanyName)
                    : req.Consignor?.Trim();
            }

            string? consigneeId = null;
            string? consigneeName = null;
            if (Visible(fieldMap, "Consignee"))
            {
                var requireConsignee = FieldConfigurationService.MustValidate(fieldMap.GetValueOrDefault("Consignee"));
                var (row, err) = await PartyMasterHelper.ResolveActiveConsigneeAsync(
                    db, tenants, branches, req.ConsigneeId, req.Consignee, ct, requireValue: requireConsignee);
                if (err != null) return BadRequest(new ApiError(err));
                consigneeId = row?.Id ?? req.ConsigneeId;
                consigneeName = row != null
                    ? PartyMasterHelper.DisplayName(row.Name, row.CompanyName)
                    : req.Consignee?.Trim();
            }

            var (materialId, materialName) = Visible(fieldMap, "Material")
                ? await ResolveMaterialAsync(req.MaterialId, req.Material, ct)
                : (null, null);

            var legacyCustomerName = ResolveLegacyCustomerName(req.Customer, consignorName, consigneeName);
            var customer = !string.IsNullOrWhiteSpace(legacyCustomerName)
                ? await TenantScope.FindCustomerByNameAsync(db, tenants, branches, legacyCustomerName)
                : null;

            LorryReceipt? linkedLr = null;
            if (!string.IsNullOrWhiteSpace(req.LrNumber))
            {
                linkedLr = await TenantScope.LorryReceipts(db, tenants, branches)
                    .FirstOrDefaultAsync(l => l.LrNumber == req.LrNumber, ct);
                if (linkedLr == null)
                    return BadRequest(new ApiError($"LR '{req.LrNumber}' was not found in your company."));
                if (!string.IsNullOrEmpty(linkedLr.BookingId))
                    return BadRequest(new ApiError($"LR '{req.LrNumber}' is already linked to booking '{linkedLr.BookingId}'."));
            }

            var freight = Visible(fieldMap, "Freight") ? req.Freight : 0;
            var advance = Visible(fieldMap, "Advance") ? req.Advance : 0;
            var balance = freight - advance;
            var booking = new Booking
            {
                Id = id,
                BookingDate = bookingDate,
                CustomerId = customer?.Id,
                CustomerName = legacyCustomerName,
                ConsignorId = consignorId,
                ConsigneeId = consigneeId,
                Consignor = consignorName,
                Consignee = consigneeName,
                FromCity = Visible(fieldMap, "From") ? (req.From ?? "") : "",
                ToCity = Visible(fieldMap, "To") ? (req.To ?? "") : "",
                MaterialId = materialId,
                Material = materialName,
                Quantity = Visible(fieldMap, "Quantity") ? req.Quantity : null,
                VehicleId = vehicle?.Id,
                VehicleNumber = vehicle?.Number ?? (Visible(fieldMap, "Vehicle") ? req.Vehicle : null),
                DriverId = driver?.Id,
                DriverName = driver?.Name ?? (Visible(fieldMap, "Driver") ? req.Driver : null),
                Freight = freight,
                Status = string.IsNullOrWhiteSpace(req.Status) ? "Pending" : req.Status,
                Payment = Visible(fieldMap, "Payment")
                    ? (string.IsNullOrWhiteSpace(req.Payment) ? "Unpaid" : req.Payment)
                    : "Unpaid",
                Advance = advance,
                Balance = balance,
                Remarks = Visible(fieldMap, "Remarks") ? req.Remarks : null,
                CompanyId = companyId,
                BranchId = branchId,
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
            return CreatedAtAction(nameof(Get), new { id }, EntityMappers.ToDto(booking, linkedLr?.LrNumber));
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
    public async Task<ActionResult<BookingDto>> Update(string id, [FromBody] CreateBookingRequest req, CancellationToken ct)
    {
        id = DocumentCodeRules.DecodePathId(id);
        var booking = await db.Bookings.FindAsync(id);
        if (booking == null || !TenantScope.CanAccessBranchEntity(tenants, branches, booking)) return NotFound();

        var fieldMap = await fieldConfig.GetMapAsync(FieldConfigurationCatalog.ModuleBooking, ct);
        var linkedLrNumber = await ResolveLrNumberAsync(id);
        var hasLr = !string.IsNullOrWhiteSpace(linkedLrNumber);

        // After LR is linked, only status / payment / remarks may change — skip party/material resolve
        // so inactive masters cannot block status updates.
        Vehicle? vehicle = null;
        Driver? driver = null;
        string? consignorId = booking.ConsignorId;
        string? consignorName = booking.Consignor;
        string? consigneeId = booking.ConsigneeId;
        string? consigneeName = booking.Consignee;
        string? materialId = booking.MaterialId;
        string? materialName = booking.Material;
        Customer? customer = null;

        if (!hasLr)
        {
            var validationError = await ValidateBookingFieldsAsync(req, ct);
            if (validationError != null)
                return BadRequest(new ApiError(validationError));

            vehicle = Visible(fieldMap, "Vehicle") && !string.IsNullOrEmpty(req.Vehicle)
                ? await TenantScope.FindVehicleByRefAsync(db, tenants, branches, req.Vehicle) : null;
            driver = Visible(fieldMap, "Driver") && !string.IsNullOrEmpty(req.Driver)
                ? await ResolveDriverAsync(req.Driver, ct) : null;

            if (Visible(fieldMap, "Consignor"))
            {
                var requireConsignor = FieldConfigurationService.MustValidate(fieldMap.GetValueOrDefault("Consignor"));
                var (row, err) = await PartyMasterHelper.ResolveActiveConsignorAsync(
                    db, tenants, branches, req.ConsignorId, req.Consignor, ct, requireValue: requireConsignor);
                if (err != null) return BadRequest(new ApiError(err));
                consignorId = row?.Id ?? req.ConsignorId;
                consignorName = row != null
                    ? PartyMasterHelper.DisplayName(row.Name, row.CompanyName)
                    : req.Consignor?.Trim();
            }

            if (Visible(fieldMap, "Consignee"))
            {
                var requireConsignee = FieldConfigurationService.MustValidate(fieldMap.GetValueOrDefault("Consignee"));
                var (row, err) = await PartyMasterHelper.ResolveActiveConsigneeAsync(
                    db, tenants, branches, req.ConsigneeId, req.Consignee, ct, requireValue: requireConsignee);
                if (err != null) return BadRequest(new ApiError(err));
                consigneeId = row?.Id ?? req.ConsigneeId;
                consigneeName = row != null
                    ? PartyMasterHelper.DisplayName(row.Name, row.CompanyName)
                    : req.Consignee?.Trim();
            }

            (materialId, materialName) = Visible(fieldMap, "Material")
                ? await ResolveMaterialAsync(req.MaterialId, req.Material, ct)
                : (booking.MaterialId, booking.Material);

            var legacyCustomerName = ResolveLegacyCustomerName(req.Customer, consignorName, consigneeName);
            customer = !string.IsNullOrWhiteSpace(legacyCustomerName)
                ? await TenantScope.FindCustomerByNameAsync(db, tenants, branches, legacyCustomerName)
                : null;
        }

        var prevStatus = booking.Status;

        DateOnly bookingDate = booking.BookingDate;
        if (!hasLr && Visible(fieldMap, "Date"))
        {
            if (!ApiParseHelper.TryParseDate(req.Date, out bookingDate))
                return BadRequest(new ApiError("Invalid booking date. Use YYYY-MM-DD."));
        }

        // Full edit only before an LR is generated. After LR, status/payment/remarks only.
        // Hidden fields are not overwritten — existing stored values are preserved.
        if (!hasLr)
        {
            var legacyCustomerName = ResolveLegacyCustomerName(req.Customer, consignorName, consigneeName);
            if (Visible(fieldMap, "Date")) booking.BookingDate = bookingDate;
            booking.CustomerId = customer?.Id;
            booking.CustomerName = string.IsNullOrWhiteSpace(legacyCustomerName)
                ? booking.CustomerName
                : legacyCustomerName;
            if (Visible(fieldMap, "Consignor"))
            {
                booking.ConsignorId = consignorId;
                booking.Consignor = consignorName;
            }
            if (Visible(fieldMap, "Consignee"))
            {
                booking.ConsigneeId = consigneeId;
                booking.Consignee = consigneeName;
            }
            if (Visible(fieldMap, "From")) booking.FromCity = req.From ?? "";
            if (Visible(fieldMap, "To")) booking.ToCity = req.To ?? "";
            if (Visible(fieldMap, "Material"))
            {
                booking.MaterialId = materialId;
                booking.Material = materialName;
            }
            if (Visible(fieldMap, "Quantity")) booking.Quantity = req.Quantity;
            if (Visible(fieldMap, "Vehicle"))
            {
                booking.VehicleId = vehicle?.Id;
                booking.VehicleNumber = vehicle?.Number ?? req.Vehicle;
            }
            if (Visible(fieldMap, "Driver"))
            {
                booking.DriverId = driver?.Id;
                booking.DriverName = driver?.Name ?? req.Driver;
            }
            if (Visible(fieldMap, "Freight")) booking.Freight = req.Freight;
            if (Visible(fieldMap, "Advance")) booking.Advance = req.Advance;
            if (Visible(fieldMap, "Freight") || Visible(fieldMap, "Advance"))
                booking.Balance = booking.Freight - booking.Advance;
        }
        else if (
            (Visible(fieldMap, "From") && booking.FromCity != req.From) ||
            (Visible(fieldMap, "To") && booking.ToCity != req.To) ||
            (Visible(fieldMap, "Freight") && booking.Freight != req.Freight) ||
            (Visible(fieldMap, "Advance") && booking.Advance != req.Advance) ||
            (Visible(fieldMap, "Consignor") && (booking.Consignor ?? "") != (req.Consignor ?? "")) ||
            (Visible(fieldMap, "Consignee") && (booking.Consignee ?? "") != (req.Consignee ?? "")) ||
            (Visible(fieldMap, "Material") && (booking.Material ?? "") != (req.Material ?? "")) ||
            (Visible(fieldMap, "Quantity") && (booking.Quantity ?? "") != (req.Quantity ?? "")) ||
            (Visible(fieldMap, "Vehicle") && (booking.VehicleNumber ?? "") != (req.Vehicle ?? "")) ||
            (Visible(fieldMap, "Driver") && (booking.DriverName ?? "") != (req.Driver ?? "")) ||
            (Visible(fieldMap, "Date") && req.Date != null && booking.BookingDate.ToString("yyyy-MM-dd") != req.Date))
        {
            return BadRequest(new ApiError(
                $"Booking '{id}' already has LR '{linkedLrNumber}'. Edit booking details before generating the LR, or update the LR instead."));
        }

        booking.Status = req.Status;
        if (Visible(fieldMap, "Payment")) booking.Payment = req.Payment;
        if (Visible(fieldMap, "Remarks")) booking.Remarks = req.Remarks;
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
                    ["origin"] = booking.FromCity ?? "",
                    ["destination"] = booking.ToCity ?? "",
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
        return Ok(EntityMappers.ToDto(booking, linkedLrNumber));
    }

    static bool IsDispatchStatus(string status) =>
        status is "In Transit" or "On Trip" or "Dispatched" or "Delivered";

    async Task<string?> ResolveLrNumberAsync(string bookingId, CancellationToken ct = default)
    {
        return await TenantScope.LorryReceipts(db, tenants, branches).AsNoTracking()
            .Where(l => l.BookingId == bookingId)
            .OrderBy(l => l.LrNumber)
            .Select(l => l.LrNumber)
            .FirstOrDefaultAsync(ct);
    }

    async Task<Dictionary<string, string>> ResolveLrNumbersAsync(IReadOnlyList<string> bookingIds, CancellationToken ct = default)
    {
        if (bookingIds.Count == 0) return new Dictionary<string, string>();
        var rows = await TenantScope.LorryReceipts(db, tenants, branches).AsNoTracking()
            .Where(l => l.BookingId != null && bookingIds.Contains(l.BookingId))
            .Select(l => new { l.BookingId, l.LrNumber })
            .ToListAsync(ct);
        return rows
            .GroupBy(r => r.BookingId!)
            .ToDictionary(g => g.Key, g => g.OrderBy(x => x.LrNumber).First().LrNumber);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        id = DocumentCodeRules.DecodePathId(id);
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
