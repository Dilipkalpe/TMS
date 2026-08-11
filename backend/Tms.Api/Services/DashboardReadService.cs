using System.Text.Json;
using Dapper;
using Npgsql;
using Tms.Api.DTOs;

namespace Tms.Api.Services;

/// <summary>High-performance dashboard reads via PostgreSQL stored procedures.</summary>
public sealed class DashboardReadService(IConfiguration config, ILogger<DashboardReadService> logger)
{
    static readonly JsonSerializerOptions HomeJsonOpts = CreateHomeJsonOptions();

    static JsonSerializerOptions CreateHomeJsonOptions()
    {
        var opts = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        opts.Converters.Add(new NullableDateOnlyJsonConverter());
        opts.Converters.Add(new DateOnlyJsonConverter());
        return opts;
    }

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

    public async Task<DashboardHomeDto?> TryGetHomeAsync(
        Guid companyId,
        Guid? branchId,
        DateOnly dateFrom,
        DateOnly dateTo,
        CancellationToken ct = default)
    {
        try
        {
            await using var conn = await SqlReadConnection.OpenReadAsync(config, ct);
            // Dapper does not bind System.DateOnly — pass DateTime (date component only).
            var json = await conn.QuerySingleOrDefaultAsync<string>(
                new CommandDefinition(
                    "SELECT sp_dashboard_home(@p_company_id, @p_branch_id, @p_date_from, @p_date_to)::text",
                    new
                    {
                        p_company_id = companyId,
                        p_branch_id = (object?)branchId ?? DBNull.Value,
                        p_date_from = dateFrom.ToDateTime(TimeOnly.MinValue),
                        p_date_to = dateTo.ToDateTime(TimeOnly.MinValue),
                    },
                    commandTimeout: SchemaMigrationHelper.CommandTimeoutSeconds,
                    cancellationToken: ct));

            if (string.IsNullOrWhiteSpace(json)) return null;

            var payload = JsonSerializer.Deserialize<DashboardHomeJsonPayload>(json, HomeJsonOpts);
            return payload?.ToDto();
        }
        catch (PostgresException ex) when (ex.SqlState is "42883")
        {
            logger.LogDebug("sp_dashboard_home not installed — using EF fallback");
            return null;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "sp_dashboard_home failed — using EF fallback");
            return null;
        }
    }

    public async Task<object?> TryGetChartAsync(
        Guid companyId,
        Guid? branchId,
        string chart,
        CancellationToken ct = default)
    {
        try
        {
            await using var conn = await SqlReadConnection.OpenReadAsync(config, ct);
            var json = await conn.QuerySingleOrDefaultAsync<string>(
                new CommandDefinition(
                    "SELECT sp_dashboard_chart(@p_company_id, @p_branch_id, @p_chart)::text",
                    new
                    {
                        p_company_id = companyId,
                        p_branch_id = (object?)branchId ?? DBNull.Value,
                        p_chart = chart,
                    },
                    commandTimeout: SchemaMigrationHelper.CommandTimeoutSeconds,
                    cancellationToken: ct));

            if (string.IsNullOrWhiteSpace(json)) return null;

            return JsonSerializer.Deserialize<object>(json, HomeJsonOpts);
        }
        catch (PostgresException ex) when (ex.SqlState is "42883")
        {
            logger.LogDebug("sp_dashboard_chart not installed — using EF fallback for {Chart}", chart);
            return null;
        }
        catch (PostgresException ex) when (ex.SqlState is "P0001")
        {
            logger.LogDebug("sp_dashboard_chart unknown chart {Chart} — using EF fallback", chart);
            return null;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "sp_dashboard_chart failed for {Chart} — using EF fallback", chart);
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

    sealed class DashboardHomeJsonPayload
    {
        public List<DashboardHomeKpiDto> Kpis { get; set; } = [];
        public List<DashboardHomeTrendPointDto> LrTrend { get; set; } = [];
        public List<DashboardHomeStatusSliceDto> LrStatusSummary { get; set; } = [];
        public int LrStatusTotal { get; set; }
        public List<DashboardHomeDestinationDto> TopDestinations { get; set; } = [];
        public List<DashboardHomeRecentLrDto> RecentLrs { get; set; } = [];
        public List<DashboardHomePendingDeliveryDto> PendingDeliveries { get; set; } = [];
        public List<DashboardHomeNotificationDto> Notifications { get; set; } = [];
        public DateOnly DateFrom { get; set; }
        public DateOnly DateTo { get; set; }

        public DashboardHomeDto ToDto() => new(
            Kpis,
            LrTrend,
            LrStatusSummary,
            LrStatusTotal,
            TopDestinations,
            RecentLrs,
            PendingDeliveries,
            Notifications,
            DateFrom,
            DateTo,
            DateTime.UtcNow);
    }
}
