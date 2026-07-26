using System.Text.Json;
using Tms.Api.DTOs;

namespace Tms.Api.Services;

/// <summary>Page in-memory report/register rows after optional search.</summary>
public static class PagingHelper
{
    public static PagedResult<object> PageRows(
        IEnumerable<object?>? source,
        int page,
        int pageSize,
        string? search = null,
        bool includeTotal = true,
        int maxPageSize = QueryExtensions.ReportMaxPageSize)
    {
        (page, pageSize) = QueryExtensions.NormalizePaging(page, pageSize, maxPageSize);
        var rows = (source ?? Enumerable.Empty<object?>())
            .Where(x => x != null)
            .Cast<object>()
            .ToList();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim().ToLowerInvariant();
            rows = rows.Where(r => RowMatches(r, q)).ToList();
        }

        var total = rows.Count;
        var skip = (page - 1) * pageSize;
        var slice = rows.Skip(skip).Take(pageSize + 1).ToList();
        var hasMore = slice.Count > pageSize;
        if (hasMore) slice.RemoveAt(slice.Count - 1);

        var reportedTotal = includeTotal
            ? total
            : (page == 1
                ? (hasMore ? pageSize + 1 : slice.Count)
                : skip + slice.Count + (hasMore ? 1 : 0));
        var approx = !includeTotal && (hasMore || page > 1);

        return new PagedResult<object>(slice, reportedTotal, page, pageSize, hasMore, approx);
    }

    public static IReadOnlyList<object> AsObjectList(object? data)
    {
        if (data is null) return [];
        if (data is IEnumerable<object> typed) return typed.Where(x => x != null).Cast<object>().ToList();
        if (data is System.Collections.IEnumerable raw && data is not string)
        {
            var list = new List<object>();
            foreach (var item in raw)
            {
                if (item != null) list.Add(item);
            }
            return list;
        }
        return [data];
    }

    static bool RowMatches(object row, string q)
    {
        try
        {
            return JsonSerializer.Serialize(row).ToLowerInvariant().Contains(q);
        }
        catch
        {
            return row.ToString()?.ToLowerInvariant().Contains(q) == true;
        }
    }
}
