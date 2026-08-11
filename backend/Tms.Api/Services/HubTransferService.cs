using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public class HubTransferException : Exception
{
    public HubTransferException(string message) : base(message) { }
}

public class HubTransferService(
    TmsDbContext db,
    ITenantContext tenants,
    IBranchContext branches,
    DocumentNumberService documentNumbers)
{
    static readonly string[] TerminalLrStatuses =
    [
        LrStatuses.DeliveryCompleted, LrStatuses.PodUploaded, LrStatuses.InvoiceGenerated,
        LrStatuses.ExpenseAdded, LrStatuses.ExpenseApproved, LrStatuses.Closed, LrStatuses.Draft,
    ];

    Guid CompanyId => TenantScope.ResolveCompanyId(tenants);

    public async Task<object> GetSummaryAsync(Guid? hubBranchId, CancellationToken ct = default)
    {
        var lrs = await ScopedLrs().AsNoTracking().ToListAsync(ct);
        var movements = await TenantScope.LrMovements(db, tenants).AsNoTracking().ToListAsync(ct);
        var activeByLr = movements
            .Where(m => !LrMovementStatuses.Terminal.Contains(m.Status))
            .GroupBy(m => m.LrNumber, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.MovementNo).First(), StringComparer.OrdinalIgnoreCase);

        bool AtHub(LorryReceipt lr)
        {
            if (hubBranchId != null && activeByLr.TryGetValue(lr.LrNumber, out var m)
                && m.CurrentHubBranchId != null && m.CurrentHubBranchId != hubBranchId)
                return false;
            return lr.Status is LrStatuses.HubReceived or LrStatuses.AvailableForReManifest
                || (activeByLr.TryGetValue(lr.LrNumber, out var am)
                    && am.Status is LrMovementStatuses.HubReceived or LrMovementStatuses.Unloaded
                        or LrMovementStatuses.ReadyForReManifest or LrMovementStatuses.Created);
        }

        var manifests = await TenantScope.HubManifests(db, tenants, branches).AsNoTracking()
            .Where(m => !m.IsInbound && m.Status != HubManifestStatuses.Cancelled && m.Status != HubManifestStatuses.Dispatched && m.Status != HubManifestStatuses.Completed)
            .ToListAsync(ct);

        return new
        {
            totalAtHub = lrs.Count(AtHub),
            readyForReManifest = lrs.Count(lr => lr.Status == LrStatuses.AvailableForReManifest
                && (hubBranchId == null || !activeByLr.TryGetValue(lr.LrNumber, out var m) || m.CurrentHubBranchId == hubBranchId || m.CurrentHubBranchId == null)),
            manifestCreated = manifests.Count(m => m.Status == HubManifestStatuses.Draft
                && (hubBranchId == null || m.FromHubBranchId == hubBranchId)),
            readyForDispatch = manifests.Count(m =>
                (m.Status == HubManifestStatuses.VehicleAssigned || m.Status == HubManifestStatuses.ReadyForDispatch)
                && (hubBranchId == null || m.FromHubBranchId == hubBranchId)),
            inTransit = lrs.Count(lr => lr.Status == LrStatuses.InTransit),
            delivered = lrs.Count(lr => lr.Status is LrStatuses.DeliveryCompleted or LrStatuses.PodUploaded
                or LrStatuses.InvoiceGenerated or LrStatuses.Closed),
        };
    }

    public async Task<(List<object> Items, int Total)> ListLrsAsync(
        string? lrNo, DateOnly? dateFrom, DateOnly? dateTo, Guid? hubBranchId, string? destination,
        string? status, string? vehicleNo, string? manifestNo, string? customer, string? search,
        string? kpi, int page, int pageSize, CancellationToken ct = default)
    {
        var q = ScopedLrs().AsNoTracking();
        if (!string.IsNullOrWhiteSpace(lrNo))
            q = q.Where(x => x.LrNumber.Contains(lrNo.Trim()));
        if (dateFrom != null) q = q.Where(x => x.LrDate >= dateFrom);
        if (dateTo != null) q = q.Where(x => x.LrDate <= dateTo);
        if (!string.IsNullOrWhiteSpace(destination))
        {
            var d = destination.Trim().ToLower();
            q = q.Where(x => x.ToCity.ToLower().Contains(d));
        }
        if (!string.IsNullOrWhiteSpace(customer))
        {
            var c = customer.Trim().ToLower();
            q = q.Where(x =>
                (x.Consignor != null && x.Consignor.ToLower().Contains(c))
                || (x.Consignee != null && x.Consignee.ToLower().Contains(c)));
        }
        if (!string.IsNullOrWhiteSpace(vehicleNo))
        {
            var v = vehicleNo.Trim().ToLower();
            q = q.Where(x => x.VehicleNumber != null && x.VehicleNumber.ToLower().Contains(v));
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(x =>
                x.LrNumber.ToLower().Contains(s)
                || x.FromCity.ToLower().Contains(s)
                || x.ToCity.ToLower().Contains(s)
                || (x.Consignor != null && x.Consignor.ToLower().Contains(s))
                || (x.Consignee != null && x.Consignee.ToLower().Contains(s))
                || (x.VehicleNumber != null && x.VehicleNumber.ToLower().Contains(s)));
        }

        // Hub-transfer relevant statuses (plus delivered for KPI)
        var relevant = new[]
        {
            LrStatuses.InTransit, LrStatuses.HubReceived, LrStatuses.AvailableForReManifest,
            LrStatuses.DeliveryCompleted, LrStatuses.PodUploaded, LrStatuses.Closed,
        };
        q = q.Where(x => relevant.Contains(x.Status));

        if (!string.IsNullOrWhiteSpace(status))
            q = q.Where(x => x.Status == status.Trim());

        if (!string.IsNullOrWhiteSpace(kpi))
        {
            q = kpi.Trim().ToLowerInvariant() switch
            {
                "at-hub" or "totalathub" => q.Where(x => x.Status == LrStatuses.HubReceived || x.Status == LrStatuses.AvailableForReManifest),
                "ready" or "readyforremanifest" => q.Where(x => x.Status == LrStatuses.AvailableForReManifest),
                "intransit" or "in-transit" => q.Where(x => x.Status == LrStatuses.InTransit),
                "delivered" => q.Where(x => x.Status == LrStatuses.DeliveryCompleted || x.Status == LrStatuses.PodUploaded || x.Status == LrStatuses.Closed),
                "manifestcreated" or "readyfordispatch" => q.Where(x => x.Status == LrStatuses.AvailableForReManifest),
                _ => q,
            };
        }

        var total = await q.CountAsync(ct);
        var pageNo = Math.Max(page, 1);
        var size = Math.Clamp(pageSize, 1, 200);
        var rows = await q.OrderByDescending(x => x.LrDate).ThenByDescending(x => x.LrNumber)
            .Skip((pageNo - 1) * size).Take(size).ToListAsync(ct);

        var lrNos = rows.Select(r => r.LrNumber).ToList();
        var movements = await TenantScope.LrMovements(db, tenants).AsNoTracking()
            .Where(m => lrNos.Contains(m.LrNumber))
            .ToListAsync(ct);
        var activeMovements = movements
            .Where(m => !LrMovementStatuses.Terminal.Contains(m.Status))
            .GroupBy(m => m.LrNumber, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.MovementNo).First(), StringComparer.OrdinalIgnoreCase);

        var manifestIds = activeMovements.Values.Where(m => m.ManifestId != null).Select(m => m.ManifestId!.Value).Distinct().ToList();
        var manifests = await db.HubManifests.AsNoTracking().Where(m => manifestIds.Contains(m.Id)).ToListAsync(ct);
        var manifestById = manifests.ToDictionary(m => m.Id);

        // Next outbound draft manifests for LRs
        var nextLines = await db.HubManifestLrs.AsNoTracking()
            .Where(l => lrNos.Contains(l.LrNumber))
            .Join(db.HubManifests.AsNoTracking().Where(m =>
                    !m.IsInbound && m.CompanyId == CompanyId
                    && m.Status != HubManifestStatuses.Cancelled && m.Status != HubManifestStatuses.Completed),
                l => l.ManifestId, m => m.Id, (l, m) => new { l.LrNumber, m })
            .ToListAsync(ct);
        var nextByLr = nextLines
            .GroupBy(x => x.LrNumber, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.m.CreatedAt).First().m, StringComparer.OrdinalIgnoreCase);

        if (hubBranchId != null)
        {
            rows = rows.Where(lr =>
            {
                if (!activeMovements.TryGetValue(lr.LrNumber, out var m))
                    return lr.Status == LrStatuses.InTransit; // inbound candidates
                return m.CurrentHubBranchId == null || m.CurrentHubBranchId == hubBranchId;
            }).ToList();
        }

        if (!string.IsNullOrWhiteSpace(manifestNo))
        {
            var mn = manifestNo.Trim().ToLower();
            rows = rows.Where(lr =>
            {
                if (activeMovements.TryGetValue(lr.LrNumber, out var am) && am.ManifestId != null
                    && manifestById.TryGetValue(am.ManifestId.Value, out var cm)
                    && cm.ManifestNo.ToLower().Contains(mn))
                    return true;
                return nextByLr.TryGetValue(lr.LrNumber, out var nm) && nm.ManifestNo.ToLower().Contains(mn);
            }).ToList();
        }

        var items = rows.Select(lr =>
        {
            activeMovements.TryGetValue(lr.LrNumber, out var mov);
            HubManifest? currManifest = null;
            if (mov?.ManifestId != null) manifestById.TryGetValue(mov.ManifestId.Value, out currManifest);
            nextByLr.TryGetValue(lr.LrNumber, out var nextManifest);
            var hubName = mov?.CurrentHubName;
            var currentLoc = ResolveCurrentLocation(lr, mov);
            var nextDest = nextManifest?.ToDestination
                ?? (mov?.Status is LrMovementStatuses.ReadyForReManifest or LrMovementStatuses.HubReceived or LrMovementStatuses.Unloaded
                    ? lr.ToCity
                    : mov?.ToLocation);
            return (object)new
            {
                lrNumber = lr.LrNumber,
                lrDate = lr.LrDate,
                consignor = lr.Consignor,
                consignee = lr.Consignee,
                originalFrom = lr.FromCity,
                finalDestination = lr.ToCity,
                currentLocation = currentLoc,
                currentHub = hubName,
                currentHubBranchId = mov?.CurrentHubBranchId,
                previousVehicle = mov?.VehicleNumber ?? lr.VehicleNumber,
                currentStatus = lr.Status,
                movementStatus = mov?.Status,
                nextDestination = nextDest,
                currentManifestNo = currManifest?.ManifestNo,
                currentManifestId = currManifest?.Id,
                nextManifestNo = nextManifest != null && nextManifest.Id != currManifest?.Id ? nextManifest.ManifestNo : null,
                nextManifestId = nextManifest != null && nextManifest.Id != currManifest?.Id ? nextManifest.Id : (Guid?)null,
                packages = ParsePackages(lr.Quantity),
                weight = ParseWeight(lr.Quantity),
                quantity = lr.Quantity,
                vehicleNumber = lr.VehicleNumber,
                movementId = mov?.Id,
                movementNo = mov?.MovementNo,
            };
        }).ToList();

        return (items, hubBranchId != null || !string.IsNullOrWhiteSpace(manifestNo) ? items.Count : total);
    }

    public async Task<object> GetInboundPreviewAsync(string? loadingSheetNo, string? vehicleNo, string? manifestNo, CancellationToken ct = default)
    {
        List<string> lrNumbers = [];
        Guid? sourceLoadingSheetId = null;
        string? vehicle = vehicleNo;
        string? sourceLabel = null;

        if (!string.IsNullOrWhiteSpace(manifestNo))
        {
            var m = await TenantScope.HubManifests(db, tenants, branches).AsNoTracking()
                .Include(x => x.Lines)
                .FirstOrDefaultAsync(x => x.ManifestNo == manifestNo.Trim(), ct)
                ?? throw new HubTransferException($"Manifest '{manifestNo}' was not found.");
            lrNumbers = m.Lines.Select(l => l.LrNumber).ToList();
            vehicle ??= m.VehicleNumber;
            sourceLabel = m.ManifestNo;
        }
        else if (!string.IsNullOrWhiteSpace(loadingSheetNo))
        {
            var sheet = await tenants.Filter(db.LrLoadingSheets.AsNoTracking())
                .Include(s => s.Items)
                .FirstOrDefaultAsync(s => s.SheetNumber == loadingSheetNo.Trim(), ct)
                ?? throw new HubTransferException($"Loading sheet '{loadingSheetNo}' was not found.");
            sourceLoadingSheetId = sheet.Id;
            vehicle ??= sheet.VehicleNumber;
            sourceLabel = sheet.SheetNumber;
            lrNumbers = sheet.Items.Select(i => i.LrNumber).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
            if (lrNumbers.Count == 0) lrNumbers.Add(sheet.LrNumber);
        }
        else if (!string.IsNullOrWhiteSpace(vehicleNo))
        {
            var v = vehicleNo.Trim().ToLower();
            lrNumbers = await ScopedLrs().AsNoTracking()
                .Where(x => x.Status == LrStatuses.InTransit && x.VehicleNumber != null && x.VehicleNumber.ToLower().Contains(v))
                .Select(x => x.LrNumber)
                .ToListAsync(ct);
            sourceLabel = vehicleNo.Trim();
        }
        else
            throw new HubTransferException("Provide loadingSheetNo, vehicleNo, or manifestNo.");

        var lrs = await ScopedLrs().AsNoTracking().Where(x => lrNumbers.Contains(x.LrNumber)).ToListAsync(ct);
        return new
        {
            sourceLoadingSheetId,
            sourceLabel,
            vehicleNumber = vehicle,
            lines = lrs.Select(lr => new
            {
                lrNumber = lr.LrNumber,
                lrDate = lr.LrDate,
                consignor = lr.Consignor,
                consignee = lr.Consignee,
                originalFrom = lr.FromCity,
                finalDestination = lr.ToCity,
                status = lr.Status,
                packages = ParsePackages(lr.Quantity),
                weight = ParseWeight(lr.Quantity),
                vehicleNumber = lr.VehicleNumber,
                canReceive = lr.Status == LrStatuses.InTransit,
            }),
        };
    }

    public async Task<object> ReceiveAtHubAsync(ReceiveAtHubRequest req, string? user, CancellationToken ct = default)
    {
        if (req.LrNumbers == null || req.LrNumbers.Count == 0)
            throw new HubTransferException("Select at least one LR to receive.");
        if (string.IsNullOrWhiteSpace(req.HubName) && req.HubBranchId == null)
            throw new HubTransferException("Hub is required.");

        var hub = await ResolveHubAsync(req.HubBranchId, req.HubName, ct);
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        HubManifest? inboundManifest = null;
        if (req.SourceLoadingSheetId != null || !string.IsNullOrWhiteSpace(req.LoadingSheetNo))
        {
            Guid? sheetId = req.SourceLoadingSheetId;
            LrLoadingSheet? sheet = null;
            if (sheetId != null)
                sheet = await tenants.Filter(db.LrLoadingSheets).FirstOrDefaultAsync(s => s.Id == sheetId, ct);
            else if (!string.IsNullOrWhiteSpace(req.LoadingSheetNo))
                sheet = await tenants.Filter(db.LrLoadingSheets)
                    .FirstOrDefaultAsync(s => s.SheetNumber == req.LoadingSheetNo.Trim(), ct);
            if (sheet != null)
            {
                inboundManifest = await db.HubManifests
                    .FirstOrDefaultAsync(m => m.CompanyId == CompanyId && m.SourceLoadingSheetId == sheet.Id && m.IsInbound, ct);
                if (inboundManifest == null)
                {
                    var branchId = branches.AssignBranchId ?? hub.BranchId;
                    var manifestNo = await documentNumbers.NextAsync(DocumentNumberTypes.HubManifest, CompanyId, branchId ?? Guid.Empty, DateOnly.FromDateTime(DateTime.UtcNow), ct);
                    inboundManifest = new HubManifest
                    {
                        Id = Guid.NewGuid(),
                        CompanyId = CompanyId,
                        BranchId = branchId,
                        ManifestNo = manifestNo,
                        FromHubBranchId = null,
                        FromHubName = sheet.LoadingLocation,
                        ToDestination = hub.Name,
                        VehicleId = sheet.VehicleId,
                        VehicleNumber = sheet.VehicleNumber ?? req.VehicleNumber,
                        Status = HubManifestStatuses.Dispatched,
                        SourceLoadingSheetId = sheet.Id,
                        IsInbound = true,
                        DispatchAt = sheet.LoadingAt,
                        Remarks = "Inbound from loading sheet",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                        CreatedBy = user,
                    };
                    db.HubManifests.Add(inboundManifest);
                }
            }
        }

        var received = new List<object>();
        foreach (var lrNumber in req.LrNumbers.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            var lr = await LockLrAsync(lrNumber, ct);
            EnsureNotTerminal(lr);
            if (lr.Status != LrStatuses.InTransit && lr.Status != LrStatuses.HubReceived)
                throw new HubTransferException($"LR {lr.LrNumber} must be In Transit to receive at hub (current: {lr.Status}).");

            var active = await GetActiveMovementAsync(lr.LrNumber, ct);
            if (active != null && active.Status is LrMovementStatuses.HubReceived or LrMovementStatuses.Unloaded or LrMovementStatuses.ReadyForReManifest)
            {
                if (active.CurrentHubBranchId != null && hub.BranchId != null && active.CurrentHubBranchId != hub.BranchId)
                    throw new HubTransferException($"LR {lr.LrNumber} is already at another hub.");
                // idempotent receive
                received.Add(new { lr.LrNumber, movementId = active.Id, status = lr.Status });
                continue;
            }

            if (active != null && active.Status is LrMovementStatuses.InTransit or LrMovementStatuses.Dispatched)
            {
                var prev = active.Status;
                active.Status = LrMovementStatuses.HubReceived;
                active.CurrentHubBranchId = hub.BranchId;
                active.CurrentHubName = hub.Name;
                active.HubReceivedAt = req.ReceivedAt ?? DateTime.UtcNow;
                active.ReceivedBy = user;
                active.ToLocation = hub.Name;
                active.UpdatedAt = DateTime.UtcNow;
                active.UpdatedBy = user;
                if (inboundManifest != null) active.ManifestId ??= inboundManifest.Id;
                RecordLrStatus(lr, LrStatuses.HubReceived, user, $"Hub received at {hub.Name}");
                Audit(lr.LrNumber, inboundManifest?.Id, active.Id, "HubReceived", prev, LrMovementStatuses.HubReceived, user, req.Remarks);
            }
            else
            {
                // First hub receive — create Leg 1 from origin dispatch
                var movementNo = await NextMovementNoAsync(lr.LrNumber, ct);
                var mov = new LrMovement
                {
                    Id = Guid.NewGuid(),
                    CompanyId = CompanyId,
                    LrNumber = lr.LrNumber,
                    MovementNo = movementNo,
                    MovementType = LrMovementTypes.HubTransfer,
                    FromLocation = lr.FromCity,
                    ToLocation = hub.Name,
                    CurrentHubBranchId = hub.BranchId,
                    CurrentHubName = hub.Name,
                    VehicleId = lr.VehicleId,
                    VehicleNumber = req.VehicleNumber ?? lr.VehicleNumber,
                    DriverId = lr.DriverId,
                    DriverName = lr.DriverName,
                    ManifestId = inboundManifest?.Id,
                    Status = LrMovementStatuses.HubReceived,
                    DispatchAt = null,
                    HubReceivedAt = req.ReceivedAt ?? DateTime.UtcNow,
                    ReceivedBy = user,
                    Remarks = req.Remarks,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    CreatedBy = user,
                };
                db.LrMovements.Add(mov);
                if (inboundManifest != null)
                {
                    var existsLine = await db.HubManifestLrs.AnyAsync(l => l.ManifestId == inboundManifest.Id && l.LrNumber == lr.LrNumber, ct);
                    if (!existsLine)
                    {
                        db.HubManifestLrs.Add(new HubManifestLr
                        {
                            Id = Guid.NewGuid(),
                            ManifestId = inboundManifest.Id,
                            LrNumber = lr.LrNumber,
                            Packages = ParsePackages(lr.Quantity),
                            Weight = ParseWeight(lr.Quantity),
                            LineStatus = HubManifestLineStatuses.Received,
                            CreatedAt = DateTime.UtcNow,
                        });
                    }
                    else
                    {
                        var line = await db.HubManifestLrs.FirstAsync(l => l.ManifestId == inboundManifest.Id && l.LrNumber == lr.LrNumber, ct);
                        line.LineStatus = HubManifestLineStatuses.Received;
                    }
                }
                RecordLrStatus(lr, LrStatuses.HubReceived, user, $"Hub received at {hub.Name}");
                Audit(lr.LrNumber, inboundManifest?.Id, mov.Id, "HubReceived", LrStatuses.InTransit, LrStatuses.HubReceived, user, req.Remarks);
                received.Add(new { lr.LrNumber, movementId = mov.Id, status = LrStatuses.HubReceived });
                continue;
            }

            if (inboundManifest != null)
            {
                var existsLine = await db.HubManifestLrs.AnyAsync(l => l.ManifestId == inboundManifest.Id && l.LrNumber == lr.LrNumber, ct);
                if (!existsLine)
                {
                    db.HubManifestLrs.Add(new HubManifestLr
                    {
                        Id = Guid.NewGuid(),
                        ManifestId = inboundManifest.Id,
                        LrNumber = lr.LrNumber,
                        Packages = ParsePackages(lr.Quantity),
                        Weight = ParseWeight(lr.Quantity),
                        LineStatus = HubManifestLineStatuses.Received,
                        CreatedAt = DateTime.UtcNow,
                    });
                }
            }
            received.Add(new { lr.LrNumber, movementId = active!.Id, status = LrStatuses.HubReceived });
        }

        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return new { hub = hub.Name, hubBranchId = hub.BranchId, inboundManifestId = inboundManifest?.Id, inboundManifestNo = inboundManifest?.ManifestNo, received };
    }

    public async Task<object> UnloadAtHubAsync(UnloadAtHubRequest req, string? user, CancellationToken ct = default)
    {
        if (req.LrNumbers == null || req.LrNumbers.Count == 0)
            throw new HubTransferException("Select at least one LR to unload.");

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var results = new List<object>();
        foreach (var lrNumber in req.LrNumbers.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            var lr = await LockLrAsync(lrNumber, ct);
            EnsureNotTerminal(lr);
            if (lr.Status != LrStatuses.HubReceived && lr.Status != LrStatuses.AvailableForReManifest)
                throw new HubTransferException($"LR {lr.LrNumber} must be Hub Received before unload (current: {lr.Status}).");

            var mov = await GetActiveMovementAsync(lr.LrNumber, ct)
                ?? throw new HubTransferException($"LR {lr.LrNumber} has no active movement. Receive at hub first.");
            if (mov.Status is not (LrMovementStatuses.HubReceived or LrMovementStatuses.Unloaded or LrMovementStatuses.ReadyForReManifest))
                throw new HubTransferException($"LR {lr.LrNumber} movement status '{mov.Status}' cannot be unloaded.");

            var prev = mov.Status;
            mov.Status = LrMovementStatuses.ReadyForReManifest;
            mov.UnloadAt = req.UnloadAt ?? DateTime.UtcNow;
            mov.UpdatedAt = DateTime.UtcNow;
            mov.UpdatedBy = user;
            if (!string.IsNullOrWhiteSpace(req.Remarks)) mov.Remarks = req.Remarks;

            if (mov.ManifestId != null)
            {
                var lines = await db.HubManifestLrs.Where(l => l.ManifestId == mov.ManifestId && l.LrNumber == lr.LrNumber).ToListAsync(ct);
                foreach (var line in lines) line.LineStatus = HubManifestLineStatuses.Unloaded;
            }

            RecordLrStatus(lr, LrStatuses.AvailableForReManifest, user, "Unloaded at hub — available for re-manifest");
            Audit(lr.LrNumber, mov.ManifestId, mov.Id, "HubUnloaded", prev, LrMovementStatuses.ReadyForReManifest, user, req.Remarks);
            results.Add(new { lr.LrNumber, movementId = mov.Id, status = LrStatuses.AvailableForReManifest });
        }

        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return new { unloaded = results };
    }

    public async Task<object> CreateReManifestAsync(CreateReManifestRequest req, string? user, CancellationToken ct = default)
    {
        if (req.LrNumbers == null || req.LrNumbers.Count == 0)
            throw new HubTransferException("Select at least one LR for re-manifest.");
        if (string.IsNullOrWhiteSpace(req.ToDestination))
            throw new HubTransferException("Destination is required.");
        if (string.IsNullOrWhiteSpace(req.HubName) && req.HubBranchId == null)
            throw new HubTransferException("From hub is required.");

        var hub = await ResolveHubAsync(req.HubBranchId, req.HubName, ct);
        if (string.Equals(hub.Name.Trim(), req.ToDestination.Trim(), StringComparison.OrdinalIgnoreCase)
            || (!string.IsNullOrWhiteSpace(hub.City) && string.Equals(hub.City.Trim(), req.ToDestination.Trim(), StringComparison.OrdinalIgnoreCase)))
            throw new HubTransferException("Current hub cannot be the same as the next destination.");

        // Pre-validate all LRs before allocating a manifest number / writing rows
        var distinctLrs = req.LrNumbers.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var locked = new List<(LorryReceipt Lr, LrMovement Active)>();
        foreach (var lrNumber in distinctLrs)
        {
            var lr = await LockLrAsync(lrNumber, ct);
            EnsureNotTerminal(lr);
            if (lr.Status != LrStatuses.AvailableForReManifest)
                throw new HubTransferException($"LR {lr.LrNumber} must be Available for Re-Manifest (current: {lr.Status}).");

            var active = await GetActiveMovementAsync(lr.LrNumber, ct)
                ?? throw new HubTransferException($"LR {lr.LrNumber} has no active movement. Unload at hub first.");
            if (active.Status != LrMovementStatuses.ReadyForReManifest && active.Status != LrMovementStatuses.Unloaded)
                throw new HubTransferException($"LR {lr.LrNumber} is not unloaded / ready for re-manifest (movement: {active.Status}).");
            if (active.CurrentHubBranchId != null && hub.BranchId != null && active.CurrentHubBranchId != hub.BranchId)
                throw new HubTransferException($"LR {lr.LrNumber} does not belong to hub {hub.Name}.");
            locked.Add((lr, active));
        }

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var branchId = branches.AssignBranchId ?? hub.BranchId
            ?? locked.Select(x => x.Lr.BranchId).FirstOrDefault(id => id != null)
            ?? throw new HubTransferException("Branch is required to create a re-manifest number.");
        var manifestNo = await documentNumbers.NextAsync(
            DocumentNumberTypes.HubManifest, CompanyId, branchId, DateOnly.FromDateTime(DateTime.UtcNow), ct);

        Vehicle? vehicle = null;
        Driver? driver = null;
        if (!string.IsNullOrWhiteSpace(req.VehicleId))
            vehicle = await TenantScope.Vehicles(db, tenants, branches).FirstOrDefaultAsync(v => v.Id == req.VehicleId, ct);
        if (!string.IsNullOrWhiteSpace(req.DriverId))
            driver = await TenantScope.Drivers(db, tenants, branches).FirstOrDefaultAsync(d => d.Id == req.DriverId, ct);

        var hasVehicle = vehicle != null || !string.IsNullOrWhiteSpace(req.VehicleNumber);
        var manifest = new HubManifest
        {
            Id = Guid.NewGuid(),
            CompanyId = CompanyId,
            BranchId = branchId,
            ManifestNo = manifestNo,
            FromHubBranchId = hub.BranchId,
            FromHubName = hub.Name,
            ToDestination = req.ToDestination.Trim(),
            VehicleId = vehicle?.Id ?? req.VehicleId,
            VehicleNumber = vehicle?.Number ?? req.VehicleNumber,
            VehicleType = vehicle?.Type ?? req.VehicleType,
            DriverId = driver?.Id ?? req.DriverId,
            DriverName = driver?.Name ?? req.DriverName,
            DriverMobile = driver?.Phone ?? req.DriverMobile,
            Status = hasVehicle ? HubManifestStatuses.ReadyForDispatch : HubManifestStatuses.Draft,
            Remarks = req.Remarks,
            IsInbound = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = user,
        };
        db.HubManifests.Add(manifest);

        var sort = 0;
        foreach (var (lr, active) in locked)
        {
            var prevStatus = active.Status;
            active.Status = LrMovementStatuses.ReManifested;
            active.UpdatedAt = DateTime.UtcNow;
            active.UpdatedBy = user;

            var movementNo = await NextMovementNoAsync(lr.LrNumber, ct);
            var mov = new LrMovement
            {
                Id = Guid.NewGuid(),
                CompanyId = CompanyId,
                LrNumber = lr.LrNumber,
                MovementNo = movementNo,
                MovementType = LrMovementTypes.HubTransfer,
                FromLocation = hub.Name,
                ToLocation = req.ToDestination.Trim(),
                CurrentHubBranchId = hub.BranchId,
                CurrentHubName = hub.Name,
                VehicleId = manifest.VehicleId,
                VehicleNumber = manifest.VehicleNumber,
                DriverId = manifest.DriverId,
                DriverName = manifest.DriverName,
                ManifestId = manifest.Id,
                Status = LrMovementStatuses.Created,
                Remarks = req.Remarks,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = user,
            };
            db.LrMovements.Add(mov);
            db.HubManifestLrs.Add(new HubManifestLr
            {
                Id = Guid.NewGuid(),
                ManifestId = manifest.Id,
                LrNumber = lr.LrNumber,
                Packages = ParsePackages(lr.Quantity),
                Weight = ParseWeight(lr.Quantity),
                SortOrder = sort++,
                LineStatus = HubManifestLineStatuses.Assigned,
                CreatedAt = DateTime.UtcNow,
            });
            Audit(lr.LrNumber, manifest.Id, mov.Id, "ReManifestCreated", prevStatus, LrMovementStatuses.Created, user, req.Remarks);
        }

        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return await GetManifestAsync(manifest.Id, ct);
    }

    public async Task<object> AssignVehicleAsync(Guid manifestId, AssignVehicleRequest req, string? user, CancellationToken ct = default)
    {
        var manifest = await TenantScope.HubManifests(db, tenants, branches)
            .Include(m => m.Lines)
            .FirstOrDefaultAsync(m => m.Id == manifestId, ct)
            ?? throw new HubTransferException("Manifest not found.");
        if (manifest.Status is HubManifestStatuses.Dispatched or HubManifestStatuses.Cancelled or HubManifestStatuses.Completed)
            throw new HubTransferException($"Cannot assign vehicle to manifest in status {manifest.Status}.");

        Vehicle? vehicle = null;
        Driver? driver = null;
        if (!string.IsNullOrWhiteSpace(req.VehicleId))
            vehicle = await TenantScope.Vehicles(db, tenants, branches).FirstOrDefaultAsync(v => v.Id == req.VehicleId, ct)
                ?? throw new HubTransferException("Vehicle not found.");
        if (!string.IsNullOrWhiteSpace(req.DriverId))
            driver = await TenantScope.Drivers(db, tenants, branches).FirstOrDefaultAsync(d => d.Id == req.DriverId, ct)
                ?? throw new HubTransferException("Driver not found.");

        var vehNo = vehicle?.Number ?? req.VehicleNumber;
        if (string.IsNullOrWhiteSpace(vehNo))
            throw new HubTransferException("Vehicle is required.");

        manifest.VehicleId = vehicle?.Id ?? req.VehicleId;
        manifest.VehicleNumber = vehNo;
        manifest.VehicleType = vehicle?.Type ?? req.VehicleType;
        manifest.DriverId = driver?.Id ?? req.DriverId;
        manifest.DriverName = driver?.Name ?? req.DriverName;
        manifest.DriverMobile = driver?.Phone ?? req.DriverMobile;
        manifest.Status = HubManifestStatuses.ReadyForDispatch;
        manifest.UpdatedAt = DateTime.UtcNow;
        manifest.UpdatedBy = user;
        if (!string.IsNullOrWhiteSpace(req.Remarks)) manifest.Remarks = req.Remarks;

        var movements = await db.LrMovements
            .Where(m => m.ManifestId == manifest.Id && !LrMovementStatuses.Terminal.Contains(m.Status))
            .ToListAsync(ct);
        foreach (var mov in movements)
        {
            mov.VehicleId = manifest.VehicleId;
            mov.VehicleNumber = manifest.VehicleNumber;
            mov.DriverId = manifest.DriverId;
            mov.DriverName = manifest.DriverName;
            mov.UpdatedAt = DateTime.UtcNow;
            mov.UpdatedBy = user;
        }

        Audit(null, manifest.Id, null, "VehicleAssigned", HubManifestStatuses.Draft, HubManifestStatuses.ReadyForDispatch, user, req.Remarks);
        await db.SaveChangesAsync(ct);
        return await GetManifestAsync(manifest.Id, ct);
    }

    public async Task<object> DispatchManifestAsync(Guid manifestId, DispatchManifestRequest req, string? user, CancellationToken ct = default)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var manifest = await TenantScope.HubManifests(db, tenants, branches)
            .Include(m => m.Lines)
            .FirstOrDefaultAsync(m => m.Id == manifestId, ct)
            ?? throw new HubTransferException("Manifest not found.");
        if (manifest.Status is HubManifestStatuses.Dispatched or HubManifestStatuses.Cancelled)
            throw new HubTransferException($"Manifest is already {manifest.Status}.");
        if (string.IsNullOrWhiteSpace(manifest.VehicleNumber))
            throw new HubTransferException("Assign a vehicle before dispatch.");
        if (manifest.Lines.Count == 0)
            throw new HubTransferException("Manifest has no LR lines.");

        var dispatchAt = req.DispatchAt ?? DateTime.UtcNow;
        manifest.Status = HubManifestStatuses.Dispatched;
        manifest.DispatchAt = dispatchAt;
        manifest.UpdatedAt = DateTime.UtcNow;
        manifest.UpdatedBy = user;
        if (!string.IsNullOrWhiteSpace(req.Remarks)) manifest.Remarks = req.Remarks;

        foreach (var line in manifest.Lines.Where(l => l.LineStatus != HubManifestLineStatuses.Cancelled))
        {
            var lr = await LockLrAsync(line.LrNumber, ct);
            EnsureNotTerminal(lr);
            var mov = await db.LrMovements
                .Where(m => m.CompanyId == CompanyId && m.LrNumber == lr.LrNumber && m.ManifestId == manifest.Id
                    && !LrMovementStatuses.Terminal.Contains(m.Status))
                .OrderByDescending(m => m.MovementNo)
                .FirstOrDefaultAsync(ct)
                ?? throw new HubTransferException($"No active movement for LR {lr.LrNumber} on this manifest.");

            var prev = mov.Status;
            mov.Status = LrMovementStatuses.InTransit;
            mov.DispatchAt = dispatchAt;
            mov.VehicleId = manifest.VehicleId;
            mov.VehicleNumber = manifest.VehicleNumber;
            mov.DriverId = manifest.DriverId;
            mov.DriverName = manifest.DriverName;
            mov.CurrentHubName = manifest.FromHubName;
            mov.UpdatedAt = DateTime.UtcNow;
            mov.UpdatedBy = user;
            line.LineStatus = HubManifestLineStatuses.Dispatched;

            // Update operational vehicle on LR — never change FromCity/ToCity
            lr.VehicleId = manifest.VehicleId;
            lr.VehicleNumber = manifest.VehicleNumber;
            lr.DriverId = manifest.DriverId;
            lr.DriverName = manifest.DriverName;
            RecordLrStatus(lr, LrStatuses.InTransit, user, $"Hub dispatch {manifest.ManifestNo}");
            Audit(lr.LrNumber, manifest.Id, mov.Id, "HubDispatch", prev, LrMovementStatuses.InTransit, user, req.Remarks);
        }

        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return await GetManifestAsync(manifest.Id, ct);
    }

    public async Task<object> GetManifestAsync(Guid id, CancellationToken ct = default)
    {
        var m = await TenantScope.HubManifests(db, tenants, branches).AsNoTracking()
            .Include(x => x.Lines)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new HubTransferException("Manifest not found.");
        var lrNos = m.Lines.Select(l => l.LrNumber).ToList();
        var lrs = await ScopedLrs().AsNoTracking().Where(x => lrNos.Contains(x.LrNumber)).ToListAsync(ct);
        var lrMap = lrs.ToDictionary(x => x.LrNumber, StringComparer.OrdinalIgnoreCase);
        return new
        {
            id = m.Id,
            manifestNo = m.ManifestNo,
            fromHubBranchId = m.FromHubBranchId,
            fromHubName = m.FromHubName,
            toDestination = m.ToDestination,
            vehicleId = m.VehicleId,
            vehicleNumber = m.VehicleNumber,
            vehicleType = m.VehicleType,
            driverId = m.DriverId,
            driverName = m.DriverName,
            driverMobile = m.DriverMobile,
            status = m.Status,
            dispatchAt = m.DispatchAt,
            isInbound = m.IsInbound,
            remarks = m.Remarks,
            createdAt = m.CreatedAt,
            totalLr = m.Lines.Count,
            totalPackages = m.Lines.Sum(l => l.Packages ?? 0),
            totalWeight = m.Lines.Sum(l => l.Weight ?? 0),
            lines = m.Lines.OrderBy(l => l.SortOrder).Select(l =>
            {
                lrMap.TryGetValue(l.LrNumber, out var lr);
                return new
                {
                    l.Id,
                    l.LrNumber,
                    l.Packages,
                    l.Weight,
                    l.LineStatus,
                    lrDate = lr?.LrDate,
                    consignor = lr?.Consignor,
                    consignee = lr?.Consignee,
                    originalFrom = lr?.FromCity,
                    finalDestination = lr?.ToCity,
                };
            }),
        };
    }

    public async Task<object> GetMovementHistoryAsync(string lrNumber, CancellationToken ct = default)
    {
        var lr = await ScopedLrs().AsNoTracking().FirstOrDefaultAsync(x => x.LrNumber == lrNumber, ct)
            ?? throw new HubTransferException($"LR '{lrNumber}' was not found.");
        var movements = await TenantScope.LrMovements(db, tenants).AsNoTracking()
            .Where(m => m.LrNumber == lr.LrNumber)
            .OrderBy(m => m.MovementNo)
            .ToListAsync(ct);
        var manifestIds = movements.Where(m => m.ManifestId != null).Select(m => m.ManifestId!.Value).Distinct().ToList();
        var manifests = await db.HubManifests.AsNoTracking().Where(m => manifestIds.Contains(m.Id)).ToDictionaryAsync(m => m.Id, ct);
        var active = movements.Where(m => !LrMovementStatuses.Terminal.Contains(m.Status)).OrderByDescending(m => m.MovementNo).FirstOrDefault();

        return new
        {
            lrNumber = lr.LrNumber,
            originalFrom = lr.FromCity,
            originalTo = lr.ToCity,
            currentStatus = lr.Status,
            currentLocation = ResolveCurrentLocation(lr, active),
            legs = movements.Select(m =>
            {
                manifests.TryGetValue(m.ManifestId ?? Guid.Empty, out var man);
                return new
                {
                    m.Id,
                    m.MovementNo,
                    m.MovementType,
                    m.FromLocation,
                    m.ToLocation,
                    m.CurrentHubName,
                    m.VehicleNumber,
                    m.DriverName,
                    manifestNo = man?.ManifestNo,
                    manifestId = m.ManifestId,
                    m.Status,
                    m.DispatchAt,
                    m.HubReceivedAt,
                    m.UnloadAt,
                    m.DeliveryAt,
                    m.ReceivedBy,
                    m.Remarks,
                    m.CreatedAt,
                };
            }),
        };
    }

    public async Task<object> GetManifestPrintAsync(Guid id, CancellationToken ct = default) =>
        await GetManifestAsync(id, ct);

    public async Task<object> GetReceiveReportAsync(Guid inboundManifestId, CancellationToken ct = default)
    {
        var data = await GetManifestAsync(inboundManifestId, ct);
        var audits = await db.HubTransferAudits.AsNoTracking()
            .Where(a => a.CompanyId == CompanyId && a.ManifestId == inboundManifestId && a.Action == "HubReceived")
            .OrderBy(a => a.PerformedAt)
            .ToListAsync(ct);
        return new { manifest = data, receiveEvents = audits };
    }

    // --- helpers ---

    IQueryable<LorryReceipt> ScopedLrs() => TenantScope.LorryReceipts(db, tenants, branches);

    async Task<LorryReceipt> LockLrAsync(string lrNumber, CancellationToken ct)
    {
        var lr = await ScopedLrs().FirstOrDefaultAsync(x => x.LrNumber == lrNumber, ct)
            ?? throw new HubTransferException($"LR '{lrNumber}' was not found.");
        // Row lock via reload tracked entity in transaction
        await db.Entry(lr).ReloadAsync(ct);
        return lr;
    }

    async Task<LrMovement?> GetActiveMovementAsync(string lrNumber, CancellationToken ct) =>
        await db.LrMovements
            .Where(m => m.CompanyId == CompanyId && m.LrNumber == lrNumber && !LrMovementStatuses.Terminal.Contains(m.Status))
            .OrderByDescending(m => m.MovementNo)
            .FirstOrDefaultAsync(ct);

    async Task<int> NextMovementNoAsync(string lrNumber, CancellationToken ct)
    {
        var max = await db.LrMovements.AsNoTracking()
            .Where(m => m.CompanyId == CompanyId && m.LrNumber == lrNumber)
            .Select(m => (int?)m.MovementNo)
            .MaxAsync(ct);
        return (max ?? 0) + 1;
    }

    async Task<(Guid? BranchId, string Name, string? City)> ResolveHubAsync(Guid? hubBranchId, string? hubName, CancellationToken ct)
    {
        if (hubBranchId != null)
        {
            var b = await tenants.Filter(db.Branches.AsNoTracking()).FirstOrDefaultAsync(x => x.Id == hubBranchId, ct)
                ?? throw new HubTransferException("Hub branch was not found.");
            return (b.Id, b.Name, b.City);
        }
        var name = hubName!.Trim();
        var match = await tenants.Filter(db.Branches.AsNoTracking())
            .FirstOrDefaultAsync(x => x.Name == name || (x.City != null && x.City == name), ct);
        return (match?.Id, match?.Name ?? name, match?.City);
    }

    static void EnsureNotTerminal(LorryReceipt lr)
    {
        if (TerminalLrStatuses.Contains(lr.Status) || string.Equals(lr.Status, "Cancelled", StringComparison.OrdinalIgnoreCase))
            throw new HubTransferException($"LR {lr.LrNumber} cannot be transferred (status: {lr.Status}).");
    }

    void RecordLrStatus(LorryReceipt lr, string newStatus, string? user, string? remarks)
    {
        if (lr.Status == newStatus) return;
        var old = lr.Status;
        lr.Status = newStatus;
        lr.UpdatedAt = DateTime.UtcNow;
        lr.UpdatedBy = user;
        db.LrStatusHistories.Add(new LrStatusHistory
        {
            Id = Guid.NewGuid(),
            CompanyId = lr.CompanyId,
            LrNumber = lr.LrNumber,
            OldStatus = old,
            NewStatus = newStatus,
            ChangedBy = user,
            ChangedAt = DateTime.UtcNow,
            Remarks = remarks,
        });
    }

    void Audit(string? lrNumber, Guid? manifestId, Guid? movementId, string action, string? prev, string? next, string? user, string? remarks)
    {
        db.HubTransferAudits.Add(new HubTransferAudit
        {
            Id = Guid.NewGuid(),
            CompanyId = CompanyId,
            LrNumber = lrNumber,
            ManifestId = manifestId,
            MovementId = movementId,
            Action = action,
            PreviousStatus = prev,
            NewStatus = next,
            Remarks = remarks,
            PerformedBy = user,
            PerformedAt = DateTime.UtcNow,
        });
    }

    static string ResolveCurrentLocation(LorryReceipt lr, LrMovement? mov)
    {
        if (mov == null) return lr.Status == LrStatuses.InTransit ? $"En route ({lr.VehicleNumber})" : lr.FromCity;
        return mov.Status switch
        {
            LrMovementStatuses.HubReceived or LrMovementStatuses.Unloaded or LrMovementStatuses.ReadyForReManifest
                or LrMovementStatuses.Created => mov.CurrentHubName ?? mov.ToLocation,
            LrMovementStatuses.InTransit or LrMovementStatuses.Dispatched =>
                string.IsNullOrWhiteSpace(mov.VehicleNumber)
                    ? $"En route to {mov.ToLocation}"
                    : $"{mov.ToLocation}-bound ({mov.VehicleNumber})",
            _ => mov.CurrentHubName ?? mov.ToLocation,
        };
    }

    static int? ParsePackages(string? quantity)
    {
        if (string.IsNullOrWhiteSpace(quantity)) return null;
        var digits = new string(quantity.TakeWhile(c => char.IsDigit(c) || c == '.').ToArray());
        return int.TryParse(digits.Split('.')[0], out var n) ? n : null;
    }

    static decimal? ParseWeight(string? quantity)
    {
        if (string.IsNullOrWhiteSpace(quantity)) return null;
        var m = System.Text.RegularExpressions.Regex.Match(quantity, @"(\d+(\.\d+)?)\s*(kg|ton|t|mts)?", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        if (!m.Success) return null;
        return decimal.TryParse(m.Groups[1].Value, out var d) ? d : null;
    }
}

public record ReceiveAtHubRequest(
    List<string> LrNumbers,
    Guid? HubBranchId,
    string? HubName,
    DateTime? ReceivedAt,
    string? VehicleNumber,
    Guid? SourceLoadingSheetId,
    string? LoadingSheetNo,
    string? Remarks);

public record UnloadAtHubRequest(List<string> LrNumbers, DateTime? UnloadAt, string? Remarks);

public record CreateReManifestRequest(
    List<string> LrNumbers,
    Guid? HubBranchId,
    string? HubName,
    string ToDestination,
    string? VehicleId,
    string? VehicleNumber,
    string? VehicleType,
    string? DriverId,
    string? DriverName,
    string? DriverMobile,
    DateTime? DispatchDate,
    string? Remarks);

public record AssignVehicleRequest(
    string? VehicleId,
    string? VehicleNumber,
    string? VehicleType,
    string? DriverId,
    string? DriverName,
    string? DriverMobile,
    string? Remarks);

public record DispatchManifestRequest(DateTime? DispatchAt, string? Remarks);
