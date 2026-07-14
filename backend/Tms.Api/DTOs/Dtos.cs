using System.Text.Json.Serialization;
using Tms.Api.Models;
using Tms.Api.Services;

namespace Tms.Api.DTOs;

public record LoginRequest(string Username, string Password);
public record LoginResponse(
    string Token,
    string Name,
    string Role,
    string Username,
    Guid? CompanyId,
    string? CompanyName,
    Guid? BranchId,
    string? BranchName,
    bool CanAccessAllBranches,
    bool IsPlatformAdmin,
    string? PlanCode,
    IReadOnlyList<string>? Features);
public record ApiError(string Message);

public record BookingDto(
    string Id, string Date, string Customer, string? Consignor, string? Consignee,
    string From, string To, string? Material, string? Quantity,
    string? Vehicle, string? Driver, decimal Freight, string Status, string Payment,
    decimal Advance, decimal Balance, string? Remarks);

public record CreateBookingRequest(
    string Date, string Customer, string? Consignor, string? Consignee,
    string From, string To, string? Material, string? Quantity,
    string? Vehicle, string? Driver, decimal Freight, string Status, string Payment,
    decimal Advance, string? Remarks, string? LrNumber = null);

public record VehicleDto(
    string Id, string Number, string? Type, string? Model, string? Capacity, string? Owner,
    string Status, string? Insurance, string? Fitness, string? Permit, string? Puc,
    string? LastMaintenance, int Trips, decimal Revenue);

public record DriverDto(
    string Id, string Name, string? License, string? LicenseExpiry, string? Phone,
    string? Email, string? Address, decimal Salary, decimal Advance, string Status,
    int Trips, decimal Rating);

public record CustomerDto(
    string Id, string Name, string? Contact, string? Phone, string? Email, string? Gst,
    string? Address, decimal Outstanding, decimal CreditLimit, int TotalTrips, decimal LedgerBalance,
    bool PortalEnabled = false, string? PortalPhone = null, bool HasPin = false,
    Guid? BranchId = null, string? BranchName = null, string? BranchCode = null);

public record VendorDto(
    string Id, string Name, string? Contact, string? Phone, string? Email, string? Gst,
    string? Address, decimal Outstanding, string? Category, int TotalBills);

public record ExpenseDto(
    string Id, string Date, string Category, string? Description, string? Vehicle,
    string? Vendor, decimal Amount, string? PaymentMode, string Status);

public record LrDto(
    string LrNumber, string LrDate, string? Consignor, string? Consignee,
    string From, string To, string? Vehicle, string? Driver, string? Material,
    string? Quantity, decimal Freight, decimal Gst, decimal Balance, string PaymentType,
    string? BookingId, decimal? Hamali, decimal? LoadingCharges, decimal? UnloadingCharges,
    decimal? Insurance, decimal? Advance, string? Remarks);

public record DashboardStatsDto(
    int TotalVehicles, int TotalDrivers, int TotalCustomers, int TotalTrips,
    int PendingLr, int TodaysBookings, decimal TotalIncome, decimal TotalExpenses,
    decimal NetProfit, decimal CashBalance, decimal BankBalance);

public record RecentBookingDto(string Id, string Customer, string Route, string Date, string Status, string Payment);
public record RecentTripDto(string Lr, string Vehicle, string Driver, string From, string To, string Freight);

public record PagedResult<T>(
    IReadOnlyList<T> Items,
    int Total,
    int Page,
    int PageSize,
    bool HasMore = false,
    bool TotalIsApproximate = false)
{
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling(Total / (double)PageSize) : 0;
}

public record PayrollRunDto(
    Guid Id,
    string RunCode,
    int PayMonth,
    int PayYear,
    string PeriodLabel,
    string Status,
    decimal TotalGross,
    decimal TotalDeductions,
    decimal TotalNet,
    int EntryCount,
    string? PaymentMode,
    DateTime? ProcessedAt,
    DateTime? PaidAt,
    string? Remarks,
    Guid? VoucherId,
    string? VoucherNo,
    DateTime? CreatedAt);

public record PayrollAccountingAttendantDto(
    Guid Id,
    Guid RunId,
    Guid VoucherId,
    string VoucherNo,
    string LinkType,
    string? DebitLedger,
    string? CreditLedger,
    decimal Amount,
    string? Narration,
    string? VoucherDate,
    string? VoucherType,
    string? PaymentMode,
    DateTime? CreatedAt);

