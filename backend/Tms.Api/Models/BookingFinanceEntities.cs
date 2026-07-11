namespace Tms.Api.Models;

public class Broker : ITenantScoped
{
    public string Id { get; set; } = "";
    public Guid CompanyId { get; set; }
    public string Name { get; set; } = "";
    public string? Phone { get; set; }
    public string? Gst { get; set; }
    public string? Address { get; set; }
    public decimal Outstanding { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class BookingBrokerCharge : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string BookingId { get; set; } = "";
    public string? BrokerId { get; set; }
    public string BrokerName { get; set; } = "";
    public string ChargeType { get; set; } = "Commission";
    public decimal Amount { get; set; }
    public decimal PaidAmount { get; set; }
    public string? Remarks { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class BookingExpense : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string BookingId { get; set; } = "";
    public DateOnly ExpenseDate { get; set; }
    public string Category { get; set; } = "";
    public string? Description { get; set; }
    public decimal Amount { get; set; }
    public string? VendorId { get; set; }
    public string? VendorName { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class BookingPayment : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string BookingId { get; set; } = "";
    public DateOnly PaymentDate { get; set; }
    public decimal Amount { get; set; }
    public string? PaymentMode { get; set; }
    public string? ReferenceNo { get; set; }
    public string? Remarks { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class Provision : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string ProvisionType { get; set; } = "";
    public string? PartyId { get; set; }
    public string PartyName { get; set; } = "";
    public DateOnly ProvisionDate { get; set; }
    public decimal Amount { get; set; }
    public string? ReferenceNo { get; set; }
    public string? Remarks { get; set; }
    public bool IsReversed { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class TransportBill : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string BillNo { get; set; } = "";
    public string BillType { get; set; } = "";
    public string BookingId { get; set; } = "";
    public DateOnly BillDate { get; set; }
    public string? CustomerName { get; set; }
    public string? Gstin { get; set; }
    public string? PlaceOfSupply { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal GstAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string? BillDataJson { get; set; }
    public DateTime CreatedAt { get; set; }
}
