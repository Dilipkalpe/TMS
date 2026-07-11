using Microsoft.EntityFrameworkCore;

namespace Tms.Api.Data;

/// <summary>Read-only EF context for reports — routes to read replica when configured.</summary>
public class ReadOnlyTmsDbContext(DbContextOptions<ReadOnlyTmsDbContext> options)
    : TmsDbContext(options);