public record PayrollEntryDto(
    Guid Id,
    Guid RunId,
    string EmployeeType,
    string EmployeeId,
    string EmployeeName,
    string? EmploymentType,
    decimal BasicSalary,
    decimal TripIncentive,
    decimal Overtime,
    decimal OtherAllowance,
    decimal TmsAllowance,
    decimal GrossPay,
    decimal PfDeduction,
    decimal EsiDeduction,
    decimal InsuranceDeduction,
    decimal AdvanceRecovery,
    decimal OtherDeduction,
    decimal DaysWorked,
    decimal NetPay,
    string PaymentStatus,
    DateTime? PaidAt);

public record PayrollSummaryDto(
    long TotalRuns = 0,
    long DraftRuns = 0,
    long ProcessedRuns = 0,
    long PaidRuns = 0,
    decimal TotalPaidAmount = 0,
    long ActiveDrivers = 0,
    long ActiveEmployees = 0,
    string? LastRunPeriod = null);

public record PayrollSettingDto(string Key, string Value, string? Description, DateTime? UpdatedAt);
public record UpdatePayrollSettingRequest(string Key, string Value);

public record PayslipDto(
    Guid EntryId, Guid RunId, string RunCode, string PeriodLabel,
    int PayMonth, int PayYear, string RunStatus,
    string EmployeeType, string EmployeeId, string EmployeeName,
    string? EmploymentType, string? DepartmentName, string? DesignationName,
    decimal BasicSalary, decimal TripIncentive, decimal Overtime,
    decimal OtherAllowance, decimal TmsAllowance, decimal GrossPay,
    decimal PfDeduction, decimal EsiDeduction, decimal InsuranceDeduction,
    decimal AdvanceRecovery, decimal OtherDeduction, decimal DaysWorked,
    decimal NetPay, string PaymentStatus, DateTime? PaidAt, string? CompanyName);

public record PayslipListItemDto(
    Guid EntryId, Guid RunId, string RunCode, string PeriodLabel,
    string EmployeeId, string EmployeeName, string EmployeeType,
    decimal GrossPay, decimal NetPay, string PaymentStatus, DateTime? PaidAt);

public record SalaryRegisterRowDto(
    string RunCode, string PeriodLabel, string EmployeeId, string EmployeeName,
    string EmployeeType, string? EmploymentType, decimal DaysWorked,
    decimal BasicSalary, decimal TripIncentive, decimal Overtime,
    decimal OtherAllowance, decimal TmsAllowance, decimal GrossPay, decimal PfDeduction,
    decimal EsiDeduction, decimal InsuranceDeduction,
    decimal AdvanceRecovery, decimal OtherDeduction, decimal NetPay, string PaymentStatus);

public record HrSummaryDto(
    long TotalEmployees = 0, long ActiveEmployees = 0, long OnLeave = 0,
    long Departments = 0, long PendingLeaves = 0,
    long TodayPresent = 0, long TodayAbsent = 0);

public record HrDepartmentDto(
    Guid Id, string Code, string Name, string? Description,
    string Status, long EmployeeCount, DateTime CreatedAt);

public record SaveDepartmentRequest(
    Guid? Id, string Code, string Name, string? Description, string? Status);

public record HrDesignationDto(
    Guid Id, string Code, string Name, Guid? DepartmentId,
    string? DepartmentName, int GradeLevel, string Status);

public record HrEmployeeDto(
    Guid Id, string EmployeeCode, string Name, string EmployeeType,
    string EmploymentType,
    Guid? DepartmentId, string? DepartmentName,
    Guid? DesignationId, string? DesignationName,
    string? DriverId, string? Email, string? Phone,
    DateOnly? DateOfJoining, decimal BasicSalary, decimal DailyWage,
    decimal Hra, decimal Da, decimal Conveyance, decimal OtherAllowance, decimal Advance,
    bool PfApplicable, bool EsiApplicable, bool InsuranceApplicable, decimal InsuranceAmount,
    DateOnly? ContractEndDate, string Status, DateTime CreatedAt);

