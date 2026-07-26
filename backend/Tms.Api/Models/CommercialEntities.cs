namespace Tms.Api.Models;

public class FreightRate : IBranchScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid? BranchId { get; set; }
    public Branch? Branch { get; set; }
    public string? CustomerId { get; set; }
    public string FromCity { get; set; } = "";
    public string ToCity { get; set; } = "";
    public string? VehicleType { get; set; }
    public decimal RateAmount { get; set; }
    public string RateUnit { get; set; } = "PerTrip";
    public DateOnly? ValidFrom { get; set; }
    public DateOnly? ValidTo { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class Quotation : IBranchScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid? BranchId { get; set; }
    public Branch? Branch { get; set; }
    public string QuoteNo { get; set; } = "";
    public string? CustomerId { get; set; }
    public string CustomerName { get; set; } = "";
    public string FromCity { get; set; } = "";
    public string ToCity { get; set; } = "";
    public string? VehicleType { get; set; }
    public decimal Freight { get; set; }
    public DateOnly? ValidUntil { get; set; }
    public string Status { get; set; } = "Draft";
    public string? Notes { get; set; }
    public string? BookingId { get; set; }
    public Guid? FreightRateId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class QuotationLine : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid QuotationId { get; set; }
    public string Description { get; set; } = "";
    public decimal Qty { get; set; } = 1;
    public decimal Rate { get; set; }
    public decimal Amount { get; set; }
    public int SortOrder { get; set; }
}

public class FreightInvoice : IBranchScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid? BranchId { get; set; }
    public Branch? Branch { get; set; }
    public string InvoiceNo { get; set; } = "";
    public string BookingId { get; set; } = "";
    public string? LrNumber { get; set; }
    public string? CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? Gstin { get; set; }
    public string? PlaceOfSupply { get; set; }
    public string BillType { get; set; } = "FC";
    public DateOnly InvoiceDate { get; set; }
    public DateOnly? DueDate { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal GstAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal AdvanceAdjusted { get; set; }
    public decimal AmountPaid { get; set; }
    public decimal Balance { get; set; }
    public string Status { get; set; } = "Issued";
    public string? InvoiceDataJson { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class FreightInvoiceLine : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid FreightInvoiceId { get; set; }
    public string Description { get; set; } = "";
    public decimal Qty { get; set; } = 1;
    public decimal Rate { get; set; }
    public decimal Amount { get; set; }
    public int SortOrder { get; set; }
}
