using FluentAssertions;
using Tms.Api.Models;
using Tms.Api.Services;

namespace Tms.Api.Tests.Services;

public class LrMovementReportBuilderTests
{
    static LorryReceipt Lr(
        string no = "LR-1",
        string from = "Pune",
        string to = "Mumbai",
        string status = LrStatuses.InTransit) => new()
    {
        LrNumber = no,
        LrDate = new DateOnly(2026, 9, 1),
        FromCity = from,
        ToCity = to,
        Status = status,
        Consignor = "Consignor A",
        Consignee = "Consignee B",
        VehicleNumber = "MH12AB1234",
        DriverName = "Driver X",
        BookingId = "BK-1",
        CreatedAt = new DateTime(2026, 9, 1, 8, 0, 0, DateTimeKind.Utc),
        UpdatedAt = new DateTime(2026, 9, 2, 12, 0, 0, DateTimeKind.Utc),
        CompanyId = Guid.Parse("00000000-0000-4000-8000-000000000099"),
    };

    [Fact]
    public void Direct_lr_synthesizes_loading_dispatch_delivery_without_movements()
    {
        var lr = Lr(status: LrStatuses.PodUploaded);
        var loading = new LrLoadingSheet
        {
            LrNumber = lr.LrNumber,
            SheetNumber = "LS-1",
            LoadingLocation = "Pune WH",
            LoadingAt = new DateTime(2026, 9, 1, 10, 0, 0, DateTimeKind.Utc),
            VehicleNumber = lr.VehicleNumber,
            CreatedAt = new DateTime(2026, 9, 1, 10, 0, 0, DateTimeKind.Utc),
        };
        var pass = new LrTransitPass
        {
            LrNumber = lr.LrNumber,
            PassNumber = "TP-1",
            IssueDate = new DateOnly(2026, 9, 1),
            RouteFrom = "Pune",
            RouteTo = "Mumbai",
            VehicleNumber = lr.VehicleNumber,
            DriverName = lr.DriverName,
            CreatedAt = new DateTime(2026, 9, 1, 11, 0, 0, DateTimeKind.Utc),
        };
        var delivery = new LrDeliverySheet
        {
            LrNumber = lr.LrNumber,
            TripNo = "TRP-1",
            DeliveryDate = new DateOnly(2026, 9, 2),
            DeliveryLocation = "Mumbai",
            ReceiverName = "Receiver",
            PodNo = "POD-1",
            ExtendedDataJson = """{"dispatch":{"dispatchNo":"TRP-1","dispatchDate":"2026-09-01","dispatchTime":"14:30"}}""",
            CreatedAt = new DateTime(2026, 9, 1, 14, 30, 0, DateTimeKind.Utc),
            UpdatedAt = new DateTime(2026, 9, 2, 18, 0, 0, DateTimeKind.Utc),
        };

        var rows = LrMovementReportBuilder.BuildEvents(lr, loading, pass, delivery, [], []);

        rows.Should().NotBeEmpty();
        rows.Select(r => r.Event).Should().Contain(new[] { "LR Created", "Loading", "Transit Pass", "Dispatch", "In Transit", "Delivery", "POD" });
        rows.Should().OnlyContain(r => r.MovementType == LrMovementTypes.Direct);
        rows.Should().BeInAscendingOrder(r => r.SortAt);
        rows.Select(r => r.Event).Should().OnlyHaveUniqueItems();
    }

    [Fact]
    public void Hub_transfer_expands_movement_timestamps()
    {
        var lr = Lr(status: LrStatuses.AvailableForReManifest);
        var mov = new LrMovement
        {
            LrNumber = lr.LrNumber,
            MovementNo = 1,
            MovementType = LrMovementTypes.HubTransfer,
            FromLocation = "Pune",
            ToLocation = "Nagpur Hub",
            CurrentHubName = "Nagpur Hub",
            VehicleNumber = "MH14XX9999",
            DriverName = "Hub Driver",
            Status = LrMovementStatuses.ReadyForReManifest,
            CreatedAt = new DateTime(2026, 9, 1, 9, 0, 0, DateTimeKind.Utc),
            DispatchAt = new DateTime(2026, 9, 1, 12, 0, 0, DateTimeKind.Utc),
            HubReceivedAt = new DateTime(2026, 9, 1, 18, 0, 0, DateTimeKind.Utc),
            UnloadAt = new DateTime(2026, 9, 1, 19, 0, 0, DateTimeKind.Utc),
        };

        var rows = LrMovementReportBuilder.BuildEvents(lr, null, null, null, [mov], []);

        rows.Select(r => r.Event).Should().Contain(new[]
        {
            "Manifest Created", "Dispatch", "In Transit", "Hub Arrival", "Hub Receive", "Unload", "Ready for Re-Manifest",
        });
        rows.Should().Contain(r => r.MovementType == LrMovementTypes.HubTransfer);
        rows.Should().BeInAscendingOrder(r => r.SortAt);
    }

