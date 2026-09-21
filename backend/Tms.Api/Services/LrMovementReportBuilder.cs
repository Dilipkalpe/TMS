using System.Globalization;
using System.Text.Json;
using Tms.Api.Models;

namespace Tms.Api.Services;

/// <summary>
/// Builds chronological LR movement event rows from process docs + hub movements + status history.
/// Pure helpers — no DB access — so unit tests can cover Direct vs Hub paths.
/// </summary>
public static class LrMovementReportBuilder
{
    public sealed record EventRow(
        string LrNumber,
        string LrDate,
        string? BookingNo,
        string? VehicleNo,
        string? Driver,
        string? Consignor,
        string? Consignee,
        string Origin,
        string Destination,
        string MovementType,
        string? FromLocation,
        string? ToLocation,
        string Event,
        string Status,
        string EventDate,
        string EventTime,
        string? CurrentLocation,
        string? Remarks,
        DateTime SortAt);

    public static string ResolveCurrentLocation(LorryReceipt lr, LrMovement? activeMov, LrDeliverySheet? delivery)
    {
        if (activeMov != null)
        {
            return activeMov.Status switch
            {
                LrMovementStatuses.HubReceived or LrMovementStatuses.Unloaded
                    or LrMovementStatuses.ReadyForReManifest or LrMovementStatuses.Created
                    => activeMov.CurrentHubName ?? activeMov.ToLocation,
                LrMovementStatuses.InTransit or LrMovementStatuses.Dispatched
                    => string.IsNullOrWhiteSpace(activeMov.VehicleNumber)
                        ? $"En route to {activeMov.ToLocation}"
                        : $"{activeMov.ToLocation}-bound ({activeMov.VehicleNumber})",
                _ => activeMov.CurrentHubName ?? activeMov.ToLocation,
            };
        }

        if (TryReadJson(delivery?.ExtendedDataJson, out var root))
        {
            if (root.TryGetProperty("currentLocation", out var loc) && loc.ValueKind == JsonValueKind.String)
            {
                var s = loc.GetString();
                if (!string.IsNullOrWhiteSpace(s)) return s!;
            }
            if (root.TryGetProperty("inTransitStatus", out var its) && its.ValueKind == JsonValueKind.String)
            {
                var s = its.GetString();
                if (!string.IsNullOrWhiteSpace(s) && !string.Equals(s, "In Transit", StringComparison.OrdinalIgnoreCase))
                    return s!;
            }
        }

        if (string.Equals(lr.Status, LrStatuses.InTransit, StringComparison.OrdinalIgnoreCase))
            return string.IsNullOrWhiteSpace(lr.VehicleNumber) ? $"En route to {lr.ToCity}" : $"En route ({lr.VehicleNumber})";

        if (lr.Status is LrStatuses.DeliveryCompleted or LrStatuses.PodUploaded
            or LrStatuses.InvoiceGenerated or LrStatuses.Closed)
            return lr.ToCity;

        return lr.FromCity;
    }

    public static string ResolveMovementType(IReadOnlyList<LrMovement> movements) =>
        movements.Count == 0
            ? LrMovementTypes.Direct
            : movements.Any(m => string.Equals(m.MovementType, LrMovementTypes.HubTransfer, StringComparison.OrdinalIgnoreCase))
                ? LrMovementTypes.HubTransfer
                : movements[0].MovementType;

    public static IReadOnlyList<EventRow> BuildEvents(
        LorryReceipt lr,
        LrLoadingSheet? loading,
        LrTransitPass? transit,
        LrDeliverySheet? delivery,
        IReadOnlyList<LrMovement> movements,
        IReadOnlyList<LrStatusHistory> statusHistory)
    {
        var movType = ResolveMovementType(movements);
        var active = movements
            .Where(m => !LrMovementStatuses.Terminal.Contains(m.Status))
            .OrderByDescending(m => m.MovementNo)
            .FirstOrDefault();
        var currentLoc = ResolveCurrentLocation(lr, active, delivery);
        var vehicle = active?.VehicleNumber ?? movements.LastOrDefault()?.VehicleNumber ?? lr.VehicleNumber;
        var driver = active?.DriverName ?? movements.LastOrDefault()?.DriverName ?? lr.DriverName;

        var rows = new List<EventRow>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        void Add(
            string evt,
            string status,
            DateTime? at,
            string? from,
            string? to,
            string? remarks,
            string? rowVehicle = null,
            string? rowDriver = null,
            string? movementTypeOverride = null)
        {
            if (at == null || at == default) return;
            var utc = at.Value.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(at.Value, DateTimeKind.Utc)
                : at.Value.ToUniversalTime();
            var key = $"{evt}|{utc:yyyy-MM-dd HH:mm}|{from}|{to}|{status}";
            if (!seen.Add(key)) return;

            rows.Add(new EventRow(
                lr.LrNumber,
                lr.LrDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                lr.BookingId,
                rowVehicle ?? vehicle,
                rowDriver ?? driver,
                lr.Consignor,
                lr.Consignee,
                lr.FromCity,
                lr.ToCity,
                movementTypeOverride ?? movType,
                from,
                to,
                evt,
                status,
                utc.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                utc.ToString("HH:mm", CultureInfo.InvariantCulture),
                currentLoc,
                remarks,
                utc));
        }

        // --- Shared document stages (both Direct and Hub) ---
        Add("LR Created", LrStatuses.LRCreated, lr.CreatedAt == default ? lr.LrDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc) : lr.CreatedAt,
            lr.FromCity, lr.ToCity, null);

