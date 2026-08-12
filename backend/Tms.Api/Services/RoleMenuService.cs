using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public sealed record MenuCatalogItem(string Key, string Label, string Group);

public class RoleMenuService(TmsDbContext db, UserRoleTypeService roleTypes)
{
    public static readonly string[] ManageRoles = TenantRoles.AssignableRoles;

    public static readonly string[] AdminLockedKeys =
    [
        "/settings",
        "/settings/users",
        "/settings/role-menus",
    ];

    public static IReadOnlyList<MenuCatalogItem> Catalog { get; } = BuildCatalog();

    public static IReadOnlySet<string> AllCatalogKeys { get; } =
        Catalog.Select(c => c.Key).ToHashSet(StringComparer.OrdinalIgnoreCase);

    public static HashSet<string> GetDefaultVisibleKeys(string role)
    {
        var all = AllCatalogKeys.ToHashSet(StringComparer.OrdinalIgnoreCase);
        if (TenantRoles.IsPlatformAdmin(role) || role == TenantRoles.CompanyAdmin)
            return all;

        if (role == TenantRoles.BranchManager)
        {
            var hide = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "/settings/data-cleanup",
                "/settings/notifications",
                "/settings/print-templates",
                "/settings/portal-users",
            };
            all.RemoveWhere(k => hide.Contains(k));
            foreach (var k in AdminLockedKeys) all.Add(k);
            all.Add("/settings/general");
            all.Add("/settings/branches");
            all.Add("/settings/document-numbering");
            return all;
        }

        if (role == TenantRoles.Accountant)
        {
            var keys = FilterAllow(all,
                "/",
                "/accounting",
                "/reports",
                "/masters",
                "/customers",
                "/vendors",
                // finance reports (also under /reports and /accounting)
                "/reports/income",
                "/reports/expenses",
                "/reports/cash-flow",
                "/reports/booking-pl",
                "/reports/direct-lr-pl",
                "/reports/broker-outstanding",
                "/reports/customers",
                "/reports/vendors",
                "/accounting/ledger-report",
                "/accounting/balance-sheet",
                "/accounting/profit-loss",
                "/accounting/trial-balance",
                "/accounting/customer-ledger",
                "/accounting/vendor-ledger",
                "/accounting/outstanding",
                "/accounting/gst",
                "/accounting/cash-book",
                "/accounting/bank-book",
                "/accounting/day-book",
                "/accounting/voucher-entry",
                "/accounting/chart-of-accounts",
                "/accounting/ledger-master",
                "/accounting/freight-invoices",
                "/accounting/payment-adjustment",
                "/accounting/provisions",
                "/accounting/journal-register",
                "/accounting/receipt-register",
                "/accounting/payment-register",
                "/accounting/purchase-register",
                "/accounting/sales-register",
                "/accounting/driver-ledger",
                "/accounting/vehicle-ledger");
            // Settings hub + general only (do not prefix-expand /settings/*)
            keys.Add("/settings");
            keys.Add("/settings/general");
            return keys;
        }

