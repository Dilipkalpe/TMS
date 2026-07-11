using Dapper;
using Npgsql;
using Tms.Api.DTOs;

namespace Tms.Api.Services;

/// <summary>High-performance dashboard reads via PostgreSQL stored procedures.</summary>
public sealed class DashboardReadService(IConfiguration config, ILogger<DashboardReadService> logger)
{
    public async Task<DashboardStatsDto?> TryGetStatsAsync(
        Guid companyId, Guid? branchId, CancellationToken ct = default)
    {
        try
        {
            await using var conn = await SqlReadConnection.OpenReadAsync(config, ct);
            var row = await conn.QuerySingleOrDefaultAsync<DashboardStatsRow>(
                new CommandDefinition(
                    "SELECT * FROM sp_dashboard_stats(@p_company_id, @p_branch_id)",
                    new { p_company_id = companyId, p_branch_id = (object?)branchId ?? DBNull.Value },
                    commandTimeout: SchemaMigrationHelper.CommandTimeoutSeconds,
                    cancellationToken: ct));

            return row?.ToDto();
        }
        catch (PostgresException ex) when (ex.SqlState is "42883")
        {
            logger.LogDebug("sp_dashboard_stats not installed — using EF fallback");
            return null;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Dashboard stats SP failed — using EF fallback");
            return null;
        }
    }

    sealed class DashboardStatsRow
    {
        public int total_vehicles { get; init; }
        public int total_drivers { get; init; }
        public int total_customers { get; init; }
        public int total_trips { get; init; }
        public int pending_lr { get; init; }
        public int todays_bookings { get; init; }
        public decimal total_income { get; init; }
        public decimal total_expenses { get; init; }
        public decimal net_profit { get; init; }
        public decimal cash_balance { get; init; }
        public decimal bank_balance { get; init; }

        public DashboardStatsDto ToDto() => new(
            total_vehicles, total_drivers, total_customers, total_trips,
            pending_lr, todays_bookings, total_income, total_expenses,
            net_profit, cash_balance, bank_balance);
    }
}
