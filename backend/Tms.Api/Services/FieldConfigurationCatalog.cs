namespace Tms.Api.Services;

/// <summary>
/// Canonical seed definitions for configurable Booking and LR fields.
/// Technical names are stable; defaults match current UI labels.
/// </summary>
public static class FieldConfigurationCatalog
{
    public const string ModuleBooking = "Booking";
    public const string ModuleLr = "LR";
    public const int MaxCustomDisplayNameLength = 120;

    public sealed record FieldDef(
        string Module,
        string TechnicalFieldName,
        string DefaultDisplayName,
        bool DefaultVisible,
        bool DefaultRequired,
        int DisplayOrder);

    public static IReadOnlyList<FieldDef> All { get; } =
    [
        // ——— Booking ———
        new(ModuleBooking, "Date", "Booking Date", true, true, 10),
        new(ModuleBooking, "Consignor", "Consignor", true, true, 20),
        new(ModuleBooking, "Consignee", "Consignee", true, true, 30),
        new(ModuleBooking, "From", "From", true, true, 40),
        new(ModuleBooking, "To", "To", true, true, 50),
        new(ModuleBooking, "Material", "Material", true, false, 60),
        new(ModuleBooking, "Quantity", "Quantity", true, false, 70),
        new(ModuleBooking, "Vehicle", "Vehicle", true, false, 80),
        new(ModuleBooking, "Driver", "Driver", true, false, 90),
        new(ModuleBooking, "Freight", "Freight (₹)", true, false, 100),
        new(ModuleBooking, "Advance", "Advance (₹)", true, false, 110),
        new(ModuleBooking, "Payment", "Payment Status", true, false, 120),
        new(ModuleBooking, "Remarks", "Remarks", true, false, 130),

        // ——— LR ———
        new(ModuleLr, "BookingId", "Booking No.", true, false, 10),
        new(ModuleLr, "LrDate", "LR Date", true, true, 20),
        new(ModuleLr, "BusinessType", "Transport Type", true, true, 30),
        new(ModuleLr, "ServiceType", "Service", true, false, 40),
        new(ModuleLr, "Consignor", "Consignor", true, true, 50),
        new(ModuleLr, "Consignee", "Consignee", true, true, 60),
        new(ModuleLr, "BillingParty", "Billing Party", true, false, 70),
        new(ModuleLr, "PickupAddress", "Pickup Address", true, false, 80),
        new(ModuleLr, "From", "Pickup City", true, true, 90),
        new(ModuleLr, "To", "Delivery City", true, true, 100),
        new(ModuleLr, "DeliveryBranch", "Delivery Branch", true, false, 110),
        new(ModuleLr, "ExpectedDeliveryDate", "Expected Delivery Date", true, false, 120),
        new(ModuleLr, "ExpectedDeliveryTime", "Expected Delivery Time", true, false, 130),
        new(ModuleLr, "EwayBillNo", "E-Way Bill No.", true, false, 140),
        new(ModuleLr, "Vehicle", "Vehicle", true, false, 150),
        new(ModuleLr, "Driver", "Driver", true, false, 160),
        new(ModuleLr, "Material", "Material", true, false, 170),
        new(ModuleLr, "Freight", "Freight (₹)", true, false, 180),
        new(ModuleLr, "GstPercent", "GST %", true, false, 190),
        new(ModuleLr, "LoadingCharges", "Loading Charges (₹)", true, false, 200),
        new(ModuleLr, "UnloadingCharges", "Unloading Charges (₹)", true, false, 210),
        new(ModuleLr, "OtherCharges", "Other Charges (₹)", true, false, 220),
        new(ModuleLr, "Insurance", "Insurance", true, false, 230),
        new(ModuleLr, "Advance", "Advance (₹)", true, false, 240),
        new(ModuleLr, "PaymentType", "Freight Type", true, false, 250),
        new(ModuleLr, "Remarks", "Remarks", true, false, 260),
    ];

    public static IEnumerable<FieldDef> ForModule(string module) =>
        All.Where(f => string.Equals(f.Module, module, StringComparison.OrdinalIgnoreCase));

    public static FieldDef? Find(string module, string technicalFieldName) =>
        All.FirstOrDefault(f =>
            string.Equals(f.Module, module, StringComparison.OrdinalIgnoreCase)
            && string.Equals(f.TechnicalFieldName, technicalFieldName, StringComparison.OrdinalIgnoreCase));

    public static bool IsKnownModule(string? module) =>
        string.Equals(module, ModuleBooking, StringComparison.OrdinalIgnoreCase)
        || string.Equals(module, ModuleLr, StringComparison.OrdinalIgnoreCase);

    public static string NormalizeModule(string module) =>
        string.Equals(module, ModuleLr, StringComparison.OrdinalIgnoreCase)
            ? ModuleLr
            : ModuleBooking;
}
