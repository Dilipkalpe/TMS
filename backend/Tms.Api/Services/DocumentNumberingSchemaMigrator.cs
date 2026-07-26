using Tms.Api.Data;

namespace Tms.Api.Services;

public static class DocumentNumberingSchemaMigrator
{
    public static Task EnsureAsync(TmsDbContext db, CancellationToken ct = default) =>
        PsqlFileRunner.RunSqlFileAsync(db, "database/document_numbering/schema.sql", ct);
}
