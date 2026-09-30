using System.Text;
using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services.Accounting;

/// <summary>
/// GSTR-1 / GSTR-3B summaries, Form 26Q export, and local e-Invoice register.
/// Filing portals (GSTN / NIC / TRACES) are out of scope — registers/exports only.
/// </summary>
public class GstComplianceService(TmsDbContext db, ITenantContext tenants, GlReportService reports)
{
    Guid CompanyId => TenantScope.ResolveCompanyId(tenants);

    public async Task<object> Gstr1Async(DateOnly? from, DateOnly? to, CancellationToken ct = default)
    {
        var (fromDate, toDate, companyGstin, companyState, invoices) = await LoadOutwardAsync(from, to, ct);
        var (b2b, b2c, taxableB2b, taxableB2c, igst, cgst, sgst) = BuildGstr1Rows(invoices, companyState);

        return new
        {
            form = "GSTR-1",
            from = fromDate.ToString("yyyy-MM-dd"),
            to = toDate.ToString("yyyy-MM-dd"),
            companyGstin,
            note = "Export register for GST portal upload — not a live GSTN filing.",
            summary = new
            {
                b2bCount = b2b.Count,
                b2cCount = b2c.Count,
                taxableB2b,
                taxableB2c,
                igst,
                cgst,
                sgst,
                totalTax = igst + cgst + sgst,
            },
            b2b,
            b2c,
        };
    }

