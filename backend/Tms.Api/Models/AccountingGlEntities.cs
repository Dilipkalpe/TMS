namespace Tms.Api.Models;

public static class VoucherStatuses
{
    public const string Draft = "DRAFT";
    public const string Posted = "POSTED";
    public const string Reversed = "REVERSED";
}

public static class AccountingSourceTypes
{
    public const string CustomerInvoice = "CUSTOMER_INVOICE";
    public const string CustomerReceipt = "CUSTOMER_RECEIPT";
    public const string VendorBill = "VENDOR_BILL";
    public const string VendorPayment = "VENDOR_PAYMENT";
    public const string ExpenseCash = "EXPENSE_CASH";
    public const string ExpenseCredit = "EXPENSE_CREDIT";
    public const string AdvanceReceived = "ADVANCE_RECEIVED";
    public const string AdvancePaid = "ADVANCE_PAID";
    public const string CreditNote = "CREDIT_NOTE";
    public const string DebitNote = "DEBIT_NOTE";
    public const string Journal = "JOURNAL";
    public const string Contra = "CONTRA";
    public const string OpeningBalance = "OPENING_BALANCE";
    public const string TdsPayable = "TDS_PAYABLE";
    public const string TdsReceivable = "TDS_RECEIVABLE";
    public const string Manual = "MANUAL";
    public const string BookingExpense = "BOOKING_EXPENSE";
    public const string LrExpense = "LR_EXPENSE";
    public const string Provision = "PROVISION";
    public const string BrokerCharge = "BROKER_CHARGE";
}

public static class AccountingTxnTypes
{
    public const string CustomerInvoice = "CUSTOMER_INVOICE";
    public const string CustomerReceipt = "CUSTOMER_RECEIPT";
    public const string VendorBill = "VENDOR_BILL";
    public const string VendorPayment = "VENDOR_PAYMENT";
    public const string ExpenseCash = "EXPENSE_CASH";
    public const string ExpenseCredit = "EXPENSE_CREDIT";
    public const string AdvanceReceived = "ADVANCE_RECEIVED";
    public const string AdvancePaid = "ADVANCE_PAID";
    public const string CreditNote = "CREDIT_NOTE";
    public const string DebitNote = "DEBIT_NOTE";
    public const string Journal = "JOURNAL";
    public const string Contra = "CONTRA";
    public const string BookingExpense = "BOOKING_EXPENSE";
    public const string LrExpense = "LR_EXPENSE";
    public const string Provision = "PROVISION";
    public const string BrokerCharge = "BROKER_CHARGE";
}

public class AccountGroup : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public string AccountType { get; set; } = "";
    public Guid? ParentId { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
}

public class FinancialYear : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string Code { get; set; } = "";
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public bool IsClosed { get; set; }
    public DateTime CreatedAt { get; set; }
    public ICollection<AccountingPeriod> Periods { get; set; } = [];
}

public class AccountingPeriod : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid FinancialYearId { get; set; }
    public FinancialYear? FinancialYear { get; set; }
    public int PeriodNo { get; set; }
    public string Name { get; set; } = "";
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public bool IsLocked { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CostCentre : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
}

