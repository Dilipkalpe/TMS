using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;

namespace Tms.Api.Services;

public static class SchemaBootstrap
{
    public static async Task RunAsync(TmsDbContext db, ILogger logger, bool failOnError, CancellationToken ct = default)
    {
        db.Database.SetCommandTimeout(SchemaMigrationHelper.CommandTimeoutSeconds);

        (string Name, Func<Task> Run)[] steps =
        [
            ("Core", () => CoreSchemaMigrator.EnsureAsync(db, ct)),
            ("HrPayroll", () => HrPayrollSchemaMigrator.EnsureAsync(db, ct)),
            ("Maintenance", () => MaintenanceSchemaMigrator.EnsureAsync(db, ct)),
            ("EnterpriseModule", () => EnterpriseModuleSchemaMigrator.EnsureAsync(db, ct)),
            ("GPS", () => GpsSchemaMigrator.EnsureAsync(db, ct)),
            ("Notification", () => NotificationSchemaMigrator.EnsureAsync(db, ct)),
            ("Branch", () => BranchSchemaMigrator.EnsureAsync(db, ct)),
            ("Portal", () => PortalSchemaMigrator.EnsureSchemaAsync(db, ct)),
            ("Routing", () => RouteSchemaMigrator.EnsureAsync(db, ct)),
            ("BookingFinance", () => BookingFinanceSchemaMigrator.EnsureAsync(db, ct)),
            ("Reports", () => ReportsSchemaMigrator.EnsureAsync(db, ct)),
            ("SaaS", () => TenantSchemaMigrator.EnsureAsync(db, logger, ct)),
        ];

        foreach (var (name, run) in steps)
        {
            try
            {
                await run();
            }
            catch (Exception ex)
            {
                if (failOnError)
                    throw new InvalidOperationException($"Schema migration failed: {name}. Run npm run *:install or fix database.", ex);
                logger.LogWarning(ex, "{Name} schema migration failed — run npm run *:install", name);
            }
        }
    }
}
