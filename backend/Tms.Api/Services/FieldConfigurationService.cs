using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public sealed record FieldConfigurationDto(
    Guid Id,
    string Module,
    string TechnicalFieldName,
    string DefaultDisplayName,
    string? CustomDisplayName,
    string DisplayName,
    bool IsVisible,
    bool IsRequired,
    int DisplayOrder,
    bool IsActive);

public sealed record FieldConfigurationUpdateItem(
    string TechnicalFieldName,
    string? CustomDisplayName,
    bool IsVisible,
    bool IsRequired,
    int DisplayOrder,
    bool IsActive,
    bool ResetCustomDisplayName = false);

/// <summary>
/// Centralized Booking/LR field configuration: visibility, required, labels, order.
/// Loads once per company+module (cached); validation helpers respect Visible && Required.
/// </summary>
public class FieldConfigurationService(
    TmsDbContext db,
    ITenantContext tenants,
    TenantCacheService cache)
{
    static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);

    public async Task<IReadOnlyList<FieldConfigurationDto>> GetModuleAsync(
        string module,
        CancellationToken ct = default)
    {
        var companyId = RequireCompanyId();
        module = FieldConfigurationCatalog.NormalizeModule(module);
        var key = CacheKey(companyId, module);

        return await cache.GetOrCreateAsync(key, async () =>
        {
            await EnsureSeededAsync(companyId, module, ct);
            var rows = await db.FieldConfigurations.AsNoTracking()
                .Where(f => f.CompanyId == companyId && f.Module == module)
                .OrderBy(f => f.DisplayOrder)
                .ThenBy(f => f.TechnicalFieldName)
                .ToListAsync(ct);
            return rows.Select(ToDto).ToList();
        }, CacheTtl, ct);
    }

    public async Task<IReadOnlyDictionary<string, FieldConfigurationDto>> GetMapAsync(
        string module,
        CancellationToken ct = default)
    {
        var list = await GetModuleAsync(module, ct);
        // Include inactive rows so IsVisible / MustValidate can honor IsActive=false.
        // Omitting them made missing keys default to visible and broke the Active toggle.
        return list.ToDictionary(f => f.TechnicalFieldName, f => f, StringComparer.OrdinalIgnoreCase);
    }

    public async Task<IReadOnlyList<FieldConfigurationDto>> SaveModuleAsync(
        string module,
        IReadOnlyList<FieldConfigurationUpdateItem> updates,
        CancellationToken ct = default)
    {
        var companyId = RequireCompanyId();
        module = FieldConfigurationCatalog.NormalizeModule(module);
        await EnsureSeededAsync(companyId, module, ct);

        var existing = await db.FieldConfigurations
            .Where(f => f.CompanyId == companyId && f.Module == module)
            .ToListAsync(ct);
        var byName = existing.ToDictionary(f => f.TechnicalFieldName, StringComparer.OrdinalIgnoreCase);
        var now = DateTime.UtcNow;

        foreach (var upd in updates)
        {
            if (string.IsNullOrWhiteSpace(upd.TechnicalFieldName)) continue;
            if (!byName.TryGetValue(upd.TechnicalFieldName.Trim(), out var row)) continue;

            var custom = upd.ResetCustomDisplayName
                ? null
                : NormalizeCustomDisplayName(upd.CustomDisplayName);

            if (custom != null && custom.Length > FieldConfigurationCatalog.MaxCustomDisplayNameLength)
                throw new InvalidOperationException(
                    $"Custom display name for '{row.TechnicalFieldName}' exceeds {FieldConfigurationCatalog.MaxCustomDisplayNameLength} characters.");

            row.CustomDisplayName = custom;
            row.IsVisible = upd.IsVisible;
            // Hidden fields are never enforced as required at runtime; store as requested for when re-enabled.
            row.IsRequired = upd.IsRequired;
            row.DisplayOrder = Math.Max(0, upd.DisplayOrder);
            row.IsActive = upd.IsActive;
            row.UpdatedAt = now;
        }

        await db.SaveChangesAsync(ct);
        await InvalidateCacheAsync(companyId, module, ct);
        return await GetModuleAsync(module, ct);
    }

    /// <summary>True when field is active, visible, and required — the only case that must validate.</summary>
    public static bool MustValidate(FieldConfigurationDto? field) =>
        field is { IsActive: true, IsVisible: true, IsRequired: true };

    public static bool IsVisible(FieldConfigurationDto? field) =>
        field is null || (field.IsActive && field.IsVisible);

    public static string DisplayName(FieldConfigurationDto? field, string fallback) =>
        field is null || string.IsNullOrWhiteSpace(field.DisplayName)
            ? fallback
            : field.DisplayName;

    public static string RequiredMessage(FieldConfigurationDto? field, string fallbackLabel) =>
        $"{DisplayName(field, fallbackLabel)} is required.";

    public static bool IsMissing(string? value) => string.IsNullOrWhiteSpace(value);

    /// <summary>
    /// When field is hidden, return null (do not invent business values).
    /// Callers that map to NOT NULL string columns should coalesce to "".
    /// </summary>
    public static string? NullIfHidden(FieldConfigurationDto? field, string? value) =>
        IsVisible(field) ? value : null;

    public async Task EnsureSeededAsync(Guid companyId, string? module = null, CancellationToken ct = default)
    {
        var defs = string.IsNullOrWhiteSpace(module)
            ? FieldConfigurationCatalog.All
            : FieldConfigurationCatalog.ForModule(FieldConfigurationCatalog.NormalizeModule(module)).ToList();

        var existingKeys = await db.FieldConfigurations.AsNoTracking()
            .Where(f => f.CompanyId == companyId
                && (module == null || f.Module == FieldConfigurationCatalog.NormalizeModule(module!)))
            .Select(f => new { f.Module, f.TechnicalFieldName })
            .ToListAsync(ct);

        var have = existingKeys
            .Select(k => $"{k.Module}|{k.TechnicalFieldName}")
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var now = DateTime.UtcNow;
        var added = false;
        foreach (var def in defs)
        {
            var key = $"{def.Module}|{def.TechnicalFieldName}";
            if (have.Contains(key)) continue;
            db.FieldConfigurations.Add(new FieldConfiguration
            {
                Id = Guid.NewGuid(),
                CompanyId = companyId,
                Module = def.Module,
                TechnicalFieldName = def.TechnicalFieldName,
                DefaultDisplayName = def.DefaultDisplayName,
                CustomDisplayName = null,
                IsVisible = def.DefaultVisible,
                IsRequired = def.DefaultRequired,
                DisplayOrder = def.DisplayOrder,
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now,
            });
            added = true;
        }

        if (added)
            await db.SaveChangesAsync(ct);
    }

    Guid RequireCompanyId()
    {
        var id = tenants.EffectiveCompanyId ?? tenants.AssignCompanyId;
        if (id == null || id == Guid.Empty)
            throw new InvalidOperationException("Company context required.");
        return id.Value;
    }

    static string? NormalizeCustomDisplayName(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return value.Trim();
    }

    static FieldConfigurationDto ToDto(FieldConfiguration f) => new(
        f.Id,
        f.Module,
        f.TechnicalFieldName,
        f.DefaultDisplayName,
        f.CustomDisplayName,
        f.EffectiveDisplayName,
        f.IsVisible,
        f.IsRequired,
        f.DisplayOrder,
        f.IsActive);

    static string CacheKey(Guid companyId, string module) =>
        $"field-config:{companyId}:{module}";

    Task InvalidateCacheAsync(Guid companyId, string module, CancellationToken ct) =>
        cache.RemoveAsync(CacheKey(companyId, module), ct);
}