public class AccountingSettings
{
    public Guid CompanyId { get; set; }
    public bool GlReportsEnabled { get; set; }
    public bool RequireApproval { get; set; }
    public bool AutoPostOps { get; set; } = true;
    public Guid? DefaultCashLedgerId { get; set; }
    public Guid? DefaultBankLedgerId { get; set; }
    public Guid? ArControlLedgerId { get; set; }
    public Guid? ApControlLedgerId { get; set; }
    public Guid? FreightIncomeLedgerId { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class AccountPostingMap : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string TxnType { get; set; } = "";
    public Guid? DebitLedgerId { get; set; }
    public Guid? CreditLedgerId { get; set; }
    public Guid? TaxLedgerId { get; set; }
    public Guid? TdsLedgerId { get; set; }
    public Guid? SecondaryLedgerId { get; set; }
    public string? ExtrasJson { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime UpdatedAt { get; set; }
}

public class VendorBill : ITenantScoped, IAuditable
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid? BranchId { get; set; }
    public string BillNo { get; set; } = "";
    public DateOnly BillDate { get; set; }
    public string VendorId { get; set; } = "";
    public string? VendorName { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal CgstAmount { get; set; }
    public decimal SgstAmount { get; set; }
    public decimal IgstAmount { get; set; }
    public decimal TdsAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal AmountPaid { get; set; }
    public decimal Balance { get; set; }
    public Guid? ExpenseAccountId { get; set; }
    public Guid? CostCentreId { get; set; }
    public string? ReferenceNo { get; set; }
    public string? Narration { get; set; }
    public string Status { get; set; } = "POSTED";
    public Guid? AccountingVoucherId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
    public ICollection<VendorBillLine> Lines { get; set; } = [];
}

public class VendorBillLine : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid VendorBillId { get; set; }
    public VendorBill? VendorBill { get; set; }
    public int LineNo { get; set; }
    public string? Description { get; set; }
    public Guid? LedgerAccountId { get; set; }
    public decimal Amount { get; set; }
    public decimal TaxAmount { get; set; }
}

public class VendorBillSettlement : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid VendorBillId { get; set; }
    public Guid? VendorPaymentId { get; set; }
    public decimal Amount { get; set; }
    public DateOnly SettlementDate { get; set; }
    public Guid? AccountingVoucherId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreditDebitNote : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid? BranchId { get; set; }
    public string NoteNo { get; set; } = "";
    public DateOnly NoteDate { get; set; }
    public string NoteType { get; set; } = "CREDIT";
    public string PartyType { get; set; } = "CUSTOMER";
    public string PartyId { get; set; } = "";
    public string? PartyName { get; set; }
    public Guid? InvoiceId { get; set; }
    public Guid? VendorBillId { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string? Narration { get; set; }
    public string Status { get; set; } = "POSTED";
    public Guid? AccountingVoucherId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
}

public class BankAccount : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid LedgerAccountId { get; set; }
    public string BankName { get; set; } = "";
    public string? AccountNo { get; set; }
    public string? Ifsc { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
}

public class BankReconciliation : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid BankAccountId { get; set; }
    public DateOnly StatementDate { get; set; }
    public decimal StatementBalance { get; set; }
    public decimal BookBalance { get; set; }
    public string Status { get; set; } = "OPEN";
    public DateTime CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
}

public class BankReconciliationLine : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid BankReconciliationId { get; set; }
    public Guid? VoucherLineId { get; set; }
    public string? StatementRef { get; set; }
    public decimal Amount { get; set; }
    public bool IsMatched { get; set; }
    public DateTime? MatchedAt { get; set; }
}

public class AccountingAuditLog : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string EntityType { get; set; } = "";
    public string EntityId { get; set; } = "";
    public string Action { get; set; } = "";
    public string? Details { get; set; }
    public string? UserName { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AccountingReconciliationFinding : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string FindingType { get; set; } = "";
    public string? SourceType { get; set; }
    public string? SourceId { get; set; }
    public Guid? VoucherId { get; set; }
    public decimal? AmountOps { get; set; }
    public decimal? AmountGl { get; set; }
    public string? Message { get; set; }
    public string Status { get; set; } = "OPEN";
    public DateTime CreatedAt { get; set; }
}

/// <summary>Local e-Invoice register (manual IRN/Ack from NIC — no portal API).</summary>
public class EInvoiceRegister : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid FreightInvoiceId { get; set; }
    public string InvoiceNo { get; set; } = "";
    public DateOnly InvoiceDate { get; set; }
    public string? CustomerName { get; set; }
    public string? Gstin { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string? Irn { get; set; }
    public string? AckNo { get; set; }
    public DateOnly? AckDate { get; set; }
    public string Status { get; set; } = "READY";
    public string? Remarks { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
}

public record PostingLine(
    Guid LedgerAccountId,
    string LedgerName,
    decimal Debit,
    decimal Credit,
    string? Narration = null,
    Guid? CostCentreId = null,
    string? PartyType = null,
    string? PartyId = null);

public record PostingRequest(
    string VoucherType,
    DateOnly TransactionDate,
    DateOnly? PostingDate,
    string? PartyName,
    string? Mode,
    string? Narration,
    string? ReferenceNo,
    string? SourceType,
    string? SourceId,
    Guid? BranchId,
    Guid? CostCentreId,
    IReadOnlyList<PostingLine> Lines,
    string? CreatedBy = null,
    bool AsDraft = false);
