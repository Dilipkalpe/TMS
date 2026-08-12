using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public static class BookingFinanceService
{
    public sealed record BillLineItem(string Description, decimal Amount, string? Detail = null);

    public sealed record TransportBillBuildResult(
        decimal Freight,
        decimal OtherCharges,
        decimal TaxableAmount,
        decimal GstAmount,
        decimal GrossTotal,
        decimal Advance,
        decimal BookingAdvance,
        decimal PaymentsTotal,
        decimal NetPayable,
        IReadOnlyList<BillLineItem> Lines);
    public static async Task RecalculateBookingPaymentStatusAsync(TmsDbContext db, Booking booking, CancellationToken ct = default)
    {
        var extraPaid = await db.BookingPayments
            .Where(p => p.BookingId == booking.Id)
            .SumAsync(p => p.Amount, ct);

        // Payments queued in the current SaveChanges batch are not in the DB yet.
        var pendingAdded = db.ChangeTracker.Entries<BookingPayment>()
            .Where(e => e.State == EntityState.Added && e.Entity.BookingId == booking.Id)
            .Sum(e => e.Entity.Amount);
        extraPaid += pendingAdded;

        var totalReceived = booking.Advance + extraPaid;
        booking.Balance = Math.Max(0, booking.Freight - totalReceived);
        booking.Payment = booking.Balance <= 0 ? "Paid" : totalReceived > 0 ? "Partial" : "Unpaid";
        booking.UpdatedAt = DateTime.UtcNow;
    }

    public static async Task SyncCustomerOutstandingAsync(TmsDbContext db, Guid companyId, string? customerId, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(customerId)) return;
        var customer = await db.Customers.FindAsync([customerId], ct);
        if (customer == null || customer.CompanyId != companyId) return;

        var bookingBal = await db.Bookings
            .Where(b => b.CompanyId == companyId && b.CustomerId == customerId)
            .SumAsync(b => b.Balance, ct);

        // Direct LRs (no booking): include open balance until an active freight invoice takes over.
        var invoicedLrNos = db.FreightInvoices.AsNoTracking()
            .Where(i => i.CompanyId == companyId && i.Status != "Cancelled" && i.LrNumber != null && i.LrNumber != "")
            .Select(i => i.LrNumber!);
        var directLrBal = await db.LorryReceipts
            .Where(l => l.CompanyId == companyId
                && l.CustomerId == customerId
                && (l.BookingId == null || l.BookingId == "")
                && l.Status != LrStatuses.Draft
                && l.Status != LrStatuses.Closed
                && l.Balance > 0
                && !invoicedLrNos.Contains(l.LrNumber))
            .SumAsync(l => l.Balance, ct);

        var invoiceBal = await db.FreightInvoices
            .Where(i => i.CompanyId == companyId
                && i.CustomerId == customerId
                && i.Status != "Cancelled"
                && i.Balance > 0)
            .SumAsync(i => i.Balance, ct);

        var partyProv = await db.Provisions
            .Where(p => p.CompanyId == companyId && p.ProvisionType == "Party" && p.PartyId == customerId && !p.IsReversed)
            .SumAsync(p => p.Amount, ct);

        customer.Outstanding = bookingBal + directLrBal + invoiceBal + partyProv;
        customer.LedgerBalance = customer.Outstanding;
        customer.UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Resolve billing party to a Customer (by id or name). Creates a Customer when only a name is known
    /// so Direct LR / billing-party outstanding can be tracked.
    /// </summary>
    public static async Task<Customer?> ResolveBillingCustomerAsync(
        TmsDbContext db,
        ITenantContext tenants,
        IBranchContext branches,
        string? customerId,
        string? customerName,
        CancellationToken ct = default)
    {
        if (!string.IsNullOrWhiteSpace(customerId))
        {
            var byId = await TenantScope.FindCustomerAsync(db, tenants, branches, customerId.Trim(), ct);
            if (byId != null) return byId;
        }

        var name = customerName?.Trim();
        if (string.IsNullOrWhiteSpace(name)) return null;

        var byName = await TenantScope.FindCustomerByNameAsync(db, tenants, branches, name, ct);
        if (byName != null) return byName;

        // Name may match a customer outside branch lookup scope (null BranchId shared masters).
        var shared = await BranchAccess.FilterForLookup(branches, tenants.Filter(db.Customers.AsQueryable()))
            .FirstOrDefaultAsync(c => c.Name.ToLower() == name.ToLower(), ct);
        if (shared != null) return shared;

        var created = new Customer
        {
            Id = await IdGenerator.NextCustomerId(db),
            Name = name,
            BranchId = branches.AssignBranchId,
            CompanyId = TenantScope.ResolveCompanyId(tenants),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Customers.Add(created);
        return created;
    }

    public static async Task SyncVendorOutstandingAsync(TmsDbContext db, Guid companyId, string? vendorId, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(vendorId)) return;
        var vendor = await db.Vendors.FindAsync([vendorId], ct);
        if (vendor == null || vendor.CompanyId != companyId) return;

        var expenseBal = await db.BookingExpenses
            .Where(e => e.CompanyId == companyId && e.VendorId == vendorId)
            .SumAsync(e => e.Amount, ct);
        var prov = await db.Provisions
            .Where(p => p.CompanyId == companyId && p.ProvisionType == "Vendor" && p.PartyId == vendorId && !p.IsReversed)
            .SumAsync(p => p.Amount, ct);
        vendor.Outstanding = expenseBal + prov;
        vendor.UpdatedAt = DateTime.UtcNow;
    }

    public static async Task SyncBrokerOutstandingAsync(TmsDbContext db, Guid companyId, string brokerName, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(brokerName)) return;
        var broker = await db.Brokers.FirstOrDefaultAsync(b => b.CompanyId == companyId && b.Name == brokerName, ct);
        if (broker == null) return;

        broker.Outstanding = await db.BookingBrokerCharges
            .Where(c => c.CompanyId == companyId && c.BrokerName == brokerName)
            .SumAsync(c => c.Amount - c.PaidAmount, ct);
        broker.UpdatedAt = DateTime.UtcNow;
    }

    public static async Task<object> BuildBookingProfitLossAsync(TmsDbContext db, Booking booking, CancellationToken ct = default)
    {
        var rows = await BuildBookingProfitLossBatchAsync(db, [booking], ct);
        return rows[0];
    }

    public static async Task<List<object>> BuildBookingProfitLossBatchAsync(
        TmsDbContext db, IReadOnlyList<Booking> bookings, CancellationToken ct = default)
    {
        if (bookings.Count == 0) return [];

        var ids = bookings.Select(b => b.Id).ToList();
        var brokerByBooking = await db.BookingBrokerCharges.AsNoTracking()
            .Where(c => ids.Contains(c.BookingId))
            .GroupBy(c => c.BookingId)
            .Select(g => new { g.Key, Total = g.Sum(c => c.Amount) })
            .ToDictionaryAsync(x => x.Key, x => x.Total, ct);
        var expenseByBooking = await db.BookingExpenses.AsNoTracking()
            .Where(e => ids.Contains(e.BookingId))
            .GroupBy(e => e.BookingId)
            .Select(g => new { g.Key, Total = g.Sum(e => e.Amount) })
            .ToDictionaryAsync(x => x.Key, x => x.Total, ct);

        var lrs = await db.LorryReceipts.AsNoTracking()
            .Where(l => l.BookingId != null && ids.Contains(l.BookingId))
            .Select(l => new { l.BookingId, l.LrNumber, l.Freight, l.Gst })
            .ToListAsync(ct);
        var lrFreightByBooking = lrs
            .GroupBy(l => l.BookingId!)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.Freight + x.Gst));
        var lrNumbers = lrs.Select(l => l.LrNumber).Distinct().ToList();
        var lrExpenseByNumber = lrNumbers.Count == 0
            ? new Dictionary<string, decimal>()
            : await db.LrExpenses.AsNoTracking()
                .Where(e => lrNumbers.Contains(e.LrNumber) && e.Status != "Rejected")
                .GroupBy(e => e.LrNumber)
                .Select(g => new { g.Key, Total = g.Sum(x => x.Amount) })
                .ToDictionaryAsync(x => x.Key, x => x.Total, ct);
        var lrExpenseByBooking = lrs
            .GroupBy(l => l.BookingId!)
            .ToDictionary(
                g => g.Key,
                g => g.Sum(x => lrExpenseByNumber.TryGetValue(x.LrNumber, out var a) ? a : 0));

        var rows = new List<object>(bookings.Count);
        foreach (var booking in bookings)
        {
            brokerByBooking.TryGetValue(booking.Id, out var brokerCharges);
            expenseByBooking.TryGetValue(booking.Id, out var expenses);
            lrFreightByBooking.TryGetValue(booking.Id, out var lrFreight);
            lrExpenseByBooking.TryGetValue(booking.Id, out var lrExpenses);
            var income = booking.Freight + lrFreight;
            var totalCost = brokerCharges + expenses + lrExpenses;
            var profit = income - totalCost;
            var lrCount = lrs.Count(x => string.Equals(x.BookingId, booking.Id, StringComparison.OrdinalIgnoreCase));
            rows.Add(new
            {
                bookingId = booking.Id,
                bookingDate = booking.BookingDate.ToString("yyyy-MM-dd"),
                customer = booking.CustomerName,
                route = $"{booking.FromCity} → {booking.ToCity}",
                workflow = "booking",
                workflowLabel = "Booking",
                lrCount,
                income,
                bookingFreight = booking.Freight,
                lrFreight,
                brokerCharges,
                expenses,
                lrExpenses,
                totalCost,
                profit,
                marginPercent = income > 0 ? Math.Round(profit / income * 100, 2) : 0
            });
        }
        return rows;
    }

    public static async Task<string> NextBillNoAsync(TmsDbContext db, string billType, CancellationToken ct = default)
    {
        var prefix = billType.ToUpperInvariant() switch
        {
            "RCM" => "RCM-",
            "FC" => "FC-",
            _ => "BILL-"
        };
        var year = DateTime.UtcNow.Year;
        var count = await db.TransportBills
            .CountAsync(b => b.BillType == billType.ToUpperInvariant() && b.BillDate.Year == year, ct);
        return $"{prefix}{year}-{(count + 1):D4}";
    }

    public static async Task<TransportBillBuildResult> BuildTransportBillDataAsync(
        TmsDbContext db,
        Booking booking,
        string billType,
        CancellationToken ct = default)
    {
        var paymentsTotal = await db.BookingPayments
            .Where(p => p.BookingId == booking.Id)
            .SumAsync(p => p.Amount, ct);
        var advance = booking.Advance + paymentsTotal;

        var expenses = await db.BookingExpenses
            .Where(e => e.BookingId == booking.Id)
            .OrderBy(e => e.ExpenseDate)
            .ToListAsync(ct);
        var expenseCategories = expenses.Select(e => e.Category).ToHashSet(StringComparer.OrdinalIgnoreCase);

        var lines = new List<BillLineItem>
        {
            new(
                "Transport freight",
                booking.Freight,
                $"{booking.FromCity} → {booking.ToCity}")
        };

        foreach (var e in expenses)
        {
            var label = string.IsNullOrWhiteSpace(e.Description) ? e.Category : $"{e.Category} · {e.Description}";
            lines.Add(new BillLineItem(label, e.Amount));
        }

        var lr = await db.LorryReceipts.FirstOrDefaultAsync(l => l.BookingId == booking.Id, ct);
        if (lr != null)
        {
            AddLrLineIfMissing(lines, expenseCategories, "Hamali", lr.Hamali);
            AddLrLineIfMissing(lines, expenseCategories, "Loading", lr.LoadingCharges);
            AddLrLineIfMissing(lines, expenseCategories, "Unloading", lr.UnloadingCharges);
            AddLrLineIfMissing(lines, expenseCategories, "Insurance", lr.Insurance);
        }

        var freight = booking.Freight;
        var otherCharges = lines.Skip(1).Sum(l => l.Amount);
        var taxable = freight + otherCharges;
        var gstRate = billType.Equals("RCM", StringComparison.OrdinalIgnoreCase) ? 0.05m : 0.18m;
        var gst = Math.Round(taxable * gstRate, 2);
        var isRcm = billType.Equals("RCM", StringComparison.OrdinalIgnoreCase);
        var grossTotal = isRcm ? taxable : taxable + gst;
        var netPayable = Math.Max(0, grossTotal - advance);

        return new TransportBillBuildResult(
            freight,
            otherCharges,
            taxable,
            gst,
            grossTotal,
            advance,
            booking.Advance,
            paymentsTotal,
            netPayable,
            lines);
    }

    public static async Task RecalculateFreightInvoiceStatusAsync(
        TmsDbContext db, FreightInvoice invoice, CancellationToken ct = default)
    {
        if (invoice.Status == "Cancelled") return;

        var paid = await db.BookingPayments
            .Where(p => p.FreightInvoiceId == invoice.Id)
            .SumAsync(p => p.Amount, ct);

        var pendingAdded = db.ChangeTracker.Entries<BookingPayment>()
            .Where(e => e.State == EntityState.Added && e.Entity.FreightInvoiceId == invoice.Id)
            .Sum(e => e.Entity.Amount);
        paid += pendingAdded;

        invoice.AmountPaid = paid;
        invoice.Balance = Math.Max(0, invoice.TotalAmount - paid);
        invoice.Status = invoice.Balance <= 0 ? "Paid" : paid > 0 ? "Partial" : "Issued";
        invoice.UpdatedAt = DateTime.UtcNow;
    }

    public static async Task SyncFreightInvoiceFromPaymentAsync(
        TmsDbContext db, Guid? freightInvoiceId, CancellationToken ct = default)
    {
        if (freightInvoiceId == null) return;
        var inv = await db.FreightInvoices.FindAsync([freightInvoiceId.Value], ct);
        if (inv == null) return;
        await RecalculateFreightInvoiceStatusAsync(db, inv, ct);
    }

    static void AddLrLineIfMissing(
        List<BillLineItem> lines,
        HashSet<string> expenseCategories,
        string category,
        decimal? amount)
    {
        if (amount is null or <= 0) return;
        if (expenseCategories.Contains(category)) return;
        lines.Add(new BillLineItem($"{category} charges", amount.Value));
    }
}
