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
[Route("api/customer-portal")]
public class CustomerPortalController(TmsDbContext db, ITenantContext tenants, IBranchContext branches) : ControllerBase
{
    IQueryable<Booking> ScopedBookings() => tenants.Filter(branches.Filter(db.Bookings.AsQueryable()));

    [HttpGet("shipments")]
    public async Task<IActionResult> Shipments() =>
        Ok(await ScopedBookings().OrderByDescending(b => b.BookingDate).Take(100)
            .Select(b => new
            {
                id = b.Id,
                shipmentCode = b.Id,
                status = b.Status,
                origin = b.FromCity,
                destination = b.ToCity,
                customer = new { name = b.CustomerName },
                freightAmount = b.Freight,
                bookedAt = b.BookingDate,
            }).ToListAsync());

    public record PortalBooking(string Origin, string Destination, string CustomerName, decimal FreightAmount, string? Material);

    [HttpPost("bookings")]
    public async Task<IActionResult> CreateBooking([FromBody] PortalBooking body)
    {
        var id = $"BK-{DateTime.UtcNow:yyMMddHHmmss}";
        var booking = new Booking
        {
            Id = id,
            BookingDate = DateOnly.FromDateTime(DateTime.UtcNow),
            CustomerName = body.CustomerName,
            FromCity = body.Origin,
            ToCity = body.Destination,
            Material = body.Material,
            Freight = body.FreightAmount,
            Status = "Pending",
            Payment = "Unpaid",
            Balance = body.FreightAmount,
            CompanyId = TenantScope.ResolveCompanyId(tenants),
            BranchId = branches.AssignBranchId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Shipments), new { id }, booking);
    }

    [HttpGet("shipments/{id}/track")]
    public async Task<IActionResult> Track(string id)
    {
        var booking = await TenantScope.FindBookingAsync(db, tenants, branches, id);
        if (booking == null) return NotFound();
        var trip = await TenantScope.Trips(db, tenants, branches).Include(t => t.Vehicle).Include(t => t.Driver)
            .FirstOrDefaultAsync(t => t.BookingId == id);
        GpsTrack? track = null;
        if (booking.VehicleId != null)
            track = await TenantScope.GpsTracks(db, tenants).Where(g => g.VehicleId == booking.VehicleId)
                .OrderByDescending(g => g.RecordedAt).FirstOrDefaultAsync();
        var pod = await TenantScope.FindPodForBookingAsync(db, tenants, id);
        return Ok(new { booking, trip, lastGps = track, pod });
    }

    [HttpGet("invoices")]
    public async Task<IActionResult> Invoices()
    {
        var rows = await tenants.Filter(db.Invoices.AsQueryable())
            .Include(i => i.Customer).Include(i => i.Lines)
            .OrderByDescending(i => i.IssuedAt).Take(50).ToListAsync();
        return Ok(rows.Select(ModuleDto.MapInvoice));
    }

    [HttpGet("pod/{bookingId}")]
    public async Task<IActionResult> Pod(string bookingId)
    {
        var booking = await TenantScope.FindBookingAsync(db, tenants, branches, bookingId);
        if (booking == null) return NotFound();
        var pod = await TenantScope.FindPodForBookingAsync(db, tenants, bookingId);
        if (pod == null) return NotFound(new { message = "POD not available" });
        return Ok(new { shipment = new { booking.Id, booking.FromCity, booking.ToCity }, pod });
    }
}

[Authorize]
[ApiController]
[Route("api/shipments")]
public class ShipmentsController(TmsDbContext db, ITenantContext tenants, IBranchContext branches) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List() =>
        Ok(await tenants.Filter(branches.Filter(db.Bookings.AsQueryable()))
            .OrderByDescending(b => b.BookingDate).Take(100)
            .Select(b => new
            {
                b.Id, shipmentCode = b.Id, b.Status,
                origin = b.FromCity, destination = b.ToCity,
                customer = new { name = b.CustomerName },
                freightAmount = b.Freight, bookedAt = b.BookingDate,
            }).ToListAsync());

    [HttpGet("{id}/track")]
    public async Task<IActionResult> Track(string id)
    {
        var booking = await TenantScope.FindBookingAsync(db, tenants, branches, id);
        if (booking == null) return NotFound();
        var trip = await TenantScope.Trips(db, tenants, branches).Include(t => t.Driver).Include(t => t.Vehicle)
            .FirstOrDefaultAsync(t => t.BookingId == id);
        var pod = await TenantScope.FindPodForBookingAsync(db, tenants, id);
        return Ok(new { booking, trip, pod });
    }
}

