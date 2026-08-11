using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tms.Api.Data;

namespace Tms.Api.Services;

public static class UserSchemaMigrator
{
    public static async Task EnsureAsync(TmsDbContext db, CancellationToken ct = default)
    {
        var conn = (NpgsqlConnection)db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
            await conn.OpenAsync(ct);

        await SchemaMigrationHelper.EnsureBranchesPrimaryKeyAsync(conn, ct);
        await SchemaMigrationHelper.EnsureUsersPrimaryKeyAsync(conn, ct);
        await SchemaMigrationHelper.EnsureUsersProfileColumnsAsync(conn, ct);

        try
        {
            var text = await LoadSqlAsync(ct);
            foreach (var stmt in SchemaMigrationHelper.ParseSqlStatements(text))
            {
                try
                {
                    await SchemaMigrationHelper.ExecuteNonQueryAsync(conn, stmt, ct);
                }
                catch (PostgresException ex) when (ex.SqlState is "42P01" or "42830" or "42703" or "42P07")
                {
                    // Partial installs — optional tables/FKs may not be ready yet.
                }
            }

            await SchemaMigrationHelper.EnsureUserBranchesTableAsync(conn, ct);
        }
        catch (FileNotFoundException)
        {
            // Core columns already added above; SQL file optional for user_branches.
        }
    }

    static async Task<string> LoadSqlAsync(CancellationToken ct)
    {
        foreach (var p in PathCandidates())
        {
            if (File.Exists(p))
                return await File.ReadAllTextAsync(p, ct);
        }
        throw new FileNotFoundException("database/users/schema.sql not found");
    }

    static IEnumerable<string> PathCandidates()
    {
        yield return Path.Combine(AppContext.BaseDirectory, "database", "users", "schema.sql");
        yield return Path.Combine(Directory.GetCurrentDirectory(), "database", "users", "schema.sql");
        yield return Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "database", "users", "schema.sql"));
        yield return Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "database", "users", "schema.sql"));
    }
}