    [Fact]
    public void Multiple_hub_legs_are_ordered_by_movement_no()
    {
        var lr = Lr(status: LrStatuses.InTransit);
        var leg1 = new LrMovement
        {
            LrNumber = lr.LrNumber,
            MovementNo = 1,
            MovementType = LrMovementTypes.HubTransfer,
            FromLocation = "Pune",
            ToLocation = "Hub A",
            Status = LrMovementStatuses.ReManifested,
            CreatedAt = new DateTime(2026, 9, 1, 9, 0, 0, DateTimeKind.Utc),
            DispatchAt = new DateTime(2026, 9, 1, 10, 0, 0, DateTimeKind.Utc),
            HubReceivedAt = new DateTime(2026, 9, 1, 14, 0, 0, DateTimeKind.Utc),
            UnloadAt = new DateTime(2026, 9, 1, 15, 0, 0, DateTimeKind.Utc),
        };
        var leg2 = new LrMovement
        {
            LrNumber = lr.LrNumber,
            MovementNo = 2,
            MovementType = LrMovementTypes.HubTransfer,
            FromLocation = "Hub A",
            ToLocation = "Mumbai",
            Status = LrMovementStatuses.InTransit,
            CreatedAt = new DateTime(2026, 9, 2, 9, 0, 0, DateTimeKind.Utc),
            DispatchAt = new DateTime(2026, 9, 2, 11, 0, 0, DateTimeKind.Utc),
        };

        var rows = LrMovementReportBuilder.BuildEvents(lr, null, null, null, [leg2, leg1], []);
        var reDispatch = rows.First(r => r.Event == "Re-dispatch");
        var firstDispatch = rows.First(r => r.Event == "Dispatch");
        reDispatch.SortAt.Should().BeAfter(firstDispatch.SortAt);
    }

    [Fact]
    public void Missing_docs_still_emit_lr_created()
    {
        var lr = Lr(status: LrStatuses.LRCreated);
        var rows = LrMovementReportBuilder.BuildEvents(lr, null, null, null, [], []);
        rows.Should().ContainSingle(r => r.Event == "LR Created");
        rows.Should().OnlyContain(r => r.MovementType == LrMovementTypes.Direct);
    }

    [Fact]
    public void Status_history_fills_closed_without_duplicating_loading()
    {
        var lr = Lr(status: LrStatuses.Closed);
        var loading = new LrLoadingSheet
        {
            LrNumber = lr.LrNumber,
            SheetNumber = "LS-9",
            LoadingAt = new DateTime(2026, 9, 1, 10, 0, 0, DateTimeKind.Utc),
            CreatedAt = new DateTime(2026, 9, 1, 10, 0, 0, DateTimeKind.Utc),
        };
        var hist = new List<LrStatusHistory>
        {
            new()
            {
                LrNumber = lr.LrNumber,
                NewStatus = LrStatuses.LoadingCompleted,
                ChangedAt = new DateTime(2026, 9, 1, 10, 5, 0, DateTimeKind.Utc),
            },
            new()
            {
                LrNumber = lr.LrNumber,
                NewStatus = LrStatuses.Closed,
                ChangedAt = new DateTime(2026, 9, 5, 12, 0, 0, DateTimeKind.Utc),
                Remarks = "Done",
            },
        };

        var rows = LrMovementReportBuilder.BuildEvents(lr, loading, null, null, [], hist);
        rows.Count(r => r.Event == "Loading").Should().Be(1);
        rows.Should().Contain(r => r.Event == "Completed");
    }
}