[Authorize]
[ApiController]
[Route("api/trips")]
public class TripsController(TmsDbContext db, IBranchContext branches, ITenantContext tenants) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? status)
    {
        var q = TenantScope.Trips(db, tenants, branches).AsNoTracking().AsQueryable();
        var trips = await q
            .Include(t => t.Vehicle).Include(t => t.Driver).Include(t => t.Stops)
            .Where(t => status == null || t.Status == status)
            .OrderByDescending(t => t.CreatedAt).Take(100)
            .ToListAsync();

        return Ok(trips.Select(t => new
        {
            t.Id, t.TripCode, t.Status, t.Origin, t.Destination,
            t.PlannedStart, t.PlannedEnd, t.ActualStart, t.ActualEnd,
            vehicle = t.Vehicle == null ? null : new { registrationNo = t.Vehicle.Number },
            driver = t.Driver == null ? null : new { name = t.Driver.Name },
            stops = t.Stops.OrderBy(s => s.SequenceNo).Select(s => new
            {
                s.Id, s.SequenceNo, s.Address, s.Latitude, s.Longitude, s.Status, s.PlannedArrival,
            }).ToList(),
        }));
    }

    public record CreateTrip(string TripCode, string Origin, string Destination, string? VehicleId, string? DriverId, string? BookingId, DateTime? PlannedStart, DateTime? PlannedEnd, List<TripStopInput>? Stops);
    public record TripStopInput(int Sequence, string Address, decimal? Latitude, decimal? Longitude);

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTrip body)
    {
        if (!string.IsNullOrEmpty(body.VehicleId))
        {
            var vehicle = await TenantScope.FindVehicleAsync(db, tenants, branches, body.VehicleId);
            if (vehicle == null) return BadRequest(new { message = "Vehicle not found in your company" });
        }
        if (!string.IsNullOrEmpty(body.DriverId))
        {
            var driver = await TenantScope.FindDriverByRefAsync(db, tenants, branches, body.DriverId);
            if (driver == null) return BadRequest(new { message = "Driver not found in your company" });
        }
        if (!string.IsNullOrEmpty(body.BookingId))
        {
            var booking = await TenantScope.FindBookingAsync(db, tenants, branches, body.BookingId);
            if (booking == null) return BadRequest(new { message = "Booking not found in your company" });
        }

        var trip = new Trip
        {
            Id = Guid.NewGuid(),
            CompanyId = TenantScope.ResolveCompanyId(tenants),
            TripCode = body.TripCode,
            Origin = body.Origin,
            Destination = body.Destination,
            VehicleId = body.VehicleId,
            DriverId = body.DriverId,
            BookingId = body.BookingId,
            Status = body.VehicleId != null && body.DriverId != null ? "ASSIGNED" : "PLANNED",
            PlannedStart = body.PlannedStart,
            PlannedEnd = body.PlannedEnd,
            BranchId = branches.AssignBranchId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        if (body.Stops?.Count > 0)
        {
            foreach (var s in body.Stops)
                trip.Stops.Add(new TripStop { Id = Guid.NewGuid(), SequenceNo = s.Sequence, Address = s.Address, Latitude = s.Latitude, Longitude = s.Longitude });
        }
        db.Trips.Add(trip);
        db.TripStatusHistories.Add(new TripStatusHistory { Id = Guid.NewGuid(), TripId = trip.Id, Status = trip.Status, ChangedBy = User.Identity?.Name, CreatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(List), new { id = trip.Id }, trip);
    }

    public record UpdateTripStatus(string Status, string? Note);

    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateTripStatus body)
    {
        var trip = await db.Trips.FindAsync(id);
        if (trip == null || !TenantScope.CanAccessBranchEntity(tenants, branches, trip)) return NotFound();
        trip.Status = body.Status;
        trip.UpdatedAt = DateTime.UtcNow;
        if (body.Status == "IN_TRANSIT" && trip.ActualStart == null) trip.ActualStart = DateTime.UtcNow;
        if (body.Status == "COMPLETED") trip.ActualEnd = DateTime.UtcNow;
        db.TripStatusHistories.Add(new TripStatusHistory { Id = Guid.NewGuid(), TripId = id, Status = body.Status, Note = body.Note, ChangedBy = User.Identity?.Name, CreatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();
        return Ok(trip);
    }
}

[Authorize]
[ApiController]
[Route("api/documents")]
public class DocumentsController(TmsDbContext db, ITenantContext tenants) : ControllerBase
{
    [HttpGet("expiring")]
    public async Task<IActionResult> Expiring([FromQuery] int days = 30)
    {
        var horizon = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(days));
        var docs = await TenantScope.Documents(db, tenants)
            .Where(d => d.ExpiresAt != null && d.ExpiresAt <= horizon)
            .OrderBy(d => d.ExpiresAt).ToListAsync();

        var vehicleDocs = await TenantScope.Vehicles(db, tenants).Where(v =>
            (v.Insurance != null && v.Insurance <= horizon) ||
            (v.Fitness != null && v.Fitness <= horizon) ||
            (v.Permit != null && v.Permit <= horizon) ||
            (v.Puc != null && v.Puc <= horizon)).ToListAsync();

        return Ok(new { documents = docs, vehicleCompliance = vehicleDocs.Select(v => new { v.Id, v.Number, v.Insurance, v.Fitness, v.Permit, v.Puc }) });
    }

    public record SaveDocument(string EntityType, string EntityId, string DocType, string Title, string? FileUrl, DateOnly? ExpiresAt);

    [HttpPost]
    public async Task<IActionResult> Save([FromBody] SaveDocument body)
    {
        if (body.EntityType.Equals("Vehicle", StringComparison.OrdinalIgnoreCase))
        {
            var vehicle = await TenantScope.Vehicles(db, tenants).FirstOrDefaultAsync(v => v.Id == body.EntityId);
            if (vehicle == null) return NotFound(new { message = "Vehicle not found" });
        }

        var companyId = TenantScope.ResolveCompanyId(tenants);
        var doc = new Document
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            EntityType = body.EntityType,
            EntityId = body.EntityId,
            DocType = body.DocType,
            Title = body.Title,
            FileUrl = body.FileUrl,
            ExpiresAt = body.ExpiresAt,
            CreatedAt = DateTime.UtcNow,
        };
        db.Documents.Add(doc);
        await db.SaveChangesAsync();
        return Ok(doc);
    }
}

