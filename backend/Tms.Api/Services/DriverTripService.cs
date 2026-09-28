using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public record DriverTripDto(
    Guid SessionId,
    string DriverId,
    string DriverName,
    string VehicleId,
    string VehicleNumber,
    Guid? LoadingSlipId,
    string? LoadingSlipNumber,
    string LrNumber,
    string? TripNo,
    string? CustomerName,
    string? Source,
    string? Destination,
    string Status,
    bool TrackingActive,
    DateTime? StartedAt,
    DateTime? CompletedAt,
    DateTime UpdatedAt);

public record DriverLocationSubmit(
    Guid SessionId,
    decimal Latitude,
    decimal Longitude,
    decimal? Accuracy,
    decimal? Speed,
    decimal? Heading,
    DateTime? GpsTimestamp);

public class DriverTripService(TmsDbContext db, GpsIngestService ingest, IConfiguration config)
{
    static readonly string[] TerminalLrStatuses =
    [
        LrStatuses.DeliveryCompleted, LrStatuses.PodUploaded, LrStatuses.InvoiceGenerated,
        LrStatuses.ExpenseAdded, LrStatuses.ExpenseApproved, LrStatuses.Closed,
    ];

    int StaleMinutes => config.GetValue("Gps:StaleThresholdMinutes", 15);

    public async Task<DriverTripDto?> GetOrSyncActiveTripAsync(string driverId, Guid companyId, CancellationToken ct = default)
    {
        var existing = await db.DriverTripSessions
            .Where(s => s.CompanyId == companyId && s.DriverId == driverId && DriverTripStatuses.Active.Contains(s.Status))
            .OrderByDescending(s => s.UpdatedAt)
            .FirstOrDefaultAsync(ct);

        if (existing != null)
            return await MapAsync(existing, ct);

        var synced = await SyncFromLoadingSlipAsync(driverId, companyId, ct);
        return synced == null ? null : await MapAsync(synced, ct);
    }

    public async Task<DriverTripSession?> SyncFromLoadingSlipAsync(string driverId, Guid companyId, CancellationToken ct = default)
    {
        var lr = await db.LorryReceipts.AsNoTracking()
            .Where(r => r.CompanyId == companyId
                        && r.DriverId == driverId
                        && r.VehicleId != null
                        && !TerminalLrStatuses.Contains(r.Status))
            .OrderByDescending(r => r.UpdatedAt)
            .FirstOrDefaultAsync(ct);

        if (lr == null || string.IsNullOrWhiteSpace(lr.VehicleId))
            return null;

        var sheet = await db.LrLoadingSheets.AsNoTracking()
            .Include(s => s.Items)
            .Where(s => s.CompanyId == companyId && (s.LrNumber == lr.LrNumber || s.Items.Any(i => i.LrNumber == lr.LrNumber)))
            .OrderByDescending(s => s.UpdatedAt)
            .FirstOrDefaultAsync(ct);

        // Prefer loading-sheet vehicle if set
        var vehicleId = sheet?.VehicleId ?? lr.VehicleId!;
        var vehicle = await db.Vehicles.AsNoTracking().FirstOrDefaultAsync(v => v.Id == vehicleId, ct);
        if (vehicle == null) return null;

        var customer = sheet?.Items.OrderBy(i => i.SortOrder).Select(i => i.CustomerName).FirstOrDefault()
                       ?? lr.CustomerName;

        // Ensure driverId is stored on sheet extended data for audit
        if (sheet != null)
            await EnsureSheetDriverExtendedAsync(sheet.Id, driverId, ct);

        var now = DateTime.UtcNow;
        var session = new DriverTripSession
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            DriverId = driverId,
            VehicleId = vehicle.Id,
            LoadingSlipId = sheet?.Id,
            LrNumber = lr.LrNumber,
            LoadingSlipNumber = sheet?.SheetNumber,
            TripNo = sheet?.TripNo ?? lr.LrNumber,
            CustomerName = customer,
            Source = lr.FromCity,
            Destination = lr.ToCity,
            Status = DriverTripStatuses.Assigned,
            TrackingActive = false,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.DriverTripSessions.Add(session);
        db.DriverTripStatusHistories.Add(new DriverTripStatusHistory
        {
            Id = Guid.NewGuid(),
            SessionId = session.Id,
            CompanyId = companyId,
            OldStatus = null,
            NewStatus = DriverTripStatuses.Assigned,
            ChangedBy = driverId,
            ChangedAt = now,
            Notes = "Synced from Loading Slip assignment",
        });
        await db.SaveChangesAsync(ct);
        return session;
    }

