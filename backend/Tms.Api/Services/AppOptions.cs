namespace Tms.Api.Services;

public static class AppOptions
{
    public static bool IsDemoDataEnabled(IConfiguration config, IHostEnvironment env) =>
        config.GetValue("DemoData:Enabled", false);

    public static bool FailOnMigrationError(IConfiguration config, IHostEnvironment env) =>
        config.GetValue("Database:FailOnMigrationError", !env.IsDevelopment());

    /// <summary>When false, skip SQL migrations on API boot (use npm run *:install).</summary>
    public static bool RunStartupMigrations(IConfiguration config, IHostEnvironment env) =>
        config.GetValue("Database:RunStartupMigrations", env.IsDevelopment());
}