[Authorize]
[ApiController]
[Route("api/analytics")]
public class AnalyticsController(TmsDbContext db, ITenantContext tenants, IBranchContext branches) : ControllerBase
{
    [HttpGet("fleet-utilization")]
    public async Task<IActionResult> FleetUtilization()
    {
        var vehicleQ = TenantScope.Vehicles(db, tenants, branches);
        var total = await vehicleQ.CountAsync();
        var onTrip = await vehicleQ.CountAsync(v => v.Status == "On Trip");
        return Ok(new { total, onTrip, utilizationPct = total > 0 ? (int)Math.Round(onTrip * 100.0 / total) : 0 });
    }

    [HttpGet("route-profitability")]
    public async Task<IActionResult> RouteProfitability() =>
        Ok(await TenantScope.Trips(db, tenants, branches).Where(t => t.Status == "COMPLETED")
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new { t.Origin, t.Destination, t.DistanceKm, t.TollCost }).Take(100).ToListAsync());
}

[Authorize]
[ApiController]
[Route("api/finance")]
public class FinanceController(TmsDbContext db, ITenantContext tenants, IBranchContext branches) : ControllerBase
{
    IQueryable<Invoice> ScopedInvoices() =>
        tenants.Filter(db.Invoices.AsQueryable());

    [HttpGet("invoices")]
    public async Task<IActionResult> Invoices([FromQuery] int page = 1, [FromQuery] int pageSize = 50, [FromQuery] bool includeTotal = true)
    {
        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize);
        var q = ScopedInvoices().AsNoTracking()
            .Include(i => i.Customer).Include(i => i.Lines)
            .OrderByDescending(i => i.IssuedAt);
        var (rows, total, hasMore, approx) = await q.ToPagedListAsync(p, size, includeTotal);
        var items = rows.Select(ModuleDto.MapInvoice).ToList();
        return Ok(new PagedResult<object>(items, total, p, size, hasMore, approx));
    }

    [HttpGet("expenses")]
    public async Task<IActionResult> Expenses() =>
        Ok(await tenants.Filter(branches.Filter(db.Expenses.AsQueryable()))
            .OrderByDescending(e => e.ExpenseDate).Take(100).ToListAsync());

    [HttpGet("summary")]
    public async Task<IActionResult> Summary()
    {
        var invoiceQ = ScopedInvoices();
        var revenue = await invoiceQ.SumAsync(i => i.TotalAmount);
        var expenses = await tenants.Filter(branches.Filter(db.Expenses.AsQueryable())).SumAsync(e => e.Amount);
        var collected = await invoiceQ.Where(i => i.Status == "PAID").SumAsync(i => i.TotalAmount);
        var pending = await invoiceQ.CountAsync(i => i.Status == "PENDING" || i.Status == "OVERDUE");
        return Ok(new { revenue, expenses, profit = revenue - expenses, collected, pendingInvoices = pending });
    }

    public record CreateInvoiceRequest(string CustomerId, string? BookingId, decimal Amount, decimal TaxAmount, List<InvoiceLineInput>? Lines);
    public record InvoiceLineInput(string Description, decimal Quantity, decimal UnitPrice);

    [HttpPost("invoices")]
    public async Task<IActionResult> CreateInvoice([FromBody] CreateInvoiceRequest body)
    {
        if (!string.IsNullOrEmpty(body.CustomerId))
        {
            var customer = await TenantScope.FindCustomerAsync(db, tenants, branches, body.CustomerId);
            if (customer == null)
                return NotFound(new { message = "Customer not found" });
        }

        var no = $"INV-{DateTime.UtcNow:yyMMddHHmmss}";
        var inv = new Invoice
        {
            Id = Guid.NewGuid(),
            CompanyId = TenantScope.ResolveCompanyId(tenants),
            InvoiceNo = no,
            CustomerId = body.CustomerId,
            BookingId = body.BookingId,
            Amount = body.Amount,
            TaxAmount = body.TaxAmount,
            TotalAmount = body.Amount + body.TaxAmount,
            IssuedAt = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = "PENDING",
            CreatedAt = DateTime.UtcNow,
        };
        if (body.Lines?.Count > 0)
            foreach (var l in body.Lines)
                inv.Lines.Add(new InvoiceLine { Id = Guid.NewGuid(), Description = l.Description, Quantity = l.Quantity, UnitPrice = l.UnitPrice, Amount = l.Quantity * l.UnitPrice });
        db.Invoices.Add(inv);
        await db.SaveChangesAsync();
        return Ok(inv);
    }
}

