using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;
using Tms.Api.Services;

namespace Tms.Api.Tests.Infrastructure;

/// <summary>Seeds a sample LR at each operational workflow stage for integration tests.</summary>
public static class WorkflowTestSeed
{
    public static readonly Guid TestBranchId = Guid.Parse("00000000-0000-4000-8000-000000000098");
    public const string FlowLrNumber = "TC/PN/2026-27/LR/00099";
    public const string LoadingSheetNo = "TC/PN/2026-27/LS/00099";
    public const string TransitPassNo = "TC/PN/2026-27/TP/00099";
    public const string DispatchNo = "TC/PN/2026-27/TRP/00099";
    public const string DeliverySheetNo = "TC/PN/2026-27/DS/00099";

    public static void EnsureBranch(TmsDbContext db)
    {
        if (db.Branches.Any(b => b.Id == TestBranchId)) return;
        db.Branches.Add(new Branch
        {
            Id = TestBranchId,
            CompanyId = TmsWebApplicationFactory.TestCompanyId,
            Code = "PN",
            Name = "Pune HO",
            City = "Pune",
            IsHeadOffice = true,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        db.SaveChanges();
    }

    public static LorryReceipt SeedInTransitLr(TmsDbContext db)
    {
        EnsureBranch(db);
        var existing = db.LorryReceipts.FirstOrDefault(l => l.LrNumber == FlowLrNumber);
        if (existing != null) return existing;

        var loadingId = Guid.Parse("00000000-0000-4000-8000-000000000201");
        var lr = new LorryReceipt
        {
            LrNumber = FlowLrNumber,
            CompanyId = TmsWebApplicationFactory.TestCompanyId,
            BranchId = TestBranchId,
            LrDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Consignor = "Sample Consignor",
            Consignee = "Sample Consignee",
            FromCity = "Mumbai",
            ToCity = "Pune",
            VehicleNumber = "MH12AB1234",
            DriverName = "Test Driver",
            Material = "General",
            Quantity = "10 Pkgs / 500 Kg",
            Freight = 15000,
            Gst = 2700,
            Balance = 17700,
            PaymentType = "To Pay",
            Status = LrStatuses.InTransit,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.LorryReceipts.Add(lr);

        db.LrLoadingSheets.Add(new LrLoadingSheet
        {
            Id = loadingId,
            CompanyId = lr.CompanyId,
            LrNumber = lr.LrNumber,
            SheetNumber = LoadingSheetNo,
            LoadingLocation = "Mumbai Warehouse",
            LoadingStatus = "Completed",
            VehicleNumber = lr.VehicleNumber,
            LoadingAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });

        db.LrTransitPasses.Add(new LrTransitPass
        {
            Id = Guid.Parse("00000000-0000-4000-8000-000000000202"),
            CompanyId = lr.CompanyId,
            LrNumber = lr.LrNumber,
            LoadingSheetId = loadingId,
            PassNumber = TransitPassNo,
            VehicleNumber = lr.VehicleNumber,
            DriverName = lr.DriverName,
            RouteFrom = lr.FromCity,
            RouteTo = lr.ToCity,
            IssueDate = DateOnly.FromDateTime(DateTime.UtcNow),
            ExtendedDataJson = """{"passStatus":"Dispatched"}""",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });

        db.LrDeliverySheets.Add(new LrDeliverySheet
        {
            Id = Guid.Parse("00000000-0000-4000-8000-000000000203"),
            CompanyId = lr.CompanyId,
            LrNumber = lr.LrNumber,
            LoadingSheetId = loadingId,
            SheetNumber = DeliverySheetNo,
            ShipmentStatus = "In Transit",
            TripNo = DispatchNo,
            DeliveryLocation = lr.ToCity,
            ReceiverName = lr.Consignee,
            ExtendedDataJson =
                $$"""{"dispatch":{"dispatchNo":"{{DispatchNo}}","startingKm":1200},"inTransitStatus":"In Transit","checkpoints":[]}""",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });

        db.SaveChanges();
        return lr;
    }

    public static LorryReceipt SeedDeliveredLr(TmsDbContext db)
    {
        SeedInTransitLr(db);
        var lr = db.LorryReceipts.First(l => l.LrNumber == FlowLrNumber);
        lr.Status = LrStatuses.DeliveryCompleted;
        lr.UpdatedAt = DateTime.UtcNow;

        var sheet = db.LrDeliverySheets.First(s => s.LrNumber == FlowLrNumber);
        sheet.ShipmentStatus = "Delivered";
        sheet.DeliveryDate = DateOnly.FromDateTime(DateTime.UtcNow);
        sheet.PackagesTotal = 10;
        sheet.PackagesReceived = 10;
        sheet.ExtendedDataJson =
            $$"""{"dispatch":{"dispatchNo":"{{DispatchNo}}","startingKm":1200},"deliveryOutcome":"Delivered","checkpoints":[]}""";
        sheet.UpdatedAt = DateTime.UtcNow;

        db.SaveChanges();
        return lr;
    }
}
