using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public static class DbSeeder
{
    public static async Task SeedAsync(TmsDbContext db, IConfiguration config, IHostEnvironment env)
    {
        var demo = AppOptions.IsDemoDataEnabled(config, env);

        if (!await db.Users.AnyAsync())
        {
            db.Users.Add(new User
            {
                Id = Guid.NewGuid(),
                Username = "admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                FullName = "Admin User",
                Role = "Super Admin",
                CompanyId = null,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }
        else if (env.IsDevelopment())
        {
            await EnsureAdminLoginAsync(db);
        }

        Branch? ho = null;
        Branch? pune = null;
        Branch? delhi = null;
        var defaultCompanyId = TenantContext.DefaultCompanyId;

        if (!await db.Branches.AnyAsync())
        {
            ho = new Branch { Id = Guid.NewGuid(), CompanyId = defaultCompanyId, Code = "HO-MUM", Name = "Head Office — Mumbai", City = "Mumbai", State = "Maharashtra", IsHeadOffice = true, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
            pune = new Branch { Id = Guid.NewGuid(), CompanyId = defaultCompanyId, Code = "PUN", Name = "Pune Branch", City = "Pune", State = "Maharashtra", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
            delhi = new Branch { Id = Guid.NewGuid(), CompanyId = defaultCompanyId, Code = "DEL", Name = "Delhi Branch", City = "Delhi", State = "Delhi", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
            db.Branches.AddRange(ho, pune, delhi);
            await db.SaveChangesAsync();
        }
        else
        {
            ho = await db.Branches.FirstOrDefaultAsync(b => b.IsHeadOffice) ?? await db.Branches.OrderBy(b => b.Code).FirstOrDefaultAsync();
            pune = await db.Branches.FirstOrDefaultAsync(b => b.Code == "PUN");
            delhi = await db.Branches.FirstOrDefaultAsync(b => b.Code == "DEL");
        }

        if (ho != null)
            await BackfillBranchIdsAsync(db, ho.Id);

        await PortalSchemaMigrator.SeedDemoPortalAccessAsync(db);

        if (!demo) return;

        var largeDataset = await db.Customers.AsNoTracking().CountAsync() > 10_000;
        if (largeDataset) return;

        if (pune != null && !await db.Users.AnyAsync(u => u.Username == "pune_mgr"))
        {
            db.Users.Add(new User
            {
                Id = Guid.NewGuid(),
                Username = "pune_mgr",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("branch123"),
                FullName = "Pune Branch Manager",
                Role = "Branch Manager",
                CompanyId = defaultCompanyId,
                BranchId = pune.Id,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        if (!await db.Trips.AnyAsync(t => t.TripCode == "TRP-DEMO-001"))
        {
            var vehicle = await db.Vehicles.OrderBy(v => v.Id).FirstOrDefaultAsync();
            var driver = await db.Drivers.OrderBy(d => d.Id).FirstOrDefaultAsync();
            var tripId = Guid.NewGuid();
            var trip = new Trip
            {
                Id = tripId,
                TripCode = "TRP-DEMO-001",
                Origin = "Mumbai",
                Destination = "Delhi",
                VehicleId = vehicle?.Id,
                DriverId = driver?.Id,
                BranchId = ho?.Id,
                CompanyId = defaultCompanyId,
                Status = vehicle != null && driver != null ? "ASSIGNED" : "PLANNED",
                PlannedStart = DateTime.UtcNow.AddHours(2),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            db.Trips.Add(trip);
            db.TripStops.AddRange(
                new TripStop { Id = Guid.NewGuid(), TripId = tripId, SequenceNo = 1, Address = "Pune" },
                new TripStop { Id = Guid.NewGuid(), TripId = tripId, SequenceNo = 2, Address = "Ahmedabad" },
                new TripStop { Id = Guid.NewGuid(), TripId = tripId, SequenceNo = 3, Address = "Jaipur" });
            await db.SaveChangesAsync();
        }

        await PortalSchemaMigrator.SeedDemoPortalAccessAsync(db);
    }

    /// <summary>
    /// Assigns head-office branch to legacy rows. Uses set-based SQL so large perf/demo datasets
    /// do not hit EF's default 30s command timeout during startup.
    /// </summary>
    static async Task BackfillBranchIdsAsync(TmsDbContext db, Guid branchId)
    {
        if (!await NeedsBranchBackfillAsync(db)) return;

        var previousTimeout = db.Database.GetCommandTimeout();
        db.Database.SetCommandTimeout(600);
        try
        {
            await db.Database.ExecuteSqlRawAsync(
                "UPDATE vehicles SET branch_id = {0} WHERE branch_id IS NULL", branchId);
            await db.Database.ExecuteSqlRawAsync(
                "UPDATE drivers SET branch_id = {0} WHERE branch_id IS NULL", branchId);
            await db.Database.ExecuteSqlRawAsync(
                "UPDATE bookings SET branch_id = {0} WHERE branch_id IS NULL", branchId);
            await db.Database.ExecuteSqlRawAsync(
                "UPDATE expenses SET branch_id = {0} WHERE branch_id IS NULL", branchId);
            await db.Database.ExecuteSqlRawAsync(
                "UPDATE trips SET branch_id = {0} WHERE branch_id IS NULL", branchId);
            await db.Database.ExecuteSqlRawAsync(
                "UPDATE customers SET branch_id = {0} WHERE branch_id IS NULL", branchId);
        }
        finally
        {
            db.Database.SetCommandTimeout(previousTimeout);
        }
    }

    static async Task<bool> NeedsBranchBackfillAsync(TmsDbContext db)
    {
        var conn = db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync();

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT EXISTS (SELECT 1 FROM vehicles WHERE branch_id IS NULL LIMIT 1)
                OR EXISTS (SELECT 1 FROM drivers WHERE branch_id IS NULL LIMIT 1)
                OR EXISTS (SELECT 1 FROM bookings WHERE branch_id IS NULL LIMIT 1)
                OR EXISTS (SELECT 1 FROM customers WHERE branch_id IS NULL LIMIT 1)
                OR EXISTS (SELECT 1 FROM expenses WHERE branch_id IS NULL LIMIT 1)
                OR EXISTS (SELECT 1 FROM trips WHERE branch_id IS NULL LIMIT 1)
            """;
        return (bool)(await cmd.ExecuteScalarAsync() ?? false);
    }

    /// <summary>Repairs admin login when seed.sql or manual SQL left an invalid password hash.</summary>
    static async Task EnsureAdminLoginAsync(TmsDbContext db)
    {
        var admin = await db.Users.FirstOrDefaultAsync(u => u.Username == "admin");
        if (admin == null) return;

        var valid = false;
        try
        {
            valid = BCrypt.Net.BCrypt.Verify("admin123", admin.PasswordHash);
        }
        catch
        {
            valid = false;
        }

        if (valid && admin.IsActive) return;

        admin.PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123");
        admin.IsActive = true;
        if (string.IsNullOrWhiteSpace(admin.Role))
            admin.Role = "Super Admin";
        await db.SaveChangesAsync();
    }
}