[Authorize]
[ApiController]
[Route("api/marketplace")]
public class MarketplaceController(TmsDbContext db, ITenantContext tenants) : ControllerBase
{
    [HttpGet("listings")]
    public async Task<IActionResult> Listings([FromQuery] int limit = 100) =>
        Ok(await TenantScope.MarketplaceListings(db, tenants).AsNoTracking()
            .Where(l => l.IsActive)
            .OrderByDescending(l => l.CreatedAt)
            .Take(Math.Min(Math.Max(limit, 1), 500))
            .Select(l => new
            {
                l.Id, l.ListingType, l.Origin, l.Destination, l.AvailableAt,
                l.Rate, l.CapacityKg, l.VehicleId, l.IsActive, l.CreatedAt,
                bidCount = db.FreightBids.Count(b => b.ListingId == l.Id),
            }).ToListAsync());

    public record PlaceBid(string BidderName, decimal Amount);

    [HttpPost("listings/{id:guid}/bid")]
    public async Task<IActionResult> Bid(Guid id, [FromBody] PlaceBid body)
    {
        var listing = await TenantScope.FindMarketplaceListingAsync(db, tenants, id);
        if (listing == null) return NotFound();

        var companyId = TenantScope.ResolveCompanyId(tenants);
        var bid = new FreightBid { Id = Guid.NewGuid(), CompanyId = companyId, ListingId = id, BidderName = body.BidderName, Amount = body.Amount, CreatedAt = DateTime.UtcNow };
        db.FreightBids.Add(bid);
        await db.SaveChangesAsync();
        return Ok(bid);
    }