public record HrEmployeeDetailDto(
    Guid Id, string EmployeeCode, string Name, string EmployeeType,
    string EmploymentType,
    Guid? DepartmentId, string? DepartmentName,
    Guid? DesignationId, string? DesignationName,
    string? DriverId, string? Email, string? Phone,
    DateOnly? DateOfJoining, DateOnly? DateOfBirth, string? Gender, string? Address,
    string? BankAccount, string? BankIfsc, string? Pan,
    decimal BasicSalary, decimal DailyWage, decimal Hra, decimal Da, decimal Conveyance,
    decimal OtherAllowance, decimal Advance, bool PfApplicable, bool EsiApplicable,
    bool InsuranceApplicable, decimal InsuranceAmount, DateOnly? ContractEndDate,
    string? LicenseNumber, DateOnly? LicenseExpiry, string? AssignedVehicleId,
    decimal RouteAllowance, decimal FuelAllowance, decimal LoadingAllowance,
    decimal HaltingAllowance, decimal DriverBhatta,
    string Status, DateTime CreatedAt);

public record SaveEmployeeRequest(
    [property: JsonConverter(typeof(NullableGuidJsonConverter))] Guid? Id,
    string EmployeeCode, string Name, string? EmployeeType,
    string? EmploymentType,
    [property: JsonConverter(typeof(NullableGuidJsonConverter))] Guid? DepartmentId,
    [property: JsonConverter(typeof(NullableGuidJsonConverter))] Guid? DesignationId,
    string? DriverId,
    string? Email, string? Phone,
    [property: JsonConverter(typeof(NullableDateOnlyJsonConverter))] DateOnly? DateOfJoining,
    [property: JsonConverter(typeof(NullableDateOnlyJsonConverter))] DateOnly? DateOfBirth,
    string? Gender, string? Address, string? BankAccount, string? BankIfsc, string? Pan,
    decimal BasicSalary = 0, decimal DailyWage = 0, decimal Hra = 0, decimal Da = 0,
    decimal Conveyance = 0, decimal OtherAllowance = 0, decimal Advance = 0,
    bool PfApplicable = true, bool EsiApplicable = true, bool InsuranceApplicable = true,
    decimal InsuranceAmount = 0,
    [property: JsonConverter(typeof(NullableDateOnlyJsonConverter))] DateOnly? ContractEndDate = null,
    string? LicenseNumber = null,
    [property: JsonConverter(typeof(NullableDateOnlyJsonConverter))] DateOnly? LicenseExpiry = null,
    string? AssignedVehicleId = null,
    decimal RouteAllowance = 0, decimal FuelAllowance = 0, decimal LoadingAllowance = 0,
    decimal HaltingAllowance = 0, decimal DriverBhatta = 0,
    string? Status = "Active");

public record HrAttendanceDto(
    Guid Id, Guid EmployeeId, string EmployeeCode, string EmployeeName,
    DateTime AttendanceDate, string Status, TimeSpan? CheckIn, TimeSpan? CheckOut,
    decimal OvertimeHours, string? Remarks);

public record MarkAttendanceRequest(
    Guid EmployeeId, DateOnly Date, string Status,
    TimeSpan? CheckIn = null, TimeSpan? CheckOut = null,
    decimal OvertimeHours = 0, string? Remarks = null);

public record BulkAttendanceRequest(
    DateOnly Date, List<Guid> EmployeeIds, string? Status = "Present");

public record HrLeaveTypeDto(
    Guid Id, string Code, string Name, int DaysPerYear, bool IsPaid, string Status);

public record HrLeaveRequestDto(
    Guid Id, Guid EmployeeId, string EmployeeCode, string EmployeeName,
    Guid LeaveTypeId, string LeaveTypeName,
    DateTime FromDate, DateTime ToDate, decimal Days, string? Reason,
    string Status, string? ApprovedBy, DateTime? ApprovedAt, DateTime CreatedAt);

public record ApplyLeaveRequest(
    Guid EmployeeId, Guid LeaveTypeId,
    DateOnly FromDate, DateOnly ToDate, decimal Days, string? Reason);

public record HrHolidayDto(Guid Id, DateTime HolidayDate, string Name, int Year);

public record GeneratePayrollRequest(int Month, int Year);
public record PayPayrollRequest(string? PaymentMode);
