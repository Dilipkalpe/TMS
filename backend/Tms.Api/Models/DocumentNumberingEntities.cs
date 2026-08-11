namespace Tms.Api.Models;

public static class DocumentNumberTypes
{
    public const string Booking = "Booking";
    public const string Quotation = "Quotation";
    public const string LR = "LR";
    public const string Trip = "Trip";
    public const string Invoice = "Invoice";
    public const string Receipt = "Receipt";
    public const string Pod = "Pod";
    public const string LoadingSheet = "LoadingSheet";
    public const string TransitPass = "TransitPass";
    public const string DeliverySheet = "DeliverySheet";
    public const string HubManifest = "HubManifest";

    public static readonly IReadOnlyList<string> All =
    [
        Booking, Quotation, LR, Trip, Invoice, Receipt, Pod,
        LoadingSheet, TransitPass, DeliverySheet, HubManifest,
    ];

    public static string DefaultPrefix(string documentType) => documentType switch
    {
        Booking => "BKG",
        Quotation => "QTN",
        LR => "LR",
        Trip => "TRP",
        Invoice => "INV",
        Receipt => "RCP",
        Pod => "POD",
        LoadingSheet => "LS",
        TransitPass => "TP",
        DeliverySheet => "DS",
        HubManifest => "HM",
        _ => documentType.ToUpperInvariant()[..Math.Min(3, documentType.Length)],
    };
}

public static class DocumentNumberResetRules
{
    public const string FinancialYear = "FinancialYear";
    public const string Never = "Never";
}

public class DocumentNumberConfig
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid BranchId { get; set; }
    public string DocumentType { get; set; } = "";
    public string Prefix { get; set; } = "";
    public string FormatPattern { get; set; } = "{company}/{branch}/{fy}/{prefix}/{seq}";
    public string FyFormat { get; set; } = "YY-YY";
    public int RunningNumberLength { get; set; } = 5;
    public string ResetRule { get; set; } = DocumentNumberResetRules.FinancialYear;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class DocumentNumberSequence
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid BranchId { get; set; }
    public string DocumentType { get; set; } = "";
    public string FinancialYear { get; set; } = "";
    public int CurrentNumber { get; set; }
    public DateTime UpdatedAt { get; set; }
}
