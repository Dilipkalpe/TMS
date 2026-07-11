using System.Globalization;
using System.Text.Json;
using Tms.Api.DTOs;

namespace Tms.Api.Services;

public static class HrEmployeeRequestMapper
{
    public static SaveEmployeeRequest FromJson(Dictionary<string, JsonElement> body) => new(
        Id: ParseGuidN(body, "id"),
        EmployeeCode: GetString(body, "employeeCode") ?? "",
        Name: GetString(body, "name") ?? "",
        EmployeeType: GetString(body, "employeeType"),
        EmploymentType: GetString(body, "employmentType"),
        DepartmentId: ParseGuidN(body, "departmentId"),
        DesignationId: ParseGuidN(body, "designationId"),
        DriverId: GetString(body, "driverId"),
        Email: GetString(body, "email"),
        Phone: GetString(body, "phone"),
        DateOfJoining: ParseDateN(body, "dateOfJoining"),
        DateOfBirth: ParseDateN(body, "dateOfBirth"),
        Gender: GetString(body, "gender"),
        Address: GetString(body, "address"),
        BankAccount: GetString(body, "bankAccount"),
        BankIfsc: GetString(body, "bankIfsc"),
        Pan: GetString(body, "pan"),
        BasicSalary: ParseDecimal(body, "basicSalary"),
        DailyWage: ParseDecimal(body, "dailyWage"),
        Hra: ParseDecimal(body, "hra"),
        Da: ParseDecimal(body, "da"),
        Conveyance: ParseDecimal(body, "conveyance"),
        OtherAllowance: ParseDecimal(body, "otherAllowance"),
        Advance: ParseDecimal(body, "advance"),
        PfApplicable: ParseBool(body, "pfApplicable", true),
        EsiApplicable: ParseBool(body, "esiApplicable", true),
        InsuranceApplicable: ParseBool(body, "insuranceApplicable", true),
        InsuranceAmount: ParseDecimal(body, "insuranceAmount"),
        ContractEndDate: ParseDateN(body, "contractEndDate"),
        LicenseNumber: GetString(body, "licenseNumber"),
        LicenseExpiry: ParseDateN(body, "licenseExpiry"),
        AssignedVehicleId: GetString(body, "assignedVehicleId"),
        RouteAllowance: ParseDecimal(body, "routeAllowance"),
        FuelAllowance: ParseDecimal(body, "fuelAllowance"),
        LoadingAllowance: ParseDecimal(body, "loadingAllowance"),
        HaltingAllowance: ParseDecimal(body, "haltingAllowance"),
        DriverBhatta: ParseDecimal(body, "driverBhatta"),
        Status: GetString(body, "status") ?? "Active");

    static string? GetString(Dictionary<string, JsonElement> body, string key)
    {
        if (!body.TryGetValue(key, out var el)) return null;
        return el.ValueKind switch
        {
            JsonValueKind.String => NullIfEmpty(el.GetString()),
            JsonValueKind.Number => el.GetRawText(),
            JsonValueKind.True => "true",
            JsonValueKind.False => "false",
            JsonValueKind.Null => null,
            _ => NullIfEmpty(el.ToString()),
        };
    }

    static string? NullIfEmpty(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

    static Guid? ParseGuidN(Dictionary<string, JsonElement> body, string key)
    {
        var s = GetString(body, key);
        return Guid.TryParse(s, out var g) ? g : null;
    }

    static decimal ParseDecimal(Dictionary<string, JsonElement> body, string key, decimal defaultValue = 0)
    {
        var s = GetString(body, key);
        return decimal.TryParse(s, NumberStyles.Any, CultureInfo.InvariantCulture, out var d) ? d : defaultValue;
    }

    static bool ParseBool(Dictionary<string, JsonElement> body, string key, bool defaultValue)
    {
        if (!body.TryGetValue(key, out var el)) return defaultValue;
        return el.ValueKind switch
        {
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.String => bool.TryParse(el.GetString(), out var b) ? b : defaultValue,
            _ => defaultValue,
        };
    }

    public static DateOnly? ParseDateN(Dictionary<string, JsonElement> body, string key)
    {
        var s = GetString(body, key);
        return ParseDateString(s);
    }

    public static DateOnly? ParseDateString(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return null;
        s = s.Trim();

        if (DateOnly.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.None, out var d)) return d;
        if (s.Length >= 10 && DateOnly.TryParse(s.AsSpan(0, 10), CultureInfo.InvariantCulture, DateTimeStyles.None, out d))
            return d;

        string[] formats = ["yyyy-MM-dd", "dd/MM/yyyy", "MM/dd/yyyy", "d/M/yyyy", "dd-MM-yyyy", "MM-dd-yyyy"];
        if (DateOnly.TryParseExact(s, formats, CultureInfo.InvariantCulture, DateTimeStyles.None, out d))
            return d;

        return null;
    }
}
