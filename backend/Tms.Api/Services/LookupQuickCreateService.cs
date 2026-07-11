using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tms.Api.Data;
using Tms.Api.DTOs;
using Tms.Api.Models;
using Tms.Api.Services;

namespace Tms.Api.Services;

public record QuickCreateResult(string Label, bool Created, string? Id = null);

public class LookupQuickCreateService(
    TmsDbContext db,
    IBranchContext branches,
    ITenantContext tenants,
    HrService hr,
    DriverSyncService driverSync)
{
    public async Task<QuickCreateResult> CreateAsync(
        string type, string name, string? employeeType = null, CancellationToken ct = default)
    {
        var trimmed = name.Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
            throw new InvalidOperationException("Name is required.");

        return type.ToLowerInvariant() switch
        {
            "customers" => await CreateCustomerAsync(trimmed, ct),
            "vendors" => await CreateVendorAsync(trimmed, ct),
            "vehicles" => await CreateVehicleAsync(trimmed, ct),
            "employees" => await CreateEmployeeAsync(trimmed, employeeType ?? "Staff", ct),
            "drivers" => await CreateEmployeeAsync(trimmed, "Driver", ct),
            _ => throw new InvalidOperationException($"Unsupported lookup type: {type}"),
        };
    }

    async Task<QuickCreateResult> CreateCustomerAsync(string name, CancellationToken ct)
    {
        var existing = await BranchAccess.FilterForLookup(branches, tenants.Filter(db.Customers.AsQueryable()))
            .FirstOrDefaultAsync(c => c.Name.ToLower() == name.ToLower(), ct);
        if (existing != null) return new QuickCreateResult(existing.Name, false, existing.Id);

        var c = new Customer
        {
            Id = await IdGenerator.NextCustomerId(db),
            Name = name,
            BranchId = branches.AssignBranchId,
            CompanyId = TenantScope.ResolveCompanyId(tenants),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Customers.Add(c);
        await db.SaveChangesAsync(ct);
        return new QuickCreateResult(c.Name, true, c.Id);
    }

    async Task<QuickCreateResult> CreateVendorAsync(string name, CancellationToken ct)
    {
        var existing = await tenants.Filter(db.Vendors.AsQueryable())
            .FirstOrDefaultAsync(v => v.Name.ToLower() == name.ToLower(), ct);
        if (existing != null) return new QuickCreateResult(existing.Name, false, existing.Id);

        var v = new Vendor
        {
            Id = await IdGenerator.NextVendorId(db),
            Name = name,
            Category = "General",
            CompanyId = TenantScope.ResolveCompanyId(tenants),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Vendors.Add(v);
        await db.SaveChangesAsync(ct);
        return new QuickCreateResult(v.Name, true, v.Id);
    }

    async Task<QuickCreateResult> CreateVehicleAsync(string number, CancellationToken ct)
    {
        var existing = await BranchAccess.FilterForLookup(branches, tenants.Filter(db.Vehicles.AsQueryable()))
            .FirstOrDefaultAsync(v => v.Number.ToLower() == number.ToLower(), ct);
        if (existing != null) return new QuickCreateResult(existing.Number, false, existing.Id);

        var v = new Vehicle
        {
            Id = await IdGenerator.NextVehicleId(db),
            Number = number,
            Type = "Truck",
            Status = "Active",
            BranchId = branches.AssignBranchId,
            CompanyId = TenantScope.ResolveCompanyId(tenants),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Vehicles.Add(v);
        await db.SaveChangesAsync(ct);
        return new QuickCreateResult(v.Number, true, v.Id);
    }

    async Task<QuickCreateResult> CreateEmployeeAsync(string name, string employeeType, CancellationToken ct)
    {
        try
        {
            var (items, _) = await hr.ListEmployeesPagedAsync(1, 5, name, null, employeeType, "Active", null, ct);
            var match = items.FirstOrDefault(e =>
                string.Equals(e.Name, name, StringComparison.OrdinalIgnoreCase));
            if (match != null) return new QuickCreateResult(match.Name, false, match.Id.ToString());
        }
        catch (PostgresException)
        {
            return await CreateLegacyDriverAsync(name, ct);
        }

        var prefix = employeeType switch
        {
            "Driver" => "DRV",
            "Mechanic" => "MEC",
            "Loader" => "LDR",
            "Office" => "OFC",
            _ => "EMP",
        };
        var code = $"{prefix}{DateTime.UtcNow:yyMMddHHmmss}";

        var employeeId = await hr.SaveEmployeeAsync(new SaveEmployeeRequest(
            Id: null,
            EmployeeCode: code,
            Name: name,
            EmployeeType: employeeType,
            EmploymentType: "Permanent",
            DepartmentId: null,
            DesignationId: null,
            DriverId: null,
            Email: null,
            Phone: null,
            DateOfJoining: null,
            DateOfBirth: null,
            Gender: null,
            Address: null,
            BankAccount: null,
            BankIfsc: null,
            Pan: null,
            Status: "Active"), ct);

        if (string.Equals(employeeType, "Driver", StringComparison.OrdinalIgnoreCase))
            await driverSync.EnsureDriverByNameAsync(name, ct: ct);

        return new QuickCreateResult(name, true, employeeId.ToString());
    }

    async Task<QuickCreateResult> CreateLegacyDriverAsync(string name, CancellationToken ct)
    {
        var existing = await BranchAccess.FilterForLookup(branches, tenants.Filter(db.Drivers.AsQueryable()))
            .FirstOrDefaultAsync(d => d.Name.ToLower() == name.ToLower(), ct);
        if (existing != null) return new QuickCreateResult(existing.Name, false, existing.Id);

        var d = new Driver
        {
            Id = await IdGenerator.NextDriverId(db),
            Name = name,
            Status = "Active",
            BranchId = branches.AssignBranchId,
            CompanyId = TenantScope.ResolveCompanyId(tenants),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Drivers.Add(d);
        await db.SaveChangesAsync(ct);
        return new QuickCreateResult(d.Name, true, d.Id);
    }
}
