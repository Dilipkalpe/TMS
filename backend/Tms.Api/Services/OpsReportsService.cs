using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public class OpsReportsService(ReadOnlyTmsDbContext db, ITenantContext tenants, IBranchContext branches)
{
    public static string FlowStage(string? status) => status switch
    {
        LrStatuses.Draft or LrStatuses.LRCreated => "LR Created",
        LrStatuses.LoadingCompleted => "Loading",
        LrStatuses.TransitPassGenerated => "Transit Pass",
        LrStatuses.InTransit => "In Transit",
        LrStatuses.HubReceived => "Hub Received",
        LrStatuses.AvailableForReManifest => "Available for Re-Manifest",
        LrStatuses.DeliveryCompleted => "Delivery",
        LrStatuses.PodUploaded => "POD",
        LrStatuses.InvoiceGenerated => "Billing",
        LrStatuses.ExpenseAdded or LrStatuses.ExpenseApproved => "Expense",
        LrStatuses.Closed => "Closed",
        _ => string.IsNullOrWhiteSpace(status) ? "Unknown" : status,
    };

    static DateOnly? ParseDate(string? s) =>
        DateOnly.TryParse(s, out var d) ? d : null;

    /// <summary>Booking-linked LR vs Direct LR (no booking).</summary>
    public static bool IsBookingLinked(string? bookingId) =>
        !string.IsNullOrWhiteSpace(bookingId);

    public static string WorkflowCode(string? bookingId) =>
        IsBookingLinked(bookingId) ? "booking" : "direct";

    public static string WorkflowLabel(string? bookingId) =>
        IsBookingLinked(bookingId) ? "Booking" : "Direct LR";

    static IQueryable<LorryReceipt> ApplyWorkflow(IQueryable<LorryReceipt> q, string? workflow)
    {
        if (string.IsNullOrWhiteSpace(workflow)) return q;
        var w = workflow.Trim().ToLowerInvariant();
        return w switch
        {
            "booking" or "bookings" => q.Where(l => l.BookingId != null && l.BookingId != ""),
            "direct" or "directlr" or "direct-lr" => q.Where(l => l.BookingId == null || l.BookingId == ""),
            _ => q,
        };
    }

    IQueryable<LorryReceipt> Lrs() => TenantScope.LorryReceipts(db, tenants, branches).AsNoTracking();

    public async Task<object> LrRegisterAsync(
        string? search, string? fromDate, string? toDate, string? status, string? vehicle, string? workflow,
        int page, int pageSize, bool includeTotal, CancellationToken ct = default)
    {
        var q = Lrs();
        var from = ParseDate(fromDate);
        var to = ParseDate(toDate);
        if (from != null) q = q.Where(l => l.LrDate >= from);
        if (to != null) q = q.Where(l => l.LrDate <= to);
        q = ApplyWorkflow(q, workflow);
        if (!string.IsNullOrWhiteSpace(status))
        {
            var st = status.Trim();
            q = q.Where(l => l.Status == st);
        }
        if (!string.IsNullOrWhiteSpace(vehicle))
        {
            var v = vehicle.Trim().ToLower();
            q = q.Where(l => l.VehicleNumber != null && l.VehicleNumber.ToLower().Contains(v));
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(l =>
                l.LrNumber.ToLower().Contains(s)
                || (l.VehicleNumber != null && l.VehicleNumber.ToLower().Contains(s))
                || (l.DriverName != null && l.DriverName.ToLower().Contains(s))
                || (l.Consignor != null && l.Consignor.ToLower().Contains(s))
                || (l.BookingId != null && l.BookingId.ToLower().Contains(s))
                || l.FromCity.ToLower().Contains(s)
                || l.ToCity.ToLower().Contains(s)
                || l.Status.ToLower().Contains(s));
        }

        q = q.OrderByDescending(l => l.LrDate).ThenByDescending(l => l.LrNumber);
        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize, QueryExtensions.ReportMaxPageSize);
        var (list, total, hasMore, approx) = await q.ToPagedListAsync(p, size, includeTotal, ct);

        var lrNos = list.Select(l => l.LrNumber).ToList();
        var expenseByLr = await db.LrExpenses.AsNoTracking()
            .Where(e => lrNos.Contains(e.LrNumber) && e.Status != "Rejected")
            .GroupBy(e => e.LrNumber)
            .Select(g => new { g.Key, Total = g.Sum(x => x.Amount) })
            .ToDictionaryAsync(x => x.Key, x => x.Total, ct);

        var bookingIds = list
            .Where(l => IsBookingLinked(l.BookingId))
            .Select(l => l.BookingId!)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        var bookingExpenseTotal = bookingIds.Count == 0
            ? new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase)
            : await tenants.Filter(db.BookingExpenses.AsNoTracking())
                .Where(e => bookingIds.Contains(e.BookingId))
                .GroupBy(e => e.BookingId)
                .Select(g => new { g.Key, Total = g.Sum(x => x.Amount) })
                .ToDictionaryAsync(x => x.Key, x => x.Total, StringComparer.OrdinalIgnoreCase, ct);
        var lrCountByBooking = bookingIds.Count == 0
            ? new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
            : await Lrs()
                .Where(l => l.BookingId != null && bookingIds.Contains(l.BookingId))
                .GroupBy(l => l.BookingId!)
                .Select(g => new { g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Key, x => x.Count, StringComparer.OrdinalIgnoreCase, ct);

        var movements = await TenantScope.LrMovements(db, tenants).AsNoTracking()
            .Where(m => lrNos.Contains(m.LrNumber))
            .ToListAsync(ct);
        var movByLr = movements
            .Where(m => !LrMovementStatuses.Terminal.Contains(m.Status))
            .GroupBy(m => m.LrNumber, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.MovementNo).First(), StringComparer.OrdinalIgnoreCase);

        var deliverySheets = await tenants.Filter(db.LrDeliverySheets.AsNoTracking())
            .Where(d => lrNos.Contains(d.LrNumber))
            .ToListAsync(ct);
        var delByLr = deliverySheets.ToDictionary(d => d.LrNumber, StringComparer.OrdinalIgnoreCase);

        var filteredBase = ApplyWorkflow(
            Lrs().Where(l => (from == null || l.LrDate >= from) && (to == null || l.LrDate <= to)),
            workflow);
        var stageCounts = await filteredBase
            .GroupBy(l => l.Status)
            .Select(g => new { status = g.Key, count = g.Count() })
            .ToListAsync(ct);
        var bookingCount = await filteredBase.CountAsync(l => l.BookingId != null && l.BookingId != "", ct);
        var directCount = await filteredBase.CountAsync(l => l.BookingId == null || l.BookingId == "", ct);

        var rows = list.Select(l =>
        {
            expenseByLr.TryGetValue(l.LrNumber, out var lrExpense);
            movByLr.TryGetValue(l.LrNumber, out var mov);
            delByLr.TryGetValue(l.LrNumber, out var del);
            decimal allocatedBookingExpense = 0;
            if (IsBookingLinked(l.BookingId)
                && bookingExpenseTotal.TryGetValue(l.BookingId!, out var be)
                && lrCountByBooking.TryGetValue(l.BookingId!, out var n)
                && n > 0)
            {
                allocatedBookingExpense = Math.Round(be / n, 2);
            }
            var expense = lrExpense + allocatedBookingExpense;
            var income = l.Freight + l.Gst;
            var profit = income - expense;
            DateOnly? deliveryDate = del?.DeliveryDate;
            int? deliveryDays = deliveryDate != null ? deliveryDate.Value.DayNumber - l.LrDate.DayNumber : null;
            return (object)new
            {
                lr = l.LrNumber,
                lrNumber = l.LrNumber,
                date = l.LrDate.ToString("yyyy-MM-dd"),
                lrDate = l.LrDate.ToString("yyyy-MM-dd"),
                status = l.Status,
                stage = FlowStage(l.Status),
                workflow = WorkflowCode(l.BookingId),
                workflowLabel = WorkflowLabel(l.BookingId),
                bookingId = l.BookingId,
                consignor = l.Consignor,
                consignee = l.Consignee,
                vehicle = mov?.VehicleNumber ?? l.VehicleNumber,
                driver = mov?.DriverName ?? l.DriverName,
                route = $"{l.FromCity} → {l.ToCity}",
                originalFrom = l.FromCity,
                finalDestination = l.ToCity,
                currentHub = mov?.CurrentHubName,
                currentLocation = mov?.Status is LrMovementStatuses.InTransit or LrMovementStatuses.Dispatched
                    ? $"{mov.ToLocation}-bound"
                    : mov?.CurrentHubName ?? l.ToCity,
                deliveryDate = deliveryDate?.ToString("yyyy-MM-dd"),
                deliveryDays,
                freight = l.Freight,
                gst = l.Gst,
                lrExpense,
                bookingExpense = allocatedBookingExpense,
                expense,
                profit,
            };
        }).ToList();

        return new
        {
            items = rows,
            total,
            page = p,
            pageSize = size,
            hasMore,
            totalIsApproximate = approx,
            summary = new
            {
                total,
                bookingCount,
                directCount,
                byStage = stageCounts.Select(x => new { stage = FlowStage(x.status), x.status, x.count }),
            },
        };
    }

    public async Task<object> LoadingDispatchAsync(
        string? search, string? fromDate, string? toDate, string? workflow,
        int page, int pageSize, bool includeTotal, CancellationToken ct = default)
    {
        var from = ParseDate(fromDate);
        var to = ParseDate(toDate);
        var sheets = tenants.Filter(db.LrLoadingSheets.AsNoTracking()).AsQueryable();
        if (from != null)
        {
            var fromDt = from.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            sheets = sheets.Where(s => s.LoadingAt >= fromDt);
        }
        if (to != null)
        {
            var toDt = to.Value.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);
            sheets = sheets.Where(s => s.LoadingAt <= toDt);
        }
        if (!string.IsNullOrWhiteSpace(workflow))
        {
            var linkedLr = ApplyWorkflow(Lrs(), workflow).Select(l => l.LrNumber);
            sheets = sheets.Where(s => linkedLr.Contains(s.LrNumber));
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            sheets = sheets.Where(x =>
                x.SheetNumber.ToLower().Contains(s)
                || x.LrNumber.ToLower().Contains(s)
                || (x.VehicleNumber != null && x.VehicleNumber.ToLower().Contains(s)));
        }

        sheets = sheets.OrderByDescending(s => s.LoadingAt);
        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize, QueryExtensions.ReportMaxPageSize);
        var (list, total, hasMore, approx) = await sheets.ToPagedListAsync(p, size, includeTotal, ct);

        var sheetIds = list.Select(s => s.Id).ToList();
        var itemCounts = await db.LrLoadingSheetItems.AsNoTracking()
            .Where(i => sheetIds.Contains(i.LoadingSheetId))
            .GroupBy(i => i.LoadingSheetId)
            .Select(g => new { g.Key, Count = g.Count(), Qty = g.Sum(x => x.QuantityTons ?? 0) })
            .ToDictionaryAsync(x => x.Key, x => x, ct);

        var lrNos = list.Select(s => s.LrNumber).Distinct().ToList();
        var lrs = await Lrs().Where(l => lrNos.Contains(l.LrNumber)).ToDictionaryAsync(l => l.LrNumber, ct);

        var rows = list.Select(s =>
        {
            itemCounts.TryGetValue(s.Id, out var ic);
            lrs.TryGetValue(s.LrNumber, out var lr);
            var dispatched = lr != null && (
                lr.Status == LrStatuses.InTransit
                || lr.Status == LrStatuses.HubReceived
                || lr.Status == LrStatuses.AvailableForReManifest
                || lr.Status == LrStatuses.DeliveryCompleted
                || lr.Status == LrStatuses.PodUploaded
                || lr.Status == LrStatuses.Closed
                || lr.Status == LrStatuses.InvoiceGenerated);
            return (object)new
            {
                sheetNumber = s.SheetNumber,
                lrNumber = s.LrNumber,
                loadingAt = s.LoadingAt.ToString("yyyy-MM-dd HH:mm"),
                loadingLocation = s.LoadingLocation,
                vehicle = s.VehicleNumber,
                lrCount = ic?.Count ?? 1,
                quantityTons = ic?.Qty ?? s.TotalQuantity,
                loadingStatus = s.LoadingStatus,
                lrStatus = lr?.Status,
                stage = FlowStage(lr?.Status),
                workflow = WorkflowCode(lr?.BookingId),
                workflowLabel = WorkflowLabel(lr?.BookingId),
                bookingId = lr?.BookingId,
                dispatched,
                route = lr != null ? $"{lr.FromCity} → {lr.ToCity}" : "",
            };
        }).ToList();

        return new { items = rows, total, page = p, pageSize = size, hasMore, totalIsApproximate = approx };
    }

    public async Task<object> HubTransferReportAsync(
        string? search, string? fromDate, string? toDate, string? status, Guid? hubBranchId,
        int page, int pageSize, bool includeTotal, CancellationToken ct = default)
    {
        var from = ParseDate(fromDate);
        var to = ParseDate(toDate);
        var q = TenantScope.HubManifests(db, tenants, branches).AsNoTracking().AsQueryable();
        if (from != null)
        {
            var fromDt = from.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            q = q.Where(m => m.CreatedAt >= fromDt);
        }
        if (to != null)
        {
            var toDt = to.Value.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);
            q = q.Where(m => m.CreatedAt <= toDt);
        }
        if (hubBranchId != null) q = q.Where(m => m.FromHubBranchId == hubBranchId);
        if (!string.IsNullOrWhiteSpace(status))
        {
            var st = status.Trim();
            q = q.Where(m => m.Status == st);
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(m =>
                m.ManifestNo.ToLower().Contains(s)
                || m.FromHubName.ToLower().Contains(s)
                || m.ToDestination.ToLower().Contains(s)
                || (m.VehicleNumber != null && m.VehicleNumber.ToLower().Contains(s)));
        }

        q = q.OrderByDescending(m => m.CreatedAt);
        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize, QueryExtensions.ReportMaxPageSize);
        var (list, total, hasMore, approx) = await q.ToPagedListAsync(p, size, includeTotal, ct);

        var ids = list.Select(m => m.Id).ToList();
        var lineStats = await db.HubManifestLrs.AsNoTracking()
            .Where(l => ids.Contains(l.ManifestId))
            .GroupBy(l => l.ManifestId)
            .Select(g => new
            {
                g.Key,
                LrCount = g.Count(),
                Packages = g.Sum(x => x.Packages ?? 0),
                Weight = g.Sum(x => x.Weight ?? 0),
            })
            .ToDictionaryAsync(x => x.Key, x => x, ct);

        var rows = list.Select(m =>
        {
            lineStats.TryGetValue(m.Id, out var st);
            return (object)new
            {
                id = m.Id,
                manifestNo = m.ManifestNo,
                fromHub = m.FromHubName,
                toDestination = m.ToDestination,
                vehicle = m.VehicleNumber,
                driver = m.DriverName,
                status = m.Status,
                isInbound = m.IsInbound,
                dispatchAt = m.DispatchAt?.ToString("yyyy-MM-dd HH:mm"),
                createdAt = m.CreatedAt.ToString("yyyy-MM-dd"),
                lrCount = st?.LrCount ?? 0,
                packages = st?.Packages ?? 0,
                weight = st?.Weight ?? 0,
            };
        }).ToList();

        return new { items = rows, total, page = p, pageSize = size, hasMore, totalIsApproximate = approx };
    }

    public async Task<object> DeliveryPodAsync(
        string? search, string? fromDate, string? toDate, string? status, string? workflow,
        int page, int pageSize, bool includeTotal, CancellationToken ct = default)
    {
        var from = ParseDate(fromDate);
        var to = ParseDate(toDate);
        var sheetLr = tenants.Filter(db.LrDeliverySheets.AsNoTracking()).Select(d => d.LrNumber);
        var q = Lrs().Where(l =>
            l.Status == LrStatuses.DeliveryCompleted
            || l.Status == LrStatuses.PodUploaded
            || l.Status == LrStatuses.InvoiceGenerated
            || l.Status == LrStatuses.Closed
            || sheetLr.Contains(l.LrNumber));

        if (from != null) q = q.Where(l => l.LrDate >= from);
        if (to != null) q = q.Where(l => l.LrDate <= to);
        q = ApplyWorkflow(q, workflow);
        if (!string.IsNullOrWhiteSpace(status))
        {
            var st = status.Trim();
            q = q.Where(l => l.Status == st);
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(l =>
                l.LrNumber.ToLower().Contains(s)
                || (l.Consignee != null && l.Consignee.ToLower().Contains(s))
                || (l.BookingId != null && l.BookingId.ToLower().Contains(s))
                || l.ToCity.ToLower().Contains(s));
        }

        q = q.OrderByDescending(l => l.LrDate);
        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize, QueryExtensions.ReportMaxPageSize);
        var (list, total, hasMore, approx) = await q.ToPagedListAsync(p, size, includeTotal, ct);
        var lrNos = list.Select(l => l.LrNumber).ToList();
        var sheets = await tenants.Filter(db.LrDeliverySheets.AsNoTracking())
            .Where(d => lrNos.Contains(d.LrNumber))
            .ToDictionaryAsync(d => d.LrNumber, ct);

        var rows = list.Select(l =>
        {
            sheets.TryGetValue(l.LrNumber, out var d);
            return (object)new
            {
                lrNumber = l.LrNumber,
                lrDate = l.LrDate.ToString("yyyy-MM-dd"),
                status = l.Status,
                stage = FlowStage(l.Status),
                workflow = WorkflowCode(l.BookingId),
                workflowLabel = WorkflowLabel(l.BookingId),
                bookingId = l.BookingId,
                consignee = l.Consignee,
                route = $"{l.FromCity} → {l.ToCity}",
                vehicle = l.VehicleNumber,
                deliveryDate = d?.DeliveryDate?.ToString("yyyy-MM-dd"),
                deliveryLocation = d?.DeliveryLocation,
                receiverName = d?.ReceiverName,
                packagesTotal = d?.PackagesTotal,
                packagesReceived = d?.PackagesReceived,
                podNo = d?.PodNo,
                shipmentStatus = d?.ShipmentStatus,
                freight = l.Freight,
            };
        }).ToList();

        return new { items = rows, total, page = p, pageSize = size, hasMore, totalIsApproximate = approx };
    }

    public async Task<object> VehiclesLiveAsync(
        string? search, string? fromDate, string? toDate,
        int page, int pageSize, bool includeTotal, CancellationToken ct = default)
    {
        var from = ParseDate(fromDate);
        var to = ParseDate(toDate);
        var lrQ = Lrs().Where(l => l.VehicleNumber != null && l.VehicleNumber != "");
        if (from != null) lrQ = lrQ.Where(l => l.LrDate >= from);
        if (to != null) lrQ = lrQ.Where(l => l.LrDate <= to);

        var agg = await lrQ
            .GroupBy(l => l.VehicleNumber!)
            .Select(g => new
            {
                number = g.Key,
                trips = g.Count(),
                revenue = g.Sum(x => x.Freight),
                inTransit = g.Count(x => x.Status == LrStatuses.InTransit || x.Status == LrStatuses.HubReceived),
                delivered = g.Count(x =>
                    x.Status == LrStatuses.DeliveryCompleted || x.Status == LrStatuses.PodUploaded || x.Status == LrStatuses.Closed),
            })
            .ToListAsync(ct);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            agg = agg.Where(a => a.number.ToLower().Contains(s)).ToList();
        }

        var masters = await tenants.Filter(branches.Filter(db.Vehicles.AsNoTracking())).ToListAsync(ct);
        var byNum = masters.ToDictionary(v => v.Number, StringComparer.OrdinalIgnoreCase);

        var joined = agg.Select(a =>
        {
            byNum.TryGetValue(a.number, out var v);
            return new
            {
                a.number,
                type = v?.Type,
                status = v?.Status ?? "—",
                a.trips,
                a.revenue,
                a.inTransit,
                a.delivered,
                utilization = a.trips == 0 ? 0 : Math.Min(100, (int)Math.Round(a.delivered * 100.0 / a.trips)),
            };
        }).OrderByDescending(x => x.trips).ToList();

        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize, QueryExtensions.ReportMaxPageSize);
        var total = joined.Count;
        var pageItems = joined.Skip((p - 1) * size).Take(size).Cast<object>().ToList();
        return new { items = pageItems, total, page = p, pageSize = size, hasMore = p * size < total, totalIsApproximate = false };
    }

    public async Task<object> DriversLiveAsync(
        string? search, string? fromDate, string? toDate,
        int page, int pageSize, bool includeTotal, CancellationToken ct = default)
    {
        var from = ParseDate(fromDate);
        var to = ParseDate(toDate);
        var lrQ = Lrs().Where(l => l.DriverName != null && l.DriverName != "");
        if (from != null) lrQ = lrQ.Where(l => l.LrDate >= from);
        if (to != null) lrQ = lrQ.Where(l => l.LrDate <= to);

        var agg = await lrQ
            .GroupBy(l => l.DriverName!)
            .Select(g => new
            {
                name = g.Key,
                trips = g.Count(),
                revenue = g.Sum(x => x.Freight),
                inTransit = g.Count(x => x.Status == LrStatuses.InTransit || x.Status == LrStatuses.HubReceived),
            })
            .ToListAsync(ct);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            agg = agg.Where(a => a.name.ToLower().Contains(s)).ToList();
        }

        var masters = await tenants.Filter(branches.Filter(db.Drivers.AsNoTracking())).ToListAsync(ct);
        var byName = masters.GroupBy(d => d.Name, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        var joined = agg.Select(a =>
        {
            byName.TryGetValue(a.name, out var d);
            return new
            {
                a.name,
                phone = d?.Phone,
                status = d?.Status ?? "—",
                a.trips,
                a.revenue,
                a.inTransit,
                salary = d?.Salary ?? 0,
                rating = d?.Rating ?? 0,
            };
        }).OrderByDescending(x => x.trips).ToList();

        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize, QueryExtensions.ReportMaxPageSize);
        var total = joined.Count;
        var pageItems = joined.Skip((p - 1) * size).Take(size).Cast<object>().ToList();
        return new { items = pageItems, total, page = p, pageSize = size, hasMore = p * size < total, totalIsApproximate = false };
    }

    public async Task<object> CustomersLiveAsync(
        string? search, string? fromDate, string? toDate,
        int page, int pageSize, bool includeTotal, CancellationToken ct = default)
    {
        var from = ParseDate(fromDate);
        var to = ParseDate(toDate);
        var lrQ = Lrs().Where(l => l.Consignor != null && l.Consignor != "");
        if (from != null) lrQ = lrQ.Where(l => l.LrDate >= from);
        if (to != null) lrQ = lrQ.Where(l => l.LrDate <= to);

        var agg = await lrQ
            .GroupBy(l => l.Consignor!)
            .Select(g => new
            {
                name = g.Key,
                trips = g.Count(),
                freight = g.Sum(x => x.Freight),
                bookingLrs = g.Count(x => x.BookingId != null && x.BookingId != ""),
                directLrs = g.Count(x => x.BookingId == null || x.BookingId == ""),
                open = g.Count(x =>
                    x.Status != LrStatuses.Closed
                    && x.Status != LrStatuses.DeliveryCompleted
                    && x.Status != LrStatuses.PodUploaded),
            })
            .ToListAsync(ct);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            agg = agg.Where(a => a.name.ToLower().Contains(s)).ToList();
        }

        var bookingOut = await tenants.Filter(branches.Filter(db.Bookings.AsNoTracking()))
            .Where(b => b.Balance > 0 && b.Status != "Cancelled")
            .GroupBy(b => b.CustomerName)
            .Select(g => new { name = g.Key, outstanding = g.Sum(x => x.Balance) })
            .ToDictionaryAsync(x => x.name, x => x.outstanding, StringComparer.OrdinalIgnoreCase, ct);

        var joined = agg.Select(a =>
        {
            bookingOut.TryGetValue(a.name, out var outstanding);
            return new
            {
                a.name,
                contact = "",
                a.trips,
                a.bookingLrs,
                a.directLrs,
                a.freight,
                a.open,
                outstanding,
                creditLimit = 0m,
            };
        }).OrderByDescending(x => x.freight).ToList();

        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize, QueryExtensions.ReportMaxPageSize);
        var total = joined.Count;
        var pageItems = joined.Skip((p - 1) * size).Take(size).Cast<object>().ToList();
        return new { items = pageItems, total, page = p, pageSize = size, hasMore = p * size < total, totalIsApproximate = false };
    }

    public async Task<object> VendorsLiveAsync(
        string? search, string? fromDate, string? toDate,
        int page, int pageSize, bool includeTotal, CancellationToken ct = default)
    {
        var from = ParseDate(fromDate);
        var to = ParseDate(toDate);
        var expQ = tenants.Filter(branches.Filter(db.Expenses.AsNoTracking())).AsQueryable();
        if (from != null) expQ = expQ.Where(e => e.ExpenseDate >= from);
        if (to != null) expQ = expQ.Where(e => e.ExpenseDate <= to);

        var byVendor = await expQ
            .Where(e => e.VendorName != null && e.VendorName != "")
            .GroupBy(e => e.VendorName!)
            .Select(g => new { name = g.Key, bills = g.Count(), amount = g.Sum(x => x.Amount) })
            .ToListAsync(ct);

        var masters = await tenants.Filter(db.Vendors.AsNoTracking()).ToListAsync(ct);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            masters = masters.Where(v => v.Name.ToLower().Contains(s)).ToList();
            byVendor = byVendor.Where(v => v.name.ToLower().Contains(s)).ToList();
        }

        var spend = byVendor.ToDictionary(x => x.name, x => x, StringComparer.OrdinalIgnoreCase);
        var rows = masters.Select(v =>
        {
            spend.TryGetValue(v.Name, out var s);
            return new
            {
                name = v.Name,
                category = v.Category,
                outstanding = v.Outstanding,
                bills = s?.bills ?? v.TotalBills,
                amount = s?.amount ?? 0,
            };
        }).OrderByDescending(x => x.amount).ToList();

        // include expense-only vendors not in master
        foreach (var s in byVendor.Where(s => !masters.Any(m => string.Equals(m.Name, s.name, StringComparison.OrdinalIgnoreCase))))
        {
            rows.Add(new { name = s.name, category = (string?)"Expense", outstanding = 0m, bills = s.bills, amount = s.amount });
        }

        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize, QueryExtensions.ReportMaxPageSize);
        var ordered = rows.OrderByDescending(x => x.amount).ToList();
        var total = ordered.Count;
        var pageItems = ordered.Skip((p - 1) * size).Take(size).Cast<object>().ToList();
        return new { items = pageItems, total, page = p, pageSize = size, hasMore = p * size < total, totalIsApproximate = false };
    }

    public async Task<object> IncomeAsync(string? fromDate, string? toDate, string? workflow, CancellationToken ct = default)
    {
        var from = ParseDate(fromDate) ?? new DateOnly(DateTime.UtcNow.Year, 1, 1);
        var to = ParseDate(toDate) ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var q = ApplyWorkflow(Lrs().Where(l => l.LrDate >= from && l.LrDate <= to), workflow);
        var data = await q
            .GroupBy(l => new { l.LrDate.Year, l.LrDate.Month })
            .Select(g => new
            {
                g.Key.Year,
                g.Key.Month,
                freight = g.Sum(x => x.Freight),
                gst = g.Sum(x => x.Gst),
                count = g.Count(),
                bookingFreight = g.Sum(x => x.BookingId != null && x.BookingId != "" ? x.Freight : 0),
                directFreight = g.Sum(x => x.BookingId == null || x.BookingId == "" ? x.Freight : 0),
                bookingCount = g.Count(x => x.BookingId != null && x.BookingId != ""),
                directCount = g.Count(x => x.BookingId == null || x.BookingId == ""),
            })
            .OrderBy(x => x.Year).ThenBy(x => x.Month)
            .ToListAsync(ct);

        var months = new[] { "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" };
        return data.Select(d => new
        {
            month = $"{months[d.Month - 1]} {d.Year}",
            year = d.Year,
            monthNum = d.Month,
            freight = d.freight,
            bookingFreight = d.bookingFreight,
            directFreight = d.directFreight,
            gst = d.gst,
            loading = 0m,
            total = d.freight + d.gst,
            lrCount = d.count,
            bookingCount = d.bookingCount,
            directCount = d.directCount,
        });
    }

    /// <summary>P&amp;L for Direct LRs only (no booking). Booking workflow uses booking-profit-loss.</summary>
    public async Task<object> DirectLrProfitLossAsync(
        string? search, string? fromDate, string? toDate,
        int page, int pageSize, bool includeTotal, CancellationToken ct = default)
    {
        var from = ParseDate(fromDate);
        var to = ParseDate(toDate);
        var q = ApplyWorkflow(Lrs(), "direct");
        if (from != null) q = q.Where(l => l.LrDate >= from);
        if (to != null) q = q.Where(l => l.LrDate <= to);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(l =>
                l.LrNumber.ToLower().Contains(s)
                || (l.Consignor != null && l.Consignor.ToLower().Contains(s))
                || l.FromCity.ToLower().Contains(s)
                || l.ToCity.ToLower().Contains(s));
        }

        q = q.OrderByDescending(l => l.LrDate).ThenByDescending(l => l.LrNumber);
        var (p, size) = QueryExtensions.NormalizePaging(page, pageSize, QueryExtensions.ReportMaxPageSize);
        var (list, total, hasMore, approx) = await q.ToPagedListAsync(p, size, includeTotal, ct);
        var lrNos = list.Select(l => l.LrNumber).ToList();
        var expenseByLr = await db.LrExpenses.AsNoTracking()
            .Where(e => lrNos.Contains(e.LrNumber) && e.Status != "Rejected")
            .GroupBy(e => e.LrNumber)
            .Select(g => new { g.Key, Total = g.Sum(x => x.Amount) })
            .ToDictionaryAsync(x => x.Key, x => x.Total, ct);

        var rows = list.Select(l =>
        {
            expenseByLr.TryGetValue(l.LrNumber, out var expenses);
            var income = l.Freight + l.Gst;
            var profit = income - expenses;
            return (object)new
            {
                lrNumber = l.LrNumber,
                lrDate = l.LrDate.ToString("yyyy-MM-dd"),
                customer = l.Consignor,
                route = $"{l.FromCity} → {l.ToCity}",
                workflow = "direct",
                workflowLabel = "Direct LR",
                income,
                freight = l.Freight,
                gst = l.Gst,
                expenses,
                profit,
                marginPercent = income > 0 ? Math.Round(profit / income * 100, 2) : 0,
                status = l.Status,
                stage = FlowStage(l.Status),
            };
        }).ToList();

        return new { items = rows, total, page = p, pageSize = size, hasMore, totalIsApproximate = approx };
    }

    public async Task<object> ExpensesAsync(string? fromDate, string? toDate, CancellationToken ct = default)
    {
        var from = ParseDate(fromDate) ?? new DateOnly(DateTime.UtcNow.Year, 1, 1);
        var to = ParseDate(toDate) ?? DateOnly.FromDateTime(DateTime.UtcNow);

        var general = await tenants.Filter(branches.Filter(db.Expenses.AsNoTracking()))
            .Where(e => e.ExpenseDate >= from && e.ExpenseDate <= to)
            .Select(e => new { e.ExpenseDate.Year, e.ExpenseDate.Month, e.Category, e.Amount })
            .ToListAsync(ct);

        var lrExp = await tenants.Filter(db.LrExpenses.AsNoTracking())
            .Where(e => e.ExpenseDate >= from && e.ExpenseDate <= to && e.Status != "Rejected")
            .Select(e => new { e.ExpenseDate.Year, e.ExpenseDate.Month, Category = "LR:" + e.Category, e.Amount })
            .ToListAsync(ct);

        var bookingExp = await tenants.Filter(db.BookingExpenses.AsNoTracking())
            .Where(e => e.ExpenseDate >= from && e.ExpenseDate <= to)
            .Select(e => new { e.ExpenseDate.Year, e.ExpenseDate.Month, Category = "Booking:" + e.Category, e.Amount })
            .ToListAsync(ct);

        var all = general.Concat(lrExp).Concat(bookingExp).ToList();
        var months = new[] { "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" };

        return all
            .GroupBy(x => new { x.Year, x.Month })
            .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
            .Select(g =>
            {
                decimal Cat(string name) => g.Where(x => x.Category.Contains(name, StringComparison.OrdinalIgnoreCase)).Sum(x => x.Amount);
                return new
                {
                    month = $"{months[g.Key.Month - 1]} {g.Key.Year}",
                    year = g.Key.Year,
                    monthNum = g.Key.Month,
                    fuel = Cat("Fuel") + Cat("Diesel"),
                    salary = Cat("Salary") + Cat("Bhatta"),
                    toll = Cat("Toll"),
                    maintenance = Cat("Maintenance"),
                    lrExpenses = g.Where(x => x.Category.StartsWith("LR:", StringComparison.OrdinalIgnoreCase)).Sum(x => x.Amount),
                    bookingExpenses = g.Where(x => x.Category.StartsWith("Booking:", StringComparison.OrdinalIgnoreCase)).Sum(x => x.Amount),
                    total = g.Sum(x => x.Amount),
                };
            })
            .ToList();
    }
}