        // Operator — ops + billing + masters + expenses; no accounts/reports/settings (except none)
        return FilterAllow(all,
            "/",
            "/shipment-management",
            "/delivery-management",
            "/operations/billing/list",
            "/operations",
            "/masters",
            "/expenses",
            "/bookings",
            "/bookings/quotations",
            "/lr/list",
            "/operations/loading-slip/list",
            "/operations/transit-pass/list",
            "/operations/dispatch/list",
            "/shipment-management/hub-transfer",
            "/operations/in-transit/list",
            "/operations/delivery-complete/list",
            "/operations/delivery/pod/list",
            "/operations/customer-portal",
            "/operations/shipments",
            "/operations/trips",
            "/operations/gps",
            "/operations/fuel",
            "/operations/routing",
            "/operations/finance",
            "/operations/documents",
            "/operations/eway-bill",
            "/operations/notifications",
            "/operations/analytics",
            "/operations/marketplace",
            "/operations/warehouse",
            "/operations/iot",
            "/operations/ai",
            "/maintenance",
            "/vehicles",
            "/customers",
            "/vendors",
            "/consignors",
            "/consignees",
            "/items",
            "/freight-rates",
            "/hr/employees",
            "/operations/trip-expenses/list",
            "/lr/expense-approval",
            "/expenses/management");
    }

    static HashSet<string> FilterAllow(HashSet<string> all, params string[] allowed)
    {
        var allow = new HashSet<string>(allowed, StringComparer.OrdinalIgnoreCase);
        // Also include any catalog key that starts with an allowed prefix (for nested hubs already listed)
        var result = all.Where(k =>
            allow.Contains(k)
            || allow.Any(a => a != "/" && (k.StartsWith(a + "/", StringComparison.OrdinalIgnoreCase) || k.Equals(a, StringComparison.OrdinalIgnoreCase)))
            || (allow.Contains("/") && k == "/")).ToHashSet(StringComparer.OrdinalIgnoreCase);

        // For accountant: include all /accounting/* and finance-ish /reports/*
        if (allow.Contains("/accounting"))
        {
            foreach (var k in all.Where(x => x.StartsWith("/accounting", StringComparison.OrdinalIgnoreCase)))
                result.Add(k);
        }
        if (allow.Contains("/reports"))
        {
            foreach (var k in all.Where(x => x.StartsWith("/reports", StringComparison.OrdinalIgnoreCase)))
                result.Add(k);
        }
        if (allow.Contains("/operations"))
        {
            foreach (var k in all.Where(x => x.StartsWith("/operations", StringComparison.OrdinalIgnoreCase)))
                result.Add(k);
        }
        if (allow.Contains("/shipment-management"))
        {
            foreach (var k in all.Where(x => x.StartsWith("/shipment-management", StringComparison.OrdinalIgnoreCase)
                || x.StartsWith("/bookings", StringComparison.OrdinalIgnoreCase)
                || x.StartsWith("/lr", StringComparison.OrdinalIgnoreCase)))
                result.Add(k);
        }
        if (allow.Contains("/delivery-management"))
        {
            foreach (var k in all.Where(x => x.StartsWith("/delivery-management", StringComparison.OrdinalIgnoreCase)
                || x.StartsWith("/operations/in-transit", StringComparison.OrdinalIgnoreCase)
                || x.StartsWith("/operations/delivery", StringComparison.OrdinalIgnoreCase)))
                result.Add(k);
        }
        if (allow.Contains("/masters"))
        {
            foreach (var k in all.Where(x =>
                x.StartsWith("/vehicles", StringComparison.OrdinalIgnoreCase)
                || x.StartsWith("/customers", StringComparison.OrdinalIgnoreCase)
                || x.StartsWith("/vendors", StringComparison.OrdinalIgnoreCase)
                || x.StartsWith("/consignors", StringComparison.OrdinalIgnoreCase)
                || x.StartsWith("/consignees", StringComparison.OrdinalIgnoreCase)
                || x.StartsWith("/items", StringComparison.OrdinalIgnoreCase)
                || x.StartsWith("/freight-rates", StringComparison.OrdinalIgnoreCase)
                || x.StartsWith("/hr/employees", StringComparison.OrdinalIgnoreCase)
                || x.Equals("/masters", StringComparison.OrdinalIgnoreCase)))
                result.Add(k);
        }
        if (allow.Contains("/expenses"))
        {
            foreach (var k in all.Where(x =>
                x.StartsWith("/expenses", StringComparison.OrdinalIgnoreCase)
                || x.StartsWith("/operations/trip-expenses", StringComparison.OrdinalIgnoreCase)
                || x.StartsWith("/lr/expense-approval", StringComparison.OrdinalIgnoreCase)))
                result.Add(k);
        }
        if (allow.Contains("/hr"))
        {
            foreach (var k in all.Where(x => x.StartsWith("/hr", StringComparison.OrdinalIgnoreCase)
                || x.StartsWith("/payroll", StringComparison.OrdinalIgnoreCase)))
                result.Add(k);
        }

        return result;
    }

    public async Task<IReadOnlyList<string>> GetEffectiveMenuKeysAsync(Guid companyId, string role, CancellationToken ct = default)
    {
        if (TenantRoles.IsPlatformAdmin(role))
            return AllCatalogKeys.ToList();

        var normalized = NormalizeRole(role);
        var rows = await db.RoleMenuPermissions.AsNoTracking()
            .Where(r => r.CompanyId == companyId && r.Role == normalized)
            .ToListAsync(ct);

        HashSet<string> visible;
        if (rows.Count == 0)
        {
            visible = GetDefaultVisibleKeys(normalized);
        }
        else
        {
            visible = rows.Where(r => r.IsVisible).Select(r => r.MenuKey)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
            // Keys never saved → fall back to default for that key
            var defaults = GetDefaultVisibleKeys(normalized);
            foreach (var key in AllCatalogKeys)
            {
                if (!rows.Any(r => string.Equals(r.MenuKey, key, StringComparison.OrdinalIgnoreCase)))
                {
                    if (defaults.Contains(key)) visible.Add(key);
                }
            }
        }

        if (normalized == TenantRoles.CompanyAdmin)
        {
            foreach (var k in AdminLockedKeys) visible.Add(k);
        }

        EnsureHubParentsVisible(visible);

        return visible.OrderBy(x => x, StringComparer.OrdinalIgnoreCase).ToList();
    }

    /// <summary>
    /// If any hub card under a sidebar section is visible, keep the sidebar parent visible
    /// so Operator can open the hub and see the selected cards (e.g. LR List → Shipment Management).
    /// </summary>
    static void EnsureHubParentsVisible(HashSet<string> visible)
    {
        foreach (var (parent, group) in HubParentGroups)
        {
            if (visible.Contains(parent)) continue;
            if (Catalog.Any(c =>
                    string.Equals(c.Group, group, StringComparison.OrdinalIgnoreCase)
                    && visible.Contains(c.Key)))
            {
                visible.Add(parent);
            }
        }
    }

    static readonly (string Parent, string Group)[] HubParentGroups =
    [
        ("/shipment-management", "Shipment hub"),
        ("/delivery-management", "Delivery hub"),
        ("/operations", "Operations hub"),
        ("/accounting", "Accounts hub"),
        ("/reports", "Reports hub"),
        ("/masters", "Masters hub"),
        ("/expenses", "Expenses hub"),
        ("/hr", "HR & Payroll hub"),
        ("/settings", "Settings hub"),
    ];

    public async Task<object> GetMatrixAsync(Guid companyId, CancellationToken ct = default)
    {
        await roleTypes.EnsureSystemRolesAsync(companyId, ct);
        var roles = await roleTypes.ListNamesAsync(companyId, activeOnly: true, ct);
        var byRole = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
        foreach (var role in roles)
        {
            var keys = await GetEffectiveMenuKeysAsync(companyId, role, ct);
            var set = keys.ToHashSet(StringComparer.OrdinalIgnoreCase);
            byRole[role] = Catalog.Select(c => new
            {
                menuKey = c.Key,
                label = c.Label,
                group = c.Group,
                isVisible = set.Contains(c.Key),
                locked = role == TenantRoles.CompanyAdmin && AdminLockedKeys.Contains(c.Key, StringComparer.OrdinalIgnoreCase),
            }).ToList();
        }

        var roleTypeRows = await roleTypes.ListAsync(companyId, activeOnly: true, ct);
        return new
        {
            roles,
            roleTypes = roleTypeRows,
            catalog = Catalog.Select(c => new { key = c.Key, label = c.Label, group = c.Group }).ToList(),
            matrix = byRole,
        };
    }

    public async Task SaveRoleAsync(Guid companyId, string role, IEnumerable<(string MenuKey, bool IsVisible)> items, CancellationToken ct = default)
    {
        var normalized = NormalizeRole(role);
        await roleTypes.EnsureSystemRolesAsync(companyId, ct);
        if (!await roleTypes.ExistsAsync(companyId, normalized, ct)
            && !TenantRoles.IsPlatformAdmin(normalized))
            throw new InvalidOperationException($"User Role Type '{role}' is not provisioned for this company.");

        var incoming = items
            .Where(i => AllCatalogKeys.Contains(i.MenuKey))
            .GroupBy(i => i.MenuKey, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.Last().IsVisible, StringComparer.OrdinalIgnoreCase);

        // Ensure every catalog key is represented
        foreach (var key in AllCatalogKeys)
        {
            if (!incoming.ContainsKey(key))
                incoming[key] = GetDefaultVisibleKeys(normalized).Contains(key);
        }

        if (normalized == TenantRoles.CompanyAdmin)
        {
            foreach (var k in AdminLockedKeys)
                incoming[k] = true;
        }

        // Selecting a hub card (e.g. LR List) must keep its sidebar parent on
        var visibleKeys = incoming.Where(kv => kv.Value).Select(kv => kv.Key)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        EnsureHubParentsVisible(visibleKeys);
        foreach (var parent in visibleKeys)
            incoming[parent] = true;

        var existing = await db.RoleMenuPermissions
            .Where(r => r.CompanyId == companyId && r.Role == normalized)
            .ToListAsync(ct);

        var now = DateTime.UtcNow;
        foreach (var (key, visible) in incoming)
        {
            var row = existing.FirstOrDefault(r => string.Equals(r.MenuKey, key, StringComparison.OrdinalIgnoreCase));
            if (row == null)
            {
                db.RoleMenuPermissions.Add(new RoleMenuPermission
                {
                    Id = Guid.NewGuid(),
                    CompanyId = companyId,
                    Role = normalized,
                    MenuKey = key,
                    IsVisible = visible,
                    UpdatedAt = now,
                });
            }
            else
            {
                row.IsVisible = visible;
                row.UpdatedAt = now;
            }
        }

        await db.SaveChangesAsync(ct);
    }

    public async Task ResetRoleToDefaultsAsync(Guid companyId, string role, CancellationToken ct = default)
    {
        var normalized = NormalizeRole(role);
        var defaults = GetDefaultVisibleKeys(normalized);
        await SaveRoleAsync(companyId, normalized, AllCatalogKeys.Select(k => (k, defaults.Contains(k))), ct);
    }

    /// <summary>
    /// Provision User Role Types for a company: ensure every assignable role has a full menu matrix.
    /// When <paramref name="overwriteExisting"/> is false, only roles with zero rows are seeded.
    /// </summary>
    public async Task<object> ProvisionCompanyRoleTypesAsync(
        Guid companyId, bool overwriteExisting = false, CancellationToken ct = default)
    {
        await roleTypes.EnsureSystemRolesAsync(companyId, ct);
        var roles = await roleTypes.ListNamesAsync(companyId, activeOnly: true, ct);
        var provisioned = new List<object>();
        foreach (var role in roles)
        {
            var count = await db.RoleMenuPermissions.AsNoTracking()
                .CountAsync(r => r.CompanyId == companyId && r.Role == role, ct);
            if (count > 0 && !overwriteExisting)
            {
                provisioned.Add(new { role, status = "already-provisioned", rowCount = count });
                continue;
            }

            await ResetRoleToDefaultsAsync(companyId, role, ct);
            var after = await db.RoleMenuPermissions.AsNoTracking()
                .CountAsync(r => r.CompanyId == companyId && r.Role == role, ct);
            provisioned.Add(new
            {
                role,
                status = count > 0 ? "reset-to-defaults" : "seeded-defaults",
                rowCount = after,
            });
        }

        return new
        {
            companyId,
            roleTypes = await roleTypes.ListAsync(companyId, activeOnly: true, ct),
            provisioned,
            matrix = await GetMatrixAsync(companyId, ct),
        };
    }

    public static IReadOnlyList<object> RoleTypeCatalog { get; } =
        UserRoleTypeService.SystemRoleSeeds
            .Select(s => (object)new { code = s.Name, label = s.Name, description = s.Description })
            .ToList();

    public static string NormalizeRole(string? role) =>
        string.IsNullOrWhiteSpace(role) ? TenantRoles.Operator : role.Trim();

    static List<MenuCatalogItem> BuildCatalog()
    {
        var items = new List<MenuCatalogItem>();

        void Add(string key, string label, string group)
        {
            if (items.Any(i => string.Equals(i.Key, key, StringComparison.OrdinalIgnoreCase))) return;
            items.Add(new MenuCatalogItem(key, label, group));
        }

        // Sidebar
        Add("/", "Dashboard", "Sidebar");
        Add("/shipment-management", "Shipment Management", "Sidebar");
        Add("/delivery-management", "Delivery Management", "Sidebar");
        Add("/operations/billing/list", "Billing", "Sidebar");
        Add("/operations", "Operations", "Sidebar");
        Add("/accounting", "Accounts", "Sidebar");
        Add("/reports", "Reports", "Sidebar");
        Add("/masters", "Masters", "Sidebar");
        Add("/maintenance", "Maintenance", "Sidebar");
        Add("/expenses", "Expenses", "Sidebar");
        Add("/hr", "HR & Payroll", "Sidebar");
        Add("/settings", "Settings", "Sidebar");

        // Shipment hub
        Add("/bookings/quotations", "Quotation", "Shipment hub");
        Add("/bookings", "Booking", "Shipment hub");
        Add("/lr/list", "LR List", "Shipment hub");
        Add("/operations/loading-slip/list", "Loading Slip", "Shipment hub");
        Add("/operations/transit-pass/list", "Transit Pass", "Shipment hub");
        Add("/operations/dispatch/list", "Dispatch", "Shipment hub");
        Add("/shipment-management/hub-transfer", "Hub Transfer", "Shipment hub");

        // Delivery hub
        Add("/operations/in-transit/list", "In Transit", "Delivery hub");
        Add("/operations/delivery-complete/list", "Delivery Complete", "Delivery hub");
        Add("/operations/delivery/pod/list", "POD", "Delivery hub");

        // Operations hub
        Add("/operations/customer-portal", "Customer Portal", "Operations hub");
        Add("/operations/shipments", "Shipments", "Operations hub");
        Add("/operations/trips", "Trips", "Operations hub");
        Add("/operations/gps", "GPS Tracking", "Operations hub");
        Add("/operations/fuel", "Fuel Management", "Operations hub");
        Add("/operations/routing", "Route Optimizer", "Operations hub");
        Add("/operations/finance", "Finance", "Operations hub");
        Add("/operations/documents", "Documents", "Operations hub");
        Add("/operations/eway-bill", "E-Way Bill", "Operations hub");
        Add("/operations/notifications", "Notifications", "Operations hub");
        Add("/operations/analytics", "Analytics", "Operations hub");
        Add("/operations/marketplace", "Marketplace", "Operations hub");
        Add("/operations/warehouse", "Warehouse", "Operations hub");
        Add("/operations/iot", "IoT", "Operations hub");
        Add("/operations/ai", "AI Assistant", "Operations hub");

        // Accounting hub
        Add("/accounting/chart-of-accounts", "Chart of Accounts", "Accounts hub");
        Add("/accounting/ledger-master", "Ledger Master", "Accounts hub");
        Add("/accounting/voucher-entry", "Voucher Entry", "Accounts hub");
        Add("/accounting/ledger-report", "Ledger Report", "Accounts hub");
        Add("/accounting/customer-ledger", "Customer Ledger", "Accounts hub");
        Add("/accounting/vendor-ledger", "Vendor Ledger", "Accounts hub");
        Add("/accounting/driver-ledger", "Driver Ledger", "Accounts hub");
        Add("/accounting/vehicle-ledger", "Vehicle Ledger", "Accounts hub");
        Add("/accounting/cash-book", "Cash Book", "Accounts hub");
        Add("/accounting/bank-book", "Bank Book", "Accounts hub");
        Add("/accounting/day-book", "Day Book", "Accounts hub");
        Add("/accounting/journal-register", "Journal Register", "Accounts hub");
        Add("/accounting/receipt-register", "Receipt Register", "Accounts hub");
        Add("/accounting/payment-register", "Payment Register", "Accounts hub");
        Add("/accounting/purchase-register", "Purchase Register", "Accounts hub");
        Add("/accounting/sales-register", "Sales Register", "Accounts hub");
        Add("/accounting/freight-invoices", "Freight Invoices", "Accounts hub");
        Add("/accounting/trial-balance", "Trial Balance", "Accounts hub");
        Add("/accounting/payment-adjustment", "Payment Adjustment", "Accounts hub");
        Add("/accounting/provisions", "Provisions", "Accounts hub");
        Add("/accounting/profit-loss", "Profit & Loss", "Accounts hub");
        Add("/accounting/balance-sheet", "Balance Sheet", "Accounts hub");
        Add("/accounting/outstanding", "Outstanding", "Accounts hub");
        Add("/accounting/gst", "GST Reports", "Accounts hub");

        // Reports hub
        Add("/reports/trips", "LR / Trip Register", "Reports hub");
        Add("/reports/loading-dispatch", "Loading & Dispatch", "Reports hub");
        Add("/reports/hub-transfer", "Hub Transfer Report", "Reports hub");
        Add("/reports/delivery-pod", "Delivery & POD", "Reports hub");
        Add("/reports/vehicles", "Vehicle Report", "Reports hub");
        Add("/reports/drivers", "Driver Report", "Reports hub");
        Add("/reports/customers", "Customer Report", "Reports hub");
        Add("/reports/vendors", "Vendor Report", "Reports hub");
        Add("/reports/booking-pl", "Booking P&L", "Reports hub");
        Add("/reports/direct-lr-pl", "Direct LR P&L", "Reports hub");
        Add("/reports/broker-outstanding", "Broker Outstanding", "Reports hub");
        Add("/reports/income", "Income Report", "Reports hub");
        Add("/reports/expenses", "Expense Report", "Reports hub");
        Add("/reports/cash-flow", "Cash Flow", "Reports hub");

        // Masters hub
        Add("/vehicles", "Vehicles", "Masters hub");
        Add("/customers", "Customers", "Masters hub");
        Add("/hr/employees", "Drivers / HR", "Masters hub");
        Add("/vendors", "Vendors", "Masters hub");
        Add("/consignors", "Consignors", "Masters hub");
        Add("/consignees", "Consignees", "Masters hub");
        Add("/items", "Items", "Masters hub");
        Add("/freight-rates", "Freight Rates", "Masters hub");

        // Expenses hub
        Add("/operations/trip-expenses/list", "Trip Expenses", "Expenses hub");
        Add("/lr/expense-approval", "Expense Approval", "Expenses hub");
        Add("/expenses/management", "Expense Management", "Expenses hub");

        // HR / Payroll
        Add("/hr/departments", "Departments", "HR & Payroll hub");
        Add("/hr/attendance", "Attendance", "HR & Payroll hub");
        Add("/hr/leaves", "Leave Management", "HR & Payroll hub");
        Add("/hr/tms-norms", "TMS Norms", "HR & Payroll hub");
        Add("/hr/holidays", "Holidays", "HR & Payroll hub");
        Add("/payroll/runs", "Payroll Runs", "HR & Payroll hub");
        Add("/payroll/generate", "Generate Payroll", "HR & Payroll hub");
        Add("/payroll/payslips", "Payslips", "HR & Payroll hub");
        Add("/payroll/salary-register", "Salary Register", "HR & Payroll hub");
        Add("/payroll/settings", "Payroll Settings", "HR & Payroll hub");

        // Settings hub
        Add("/settings/general", "General", "Settings hub");
        Add("/settings/print-templates", "Document print templates", "Settings hub");
        Add("/settings/users", "Staff users", "Settings hub");
        Add("/settings/role-menus", "Role menus", "Settings hub");
        Add("/settings/portal-users", "Portal user access", "Settings hub");
        Add("/settings/branches", "Branch locations", "Settings hub");
        Add("/settings/document-numbering", "Document numbering", "Settings hub");
        Add("/settings/notifications", "SMS & WhatsApp", "Settings hub");
        Add("/settings/data-cleanup", "Data cleanup", "Settings hub");

        return items;
    }
}
