using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.DTOs;
using Tms.Api.Models;
using Tms.Api.Services;
using Tms.Api.Services.Accounting;

namespace Tms.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/gl")]
public class GlAccountingController(
    TmsDbContext db,
    ITenantContext tenants,
    IBranchContext branches,
    AccountingPostingEngine engine,
    GlOpsPostingService opsPosting,
    GlReportService reports,
    GstComplianceService compliance,
    AccountingMigrationService migration) : ControllerBase
{
    Guid CompanyId => TenantScope.ResolveCompanyId(tenants);

    [HttpGet("settings")]
    public async Task<ActionResult<object>> Settings()
    {
        var s = await engine.GetOrCreateSettingsAsync();
        return Ok(new
        {
            glReportsEnabled = s.GlReportsEnabled,
            requireApproval = s.RequireApproval,
            autoPostOps = s.AutoPostOps,
            defaultCashLedgerId = s.DefaultCashLedgerId,
            defaultBankLedgerId = s.DefaultBankLedgerId,
            arControlLedgerId = s.ArControlLedgerId,
            apControlLedgerId = s.ApControlLedgerId,
            freightIncomeLedgerId = s.FreightIncomeLedgerId,
        });
    }

    [HttpPut("settings")]
    public async Task<ActionResult<object>> UpdateSettings([FromBody] Dictionary<string, object?> body)
    {
        var s = await engine.GetOrCreateSettingsAsync();
        if (body.ContainsKey("glReportsEnabled"))
            s.GlReportsEnabled = body["glReportsEnabled"]?.ToString()?.Equals("true", StringComparison.OrdinalIgnoreCase) == true
                || body["glReportsEnabled"] is bool b && b;
        if (body.ContainsKey("requireApproval"))
            s.RequireApproval = body["requireApproval"]?.ToString()?.Equals("true", StringComparison.OrdinalIgnoreCase) == true
                || body["requireApproval"] is bool ra && ra;
        if (body.ContainsKey("autoPostOps"))
            s.AutoPostOps = body["autoPostOps"]?.ToString()?.Equals("true", StringComparison.OrdinalIgnoreCase) == true
                || body["autoPostOps"] is bool ap && ap;
        s.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return await Settings();
    }

    [HttpGet("account-groups")]
    public async Task<ActionResult<object>> Groups() =>
        Ok(await db.AccountGroups.AsNoTracking().Where(g => g.CompanyId == CompanyId).OrderBy(g => g.SortOrder).Select(g => new
        { g.Id, g.Code, g.Name, g.AccountType, g.ParentId, g.IsActive }).ToListAsync());

    [HttpGet("financial-years")]
    public async Task<ActionResult<object>> FinancialYears() =>
        Ok(await db.FinancialYears.AsNoTracking().Include(f => f.Periods).Where(f => f.CompanyId == CompanyId)
            .OrderByDescending(f => f.StartDate)
            .Select(f => new
            {
                f.Id, f.Code, startDate = f.StartDate.ToString("yyyy-MM-dd"), endDate = f.EndDate.ToString("yyyy-MM-dd"), f.IsClosed,
                periods = f.Periods.OrderBy(p => p.PeriodNo).Select(p => new
                {
                    p.Id, p.PeriodNo, p.Name, startDate = p.StartDate.ToString("yyyy-MM-dd"), endDate = p.EndDate.ToString("yyyy-MM-dd"), p.IsLocked,
                }),
            }).ToListAsync());

    [HttpPost("periods/{id:guid}/lock")]
    public async Task<ActionResult<object>> LockPeriod(Guid id, [FromBody] Dictionary<string, object?>? body)
    {
        var p = await db.AccountingPeriods.FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == CompanyId);
        if (p == null) return NotFound();
        var locked = body?.GetValueOrDefault("locked")?.ToString()?.Equals("true", StringComparison.OrdinalIgnoreCase) != false;
        if (body?.ContainsKey("locked") == true)
            locked = body["locked"]?.ToString()?.Equals("true", StringComparison.OrdinalIgnoreCase) == true || body["locked"] is bool b && b;
        p.IsLocked = locked;
        await db.SaveChangesAsync();
        db.AccountingAuditLogs.Add(new AccountingAuditLog
        {
            Id = Guid.NewGuid(), CompanyId = CompanyId, EntityType = "Period", EntityId = id.ToString("N"),
            Action = locked ? "LOCK" : "UNLOCK", UserName = User.Identity?.Name, CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
        return Ok(new { p.Id, p.IsLocked });
    }

    [HttpGet("cost-centres")]
    public async Task<ActionResult<object>> CostCentres() =>
        Ok(await db.CostCentres.AsNoTracking().Where(c => c.CompanyId == CompanyId && c.IsActive)
            .Select(c => new { c.Id, c.Code, c.Name }).ToListAsync());

    [HttpGet("posting-maps")]
    public async Task<ActionResult<object>> PostingMaps() =>
        Ok(await db.AccountPostingMaps.AsNoTracking().Where(m => m.CompanyId == CompanyId)
            .Select(m => new
            {
                m.Id, m.TxnType, m.DebitLedgerId, m.CreditLedgerId, m.TaxLedgerId, m.TdsLedgerId, m.SecondaryLedgerId, m.IsActive,
            }).ToListAsync());

    [HttpPut("posting-maps/{txnType}")]
    public async Task<ActionResult<object>> UpdateMap(string txnType, [FromBody] Dictionary<string, object?> body)
    {
        var m = await db.AccountPostingMaps.FirstOrDefaultAsync(x => x.CompanyId == CompanyId && x.TxnType == txnType);
        if (m == null)
        {
            m = new AccountPostingMap { Id = Guid.NewGuid(), CompanyId = CompanyId, TxnType = txnType, IsActive = true };
            db.AccountPostingMaps.Add(m);
        }
        if (Guid.TryParse(body.GetValueOrDefault("debitLedgerId")?.ToString(), out var d)) m.DebitLedgerId = d;
        if (Guid.TryParse(body.GetValueOrDefault("creditLedgerId")?.ToString(), out var c)) m.CreditLedgerId = c;
        if (Guid.TryParse(body.GetValueOrDefault("taxLedgerId")?.ToString(), out var t)) m.TaxLedgerId = t;
        if (Guid.TryParse(body.GetValueOrDefault("tdsLedgerId")?.ToString(), out var td)) m.TdsLedgerId = td;
        m.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { m.Id, m.TxnType });
    }

    [HttpPost("journals")]
    public async Task<ActionResult<object>> CreateJournal([FromBody] Dictionary<string, object?> body)
    {
        try
        {
            var date = DateOnly.TryParse(body.GetValueOrDefault("transactionDate")?.ToString(), out var d)
                ? d : DateOnly.FromDateTime(DateTime.UtcNow);
            var asDraft = body.GetValueOrDefault("asDraft")?.ToString()?.Equals("true", StringComparison.OrdinalIgnoreCase) == true
                || body.GetValueOrDefault("asDraft") is bool ad && ad;
            var linesRaw = body.GetValueOrDefault("lines");
            var lines = new List<PostingLine>();
            if (linesRaw is System.Text.Json.JsonElement je && je.ValueKind == System.Text.Json.JsonValueKind.Array)
            {
                foreach (var item in je.EnumerateArray())
                {
                    var lid = Guid.Parse(item.GetProperty("ledgerAccountId").GetString()!);
                    var debit = item.TryGetProperty("debit", out var dbEl) ? dbEl.GetDecimal() : 0;
                    var credit = item.TryGetProperty("credit", out var crEl) ? crEl.GetDecimal() : 0;
                    var name = item.TryGetProperty("ledgerName", out var n) ? n.GetString() : "";
                    var narr = item.TryGetProperty("narration", out var nr) ? nr.GetString() : null;
                    lines.Add(new PostingLine(lid, name ?? "", debit, credit, narr));
                }
            }
            var v = await engine.PostAsync(new PostingRequest(
                body.GetValueOrDefault("voucherType")?.ToString() ?? "Journal",
                date, date,
                body.GetValueOrDefault("partyName")?.ToString(),
                body.GetValueOrDefault("mode")?.ToString(),
                body.GetValueOrDefault("narration")?.ToString(),
                body.GetValueOrDefault("referenceNo")?.ToString(),
                AccountingSourceTypes.Journal,
                Guid.NewGuid().ToString("N"),
                branches.AssignBranchId,
                Guid.TryParse(body.GetValueOrDefault("costCentreId")?.ToString(), out var cc) ? cc : null,
                lines,
                User.Identity?.Name,
                asDraft), default);
            return Ok(new { v.Id, v.VoucherNo, v.Status, v.TotalAmount });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiError(ex.Message));
        }
    }

    [HttpGet("vouchers")]
    public async Task<ActionResult<object>> ListVouchers([FromQuery] string? status, [FromQuery] string? from, [FromQuery] string? to)
    {
        var q = db.Vouchers.AsNoTracking().Where(v => v.CompanyId == CompanyId);
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(v => v.Status == status);
        if (DateOnly.TryParse(from, out var f)) q = q.Where(v => (v.PostingDate ?? v.VoucherDate) >= f);
        if (DateOnly.TryParse(to, out var t)) q = q.Where(v => (v.PostingDate ?? v.VoucherDate) <= t);
        var rows = await q.OrderByDescending(v => v.PostingDate ?? v.VoucherDate).Take(500)
            .Select(v => new
            {
                v.Id, v.VoucherNo, v.VoucherType, v.Status, v.PartyName, v.TotalAmount, v.Narration, v.ReferenceNo,
                date = (v.PostingDate ?? v.VoucherDate).ToString("yyyy-MM-dd"),
                v.SourceType, v.SourceId, v.CreatedBy, v.ApprovedBy,
            }).ToListAsync();
        return Ok(rows);
    }

    [HttpGet("vouchers/{id:guid}")]
    public async Task<ActionResult<object>> GetVoucher(Guid id)
    {
        var v = await db.Vouchers.AsNoTracking().Include(x => x.Lines)
            .FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == CompanyId);
        if (v == null) return NotFound();
        return Ok(new
        {
            v.Id, v.VoucherNo, v.VoucherType, v.Status, v.PartyName, v.Mode, v.Narration, v.ReferenceNo, v.TotalAmount,
            date = (v.PostingDate ?? v.VoucherDate).ToString("yyyy-MM-dd"),
            v.CreatedBy, v.ApprovedBy, v.SourceType, v.SourceId,
            lines = v.Lines.OrderBy(l => l.LineNo).Select(l => new
            {
                l.LedgerAccountId, l.LedgerName, l.Debit, l.Credit, l.LineNarration, l.PartyType, l.PartyId,
            }),
        });
    }

    [HttpPost("vouchers/{id:guid}/post")]
    public async Task<ActionResult<object>> PostDraft(Guid id)
    {
        try
        {
            var v = await engine.PostDraftAsync(id, User.Identity?.Name);
            return Ok(new { v.Id, v.VoucherNo, v.Status });
        }
        catch (InvalidOperationException ex) { return BadRequest(new ApiError(ex.Message)); }
    }

    [HttpPost("vouchers/{id:guid}/reverse")]
    public async Task<ActionResult<object>> Reverse(Guid id, [FromBody] Dictionary<string, object?>? body)
    {
        try
        {
            var v = await engine.ReverseAsync(id, body?.GetValueOrDefault("remarks")?.ToString(), User.Identity?.Name);
            return Ok(new { v.Id, v.VoucherNo, v.Status });
        }
        catch (InvalidOperationException ex) { return BadRequest(new ApiError(ex.Message)); }
    }

    [HttpGet("reports/trial-balance")]
    public async Task<ActionResult<object>> TrialBalance([FromQuery] string? asOf) =>
        Ok(await reports.TrialBalanceAsync(DateOnly.TryParse(asOf, out var d) ? d : null));

    [HttpGet("reports/profit-loss")]
    public async Task<ActionResult<object>> ProfitLoss([FromQuery] string? from, [FromQuery] string? to) =>
        Ok(await reports.ProfitAndLossAsync(
            DateOnly.TryParse(from, out var f) ? f : null,
            DateOnly.TryParse(to, out var t) ? t : null));

    [HttpGet("reports/balance-sheet")]
    public async Task<ActionResult<object>> BalanceSheet([FromQuery] string? asOf) =>
        Ok(await reports.BalanceSheetAsync(DateOnly.TryParse(asOf, out var d) ? d : null));

    [HttpGet("reports/ledger/{ledgerId:guid}")]
    public async Task<ActionResult<object>> Ledger(Guid ledgerId, [FromQuery] string? from, [FromQuery] string? to) =>
        Ok(await reports.LedgerAsync(ledgerId,
            DateOnly.TryParse(from, out var f) ? f : null,
            DateOnly.TryParse(to, out var t) ? t : null));

    [HttpGet("reports/day-book")]
    public async Task<ActionResult<object>> DayBook([FromQuery] string? date) =>
        Ok(await reports.DayBookAsync(DateOnly.TryParse(date, out var d) ? d : null));

    [HttpGet("reports/gst-summary")]
    public async Task<ActionResult<object>> GstSummary([FromQuery] string? from, [FromQuery] string? to) =>
        Ok(await reports.GstSummaryAsync(
            DateOnly.TryParse(from, out var f) ? f : null,
            DateOnly.TryParse(to, out var t) ? t : null));

    [HttpGet("reports/party-ledger")]
    public async Task<ActionResult<object>> PartyLedger([FromQuery] string partyType, [FromQuery] string partyId, [FromQuery] string? from, [FromQuery] string? to) =>
        Ok(await reports.PartyLedgerAsync(partyType, partyId,
            DateOnly.TryParse(from, out var f) ? f : null,
            DateOnly.TryParse(to, out var t) ? t : null));

    [HttpGet("reports/ageing")]
    public async Task<ActionResult<object>> Ageing([FromQuery] string partyType = "CUSTOMER") =>
        Ok(await reports.AgeingAsync(partyType));

    // Vendor bills
    [HttpGet("vendor-bills")]
    public async Task<ActionResult<object>> VendorBills() =>
        Ok(await db.VendorBills.AsNoTracking().Where(b => b.CompanyId == CompanyId)
            .OrderByDescending(b => b.BillDate).Take(500)
            .Select(b => new
            {
                b.Id, b.BillNo, billDate = b.BillDate.ToString("yyyy-MM-dd"), b.VendorId, b.VendorName,
                b.TaxableAmount, b.TotalAmount, b.AmountPaid, b.Balance, b.Status, b.TdsAmount,
            }).ToListAsync());

    [HttpPost("vendor-bills")]
    public async Task<ActionResult<object>> CreateVendorBill([FromBody] Dictionary<string, object?> body)
    {
        try
        {
            var vendorId = body.GetValueOrDefault("vendorId")?.ToString()
                ?? throw new InvalidOperationException("vendorId required");
            var vendor = await db.Vendors.AsNoTracking().FirstOrDefaultAsync(v => v.Id == vendorId);
            var billDate = DateOnly.TryParse(body.GetValueOrDefault("billDate")?.ToString(), out var bd)
                ? bd : DateOnly.FromDateTime(DateTime.UtcNow);
            var taxable = decimal.TryParse(body.GetValueOrDefault("taxableAmount")?.ToString(), out var ta) ? ta : 0;
            var igst = decimal.TryParse(body.GetValueOrDefault("igstAmount")?.ToString(), out var ig) ? ig : 0;
            var cgst = decimal.TryParse(body.GetValueOrDefault("cgstAmount")?.ToString(), out var cg) ? cg : 0;
            var sgst = decimal.TryParse(body.GetValueOrDefault("sgstAmount")?.ToString(), out var sg) ? sg : 0;
            var tds = decimal.TryParse(body.GetValueOrDefault("tdsAmount")?.ToString(), out var td) ? td : 0;
            var total = taxable + igst + cgst + sgst;
            var count = await db.VendorBills.CountAsync(b => b.CompanyId == CompanyId) + 1;
            var bill = new VendorBill
            {
                Id = Guid.NewGuid(),
                CompanyId = CompanyId,
                BranchId = branches.AssignBranchId,
                BillNo = body.GetValueOrDefault("billNo")?.ToString() ?? $"VB-{billDate:yyyy}- {count:D4}".Replace(" ", ""),
                BillDate = billDate,
                VendorId = vendorId,
                VendorName = vendor?.Name ?? body.GetValueOrDefault("vendorName")?.ToString(),
                TaxableAmount = taxable,
                IgstAmount = igst,
                CgstAmount = cgst,
                SgstAmount = sgst,
                TdsAmount = tds,
                TotalAmount = total,
                Balance = total - tds,
                ExpenseAccountId = Guid.TryParse(body.GetValueOrDefault("expenseAccountId")?.ToString(), out var ea) ? ea : null,
                ReferenceNo = body.GetValueOrDefault("referenceNo")?.ToString(),
                Narration = body.GetValueOrDefault("narration")?.ToString(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = User.Identity?.Name,
            };
            db.VendorBills.Add(bill);
            await db.SaveChangesAsync();
            var voucherId = await opsPosting.TryPostVendorBillAsync(bill, User.Identity?.Name);
            bill.AccountingVoucherId = voucherId;
            await db.SaveChangesAsync();
            return Ok(new { bill.Id, bill.BillNo, bill.TotalAmount, bill.Balance, accountingVoucherId = voucherId });
        }
        catch (InvalidOperationException ex) { return BadRequest(new ApiError(ex.Message)); }
    }

    [HttpPost("credit-debit-notes")]
    public async Task<ActionResult<object>> CreateNote([FromBody] Dictionary<string, object?> body)
    {
        try
        {
            var noteType = body.GetValueOrDefault("noteType")?.ToString()?.ToUpperInvariant() ?? "CREDIT";
            var partyType = body.GetValueOrDefault("partyType")?.ToString()?.ToUpperInvariant() ?? "CUSTOMER";
            var partyId = body.GetValueOrDefault("partyId")?.ToString() ?? throw new InvalidOperationException("partyId required");
            var date = DateOnly.TryParse(body.GetValueOrDefault("noteDate")?.ToString(), out var nd)
                ? nd : DateOnly.FromDateTime(DateTime.UtcNow);
            var taxable = decimal.TryParse(body.GetValueOrDefault("taxableAmount")?.ToString(), out var ta) ? ta : 0;
            var tax = decimal.TryParse(body.GetValueOrDefault("taxAmount")?.ToString(), out var tx) ? tx : 0;
            var count = await db.CreditDebitNotes.CountAsync(n => n.CompanyId == CompanyId) + 1;
            var note = new CreditDebitNote
            {
                Id = Guid.NewGuid(),
                CompanyId = CompanyId,
                BranchId = branches.AssignBranchId,
                NoteNo = body.GetValueOrDefault("noteNo")?.ToString() ?? $"{noteType[0]}N-{date:yyyy}-{count:D4}",
                NoteDate = date,
                NoteType = noteType,
                PartyType = partyType,
                PartyId = partyId,
                PartyName = body.GetValueOrDefault("partyName")?.ToString(),
                TaxableAmount = taxable,
                TaxAmount = tax,
                TotalAmount = taxable + tax,
                Narration = body.GetValueOrDefault("narration")?.ToString(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = User.Identity?.Name,
            };
            db.CreditDebitNotes.Add(note);
            await db.SaveChangesAsync();
            var voucherId = await opsPosting.TryPostCreditDebitNoteAsync(note, User.Identity?.Name);
            note.AccountingVoucherId = voucherId;
            await db.SaveChangesAsync();
            return Ok(new { note.Id, note.NoteNo, note.TotalAmount, accountingVoucherId = voucherId });
        }
        catch (InvalidOperationException ex) { return BadRequest(new ApiError(ex.Message)); }
    }

    [HttpGet("bank-accounts")]
    public async Task<ActionResult<object>> BankAccounts() =>
        Ok(await db.BankAccounts.AsNoTracking().Where(b => b.CompanyId == CompanyId)
            .Select(b => new { b.Id, b.BankName, b.AccountNo, b.Ifsc, b.LedgerAccountId, b.IsActive }).ToListAsync());

    [HttpPost("bank-accounts")]
    public async Task<ActionResult<object>> CreateBankAccount([FromBody] Dictionary<string, object?> body)
    {
        if (!Guid.TryParse(body.GetValueOrDefault("ledgerAccountId")?.ToString(), out var ledId))
            return BadRequest(new ApiError("ledgerAccountId required"));
        var ba = new BankAccount
        {
            Id = Guid.NewGuid(),
            CompanyId = CompanyId,
            LedgerAccountId = ledId,
            BankName = body.GetValueOrDefault("bankName")?.ToString() ?? "Bank",
            AccountNo = body.GetValueOrDefault("accountNo")?.ToString(),
            Ifsc = body.GetValueOrDefault("ifsc")?.ToString(),
            CreatedAt = DateTime.UtcNow,
        };
        db.BankAccounts.Add(ba);
        await db.SaveChangesAsync();
        return Ok(new { ba.Id, ba.BankName });
    }

    [HttpPost("bank-reconciliations")]
    public async Task<ActionResult<object>> CreateRecon([FromBody] Dictionary<string, object?> body)
    {
        if (!Guid.TryParse(body.GetValueOrDefault("bankAccountId")?.ToString(), out var baId))
            return BadRequest(new ApiError("bankAccountId required"));
        var ba = await db.BankAccounts.FirstOrDefaultAsync(b => b.Id == baId && b.CompanyId == CompanyId);
        if (ba == null) return NotFound();
        var stmtDate = DateOnly.TryParse(body.GetValueOrDefault("statementDate")?.ToString(), out var sd)
            ? sd : DateOnly.FromDateTime(DateTime.UtcNow);
        var stmtBal = decimal.TryParse(body.GetValueOrDefault("statementBalance")?.ToString(), out var sb) ? sb : 0;
        var book = await engine.GetLedgerBalanceAsync(ba.LedgerAccountId, stmtDate);
        var recon = new BankReconciliation
        {
            Id = Guid.NewGuid(),
            CompanyId = CompanyId,
            BankAccountId = baId,
            StatementDate = stmtDate,
            StatementBalance = stmtBal,
            BookBalance = book,
            Status = "OPEN",
            CreatedAt = DateTime.UtcNow,
            CreatedBy = User.Identity?.Name,
        };
        db.BankReconciliations.Add(recon);
        await db.SaveChangesAsync();
        return Ok(new { recon.Id, recon.StatementBalance, recon.BookBalance, difference = stmtBal - book });
    }

    [HttpGet("audit-log")]
    public async Task<ActionResult<object>> AuditLog([FromQuery] int take = 200) =>
        Ok(await db.AccountingAuditLogs.AsNoTracking().Where(a => a.CompanyId == CompanyId)
            .OrderByDescending(a => a.CreatedAt).Take(Math.Clamp(take, 1, 1000))
            .Select(a => new { a.EntityType, a.EntityId, a.Action, a.Details, a.UserName, createdAt = a.CreatedAt }).ToListAsync());

    [HttpPost("migration/run")]
    public async Task<ActionResult<object>> RunMigration()
    {
        try
        {
            var result = await migration.RunCurrentFyBackfillAsync(User.Identity?.Name);
            return Ok(result);
        }
        catch (Exception ex) { return BadRequest(new ApiError(ex.Message)); }
    }

    [HttpPost("reconciliation/run")]
    public async Task<ActionResult<object>> RunReconciliation() =>
        Ok(await migration.RunReconciliationAsync());

    [HttpGet("reconciliation/findings")]
    public async Task<ActionResult<object>> Findings() =>
        Ok(await db.AccountingReconciliationFindings.AsNoTracking()
            .Where(f => f.CompanyId == CompanyId && f.Status == "OPEN")
            .OrderByDescending(f => f.CreatedAt).Take(500)
            .Select(f => new { f.FindingType, f.SourceType, f.SourceId, f.AmountOps, f.AmountGl, f.Message }).ToListAsync());

    // Compliance exports (registers — not live portal filing)
    [HttpGet("compliance/gstr1")]
    public async Task<ActionResult<object>> Gstr1([FromQuery] string? from, [FromQuery] string? to) =>
        Ok(await compliance.Gstr1Async(
            DateOnly.TryParse(from, out var f) ? f : null,
            DateOnly.TryParse(to, out var t) ? t : null));

    [HttpGet("compliance/gstr3b")]
    public async Task<ActionResult<object>> Gstr3b([FromQuery] string? from, [FromQuery] string? to) =>
        Ok(await compliance.Gstr3bAsync(
            DateOnly.TryParse(from, out var f) ? f : null,
            DateOnly.TryParse(to, out var t) ? t : null));

    [HttpGet("compliance/form26q")]
    public async Task<ActionResult<object>> Form26q([FromQuery] string? from, [FromQuery] string? to, [FromQuery] string? fy) =>
        Ok(await compliance.Form26qAsync(
            DateOnly.TryParse(from, out var f) ? f : null,
            DateOnly.TryParse(to, out var t) ? t : null,
            fy));

    [HttpGet("compliance/form26q.csv")]
    public async Task<IActionResult> Form26qCsv([FromQuery] string? from, [FromQuery] string? to)
    {
        var (csv, fileName) = await compliance.BuildForm26qCsvAsync(
            DateOnly.TryParse(from, out var f) ? f : null,
            DateOnly.TryParse(to, out var t) ? t : null);
        return File(Encoding.UTF8.GetBytes(csv), "text/csv", fileName);
    }

    [HttpGet("compliance/e-invoices")]
    public async Task<ActionResult<object>> EInvoices() =>
        Ok(await compliance.ListEInvoicesAsync());

    [HttpPost("compliance/e-invoices/{invoiceId:guid}")]
    public async Task<ActionResult<object>> RegisterEInvoice(Guid invoiceId, [FromBody] Dictionary<string, object?> body)
    {
        try
        {
            return Ok(await compliance.RegisterEInvoiceAsync(invoiceId, body ?? new(), User.Identity?.Name));
        }
        catch (InvalidOperationException ex) { return BadRequest(new ApiError(ex.Message)); }
    }
}
