using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;
using Tms.Api.Services;
using Tms.Api.Tests.Infrastructure;

namespace Tms.Api.Tests.Services;

public class LrOperationsServiceTests
{
    static TmsDbContext CreateDb()
    {
        var opts = new DbContextOptionsBuilder<TmsDbContext>()
            .UseInMemoryDatabase($"LrOpsTests_{Guid.NewGuid():N}")
            .Options;
        return new TmsDbContext(opts);
    }

    [Theory]
    [InlineData(LrStatuses.LRCreated, "Create Loading")]
    [InlineData(LrStatuses.LoadingCompleted, "Generate Transit Pass")]
    [InlineData(LrStatuses.TransitPassGenerated, "Dispatch Vehicle")]
    [InlineData(LrStatuses.InTransit, "Confirm Delivery")]
    [InlineData(LrStatuses.DeliveryCompleted, "Upload POD")]
    [InlineData(LrStatuses.PodUploaded, "Generate Invoice")]
    public void ResolveNextAction_returns_flow_labels(string status, string expected)
    {
        LrOperationsService.ResolveNextAction(status).Label.Should().Be(expected);
    }

    [Fact]
    public async Task ApplyStageFilter_dispatched_returns_in_transit_lrs_only()
    {
        await using var db = CreateDb();
        db.LorryReceipts.AddRange(
            new LorryReceipt { LrNumber = "L1", CompanyId = TmsWebApplicationFactory.TestCompanyId, Status = LrStatuses.InTransit, FromCity = "A", ToCity = "B" },
            new LorryReceipt { LrNumber = "L2", CompanyId = TmsWebApplicationFactory.TestCompanyId, Status = LrStatuses.DeliveryCompleted, FromCity = "A", ToCity = "B" });
        await db.SaveChangesAsync();

        var q = db.LorryReceipts.AsQueryable();
        var filtered = LrOperationsService.ApplyStageFilter(q, db, LrOperationStages.Dispatched);
        var numbers = await filtered.Select(l => l.LrNumber).ToListAsync();

        numbers.Should().Equal(["L1"]);
    }

    [Fact]
    public async Task ApplyStageFilter_transit_pass_generated_stage()
    {
        await using var db = CreateDb();
        db.LorryReceipts.AddRange(
            new LorryReceipt { LrNumber = "TP1", CompanyId = TmsWebApplicationFactory.TestCompanyId, Status = LrStatuses.TransitPassGenerated, FromCity = "A", ToCity = "B" },
            new LorryReceipt { LrNumber = "TP2", CompanyId = TmsWebApplicationFactory.TestCompanyId, Status = LrStatuses.InTransit, FromCity = "A", ToCity = "B" });
        await db.SaveChangesAsync();

        var numbers = await LrOperationsService
            .ApplyStageFilter(db.LorryReceipts.AsQueryable(), db, LrOperationStages.TransitPassGenerated)
            .Select(l => l.LrNumber)
            .ToListAsync();

        numbers.Should().Equal(["TP1"]);
    }
}