        if (loading != null)
        {
            Add("Loading", LrStatuses.LoadingCompleted,
                loading.LoadingAt == default ? loading.CreatedAt : loading.LoadingAt,
                loading.LoadingLocation ?? lr.FromCity,
                lr.ToCity,
                loading.SheetNumber,
                loading.VehicleNumber,
                null);
        }

        if (transit != null)
        {
            var issueAt = transit.IssueDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            if (transit.CreatedAt != default && transit.CreatedAt.Date == transit.IssueDate.ToDateTime(TimeOnly.MinValue).Date)
                issueAt = transit.CreatedAt;
            Add("Transit Pass", LrStatuses.TransitPassGenerated, issueAt,
                transit.RouteFrom ?? lr.FromCity,
                transit.RouteTo ?? lr.ToCity,
                transit.PassNumber,
                transit.VehicleNumber,
                transit.DriverName);
        }

        if (movements.Count > 0)
        {
            foreach (var m in movements.OrderBy(x => x.MovementNo).ThenBy(x => x.CreatedAt))
            {
                var isFirst = m.MovementNo <= 1;
                var legType = string.IsNullOrWhiteSpace(m.MovementType) ? LrMovementTypes.HubTransfer : m.MovementType;

                Add(isFirst ? "Manifest Created" : "Re-manifest",
                    m.Status,
                    m.CreatedAt,
                    m.FromLocation,
                    m.ToLocation,
                    m.Remarks,
                    m.VehicleNumber,
                    m.DriverName,
                    legType);

                if (m.DispatchAt != null)
                {
                    Add(isFirst ? "Dispatch" : "Re-dispatch",
                        LrMovementStatuses.InTransit,
                        m.DispatchAt,
                        m.FromLocation,
                        m.ToLocation,
                        m.Remarks,
                        m.VehicleNumber,
                        m.DriverName,
                        legType);
                    Add("In Transit",
                        LrStatuses.InTransit,
                        m.DispatchAt.Value.AddMinutes(1),
                        m.FromLocation,
                        m.ToLocation,
                        null,
                        m.VehicleNumber,
                        m.DriverName,
                        legType);
                }

                if (m.HubReceivedAt != null)
                {
                    Add("Hub Arrival",
                        LrMovementStatuses.HubReceived,
                        m.HubReceivedAt,
                        m.FromLocation,
                        m.CurrentHubName ?? m.ToLocation,
                        m.ReceivedBy,
                        m.VehicleNumber,
                        m.DriverName,
                        legType);
                    Add("Hub Receive",
                        LrStatuses.HubReceived,
                        m.HubReceivedAt.Value.AddMinutes(1),
                        m.FromLocation,
                        m.CurrentHubName ?? m.ToLocation,
                        m.ReceivedBy,
                        m.VehicleNumber,
                        m.DriverName,
                        legType);
                }

                if (m.UnloadAt != null)
                {
                    Add("Unload",
                        LrMovementStatuses.Unloaded,
                        m.UnloadAt,
                        m.CurrentHubName ?? m.ToLocation,
                        m.CurrentHubName ?? m.ToLocation,
                        m.Remarks,
                        m.VehicleNumber,
                        m.DriverName,
                        legType);
                    if (string.Equals(m.Status, LrMovementStatuses.ReadyForReManifest, StringComparison.OrdinalIgnoreCase))
                    {
                        Add("Ready for Re-Manifest",
                            LrStatuses.AvailableForReManifest,
                            m.UnloadAt.Value.AddMinutes(1),
                            m.CurrentHubName ?? m.ToLocation,
                            m.CurrentHubName ?? m.ToLocation,
                            null,
                            m.VehicleNumber,
                            m.DriverName,
                            legType);
                    }
                }

                if (m.DeliveryAt != null)
                {
                    Add("Delivery",
                        LrStatuses.DeliveryCompleted,
                        m.DeliveryAt,
                        m.FromLocation,
                        m.ToLocation,
                        m.Remarks,
                        m.VehicleNumber,
                        m.DriverName,
                        legType);
                }
            }
        }
        else
        {
            // Direct path: dispatch + checkpoints from delivery extended JSON
            if (TryReadDispatch(delivery, out var dispatchAt, out var dispatchNo, out var dispatchFrom, out var dispatchTo))
            {
                Add("Dispatch", LrStatuses.InTransit, dispatchAt,
                    dispatchFrom ?? lr.FromCity,
                    dispatchTo ?? lr.ToCity,
                    dispatchNo,
                    lr.VehicleNumber,
                    lr.DriverName,
                    LrMovementTypes.Direct);
                Add("In Transit", LrStatuses.InTransit, dispatchAt.AddMinutes(1),
                    dispatchFrom ?? lr.FromCity,
                    dispatchTo ?? lr.ToCity,
                    null,
                    lr.VehicleNumber,
                    lr.DriverName,
                    LrMovementTypes.Direct);
            }

            foreach (var cp in ReadCheckpoints(delivery))
            {
                Add("Checkpoint", LrStatuses.InTransit, cp.At,
                    cp.Location ?? lr.FromCity,
                    lr.ToCity,
                    cp.Remarks,
                    lr.VehicleNumber,
                    lr.DriverName,
                    LrMovementTypes.Direct);
            }
        }

