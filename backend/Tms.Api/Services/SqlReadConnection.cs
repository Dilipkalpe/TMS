using Npgsql;

namespace Tms.Api.Services;

/// <summary>Opens read-optimized PostgreSQL connections for stored-procedure read services.</summary>
public static class SqlReadConnection
{
    public static async Task<NpgsqlConnection> OpenReadAsync(IConfiguration config, CancellationToken ct = default)
    {
        var cs = AppConfiguration.ResolveReadOnlyConnectionString(config);
        var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(ct);
        return conn;
    }
}
