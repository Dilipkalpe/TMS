using FluentAssertions;
using Tms.Api.Services;

namespace Tms.Api.Tests.Services;

public class FieldConfigurationServiceTests
{
    static FieldConfigurationDto Field(
        string name,
        bool visible = true,
        bool required = false,
        string? custom = null,
        string defaultName = "Label",
        bool active = true) =>
        new(
            Guid.NewGuid(),
            FieldConfigurationCatalog.ModuleBooking,
            name,
            defaultName,
            custom,
            string.IsNullOrWhiteSpace(custom) ? defaultName : custom.Trim(),
            visible,
            required,
            10,
            active);

    [Fact]
    public void MustValidate_only_when_visible_and_required()
    {
        FieldConfigurationService.MustValidate(Field("X", visible: true, required: true)).Should().BeTrue();
        FieldConfigurationService.MustValidate(Field("X", visible: true, required: false)).Should().BeFalse();
        FieldConfigurationService.MustValidate(Field("X", visible: false, required: true)).Should().BeFalse();
        FieldConfigurationService.MustValidate(Field("X", visible: false, required: false)).Should().BeFalse();
        FieldConfigurationService.MustValidate(null).Should().BeFalse();
    }

    [Fact]
    public void Hidden_required_skips_validation_message()
    {
        var hiddenRequired = Field("Consignee", visible: false, required: true, defaultName: "Consignee", custom: "Receiver");
        FieldConfigurationService.MustValidate(hiddenRequired).Should().BeFalse();
        FieldConfigurationService.IsMissing(null).Should().BeTrue();
        // No validation message should be produced by callers when MustValidate is false
    }

    [Fact]
    public void DisplayName_uses_custom_then_default()
    {
        var withCustom = Field("Consignee", custom: "Receiver", defaultName: "Consignee");
        FieldConfigurationService.DisplayName(withCustom, "Consignee").Should().Be("Receiver");

        var whitespaceCustom = Field("Consignee", custom: "   ", defaultName: "Consignee");
        // DTO DisplayName already resolves empty custom to default in EffectiveDisplayName path;
        // service DisplayName uses field.DisplayName which is set in ToDto — here we set DisplayName via ctor arg
        FieldConfigurationService.DisplayName(
            Field("Consignee", custom: null, defaultName: "Consignee"), "Consignee").Should().Be("Consignee");
    }

    [Fact]
    public void RequiredMessage_uses_display_name()
    {
        var field = Field("Consignee", visible: true, required: true, custom: "Receiver", defaultName: "Consignee");
        FieldConfigurationService.RequiredMessage(field, "Consignee").Should().Be("Receiver is required.");
    }

    [Fact]
    public void IsVisible_treats_null_as_visible_for_backward_compat()
    {
        FieldConfigurationService.IsVisible(null).Should().BeTrue();
        FieldConfigurationService.IsVisible(Field("X", visible: false)).Should().BeFalse();
        FieldConfigurationService.IsVisible(Field("X", visible: true, active: false)).Should().BeFalse();
    }

    [Fact]
    public void Inactive_field_in_map_is_hidden_and_not_validated()
    {
        var inactive = Field("Remarks", visible: true, required: true, active: false);
        FieldConfigurationService.IsVisible(inactive).Should().BeFalse();
        FieldConfigurationService.MustValidate(inactive).Should().BeFalse();
        FieldConfigurationService.NullIfHidden(inactive, "note").Should().BeNull();
    }

    [Fact]
    public void Catalog_contains_booking_and_lr_core_fields()
    {
        FieldConfigurationCatalog.Find(FieldConfigurationCatalog.ModuleBooking, "Customer").Should().BeNull();
        FieldConfigurationCatalog.Find(FieldConfigurationCatalog.ModuleBooking, "Consignor").Should().NotBeNull();
        FieldConfigurationCatalog.Find(FieldConfigurationCatalog.ModuleBooking, "Consignee")!.DefaultRequired.Should().BeTrue();
        FieldConfigurationCatalog.Find(FieldConfigurationCatalog.ModuleLr, "Consignor").Should().NotBeNull();
        FieldConfigurationCatalog.Find(FieldConfigurationCatalog.ModuleLr, "EwayBillNo").Should().NotBeNull();
        FieldConfigurationCatalog.Find(FieldConfigurationCatalog.ModuleLr, "From")!.DefaultRequired.Should().BeTrue();
        FieldConfigurationCatalog.Find(FieldConfigurationCatalog.ModuleBooking, "Material").Should().NotBeNull();
    }

    [Fact]
    public void NormalizeModule_accepts_booking_and_lr()
    {
        FieldConfigurationCatalog.NormalizeModule("booking").Should().Be("Booking");
        FieldConfigurationCatalog.NormalizeModule("LR").Should().Be("LR");
        FieldConfigurationCatalog.IsKnownModule("Booking").Should().BeTrue();
        FieldConfigurationCatalog.IsKnownModule("Invoice").Should().BeFalse();
    }

    [Fact]
    public void NullIfHidden_clears_value_when_not_visible()
    {
        var hidden = Field("Vehicle", visible: false);
        FieldConfigurationService.NullIfHidden(hidden, "MH-12").Should().BeNull();
        FieldConfigurationService.NullIfHidden(Field("Vehicle", visible: true), "MH-12").Should().Be("MH-12");
    }
}
