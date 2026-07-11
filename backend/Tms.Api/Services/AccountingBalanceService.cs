using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public static class AccountingBalanceService
{
    static readonly string[] BankPaymentModes = ["NEFT", "RTGS", "Cheque", "Bank Transfer", "UPI"];

    public static async Task<decimal> GetCashBalanceAsync(TmsDbContext db, ITenantContext tenants, CancellationToken ct = default)
    {
        var receipts = await tenants.Filter(db.BookingPayments.AsQueryable())
            .Where(p => p.PaymentMode == "Cash")
            .SumAsync(p => p.Amount, ct);
        receipts += await tenants.Filter(db.Vouchers.AsQueryable())
            .Where(v => v.VoucherType == "Receipt" && v.Mode == "Cash")
            .SumAsync(v => v.TotalAmount, ct);

        var payments = await tenants.Filter(db.Vouchers.AsQueryable())
            .Where(v => v.VoucherType == "Payment" && v.Mode == "Cash")
            .SumAsync(v => v.TotalAmount, ct);
        payments += await tenants.Filter(db.Expenses.AsQueryable())
            .Where(e => e.PaymentMode == "Cash")
            .SumAsync(e => e.Amount, ct);

        return receipts - payments;
    }

    public static async Task<decimal> GetBankBalanceAsync(TmsDbContext db, ITenantContext tenants, CancellationToken ct = default)
    {
        var receipts = await tenants.Filter(db.BookingPayments.AsQueryable())
            .Where(p => BankPaymentModes.Contains(p.PaymentMode))
            .SumAsync(p => p.Amount, ct);
        receipts += await tenants.Filter(db.Vouchers.AsQueryable())
            .Where(v => v.VoucherType == "Receipt" && v.Mode != null && BankPaymentModes.Contains(v.Mode))
            .SumAsync(v => v.TotalAmount, ct);

        var payments = await tenants.Filter(db.Vouchers.AsQueryable())
            .Where(v => v.VoucherType == "Payment" && v.Mode != null && BankPaymentModes.Contains(v.Mode))
            .SumAsync(v => v.TotalAmount, ct);
        payments += await tenants.Filter(db.Expenses.AsQueryable())
            .Where(e => e.PaymentMode != null && BankPaymentModes.Contains(e.PaymentMode))
            .SumAsync(e => e.Amount, ct);

        return receipts - payments;
    }

    public static async Task<List<object>> BuildCashBookAsync(TmsDbContext db, ITenantContext tenants, CancellationToken ct = default)
    {
        var lines = new List<(DateOnly Date, decimal Receipt, decimal Payment, string Particular)>();

        foreach (var p in await tenants.Filter(db.BookingPayments.AsQueryable()).Where(x => x.PaymentMode == "Cash").ToListAsync(ct))
            lines.Add((p.PaymentDate, p.Amount, 0, $"Booking payment · {p.BookingId}"));

        foreach (var v in await tenants.Filter(db.Vouchers.AsQueryable()).Where(x => x.Mode == "Cash").OrderBy(x => x.VoucherDate).ToListAsync(ct))
        {
            if (v.VoucherType == "Receipt")
                lines.Add((v.VoucherDate, v.TotalAmount, 0, v.Narration ?? v.PartyName ?? v.VoucherType));
            else if (v.VoucherType == "Payment")
                lines.Add((v.VoucherDate, 0, v.TotalAmount, v.Narration ?? v.PartyName ?? v.VoucherType));
        }

        foreach (var e in await tenants.Filter(db.Expenses.AsQueryable()).Where(x => x.PaymentMode == "Cash").ToListAsync(ct))
            lines.Add((e.ExpenseDate, 0, e.Amount, e.Description ?? e.Category));

        return RunningBalance(lines);
    }

    public static async Task<List<object>> BuildBankBookAsync(TmsDbContext db, ITenantContext tenants, CancellationToken ct = default)
    {
        var lines = new List<(DateOnly Date, decimal Receipt, decimal Payment, string Particular)>();

        foreach (var p in await tenants.Filter(db.BookingPayments.AsQueryable()).Where(x => BankPaymentModes.Contains(x.PaymentMode)).ToListAsync(ct))
            lines.Add((p.PaymentDate, p.Amount, 0, $"Booking payment · {p.BookingId} · {p.PaymentMode}"));

        foreach (var v in await tenants.Filter(db.Vouchers.AsQueryable()).Where(x => x.Mode != null && BankPaymentModes.Contains(x.Mode)).OrderBy(x => x.VoucherDate).ToListAsync(ct))
        {
            if (v.VoucherType == "Receipt")
                lines.Add((v.VoucherDate, v.TotalAmount, 0, v.Narration ?? v.PartyName ?? v.VoucherType));
            else if (v.VoucherType == "Payment")
                lines.Add((v.VoucherDate, 0, v.TotalAmount, v.Narration ?? v.PartyName ?? v.VoucherType));
        }

        foreach (var e in await tenants.Filter(db.Expenses.AsQueryable()).Where(x => x.PaymentMode != null && BankPaymentModes.Contains(x.PaymentMode)).ToListAsync(ct))
            lines.Add((e.ExpenseDate, 0, e.Amount, e.Description ?? e.Category));

        return RunningBalance(lines, depositKey: true);
    }

    static List<object> RunningBalance(List<(DateOnly Date, decimal Receipt, decimal Payment, string Particular)> lines, bool depositKey = false)
    {
        decimal balance = 0;
        return lines
            .OrderBy(l => l.Date)
            .Select(l =>
            {
                balance += l.Receipt - l.Payment;
                if (depositKey)
                    return (object)new { date = l.Date.ToString("yyyy-MM-dd"), deposit = l.Receipt, withdrawal = l.Payment, balance, particular = l.Particular };
                return new { date = l.Date.ToString("yyyy-MM-dd"), receipt = l.Receipt, payment = l.Payment, balance, particular = l.Particular };
            })
            .ToList();
    }
}