    public record CreateListingRequest(string ListingType, string Origin, string Destination, decimal? Rate, decimal? CapacityKg);

    [HttpPost("listings")]
    public async Task<IActionResult> CreateListing([FromBody] CreateListingRequest body)
    {
        var companyId = TenantScope.ResolveCompanyId(tenants);
        var l = new MarketplaceListing
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            ListingType = body.ListingType,
            Origin = body.Origin,
            Destination = body.Destination,
            Rate = body.Rate,
            CapacityKg = body.CapacityKg,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };
        db.MarketplaceListings.Add(l);
        await db.SaveChangesAsync();
        return Ok(l);
    }
}

[Authorize]
[ApiController]
[Route("api/warehouses")]
public class WarehouseController(TmsDbContext db, ITenantContext tenants) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List()
    {
        if (tenants.EffectiveCompanyId == null) return Ok(Array.Empty<object>());

        var rows = await tenants.Filter(db.Warehouses.AsNoTracking())
            .OrderBy(w => w.Name)
            .Select(w => new
            {
                w.Id, w.Name, w.Address, w.CapacityCbm, w.CreatedAt,
                inventory = w.Inventory
                    .Where(i => i.CompanyId == w.CompanyId)
                    .Select(i => new { i.Id, i.Sku, i.Description, i.Quantity, i.WeightKg })
                    .ToList(),
            })
            .ToListAsync();
        return Ok(rows);
    }

    public record SaveWarehouse(string Name, string? Address, decimal? CapacityCbm);

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SaveWarehouse body)
    {
        if (tenants.EffectiveCompanyId == null) return BadRequest(new { message = "Company context required" });

        var companyId = TenantScope.ResolveCompanyId(tenants);
        var w = new Warehouse { Id = Guid.NewGuid(), CompanyId = companyId, Name = body.Name, Address = body.Address, CapacityCbm = body.CapacityCbm, CreatedAt = DateTime.UtcNow };
        db.Warehouses.Add(w);
        await db.SaveChangesAsync();
        return Ok(w);
    }

    public record SaveInventory(string Sku, string? Description, decimal Quantity, decimal WeightKg);

    [HttpPost("{id:guid}/inventory")]
    public async Task<IActionResult> AddInventory(Guid id, [FromBody] SaveInventory body)
    {
        var warehouse = await tenants.Filter(db.Warehouses.AsQueryable()).FirstOrDefaultAsync(w => w.Id == id);
        if (warehouse == null) return NotFound();

        var item = new WarehouseInventory
        {
            Id = Guid.NewGuid(),
            CompanyId = warehouse.CompanyId,
            WarehouseId = id,
            Sku = body.Sku,
            Description = body.Description,
            Quantity = body.Quantity,
            WeightKg = body.WeightKg,
        };
        db.WarehouseInventories.Add(item);
        await db.SaveChangesAsync();
        return Ok(item);
    }
}

[Authorize]
[ApiController]
[Route("api/iot")]
public class IotController(TmsDbContext db, ITenantContext tenants) : ControllerBase
{
    [HttpGet("devices")]
    public async Task<IActionResult> Devices() =>
        Ok(await TenantScope.IotDevices(db, tenants).AsNoTracking()
            .OrderByDescending(d => d.CreatedAt)
            .Select(d => new
            {
                d.Id, d.DeviceType, d.DeviceSerial, d.VehicleId, d.IsActive, d.LastSeenAt, d.CreatedAt,
                vehicle = d.Vehicle == null ? null : new { d.Vehicle.Id, number = d.Vehicle.Number },
            }).ToListAsync());

    public record RegisterDevice(string DeviceType, string DeviceSerial, string? VehicleId);

