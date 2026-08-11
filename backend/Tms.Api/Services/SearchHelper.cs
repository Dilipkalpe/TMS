using Microsoft.EntityFrameworkCore;
using Tms.Api.Models;

namespace Tms.Api.Services;

/// <summary>ILIKE filters backed by pg_trgm GIN indexes (database/perf/add_perf_indexes.sql).</summary>
public static class SearchHelper
{
    static string Pattern(string search) => $"%{search.Trim()}%";

    public static IQueryable<Vehicle> Filter(IQueryable<Vehicle> q, string? search)
    {
        if (string.IsNullOrWhiteSpace(search)) return q;
        var p = Pattern(search);
        return q.Where(v => EF.Functions.ILike(v.Number, p)
            || (v.Type != null && EF.Functions.ILike(v.Type, p)));
    }

    public static IQueryable<Driver> Filter(IQueryable<Driver> q, string? search)
    {
        if (string.IsNullOrWhiteSpace(search)) return q;
        var p = Pattern(search);
        return q.Where(d => EF.Functions.ILike(d.Name, p)
            || (d.Phone != null && EF.Functions.ILike(d.Phone, p)));
    }

    public static IQueryable<Customer> Filter(IQueryable<Customer> q, string? search)
    {
        if (string.IsNullOrWhiteSpace(search)) return q;
        var p = Pattern(search);
        return q.Where(c => EF.Functions.ILike(c.Name, p)
            || (c.Contact != null && EF.Functions.ILike(c.Contact, p))
            || (c.Phone != null && EF.Functions.ILike(c.Phone, p)));
    }

    public static IQueryable<Vendor> Filter(IQueryable<Vendor> q, string? search)
    {
        if (string.IsNullOrWhiteSpace(search)) return q;
        var p = Pattern(search);
        return q.Where(v => EF.Functions.ILike(v.Name, p)
            || (v.Contact != null && EF.Functions.ILike(v.Contact, p)));
    }

    public static IQueryable<Consignor> Filter(IQueryable<Consignor> q, string? search)
    {
        if (string.IsNullOrWhiteSpace(search)) return q;
        var p = Pattern(search);
        return q.Where(c => EF.Functions.ILike(c.Name, p)
            || (c.CompanyName != null && EF.Functions.ILike(c.CompanyName, p))
            || (c.City != null && EF.Functions.ILike(c.City, p))
            || (c.Gst != null && EF.Functions.ILike(c.Gst, p))
            || (c.Phone != null && EF.Functions.ILike(c.Phone, p)));
    }

    public static IQueryable<Consignee> Filter(IQueryable<Consignee> q, string? search)
    {
        if (string.IsNullOrWhiteSpace(search)) return q;
        var p = Pattern(search);
        return q.Where(c => EF.Functions.ILike(c.Name, p)
            || (c.CompanyName != null && EF.Functions.ILike(c.CompanyName, p))
            || (c.City != null && EF.Functions.ILike(c.City, p))
            || (c.Gst != null && EF.Functions.ILike(c.Gst, p))
            || (c.Phone != null && EF.Functions.ILike(c.Phone, p)));
    }

    public static IQueryable<ItemMaster> Filter(IQueryable<ItemMaster> q, string? search)
    {
        if (string.IsNullOrWhiteSpace(search)) return q;
        var p = Pattern(search);
        return q.Where(i => EF.Functions.ILike(i.Name, p)
            || (i.Hsn != null && EF.Functions.ILike(i.Hsn, p))
            || (i.Remarks != null && EF.Functions.ILike(i.Remarks, p)));
    }

    public static IQueryable<Booking> Filter(IQueryable<Booking> q, string? search)
    {
        if (string.IsNullOrWhiteSpace(search)) return q;
        var p = Pattern(search);
        return q.Where(b => EF.Functions.ILike(b.Id, p)
            || EF.Functions.ILike(b.CustomerName, p)
            || EF.Functions.ILike(b.FromCity, p)
            || EF.Functions.ILike(b.ToCity, p));
    }

    public static IQueryable<Expense> Filter(IQueryable<Expense> q, string? search)
    {
        if (string.IsNullOrWhiteSpace(search)) return q;
        var p = Pattern(search);
        return q.Where(e => EF.Functions.ILike(e.Id, p)
            || (e.Description != null && EF.Functions.ILike(e.Description, p))
            || (e.VendorName != null && EF.Functions.ILike(e.VendorName, p)));
    }

    public static IQueryable<LorryReceipt> Filter(IQueryable<LorryReceipt> q, string? search)
    {
        if (string.IsNullOrWhiteSpace(search)) return q;
        var p = Pattern(search);
        return q.Where(l => EF.Functions.ILike(l.LrNumber, p)
            || (l.Consignor != null && EF.Functions.ILike(l.Consignor, p))
            || (l.Consignee != null && EF.Functions.ILike(l.Consignee, p))
            || (l.CustomerName != null && EF.Functions.ILike(l.CustomerName, p))
            || (l.VehicleNumber != null && EF.Functions.ILike(l.VehicleNumber, p))
            || (l.DriverName != null && EF.Functions.ILike(l.DriverName, p))
            || EF.Functions.ILike(l.FromCity, p)
            || EF.Functions.ILike(l.ToCity, p));
    }
}