        // Delivery / POD from delivery sheet (avoid duplicate if movement already had DeliveryAt)
        if (delivery != null)
        {
            if (delivery.DeliveryDate != null)
            {
                var delAt = delivery.DeliveryDate.Value.ToDateTime(
                    TimeOnly.FromDateTime(delivery.UpdatedAt == default ? DateTime.UtcNow : delivery.UpdatedAt),
                    DateTimeKind.Utc);
                Add("Delivery", LrStatuses.DeliveryCompleted, delAt,
                    delivery.DeliveryLocation ?? lr.FromCity,
                    delivery.DeliveryLocation ?? lr.ToCity,
                    delivery.ReceiverName,
                    lr.VehicleNumber,
                    lr.DriverName);
            }

            if (!string.IsNullOrWhiteSpace(delivery.PodNo)
                || string.Equals(delivery.ShipmentStatus, "POD Uploaded", StringComparison.OrdinalIgnoreCase)
                || lr.Status is LrStatuses.PodUploaded or LrStatuses.InvoiceGenerated or LrStatuses.Closed)
            {
                var podAt = delivery.UpdatedAt != default ? delivery.UpdatedAt : DateTime.UtcNow;
                if (delivery.DeliveryDate != null && podAt.Date < delivery.DeliveryDate.Value.ToDateTime(TimeOnly.MinValue).Date)
                    podAt = delivery.DeliveryDate.Value.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);
                Add("POD", LrStatuses.PodUploaded, podAt,
                    lr.ToCity, lr.ToCity,
                    delivery.PodNo,
                    lr.VehicleNumber,
                    lr.DriverName);
            }
        }

        // Status history fills gaps (older LRs / billing / closed) without duplicating document stages
        var coveredStatuses = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            LrStatuses.LRCreated, LrStatuses.Draft, LrStatuses.LoadingCompleted,
            LrStatuses.TransitPassGenerated, LrStatuses.InTransit,
            LrStatuses.HubReceived, LrStatuses.AvailableForReManifest,
            LrStatuses.DeliveryCompleted, LrStatuses.PodUploaded,
            LrMovementStatuses.Dispatched, LrMovementStatuses.InTransit,
            LrMovementStatuses.HubReceived, LrMovementStatuses.Unloaded,
            LrMovementStatuses.ReadyForReManifest, LrMovementStatuses.Created,
            LrMovementStatuses.Delivered,
        };

        foreach (var h in statusHistory.OrderBy(x => x.ChangedAt))
        {
            if (string.IsNullOrWhiteSpace(h.NewStatus)) continue;
            if (coveredStatuses.Contains(h.NewStatus)) continue;
            var evt = OpsReportsService.FlowStage(h.NewStatus);
            if (string.Equals(h.NewStatus, LrStatuses.Closed, StringComparison.OrdinalIgnoreCase))
                evt = "Completed";
            Add(evt, h.NewStatus, h.ChangedAt, lr.FromCity, lr.ToCity, h.Remarks);
        }

        if (lr.Status is LrStatuses.Closed or LrStatuses.InvoiceGenerated)
        {
            if (!rows.Any(r => string.Equals(r.Event, "Completed", StringComparison.OrdinalIgnoreCase)))
            {
                var completedAt = statusHistory
                    .Where(h => h.NewStatus == lr.Status)
                    .Select(h => (DateTime?)h.ChangedAt)
                    .LastOrDefault()
                    ?? (lr.UpdatedAt != default ? lr.UpdatedAt : DateTime.UtcNow);
                Add("Completed", lr.Status, completedAt, lr.ToCity, lr.ToCity, null);
            }
        }

        return rows.OrderBy(r => r.SortAt).ThenBy(r => r.Event, StringComparer.OrdinalIgnoreCase).ToList();
    }

    static bool TryReadDispatch(
        LrDeliverySheet? delivery,
        out DateTime at,
        out string? dispatchNo,
        out string? from,
        out string? to)
    {
        at = default;
        dispatchNo = delivery?.TripNo;
        from = null;
        to = null;
        if (delivery == null) return false;

        if (TryReadJson(delivery.ExtendedDataJson, out var root)
            && root.TryGetProperty("dispatch", out var d)
            && d.ValueKind == JsonValueKind.Object)
        {
            if (d.TryGetProperty("dispatchNo", out var dn) && dn.ValueKind == JsonValueKind.String)
                dispatchNo = dn.GetString() ?? dispatchNo;

            DateOnly? date = null;
            TimeOnly? time = null;
            if (d.TryGetProperty("dispatchDate", out var dd) && dd.ValueKind == JsonValueKind.String
                && DateOnly.TryParse(dd.GetString(), out var parsedDate))
                date = parsedDate;
            if (d.TryGetProperty("dispatchTime", out var dt) && dt.ValueKind == JsonValueKind.String
                && TimeOnly.TryParse(dt.GetString(), out var parsedTime))
                time = parsedTime;

            if (date != null)
            {
                at = date.Value.ToDateTime(time ?? TimeOnly.MinValue, DateTimeKind.Utc);
                return true;
            }
        }

        // Fallback: trip no present and LR has moved past transit → use UpdatedAt/CreatedAt
        if (!string.IsNullOrWhiteSpace(delivery.TripNo))
        {
            at = delivery.CreatedAt != default ? delivery.CreatedAt : delivery.UpdatedAt;
            if (at == default) at = DateTime.UtcNow;
            return true;
        }

        return false;
    }

    static IEnumerable<(DateTime At, string? Location, string? Remarks)> ReadCheckpoints(LrDeliverySheet? delivery)
    {
        if (delivery == null || !TryReadJson(delivery.ExtendedDataJson, out var root))
            yield break;
        if (!root.TryGetProperty("checkpoints", out var arr) || arr.ValueKind != JsonValueKind.Array)
            yield break;

        foreach (var item in arr.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.Object) continue;
            DateTime? at = null;
            if (item.TryGetProperty("at", out var atEl) && atEl.ValueKind == JsonValueKind.String
                && DateTime.TryParse(atEl.GetString(), CultureInfo.InvariantCulture,
                    DateTimeStyles.RoundtripKind, out var parsed))
                at = parsed;
            else if (item.TryGetProperty("timestamp", out var ts) && ts.ValueKind == JsonValueKind.String
                     && DateTime.TryParse(ts.GetString(), CultureInfo.InvariantCulture,
                         DateTimeStyles.RoundtripKind, out var parsedTs))
                at = parsedTs;
            else if (item.TryGetProperty("date", out var dateEl) && dateEl.ValueKind == JsonValueKind.String
                     && DateOnly.TryParse(dateEl.GetString(), out var d))
            {
                TimeOnly t = TimeOnly.MinValue;
                if (item.TryGetProperty("time", out var timeEl) && timeEl.ValueKind == JsonValueKind.String)
                    TimeOnly.TryParse(timeEl.GetString(), out t);
                at = d.ToDateTime(t, DateTimeKind.Utc);
            }

            if (at == null) continue;
            string? loc = null;
            string? remarks = null;
            if (item.TryGetProperty("location", out var locEl) && locEl.ValueKind == JsonValueKind.String)
                loc = locEl.GetString();
            if (item.TryGetProperty("remarks", out var remEl) && remEl.ValueKind == JsonValueKind.String)
                remarks = remEl.GetString();
            else if (item.TryGetProperty("note", out var noteEl) && noteEl.ValueKind == JsonValueKind.String)
                remarks = noteEl.GetString();
            yield return (at.Value, loc, remarks);
        }
    }

    static bool TryReadJson(string? json, out JsonElement root)
    {
        root = default;
        if (string.IsNullOrWhiteSpace(json) || json is "{}" or "null") return false;
        try
        {
            using var doc = JsonDocument.Parse(json);
            root = doc.RootElement.Clone();
            return root.ValueKind == JsonValueKind.Object;
        }
        catch (JsonException)
        {
            return false;
        }
    }
}
