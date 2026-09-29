using Microsoft.EntityFrameworkCore;
using Tms.Api.Data;

namespace Tms.Api.Services;

public static class ExpenseAttachmentSchemaMigrator
{
    public static Task EnsureAsync(TmsDbContext db, CancellationToken ct = default)
        => PsqlFileRunner.RunSqlFileAsync(db, "database/expenses/attachments.sql", ct);
}