    async Task EnsureSheetDriverExtendedAsync(Guid sheetId, string driverId, CancellationToken ct)
    {
        var sheet = await db.LrLoadingSheets.FirstOrDefaultAsync(s => s.Id == sheetId, ct);
        if (sheet == null) return;
        try
        {
            using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(sheet.ExtendedDataJson) ? "{}" : sheet.ExtendedDataJson);
            var root = doc.RootElement.Clone();
            using var stream = new MemoryStream();
            using (var writer = new Utf8JsonWriter(stream))
            {
                writer.WriteStartObject();
                foreach (var prop in root.EnumerateObject())
                {
                    if (prop.NameEquals("driverId")) continue;
                    prop.WriteTo(writer);
                }
                writer.WriteString("driverId", driverId);
                writer.WriteEndObject();
            }
            sheet.ExtendedDataJson = System.Text.Encoding.UTF8.GetString(stream.ToArray());
            sheet.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
        }
        catch
        {
            /* non-fatal */
        }
    }

    public async Task<DriverTripDto> StartTripAsync(string driverId, Guid companyId, Guid sessionId, CancellationToken ct = default)
    {
        var session = await RequireOwnedSessionAsync(driverId, companyId, sessionId, ct);
        if (session.Status == DriverTripStatuses.DeliveryCompleted)
            throw new InvalidOperationException("Trip already completed");

        var now = DateTime.UtcNow;
        var old = session.Status;
        if (session.Status == DriverTripStatuses.Assigned)
            session.Status = DriverTripStatuses.Started;
        session.TrackingActive = true;
        session.StartedAt ??= now;
        session.UpdatedAt = now;

        db.DriverTripStatusHistories.Add(new DriverTripStatusHistory
        {
            Id = Guid.NewGuid(),
            SessionId = session.Id,
            CompanyId = companyId,
            OldStatus = old,
            NewStatus = session.Status,
            ChangedBy = driverId,
            ChangedAt = now,
            Notes = "Start Trip — browser GPS tracking enabled",
        });

        var last = await db.VehicleLastPositions.FindAsync([session.VehicleId], ct);
        if (last != null)
        {
            last.DriverId = driverId;
            last.LoadingSlipId = session.LoadingSlipId;
            last.TrackingStatus = "ACTIVE";
            last.UpdatedAt = now;
        }

        await db.SaveChangesAsync(ct);
        return (await MapAsync(session, ct))!;
    }

    public async Task<DriverTripDto> UpdateStatusAsync(
        string driverId, Guid companyId, Guid sessionId, string newStatus, CancellationToken ct = default)
    {
        var session = await RequireOwnedSessionAsync(driverId, companyId, sessionId, ct);
        var normalized = newStatus.Trim().ToUpperInvariant();
        if (!DriverTripStatuses.WorkflowOrder.Contains(normalized))
            throw new InvalidOperationException($"Invalid status: {newStatus}");
        if (!DriverTripStatuses.CanTransition(session.Status, normalized))
            throw new InvalidOperationException($"Cannot change status from {session.Status} to {normalized}");

        var now = DateTime.UtcNow;
        var old = session.Status;
        session.Status = normalized;
        session.UpdatedAt = now;

        if (normalized == DriverTripStatuses.DeliveryCompleted)
        {
            session.TrackingActive = false;
            session.CompletedAt = now;
            var last = await db.VehicleLastPositions.FindAsync([session.VehicleId], ct);
            if (last != null)
            {
                // Keep last coordinates for history; clear assignment linkage for current vehicle display
                last.TrackingStatus = "COMPLETED";
                last.UpdatedAt = now;
            }
        }
        else if (normalized is DriverTripStatuses.Started or DriverTripStatuses.InTransit)
        {
            session.TrackingActive = true;
        }

        db.DriverTripStatusHistories.Add(new DriverTripStatusHistory
        {
            Id = Guid.NewGuid(),
            SessionId = session.Id,
            CompanyId = companyId,
            OldStatus = old,
            NewStatus = normalized,
            ChangedBy = driverId,
            ChangedAt = now,
        });

        await SyncLrStatusAsync(session, normalized, ct);
        await db.SaveChangesAsync(ct);
        return (await MapAsync(session, ct))!;
    }

    async Task SyncLrStatusAsync(DriverTripSession session, string driverStatus, CancellationToken ct)
    {
        var lr = await db.LorryReceipts.FirstOrDefaultAsync(r =>
            r.CompanyId == session.CompanyId && r.LrNumber == session.LrNumber, ct);
        if (lr == null) return;

        lr.Status = driverStatus switch
        {
            DriverTripStatuses.LoadingCompleted => LrStatuses.LoadingCompleted,
            DriverTripStatuses.InTransit => LrStatuses.InTransit,
            DriverTripStatuses.DeliveryCompleted => LrStatuses.DeliveryCompleted,
            _ => lr.Status,
        };
        lr.UpdatedAt = DateTime.UtcNow;
    }

    public async Task<object> SubmitLocationAsync(
        string driverId, Guid companyId, DriverLocationSubmit body, CancellationToken ct = default)
    {
        var session = await RequireOwnedSessionAsync(driverId, companyId, body.SessionId, ct);
        if (!session.TrackingActive)
            throw new InvalidOperationException("Tracking is not active. Start the trip first.");
        if (session.Status == DriverTripStatuses.DeliveryCompleted)
            throw new InvalidOperationException("Trip already completed");

        // Server validates ownership — ignore any client-supplied vehicle/driver IDs
        var speedKmh = body.Speed.HasValue
            ? (body.Speed.Value <= 80 ? body.Speed.Value * 3.6m : body.Speed.Value) // m/s → km/h if needed
            : (decimal?)null;

        var result = await ingest.IngestAsync(new GpsIngestRequest(
            session.VehicleId,
            body.Latitude,
            body.Longitude,
            speedKmh,
            body.Heading,
            null,
            body.GpsTimestamp,
            body.Accuracy,
            "BROWSER",
            driverId,
            session.LoadingSlipId,
            "ACTIVE"), ct);

        session.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        var last = await db.VehicleLastPositions.AsNoTracking()
            .FirstOrDefaultAsync(p => p.VehicleId == session.VehicleId, ct);
        var staleCutoff = DateTime.UtcNow.AddMinutes(-StaleMinutes);
        var isStale = last == null || last.RecordedAt < staleCutoff;

        return new
        {
            trackId = result.TrackId,
            vehicleId = session.VehicleId,
            sessionId = session.Id,
            recordedAt = last?.RecordedAt,
            trackingStatus = isStale ? "STALE" : "ACTIVE",
            isStale,
        };
    }

    async Task<DriverTripSession> RequireOwnedSessionAsync(
        string driverId, Guid companyId, Guid sessionId, CancellationToken ct)
    {
        var session = await db.DriverTripSessions
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.CompanyId == companyId, ct);
        if (session == null)
            throw new InvalidOperationException("Trip not found");
        if (!string.Equals(session.DriverId, driverId, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException("Not authorized for this trip");
        return session;
    }

    async Task<DriverTripDto?> MapAsync(DriverTripSession s, CancellationToken ct)
    {
        var driver = await db.Drivers.AsNoTracking().FirstOrDefaultAsync(d => d.Id == s.DriverId, ct);
        var vehicle = await db.Vehicles.AsNoTracking().FirstOrDefaultAsync(v => v.Id == s.VehicleId, ct);
        return new DriverTripDto(
            s.Id, s.DriverId, driver?.Name ?? s.DriverId,
            s.VehicleId, vehicle?.Number ?? s.VehicleId,
            s.LoadingSlipId, s.LoadingSlipNumber, s.LrNumber, s.TripNo,
            s.CustomerName, s.Source, s.Destination, s.Status, s.TrackingActive,
            s.StartedAt, s.CompletedAt, s.UpdatedAt);
    }
}
