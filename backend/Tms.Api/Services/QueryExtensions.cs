using Microsoft.EntityFrameworkCore;

namespace Tms.Api.Services;

public static class QueryExtensions
{
    public const int DefaultPageSize = 50;
    public const int MaxPageSize = 200;
    public const int ReportMaxPageSize = 500;

    public static (int page, int pageSize) NormalizePaging(int page, int pageSize, int maxPageSize = MaxPageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, maxPageSize);
        return (page, pageSize);
    }

    public static async Task<(List<T> Items, int Total, bool HasMore, bool TotalIsApproximate)> ToPagedListAsync<T>(
        this IQueryable<T> query,
        int page,
        int pageSize,
        bool includeTotal = true,
        CancellationToken ct = default)
    {
        (page, pageSize) = NormalizePaging(page, pageSize);
        var skip = (page - 1) * pageSize;

        var pageQuery = query.Skip(skip).Take(pageSize + 1);
        var items = await pageQuery.ToListAsync(ct);
        var hasMore = items.Count > pageSize;
        if (hasMore)
            items.RemoveAt(items.Count - 1);

        int total;
        var approx = false;
        if (includeTotal)
        {
            total = await query.CountAsync(ct);
        }
        else if (page == 1)
        {
            total = hasMore ? pageSize + 1 : items.Count;
            approx = hasMore;
        }
        else
        {
            total = skip + items.Count + (hasMore ? pageSize : 0);
            approx = true;
        }

        return (items, total, hasMore, approx);
    }
}
