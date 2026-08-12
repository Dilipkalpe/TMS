using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Tms.Api.Data;
using Tms.Api.DTOs;
using Tms.Api.Models;

namespace Tms.Api.Services;

/// <summary>Background-cached accounting register reports (journal, receipt, payment, purchase, sales).</summary>
public sealed class AccountingRegisterJobService(
    TmsDbContext db,
    ITenantContext tenants,
    IBranchContext branches,
    IMemoryCache cache,
    IServiceScopeFactory scopeFactory,
    AccountingReadService accountingRead,
    ILogger<AccountingRegisterJobService> logger)
{
    public static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);
    public static readonly string[] RegisterTypes = ["journal", "receipt", "payment", "purchase", "sales"];

    public static string CacheKey(Guid companyId, string reportType, Guid? branchId = null) =>
        branchId == null
            ? $"accounting:register:{reportType}:{companyId}"
            : $"accounting:register:{reportType}:{companyId}:b:{branchId}";

    public async Task<object> GetRegisterAsync(string reportType, CancellationToken ct = default)
    {
        if (!RegisterTypes.Contains(reportType))
            throw new ArgumentException($"Unknown register type: {reportType}", nameof(reportType));

        var companyId = tenants.EffectiveCompanyId;
        if (companyId == null) return Array.Empty<object>();

        var branchId = branches.EffectiveBranchId;
        var key = CacheKey(companyId.Value, reportType, branchId);

        if (cache.TryGetValue(key, out object? cached) && cached is not null)
        {
            // Company-wide background refresh only when viewing All Branches.
            if (branchId == null)
                _ = EnqueueRefreshIfStaleAsync(companyId.Value, reportType, ct);
            return cached;
        }

        // Branch-scoped views must not use company-wide SP / job cache (those ignore X-Branch-Id).
        if (branchId == null)
        {
            var fromJob = await TryLoadFromCompletedJobAsync(companyId.Value, reportType, ct);
            if (fromJob != null)
            {
                cache.Set(key, fromJob, CacheTtl);
                return fromJob;
            }
        }

        var data = await BuildRegisterAsync(reportType, companyId.Value, branches, skipStoredProc: branchId != null, ct);
        cache.Set(key, data, CacheTtl);

        if (branchId == null)
        {
            try
            {
                await EnqueueAsync(companyId.Value, reportType, ct);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to enqueue {ReportType} register job for company {CompanyId}", reportType, companyId);
            }
        }

        return data;
    }

    public async Task<PagedResult<object>> GetRegisterPagedAsync(
        string reportType,
        int page = 1,
        int pageSize = QueryExtensions.DefaultPageSize,
        string? search = null,
        bool includeTotal = true,
        CancellationToken ct = default)
    {
        var data = await GetRegisterAsync(reportType, ct);
        return PagingHelper.PageRows(PagingHelper.AsObjectList(data), page, pageSize, search, includeTotal);
    }

    public async Task<object?> GetJobStatusAsync(Guid jobId, CancellationToken ct = default)
    {
        var job = await db.AccountingReportJobs.AsNoTracking().FirstOrDefaultAsync(j => j.Id == jobId, ct);
        if (job == null) return null;

        if (tenants.EffectiveCompanyId != null && job.CompanyId != tenants.EffectiveCompanyId)
            return null;

        object? result = null;
        if (job.Status == "Completed" && job.ResultJson != null)
            result = JsonSerializer.Deserialize<object>(job.ResultJson);

        return new
        {
            job.Id,
            job.ReportType,
            job.Status,
            job.Error,
            job.CreatedAt,
            job.CompletedAt,
            result,
        };
    }

    public async Task<Guid> EnqueueAsync(Guid companyId, string reportType, CancellationToken ct = default)
    {
        var pending = await db.AccountingReportJobs.AnyAsync(j =>
            j.CompanyId == companyId && j.ReportType == reportType &&
            (j.Status == "Pending" || j.Status == "Running"), ct);
        if (pending) return Guid.Empty;

        var job = new AccountingReportJob
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            ReportType = reportType,
            Status = "Pending",
            CreatedAt = DateTime.UtcNow,
        };
        db.AccountingReportJobs.Add(job);
        await db.SaveChangesAsync(ct);
        return job.Id;
    }

    public async Task ProcessPendingAsync(CancellationToken ct = default)
    {
        var jobs = await db.AccountingReportJobs
            .Where(j => j.Status == "Pending")
            .OrderBy(j => j.CreatedAt)
            .Take(10)
            .ToListAsync(ct);

        foreach (var job in jobs)
        {
            job.Status = "Running";
            await db.SaveChangesAsync(ct);

            try
            {
                using var scope = scopeFactory.CreateScope();
                var scopedDb = scope.ServiceProvider.GetRequiredService<TmsDbContext>();
                var scopedRead = scope.ServiceProvider.GetRequiredService<AccountingReadService>();
                var tenant = new FixedTenantContext(job.CompanyId);
                // Background cache is always company-wide (All Branches).
                var data = await BuildRegisterAsync(scopedDb, scopedRead, tenant, new AllBranchesContext(), job.ReportType, skipStoredProc: false, ct);
                job.ResultJson = JsonSerializer.Serialize(data);
                job.Status = "Completed";
                job.CompletedAt = DateTime.UtcNow;
                job.Error = null;
                await db.SaveChangesAsync(ct);
                cache.Set(CacheKey(job.CompanyId, job.ReportType), data, CacheTtl);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Accounting register job {JobId} ({Type}) failed", job.Id, job.ReportType);
                job.ResultJson = null;
                job.Status = "Failed";
                job.Error = ex.Message.Length > 2000 ? ex.Message[..2000] : ex.Message;
                job.CompletedAt = DateTime.UtcNow;
                try
                {
                    await db.SaveChangesAsync(ct);
                }
                catch (Exception saveEx)
                {
                    logger.LogError(saveEx, "Could not persist Failed status for accounting job {JobId}", job.Id);
                    db.ChangeTracker.Clear();
                }
            }
        }
    }

    async Task EnqueueRefreshIfStaleAsync(Guid companyId, string reportType, CancellationToken ct)
    {
        var cutoff = DateTime.UtcNow - CacheTtl;
        var fresh = await db.AccountingReportJobs.AsNoTracking().AnyAsync(j =>
            j.CompanyId == companyId && j.ReportType == reportType &&
            j.Status == "Completed" && j.CompletedAt >= cutoff, ct);
        if (!fresh)
            await EnqueueAsync(companyId, reportType, ct);
    }

    async Task<object?> TryLoadFromCompletedJobAsync(Guid companyId, string reportType, CancellationToken ct)
    {
        var cutoff = DateTime.UtcNow - CacheTtl;
        var job = await db.AccountingReportJobs.AsNoTracking()
            .Where(j => j.CompanyId == companyId && j.ReportType == reportType &&
                        j.Status == "Completed" && j.CompletedAt >= cutoff && j.ResultJson != null)
            .OrderByDescending(j => j.CompletedAt)
            .FirstOrDefaultAsync(ct);
        return job?.ResultJson == null ? null : JsonSerializer.Deserialize<object>(job.ResultJson);
    }

    Task<object> BuildRegisterAsync(string reportType, Guid companyId, IBranchContext branchCtx, bool skipStoredProc, CancellationToken ct)
    {
        var tenant = new FixedTenantContext(companyId);
        return BuildRegisterAsync(db, accountingRead, tenant, branchCtx, reportType, skipStoredProc, ct);
    }

    static async Task<object> BuildRegisterAsync(
        TmsDbContext db,
        AccountingReadService accountingRead,
        ITenantContext tenant,
        IBranchContext branchCtx,
        string reportType,
        bool skipStoredProc,
        CancellationToken ct)
    {
        var companyId = tenant.EffectiveCompanyId ?? TenantContext.DefaultCompanyId;
        if (!skipStoredProc)
        {
            var spResult = await accountingRead.TryGetRegisterAsync(companyId, reportType, ct: ct);
            if (spResult != null)
                return spResult;
        }

        return reportType switch
        {
            "journal" => await AccountingReportService.BuildJournalRegisterAsync(db, tenant, branchCtx, ct),
            "receipt" => await AccountingReportService.BuildReceiptRegisterAsync(db, tenant, branchCtx, ct),
            "payment" => await AccountingReportService.BuildPaymentRegisterAsync(db, tenant, branchCtx, ct),
            "purchase" => await AccountingReportService.BuildPurchaseRegisterAsync(db, tenant, branchCtx, ct),
            "sales" => await AccountingReportService.BuildSalesRegisterAsync(db, tenant, branchCtx, ct),
            _ => throw new ArgumentException($"Unknown register type: {reportType}", nameof(reportType)),
        };
    }
}

public class AccountingReportWorker(
    IServiceScopeFactory scopeFactory,
    IConfiguration config,
    ILogger<AccountingReportWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var intervalSec = Math.Clamp(config.GetValue("Accounting:RegisterJobIntervalSeconds", 15), 5, 300);
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var jobs = scope.ServiceProvider.GetRequiredService<AccountingRegisterJobService>();
                await jobs.ProcessPendingAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Accounting register worker tick failed");
            }

            try
            {
                await Task.Delay(TimeSpan.FromSeconds(intervalSec), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }
}