    public async Task<object> Gstr3bAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default)
    {
        var (fromDate, toDate, _, companyState, invoices) = await LoadOutwardAsync(from, to, ct);
        var (_, _, taxableB2b, taxableB2c, outIgst, outCgst, outSgst) = BuildGstr1Rows(invoices, companyState);
        var outTaxable = taxableB2b + taxableB2c;

        var glTaxes = await reports.GstSummaryAsync(fromDate, toDate, ct);

        var vendorBills = await db.VendorBills.AsNoTracking()
            .Where(b => b.CompanyId == CompanyId && b.BillDate >= fromDate && b.BillDate <= toDate)
            .ToListAsync(ct);

        var inwardTaxable = vendorBills.Sum(b => b.TaxableAmount);
        var inwardIgst = vendorBills.Sum(b => b.IgstAmount);
        var inwardCgst = vendorBills.Sum(b => b.CgstAmount);
        var inwardSgst = vendorBills.Sum(b => b.SgstAmount);

        return new
        {
            form = "GSTR-3B",
            from = fromDate.ToString("yyyy-MM-dd"),
            to = toDate.ToString("yyyy-MM-dd"),
            note = "Summary worksheet for GSTR-3B — verify before portal filing.",
            outwardSupplies = new
            {
                taxable = outTaxable,
                igst = outIgst,
                cgst = outCgst,
                sgst = outSgst,
                totalTax = outIgst + outCgst + outSgst,
            },
            inwardSupplies = new
            {
                taxable = inwardTaxable,
                igst = inwardIgst,
                cgst = inwardCgst,
                sgst = inwardSgst,
                totalTax = inwardIgst + inwardCgst + inwardSgst,
                billCount = vendorBills.Count,
            },
            itcEligible = new { igst = inwardIgst, cgst = inwardCgst, sgst = inwardSgst },
            netTaxPayable = new
            {
                igst = Math.Max(0, outIgst - inwardIgst),
                cgst = Math.Max(0, outCgst - inwardCgst),
                sgst = Math.Max(0, outSgst - inwardSgst),
            },
            glTaxLedgers = glTaxes,
        };
    }

    public async Task<object> Form26qAsync(DateOnly? from, DateOnly? to, string? financialYear = null, CancellationToken ct = default)
    {
        var (fromDate, toDate) = ResolvePeriod(from, to);
        var q = db.TdsTransactions.AsNoTracking().Include(t => t.Section)
            .Where(t => t.CompanyId == CompanyId
                && t.Direction == TdsDirections.Payable
                && t.Status != TdsTxnStatuses.Reversed
                && t.TransactionDate >= fromDate && t.TransactionDate <= toDate);
        if (!string.IsNullOrWhiteSpace(financialYear))
            q = q.Where(t => t.FinancialYear == financialYear);

        var rows = await q.OrderBy(t => t.TransactionDate).Select(t => new
        {
            txnId = t.Id,
            date = t.TransactionDate.ToString("yyyy-MM-dd"),
            section = t.Section != null ? t.Section.SectionCode : "",
            sectionName = t.Section != null ? t.Section.Name : "",
            partyName = t.PartyName,
            partyPan = t.PartyPan,
            partyType = t.PartyType,
            ratePercent = t.RatePercent,
            baseAmount = t.BaseAmount,
            tdsAmount = t.TdsAmount,
            sourceRef = t.SourceRef,
            financialYear = t.FinancialYear,
            status = t.Status,
        }).ToListAsync(ct);

        var bySection = rows
            .GroupBy(r => r.section)
            .Select(g => new
            {
                section = g.Key,
                count = g.Count(),
                baseAmount = g.Sum(x => x.baseAmount),
                tdsAmount = g.Sum(x => x.tdsAmount),
            })
            .OrderBy(x => x.section)
            .ToList();

        return new
        {
            form = "26Q",
            from = fromDate.ToString("yyyy-MM-dd"),
            to = toDate.ToString("yyyy-MM-dd"),
            note = "TDS payable register for Form 26Q / TRACES — not a live e-filing submission.",
            summary = new
            {
                txnCount = rows.Count,
                baseAmount = rows.Sum(r => r.baseAmount),
                tdsAmount = rows.Sum(r => r.tdsAmount),
                bySection,
            },
            rows,
        };
    }

    public async Task<(string Csv, string FileName)> BuildForm26qCsvAsync(DateOnly? from, DateOnly? to, CancellationToken ct = default)
    {
        var (fromDate, toDate) = ResolvePeriod(from, to);
        var rows = await db.TdsTransactions.AsNoTracking().Include(t => t.Section)
            .Where(t => t.CompanyId == CompanyId
                && t.Direction == TdsDirections.Payable
                && t.Status != TdsTxnStatuses.Reversed
                && t.TransactionDate >= fromDate && t.TransactionDate <= toDate)
            .OrderBy(t => t.TransactionDate)
            .ToListAsync(ct);

        var sb = new StringBuilder();
        sb.AppendLine("Date,Section,PartyName,PAN,PartyType,Rate%,BaseAmount,TDSAmount,SourceRef,FY,Status");
        foreach (var t in rows)
        {
            sb.AppendLine(string.Join(",",
                EscapeCsv(t.TransactionDate.ToString("yyyy-MM-dd")),
                EscapeCsv(t.Section?.SectionCode ?? ""),
                EscapeCsv(t.PartyName ?? ""),
                EscapeCsv(t.PartyPan ?? ""),
                EscapeCsv(t.PartyType),
                t.RatePercent.ToString("0.##"),
                t.BaseAmount.ToString("0.00"),
                t.TdsAmount.ToString("0.00"),
                EscapeCsv(t.SourceRef ?? ""),
                EscapeCsv(t.FinancialYear),
                EscapeCsv(t.Status)));
        }
        return (sb.ToString(), $"Form26Q_{fromDate:yyyyMMdd}_{toDate:yyyyMMdd}.csv");
    }

    public async Task<object> ListEInvoicesAsync(CancellationToken ct = default)
    {
        var regs = await db.EInvoiceRegisters.AsNoTracking()
            .Where(e => e.CompanyId == CompanyId)
            .OrderByDescending(e => e.CreatedAt)
            .Take(500)
            .ToListAsync(ct);

        var invIds = regs.Select(r => r.FreightInvoiceId).ToHashSet();
        var pending = await db.FreightInvoices.AsNoTracking()
            .Where(i => i.CompanyId == CompanyId && i.Status != "Cancelled" && !invIds.Contains(i.Id)
                && i.TotalAmount > 0)
            .OrderByDescending(i => i.InvoiceDate)
            .Take(100)
            .Select(i => new
            {
                invoiceId = i.Id,
                invoiceNo = i.InvoiceNo,
                invoiceDate = i.InvoiceDate.ToString("yyyy-MM-dd"),
                customerName = i.CustomerName,
                gstin = i.Gstin,
                totalAmount = i.TotalAmount,
                status = "NOT_REGISTERED",
            })
            .ToListAsync(ct);

        return new
        {
            note = "Local e-Invoice register. Enter IRN/Ack from NIC portal manually — no NIC API integration.",
            registered = regs.Select(r => new
            {
                r.Id,
                invoiceId = r.FreightInvoiceId,
                invoiceNo = r.InvoiceNo,
                invoiceDate = r.InvoiceDate.ToString("yyyy-MM-dd"),
                customerName = r.CustomerName,
                gstin = r.Gstin,
                taxableAmount = r.TaxableAmount,
                taxAmount = r.TaxAmount,
                totalAmount = r.TotalAmount,
                irn = r.Irn,
                ackNo = r.AckNo,
                ackDate = r.AckDate?.ToString("yyyy-MM-dd"),
                status = r.Status,
                remarks = r.Remarks,
            }),
            pending,
        };
    }

    public async Task<object> RegisterEInvoiceAsync(Guid freightInvoiceId, Dictionary<string, object?> body, string? user, CancellationToken ct = default)
    {
        var inv = await db.FreightInvoices.FirstOrDefaultAsync(i => i.Id == freightInvoiceId && i.CompanyId == CompanyId, ct)
            ?? throw new InvalidOperationException("Freight invoice not found.");

        var existing = await db.EInvoiceRegisters.FirstOrDefaultAsync(e => e.FreightInvoiceId == freightInvoiceId && e.CompanyId == CompanyId, ct);
        if (existing == null)
        {
            existing = new EInvoiceRegister
            {
                Id = Guid.NewGuid(),
                CompanyId = CompanyId,
                FreightInvoiceId = inv.Id,
                InvoiceNo = inv.InvoiceNo,
                InvoiceDate = inv.InvoiceDate,
                CustomerName = inv.CustomerName,
                Gstin = inv.Gstin,
                TaxableAmount = inv.TaxableAmount,
                TaxAmount = inv.GstAmount,
                TotalAmount = inv.TotalAmount,
                Status = "READY",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = user,
            };
            db.EInvoiceRegisters.Add(existing);
        }

        if (body.TryGetValue("irn", out var irn) && irn != null)
            existing.Irn = irn.ToString();
        if (body.TryGetValue("ackNo", out var ack) && ack != null)
            existing.AckNo = ack.ToString();
        if (body.TryGetValue("ackDate", out var ad) && DateOnly.TryParse(ad?.ToString(), out var ackDate))
            existing.AckDate = ackDate;
        if (body.TryGetValue("remarks", out var rem) && rem != null)
            existing.Remarks = rem.ToString();
        if (body.TryGetValue("status", out var st) && !string.IsNullOrWhiteSpace(st?.ToString()))
            existing.Status = st!.ToString()!;
        else if (!string.IsNullOrWhiteSpace(existing.Irn))
            existing.Status = "GENERATED";

        existing.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return new { existing.Id, existing.InvoiceNo, existing.Irn, existing.AckNo, existing.Status };
    }

    async Task<(DateOnly From, DateOnly To, string CompanyGstin, string? CompanyState, List<FreightInvoice> Invoices)> LoadOutwardAsync(
        DateOnly? from, DateOnly? to, CancellationToken ct)
    {
        var (fromDate, toDate) = ResolvePeriod(from, to);
        var company = await db.Companies.AsNoTracking().FirstOrDefaultAsync(c => c.Id == CompanyId, ct);
        var companyGstin = company?.Gstin ?? "";
        var companyState = StateCode(companyGstin) ?? company?.State;
        var invoices = await db.FreightInvoices.AsNoTracking()
            .Where(i => i.CompanyId == CompanyId
                && i.InvoiceDate >= fromDate && i.InvoiceDate <= toDate
                && i.Status != "Cancelled")
            .OrderBy(i => i.InvoiceDate)
            .ToListAsync(ct);
        return (fromDate, toDate, companyGstin, companyState, invoices);
    }

    static (List<object> B2b, List<object> B2c, decimal TaxableB2b, decimal TaxableB2c, decimal Igst, decimal Cgst, decimal Sgst)
        BuildGstr1Rows(List<FreightInvoice> invoices, string? companyState)
    {
        var b2b = new List<object>();
        var b2c = new List<object>();
        decimal taxableB2b = 0, taxableB2c = 0, igst = 0, cgst = 0, sgst = 0;

        foreach (var inv in invoices)
        {
            var taxable = inv.TaxableAmount > 0 ? inv.TaxableAmount : Math.Max(0, inv.TotalAmount - inv.GstAmount);
            var (i, c, s) = SplitGst(inv.GstAmount, inv.Gstin, companyState, inv.PlaceOfSupply);
            igst += i; cgst += c; sgst += s;

            var row = new
            {
                invoiceNo = inv.InvoiceNo,
                invoiceDate = inv.InvoiceDate.ToString("yyyy-MM-dd"),
                customerName = inv.CustomerName,
                gstin = inv.Gstin,
                placeOfSupply = inv.PlaceOfSupply,
                billType = inv.BillType,
                taxableAmount = taxable,
                igst = i,
                cgst = c,
                sgst = s,
                invoiceValue = inv.TotalAmount,
                invoiceId = inv.Id,
            };

            if (!string.IsNullOrWhiteSpace(inv.Gstin) && inv.Gstin.Length >= 15)
            {
                b2b.Add(row);
                taxableB2b += taxable;
            }
            else
            {
                b2c.Add(row);
                taxableB2c += taxable;
            }
        }
        return (b2b, b2c, taxableB2b, taxableB2c, igst, cgst, sgst);
    }

    static (DateOnly From, DateOnly To) ResolvePeriod(DateOnly? from, DateOnly? to)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var fromDate = from ?? (today.Month >= 4 ? new DateOnly(today.Year, 4, 1) : new DateOnly(today.Year - 1, 4, 1));
        var toDate = to ?? today;
        return (fromDate, toDate);
    }

    static (decimal Igst, decimal Cgst, decimal Sgst) SplitGst(decimal gst, string? partyGstin, string? companyState, string? placeOfSupply)
    {
        if (gst <= 0) return (0, 0, 0);
        var partyState = StateCode(partyGstin);
        var companyCode = StateCodeFromNameOrCode(companyState);
        var posCode = StateCodeFromNameOrCode(placeOfSupply);
        var isInter = true;
        if (partyState != null && companyCode != null)
            isInter = !string.Equals(partyState, companyCode, StringComparison.OrdinalIgnoreCase);
        else if (posCode != null && companyCode != null)
            isInter = !string.Equals(posCode, companyCode, StringComparison.OrdinalIgnoreCase);

        if (isInter) return (Math.Round(gst, 2), 0, 0);
        var half = Math.Round(gst / 2m, 2);
        return (0, half, gst - half);
    }

    static string? StateCode(string? gstin)
    {
        if (string.IsNullOrWhiteSpace(gstin) || gstin.Length < 2) return null;
        return gstin[..2];
    }

    static string? StateCodeFromNameOrCode(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var v = value.Trim();
        if (v.Length >= 2 && char.IsDigit(v[0]) && char.IsDigit(v[1]))
            return v[..2];
        return v;
    }

    static string EscapeCsv(string s)
    {
        if (s.Contains(',') || s.Contains('"') || s.Contains('\n'))
            return $"\"{s.Replace("\"", "\"\"")}\"";
        return s;
    }
}
