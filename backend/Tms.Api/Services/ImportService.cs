using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.DTOs;
using Tms.Api.Models;
using Tms.Api.Services;

namespace Tms.Api.Services;

public record ImportRowResult(int Row, string? Key, bool Success, string? Error);

public record ImportBatchResult(int Created, int Updated, int Failed, List<ImportRowResult> Errors);

public class ImportService(
    TmsDbContext db,
    IBranchContext branches,
    ITenantContext tenants,
    HrService hr)
{
    public async Task<ImportBatchResult> ImportCustomersAsync(IReadOnlyList<Dictionary<string, string?>> rows, CancellationToken ct = default)
    {
        var created = 0;
        var errors = new List<ImportRowResult>();
        for (var i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            var name = Get(row, "name");
            if (string.IsNullOrWhiteSpace(name))
            {
                errors.Add(new ImportRowResult(i + 1, null, false, "Name is required."));
                continue;
            }
            try
            {
                var existing = await TenantScope.Customers(db, tenants, branches)
                    .FirstOrDefaultAsync(c => c.Name == name, ct);
                if (existing != null)
                {
                    existing.Contact = Get(row, "contact") ?? existing.Contact;
                    existing.Phone = Get(row, "phone") ?? existing.Phone;
                    existing.Email = Get(row, "email") ?? existing.Email;
                    existing.Gst = Get(row, "gst") ?? existing.Gst;
                    existing.Address = Get(row, "address") ?? existing.Address;
                    existing.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    db.Customers.Add(new Customer
                    {
                        Id = await IdGenerator.NextCustomerId(db),
                        Name = name,
                        Contact = Get(row, "contact"),
                        Phone = Get(row, "phone"),
                        Email = Get(row, "email"),
                        Gst = Get(row, "gst"),
                        Address = Get(row, "address"),
                        BranchId = branches.AssignBranchId,
                        CompanyId = TenantScope.ResolveCompanyId(tenants),
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    });
                    created++;
                }
                await db.SaveChangesAsync(ct);
            }
            catch (Exception ex)
            {
                errors.Add(new ImportRowResult(i + 1, name, false, ex.Message));
            }
        }
        return new ImportBatchResult(created, rows.Count - created - errors.Count, errors.Count, errors);
    }

    public async Task<ImportBatchResult> ImportVendorsAsync(IReadOnlyList<Dictionary<string, string?>> rows, CancellationToken ct = default)
    {
        var created = 0;
        var errors = new List<ImportRowResult>();
        for (var i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            var name = Get(row, "name");
            if (string.IsNullOrWhiteSpace(name))
            {
                errors.Add(new ImportRowResult(i + 1, null, false, "Name is required."));
                continue;
            }
            try
            {
                var existing = await tenants.Filter(db.Vendors.AsQueryable())
                    .FirstOrDefaultAsync(v => v.Name == name, ct);
                if (existing != null)
                {
                    existing.Category = Get(row, "category") ?? existing.Category;
                    existing.Contact = Get(row, "contact") ?? existing.Contact;
                    existing.Phone = Get(row, "phone") ?? existing.Phone;
                    existing.Gst = Get(row, "gst") ?? existing.Gst;
                    existing.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    db.Vendors.Add(new Vendor
                    {
                        Id = await IdGenerator.NextVendorId(db),
                        Name = name,
                        Category = Get(row, "category") ?? "General",
                        Contact = Get(row, "contact"),
                        Phone = Get(row, "phone"),
                        Gst = Get(row, "gst"),
                        CompanyId = TenantScope.ResolveCompanyId(tenants),
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    });
                    created++;
                }
                await db.SaveChangesAsync(ct);
            }
            catch (Exception ex)
            {
                errors.Add(new ImportRowResult(i + 1, name, false, ex.Message));
            }
        }
        return new ImportBatchResult(created, rows.Count - created - errors.Count, errors.Count, errors);
    }

    public async Task<ImportBatchResult> ImportVehiclesAsync(IReadOnlyList<Dictionary<string, string?>> rows, CancellationToken ct = default)
    {
        var created = 0;
        var errors = new List<ImportRowResult>();
        for (var i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            var number = Get(row, "number");
            if (string.IsNullOrWhiteSpace(number))
            {
                errors.Add(new ImportRowResult(i + 1, null, false, "Number is required."));
                continue;
            }
            try
            {
                var existing = await TenantScope.Vehicles(db, tenants, branches)
                    .FirstOrDefaultAsync(v => v.Number == number, ct);
                if (existing != null)
                {
                    existing.Type = Get(row, "type") ?? existing.Type;
                    existing.Model = Get(row, "model") ?? existing.Model;
                    existing.Status = Get(row, "status") ?? existing.Status;
                    existing.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    db.Vehicles.Add(new Vehicle
                    {
                        Id = await IdGenerator.NextVehicleId(db),
                        Number = number,
                        Type = Get(row, "type") ?? "Truck",
                        Model = Get(row, "model"),
                        Status = Get(row, "status") ?? "Active",
                        BranchId = branches.AssignBranchId,
                        CompanyId = TenantScope.ResolveCompanyId(tenants),
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    });
                    created++;
                }
                await db.SaveChangesAsync(ct);
            }
            catch (Exception ex)
            {
                errors.Add(new ImportRowResult(i + 1, number, false, ex.Message));
            }
        }
        return new ImportBatchResult(created, rows.Count - created - errors.Count, errors.Count, errors);
    }

    public async Task<ImportBatchResult> ImportEmployeesAsync(IReadOnlyList<Dictionary<string, string?>> rows, CancellationToken ct = default)
    {
        var created = 0;
        var errors = new List<ImportRowResult>();
        for (var i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            var name = Get(row, "name");
            var code = Get(row, "employeeCode") ?? Get(row, "code");
            if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(code))
            {
                errors.Add(new ImportRowResult(i + 1, code, false, "Name and employeeCode are required."));
                continue;
            }
            try
            {
                var employeeType = Get(row, "employeeType") ?? Get(row, "role") ?? "Staff";
                var req = new SaveEmployeeRequest(
                    Id: null,
                    EmployeeCode: code,
                    Name: name,
                    EmployeeType: employeeType,
                    EmploymentType: Get(row, "employmentType") ?? "Permanent",
                    DepartmentId: null,
                    DesignationId: null,
                    DriverId: null,
                    Email: Get(row, "email"),
                    Phone: Get(row, "phone"),
                    DateOfJoining: ParseDate(Get(row, "dateOfJoining")),
                    DateOfBirth: ParseDate(Get(row, "dateOfBirth")),
                    Gender: Get(row, "gender"),
                    Address: Get(row, "address"),
                    BankAccount: Get(row, "bankAccount"),
                    BankIfsc: Get(row, "bankIfsc"),
                    Pan: Get(row, "pan"),
                    BasicSalary: ParseDecimal(Get(row, "basicSalary")),
                    DailyWage: ParseDecimal(Get(row, "dailyWage")),
                    LicenseNumber: Get(row, "licenseNumber"),
                    LicenseExpiry: ParseDate(Get(row, "licenseExpiry")),
                    AssignedVehicleId: Get(row, "assignedVehicleId"),
                    Status: Get(row, "status") ?? "Active");

                await hr.SaveEmployeeAsync(req, ct);
                if (string.Equals(employeeType, "Driver", StringComparison.OrdinalIgnoreCase))
                    await SyncDriverFromEmployeeAsync(name, Get(row, "phone"), Get(row, "licenseNumber"), ct);
                created++;
            }
            catch (Exception ex)
            {
                errors.Add(new ImportRowResult(i + 1, code, false, ex.Message));
            }
        }
        return new ImportBatchResult(created, 0, errors.Count, errors);
    }

    async Task SyncDriverFromEmployeeAsync(string name, string? phone, string? license, CancellationToken ct)
    {
        var driver = await TenantScope.Drivers(db, tenants, branches)
            .FirstOrDefaultAsync(d => d.Name == name, ct);
        if (driver == null)
        {
            driver = new Driver
            {
                Id = await IdGenerator.NextDriverId(db),
                Name = name,
                Phone = phone,
                License = license,
                Status = "Active",
                BranchId = branches.AssignBranchId,
                CompanyId = TenantScope.ResolveCompanyId(tenants),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            db.Drivers.Add(driver);
        }
        else
        {
            driver.Phone = phone ?? driver.Phone;
            driver.License = license ?? driver.License;
            driver.UpdatedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync(ct);
    }

    static string? Get(Dictionary<string, string?> row, string key) =>
        row.TryGetValue(key, out var v) ? v?.Trim() : null;

    static decimal ParseDecimal(string? v) =>
        decimal.TryParse(v, out var d) ? d : 0;

    static DateOnly? ParseDate(string? v) =>
        DateOnly.TryParse(v, out var d) ? d : null;
}