    [HttpPost("devices")]
    public async Task<IActionResult> Register([FromBody] RegisterDevice body)
    {
        if (!string.IsNullOrEmpty(body.VehicleId))
        {
            var vehicle = await TenantScope.Vehicles(db, tenants).FirstOrDefaultAsync(v => v.Id == body.VehicleId);
            if (vehicle == null) return NotFound(new { message = "Vehicle not found" });
        }

        var companyId = TenantScope.ResolveCompanyId(tenants);
        var d = new IotDevice { Id = Guid.NewGuid(), CompanyId = companyId, DeviceType = body.DeviceType, DeviceSerial = body.DeviceSerial, VehicleId = body.VehicleId, CreatedAt = DateTime.UtcNow };
        db.IotDevices.Add(d);
        await db.SaveChangesAsync();
        return Ok(d);
    }

    public record SensorReading(string Metric, decimal Value, string? Unit);

    [HttpPost("devices/{id:guid}/readings")]
    public async Task<IActionResult> Reading(Guid id, [FromBody] SensorReading body)
    {
        var device = await TenantScope.FindIotDeviceAsync(db, tenants, id);
        if (device == null) return NotFound();

        var r = new IotSensorReading { Id = Guid.NewGuid(), CompanyId = device.CompanyId, DeviceId = id, Metric = body.Metric, Value = body.Value, Unit = body.Unit, RecordedAt = DateTime.UtcNow };
        db.IotSensorReadings.Add(r);
        device.LastSeenAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(r);
    }
}

[Authorize]
[ApiController]
[Route("api/ai")]
public class AiController(TmsDbContext db, ITenantContext tenants) : ControllerBase
{
    async Task<Guid?> CurrentUserId()
    {
        var username = User.Identity?.Name;
        if (username == null) return null;
        return (await db.Users.FirstOrDefaultAsync(u => u.Username == username))?.Id;
    }

    public record ChatRequest(string Message, Guid? SessionId);

    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] ChatRequest body)
    {
        if (string.IsNullOrWhiteSpace(body.Message)) return BadRequest(new { message = "Message required" });
        var uid = await CurrentUserId();
        var companyId = TenantScope.ResolveCompanyId(tenants);
        AiChatSession? session = body.SessionId != null
            ? await TenantScope.AiChatSessions(db, tenants).FirstOrDefaultAsync(s => s.Id == body.SessionId)
            : null;
        if (session != null && session.UserId != uid) return NotFound();
        if (session == null)
        {
            session = new AiChatSession { Id = Guid.NewGuid(), CompanyId = companyId, UserId = uid, Title = body.Message[..Math.Min(50, body.Message.Length)], CreatedAt = DateTime.UtcNow };
            db.AiChatSessions.Add(session);
        }
        db.AiMessages.Add(new AiMessage { Id = Guid.NewGuid(), CompanyId = companyId, SessionId = session.Id, Role = "user", Content = body.Message, CreatedAt = DateTime.UtcNow });
        var reply = $"TMS Pro Assistant: Received your query about \"{body.Message[..Math.Min(80, body.Message.Length)]}\". Connect OpenAI API in production for full AI features.";
        db.AiMessages.Add(new AiMessage { Id = Guid.NewGuid(), CompanyId = companyId, SessionId = session.Id, Role = "assistant", Content = reply, CreatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();
        return Ok(new { sessionId = session.Id, reply });
    }

    [HttpGet("forecasts")]
    public async Task<IActionResult> Forecasts()
    {
        if (tenants.EffectiveCompanyId == null) return Ok(Array.Empty<object>());
        return Ok(await TenantScope.ForecastSnapshots(db, tenants).AsNoTracking()
            .OrderByDescending(f => f.CreatedAt).Take(12).ToListAsync());
    }
}

static class ModuleDto
{
    public static object MapInvoice(Invoice i) => new
    {
        i.Id, i.InvoiceNo, i.CustomerId, i.BookingId, i.Status,
        i.Amount, i.TaxAmount, i.TotalAmount, i.IssuedAt, i.DueAt, i.PaidAt, i.CreatedAt,
        customer = i.Customer == null ? null : new { i.Customer.Id, i.Customer.Name },
        lines = i.Lines.Select(l => new { l.Id, l.Description, l.Quantity, l.UnitPrice, l.Amount }).ToList(),
    };
}
