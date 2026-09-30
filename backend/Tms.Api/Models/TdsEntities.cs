namespace Tms.Api.Models;

public static class TdsDirections
{
    public const string Payable = "PAYABLE";
    public const string Receivable = "RECEIVABLE";
}

public static class TdsTxnStatuses
{
    public const string Posted = "POSTED";
    public const string Reversed = "REVERSED";
}

public static class TdsSourceTypes
{
    public const string VendorPayment = "VENDOR_PAYMENT";
    public const string BookingPayment = "BOOKING_PAYMENT";
    public const string FreightInvoicePayment = "FREIGHT_INVOICE_PAYMENT";
    public const string Expense = "EXPENSE";
    public const string Manual = "MANUAL";
    public const string Reversal = "REVERSAL";
}

public static class TdsRoundOffModes
{
    public const string Nearest = "NEAREST";
    public const string Up = "UP";
    public const string Down = "DOWN";
}

public class TdsSection : ITenantScoped, IAuditable
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string SectionCode { get; set; } = "";
    public string Name { get; set; } = "";
    public string? NatureOfPayment { get; set; }
    public string PartyType { get; set; } = "BOTH";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
}

public class TdsRate : ITenantScoped, IAuditable
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid SectionId { get; set; }
    public TdsSection? Section { get; set; }
    public decimal RatePercent { get; set; }
    public decimal RateWithoutPanPercent { get; set; } = 20;
    public decimal ThresholdAmount { get; set; }
    public string ThresholdType { get; set; } = "TRANSACTION";
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
}

public class TdsExemption : ITenantScoped, IAuditable
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string PartyType { get; set; } = "VENDOR";
    public string PartyId { get; set; } = "";
    public Guid? SectionId { get; set; }
    public TdsSection? Section { get; set; }
    public string? CertificateNo { get; set; }
    public decimal? LowerRatePercent { get; set; }
    public DateOnly ValidFrom { get; set; }
    public DateOnly? ValidTo { get; set; }
    public string? Remarks { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
}

public class TdsSettings : ITenantScoped
{
    public Guid CompanyId { get; set; }
    public bool Enabled { get; set; } = true;
    public string TdsPayableLedgerName { get; set; } = "TDS Payable";
    public string TdsReceivableLedgerName { get; set; } = "TDS Receivable";
    public string RoundOff { get; set; } = TdsRoundOffModes.Nearest;
    public bool AutoPostVoucher { get; set; } = true;
    public DateTime UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
}

public class TdsTransaction : ITenantScoped, IAuditable
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid? BranchId { get; set; }
    public string Direction { get; set; } = TdsDirections.Payable;
    public Guid? SectionId { get; set; }
    public TdsSection? Section { get; set; }
    public decimal RatePercent { get; set; }
    public decimal BaseAmount { get; set; }
    public decimal TdsAmount { get; set; }
    public string PartyType { get; set; } = "VENDOR";
    public string? PartyId { get; set; }
    public string? PartyName { get; set; }
    public string? PartyPan { get; set; }
    public string SourceType { get; set; } = TdsSourceTypes.Manual;
    public string? SourceId { get; set; }
    public string? SourceRef { get; set; }
    public string? PaymentMode { get; set; }
    public DateOnly TransactionDate { get; set; }
    public string FinancialYear { get; set; } = "";
    public Guid? VoucherId { get; set; }
    public string Status { get; set; } = TdsTxnStatuses.Posted;
    public Guid? ReversedByTxnId { get; set; }
    public Guid? ReversalOfTxnId { get; set; }
    public string? Narration { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
}

public class VendorPayment : ITenantScoped, IAuditable
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid? BranchId { get; set; }
    public string PaymentNo { get; set; } = "";
    public DateOnly PaymentDate { get; set; }
    public string VendorId { get; set; } = "";
    public Vendor? Vendor { get; set; }
    public decimal GrossAmount { get; set; }
    public decimal TdsAmount { get; set; }
    public decimal NetAmount { get; set; }
    public Guid? TdsSectionId { get; set; }
    public TdsSection? TdsSection { get; set; }
    public decimal? TdsRatePercent { get; set; }
    public Guid? TdsTransactionId { get; set; }
    public string? PaymentMode { get; set; }
    public string? ReferenceNo { get; set; }
    public string? Narration { get; set; }
    public string? ExpenseId { get; set; }
    public Guid? BookingExpenseId { get; set; }
    public string Status { get; set; } = "POSTED";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
}
