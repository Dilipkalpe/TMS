using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tms.Api.Data;

namespace Tms.Api.Services;

public static class PortalSchemaMigrator
{
    public static async Task EnsureAsync(TmsDbContext db, CancellationToken ct = default)
    {
        await EnsureSchemaAsync(db, ct);
        await BackfillBookingHistoryAsync(db, ct);
    }

    public static async Task EnsureSchemaAsync(TmsDbContext db, CancellationToken ct = default)
    {
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync(ct);

        var text = await LoadSchemaSqlAsync(ct);
        foreach (var stmt in ParseSql(text))
        {
            await using var cmd = new NpgsqlCommand(stmt, conn);
            await cmd.ExecuteNonQueryAsync(ct);
        }
    }

    static async Task<string> LoadSchemaSqlAsync(CancellationToken ct)
    {
        foreach (var p in SchemaPathCandidates())
        {
            if (File.Exists(p))
                return await File.ReadAllTextAsync(p, ct);
        }
        throw new FileNotFoundException("database/portal/schema.sql not found");
    }

    static IEnumerable<string> SchemaPathCandidates()
    {
        yield return Path.Combine(AppContext.BaseDirectory, "database", "portal", "schema.sql");
        yield return Path.Combine(Directory.GetCurrentDirectory(), "database", "portal", "schema.sql");
        yield return Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "database", "portal", "schema.sql"));
    }

    static IEnumerable<string> ParseSql(string text)
    {
        var buf = new System.Text.StringBuilder();
        foreach (var line in text.Split('\n'))
        {
            if (line.TrimStart().StartsWith("--")) continue;
            buf.AppendLine(line);
            if (line.TrimEnd().EndsWith(';'))
            {
                var s = buf.ToString().Trim();
                if (s.Length > 0) yield return s;
                buf.Clear();
            }
        }
        if (buf.Length > 0)
        {
            var s = buf.ToString().Trim();
            if (s.Length > 0) yield return s;
        }
    }

    public static async Task SeedDemoPortalAccessAsync(TmsDbContext db, CancellationToken ct = default)
    {
        var ho = await db.Branches.FirstOrDefaultAsync(b => b.Code == "HO-MUM", ct);
        var pune = await db.Branches.FirstOrDefaultAsync(b => b.Code == "PUN", ct);
        var delhi = await db.Branches.FirstOrDefaultAsync(b => b.Code == "DEL", ct);

        var demos = new (string CustomerId, string Pin, string Phone, Guid? BranchId, string SampleBooking)[]
        {
            ("C-001", "123456", "9820012345", ho?.Id, "BK-1042"),
            ("C-004", "234567", "9820045678", pune?.Id, "BK-1039"),
            ("C-002", "345678", "9820023456", delhi?.Id, "BK-1041"),
        };

        foreach (var demo in demos)
        {
            var customer = await db.Customers.FirstOrDefaultAsync(c => c.Id == demo.CustomerId, ct);
            if (customer == null) continue;

            customer.PortalEnabled = true;
            customer.PortalPinHash = BCrypt.Net.BCrypt.HashPassword(demo.Pin);
            customer.PortalPhone = demo.Phone;
            if (demo.BranchId.HasValue)
                customer.BranchId = demo.BranchId;
            customer.UpdatedAt = DateTime.UtcNow;

            if (demo.BranchId.HasValue)
            {
                var bookings = await db.Bookings.Where(b => b.CustomerId == demo.CustomerId).ToListAsync(ct);
                foreach (var b in bookings)
                    b.BranchId = demo.BranchId;
            }
        }

        await db.SaveChangesAsync(ct);
    }

    static async Task BackfillBookingHistoryAsync(TmsDbContext db, CancellationToken ct)
    {
        if (await db.BookingStatusHistories.AnyAsync(ct)) return;

        var bookings = await db.Bookings.OrderBy(b => b.CreatedAt).Take(500).ToListAsync(ct);
        foreach (var b in bookings)
        {
            db.BookingStatusHistories.Add(new Models.BookingStatusHistory
            {
                Id = Guid.NewGuid(),
                BookingId = b.Id,
                Status = "Booked",
                Note = "Booking created",
                CreatedAt = b.CreatedAt,
            });
            if (b.Status != "Pending" && b.Status != "Booked")
            {
                db.BookingStatusHistories.Add(new Models.BookingStatusHistory
                {
                    Id = Guid.NewGuid(),
                    BookingId = b.Id,
                    Status = b.Status,
                    CreatedAt = b.UpdatedAt,
                });
            }
        }
        if (bookings.Count > 0)
            await db.SaveChangesAsync(ct);
    }
}
