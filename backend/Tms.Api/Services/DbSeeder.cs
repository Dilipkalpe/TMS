using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;
using Tms.Api.Models;

namespace Tms.Api.Services;

public static class DbSeeder
{
    public static async Task SeedAsync(TmsDbContext db, IConfiguration config, IHostEnvironment env)
    {
        await EnsureDocumentCodesAsync(db);

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

        if (!await db.Branches.AnyAsync(b => b.CompanyId == defaultCompanyId))
        {
            ho = new Branch { Id = Guid.NewGuid(), CompanyId = defaultCompanyId, Code = "01", Name = "Head Office — Mumbai", City = "Mumbai", State = "Maharashtra", IsHeadOffice = true, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
            pune = new Branch { Id = Guid.NewGuid(), CompanyId = defaultCompanyId, Code = "02", Name = "Pune Branch", City = "Pune", State = "Maharashtra", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
            delhi = new Branch { Id = Guid.NewGuid(), CompanyId = defaultCompanyId, Code = "03", Name = "Delhi Branch", City = "Delhi", State = "Delhi", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
            db.Branches.AddRange(ho, pune, delhi);
            await db.SaveChangesAsync();
        }
        else
        {
            ho = await db.Branches.FirstOrDefaultAsync(b => b.CompanyId == defaultCompanyId && b.IsHeadOffice)
                ?? await db.Branches.Where(b => b.CompanyId == defaultCompanyId).OrderBy(b => b.Code).FirstOrDefaultAsync();
            pune = await db.Branches.FirstOrDefaultAsync(b => b.CompanyId == defaultCompanyId && b.Code == "02")
                ?? await db.Branches.FirstOrDefaultAsync(b => b.CompanyId == defaultCompanyId && b.Code == "PUN");
            delhi = await db.Branches.FirstOrDefaultAsync(b => b.CompanyId == defaultCompanyId && b.Code == "03")
                ?? await db.Branches.FirstOrDefaultAsync(b => b.CompanyId == defaultCompanyId && b.Code == "DEL");
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

    /// <summary>Fix legacy company/branch codes (e.g. DEFAULT, HO-MUM) for document numbering.</summary>
    static async Task EnsureDocumentCodesAsync(TmsDbContext db)
    {
        var demoId = TenantContext.DefaultCompanyId;
        if (!await db.Companies.AnyAsync(c => c.Id == demoId))
        {
            db.Companies.Add(new Company
            {
                Id = demoId,
                Code = "01",
                Name = "Demo Company",
                LegalName = "Demo Company Pvt Ltd",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
            await db.SaveChangesAsync();
        }

        var companies = await db.Companies.ToListAsync();
        var companiesChanged = false;
        foreach (var company in companies)
        {
            if (DocumentCodeRules.IsValid(company.Code)) continue;
            var next = ResolveTwoCharCode(company.Code, company.Id, companies.Where(c => c.Id != company.Id).Select(c => c.Code));
            company.Code = next;
            company.UpdatedAt = DateTime.UtcNow;
            companiesChanged = true;
        }
        if (companiesChanged) await db.SaveChangesAsync();

        var branches = await db.Branches.ToListAsync();
        var branchesChanged = false;
        foreach (var branch in branches)
        {
            if (DocumentCodeRules.IsValid(branch.Code)) continue;
            var peers = branches.Where(b => b.Id != branch.Id && b.CompanyId == branch.CompanyId).Select(b => b.Code);
            var next = ResolveTwoCharCode(branch.Code, branch.Id, peers);
            branch.Code = next;
            branch.UpdatedAt = DateTime.UtcNow;
            branchesChanged = true;
        }
        if (branchesChanged) await db.SaveChangesAsync();
    }

    static string ResolveTwoCharCode(string? current, Guid id, IEnumerable<string> usedCodes)
    {
        var used = new HashSet<string>(usedCodes.Select(DocumentCodeRules.Normalize), StringComparer.OrdinalIgnoreCase);
        var normalized = DocumentCodeRules.Normalize(current);
        if (normalized is "DEFAULT" or "DEMO" or "TMS")
            normalized = "01";

        var candidate = normalized.Length >= 2 ? normalized[..2] : "01";
        if (DocumentCodeRules.IsValid(candidate) && !used.Contains(candidate))
            return candidate;

        candidate = $"{Math.Abs(id.GetHashCode()) % 100:00}";
        var attempt = 0;
        while (used.Contains(candidate) && attempt < 100)
        {
            candidate = $"{Math.Abs(HashCode.Combine(id, attempt)) % 100:00}";
            attempt++;
        }
        return candidate;
    }
}
