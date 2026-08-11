using Tms.Api.Models;
using Tms.Api.Services;

namespace Tms.Api.Tests.Services;

public class LrProcessServiceTests
{
    static LorryReceipt Lr(string status) => new()
    {
        LrNumber = "TEST-LR",
        CompanyId = Guid.NewGuid(),
        Status = status,
        FromCity = "A",
        ToCity = "B",
    };

    [Fact]
    public void EnsureStatusAtLeast_allows_when_at_required_stage()
    {
        var lr = Lr(LrStatuses.TransitPassGenerated);
        var act = () => LrProcessService.EnsureStatusAtLeast(lr, LrStatuses.TransitPassGenerated);
        act.Should().NotThrow();
    }

    [Fact]
    public void EnsureStatusAtLeast_allows_when_past_required_stage()
    {
        var lr = Lr(LrStatuses.InTransit);
        var act = () => LrProcessService.EnsureStatusAtLeast(lr, LrStatuses.TransitPassGenerated);
        act.Should().NotThrow();
    }

    [Fact]
    public void EnsureStatusAtLeast_blocks_when_prior_step_incomplete()
    {
        var lr = Lr(LrStatuses.LoadingCompleted);
        var act = () => LrProcessService.EnsureStatusAtLeast(lr, LrStatuses.TransitPassGenerated);
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*Transit Pass Generated*");
    }

    [Fact]
    public void EnsureStatusAtLeast_blocks_closed_lr()
    {
        var lr = Lr(LrStatuses.Closed);
        var act = () => LrProcessService.EnsureStatusAtLeast(lr, LrStatuses.LRCreated);
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*closed*");
    }
}
