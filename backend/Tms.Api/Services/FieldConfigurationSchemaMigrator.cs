using Tms.Api.Data;

namespace Tms.Api.Services;

public static class FieldConfigurationSchemaMigrator
{
    public static async Task EnsureAsync(TmsDbContext db, CancellationToken ct = default)
    {
        await PsqlFileRunner.RunSqlFileAsync(db, "database/field_configuration/schema.sql", ct);
        await PsqlFileRunner.RunSqlFileAsync(db, "database/booking/party_material.sql", ct);
    }
}
