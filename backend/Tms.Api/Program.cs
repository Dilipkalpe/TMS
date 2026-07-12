using System.IO.Compression;
using System.Text;

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.ResponseCompression;

using Microsoft.AspNetCore.Authorization;

using Microsoft.EntityFrameworkCore;

using Microsoft.IdentityModel.Tokens;

using Microsoft.OpenApi.Models;

using Tms.Api.Data;

using Tms.Api.DTOs;

using Tms.Api.Services;



var builder = WebApplication.CreateBuilder(args);



builder.Services.AddControllers()

    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        o.JsonSerializerOptions.Converters.Add(new NullableDateOnlyJsonConverter());
        o.JsonSerializerOptions.Converters.Add(new DateOnlyJsonConverter());
        o.JsonSerializerOptions.Converters.Add(new NullableGuidJsonConverter());
    });

builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var messages = context.ModelState
            .Where(kv => kv.Value?.Errors.Count > 0)
            .SelectMany(kv => kv.Value!.Errors.Select(e => FormatValidationMessage(kv.Key, e.ErrorMessage)))
            .Where(m => !string.IsNullOrWhiteSpace(m))
            .Distinct()
            .ToArray();

        var message = messages.Length > 0
            ? string.Join(" ", messages)
            : "Please check the required fields and try again.";

        return new BadRequestObjectResult(new ApiError(message));
    };
});



var connectionString = AppConfiguration.ResolveConnectionString(builder.Configuration);
var readOnlyConnectionString = AppConfiguration.ResolveReadOnlyConnectionString(builder.Configuration);

builder.Services.AddDbContextPool<TmsDbContext>(opt => opt.UseNpgsql(connectionString));
builder.Services.AddDbContextPool<ReadOnlyTmsDbContext>(opt =>
    opt.UseNpgsql(readOnlyConnectionString).UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking));

var redisConfig = AppConfiguration.ResolveRedisConfiguration(builder.Configuration);
if (!string.IsNullOrWhiteSpace(redisConfig))
{
    builder.Services.AddStackExchangeRedisCache(o =>
    {
        o.Configuration = redisConfig;
        o.InstanceName = "tms:";
    });
}
else
    builder.Services.AddDistributedMemoryCache();

builder.Services.AddMemoryCache();
builder.Services.AddSingleton<TenantCacheService>();
builder.Services.AddScoped<AccountingRegisterJobService>();

builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
});
builder.Services.Configure<BrotliCompressionProviderOptions>(o => o.Level = CompressionLevel.Fastest);
builder.Services.Configure<GzipCompressionProviderOptions>(o => o.Level = CompressionLevel.Fastest);



builder.Services.AddScoped<DashboardReadService>();
builder.Services.AddScoped<AccountingReadService>();

builder.Services.AddScoped<PayrollService>();

builder.Services.AddScoped<HrService>();

builder.Services.AddScoped<MaintenanceService>();

builder.Services.AddScoped<FuelService>();

builder.Services.AddScoped<GeofenceService>();

builder.Services.AddScoped<GpsIngestService>();

builder.Services.AddScoped<FleetLiveService>();

builder.Services.AddScoped<NotificationDispatcher>();

builder.Services.AddScoped<NotificationOutboxProcessor>();

builder.Services.AddSingleton<NotificationChannelRouter>();

builder.Services.AddSingleton<INotificationChannelSender, Msg91NotificationSender>();

builder.Services.AddHttpClient("Msg91");

builder.Services.AddScoped<CustomerTrackingService>();

builder.Services.AddHttpContextAccessor();

builder.Services.AddScoped<IBranchContext, BranchContext>();
builder.Services.AddScoped<ITenantContext, TenantContext>();
builder.Services.AddScoped<SubscriptionService>();

builder.Services.AddScoped<RouteOptimizationService>();
builder.Services.AddScoped<ImportService>();
builder.Services.AddScoped<LookupQuickCreateService>();
builder.Services.AddScoped<DriverSyncService>();

builder.Services.AddHttpClient();

if (!builder.Environment.IsEnvironment("Testing"))
{
    builder.Services.AddHostedService<NotificationOutboxWorker>();
    builder.Services.AddHostedService<AccountingReportWorker>();
}



var jwtKey = AppConfiguration.ResolveJwtKey(builder.Configuration);



builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)

    .AddJwtBearer(opt =>

    {

        opt.TokenValidationParameters = new TokenValidationParameters

        {

            ValidateIssuer = true,

            ValidateAudience = true,

            ValidateLifetime = true,

            ValidateIssuerSigningKey = true,

            ValidIssuer = builder.Configuration["Jwt:Issuer"],

            ValidAudience = builder.Configuration["Jwt:Audience"],

            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))

        };

    });

if (!builder.Environment.IsEnvironment("Testing"))
    builder.Services.AddAuthRateLimiting(builder.Configuration);

builder.Services.AddAuthorization(AuthorizationPolicies.Configure);



var origins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:5173"];

builder.Services.AddCors(opt => opt.AddDefaultPolicy(p =>

    p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));



builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(c =>

{

    c.SwaggerDoc("v1", new OpenApiInfo { Title = "TMS Pro API", Version = "v1" });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme

    {

        Description = "JWT Authorization header. Example: Bearer {token}",

        Name = "Authorization",

        In = ParameterLocation.Header,

        Type = SecuritySchemeType.ApiKey,

        Scheme = "Bearer"

    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement

    {

        {

            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },

            Array.Empty<string>()

        }

    });

});



var app = builder.Build();

var pathBase = app.Configuration["PathBase"];
if (!string.IsNullOrWhiteSpace(pathBase))
    app.UsePathBase(pathBase);

var webRoot = app.Environment.WebRootPath ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot");

Directory.CreateDirectory(Path.Combine(webRoot, "uploads"));

app.UseStaticFiles(new StaticFileOptions

{

    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(webRoot),

    RequestPath = ""

});



var failOnMigrationError = AppOptions.FailOnMigrationError(app.Configuration, app.Environment);
var runStartupMigrations = AppOptions.RunStartupMigrations(app.Configuration, app.Environment);

if (!app.Environment.IsEnvironment("Testing"))
{
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<TmsDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

        logger.LogInformation("TMS API: preparing database…");

        if (runStartupMigrations)
        {
            logger.LogInformation("Running full schema migrations…");
            await SchemaBootstrap.RunAsync(db, logger, failOnMigrationError);
        }
        else
        {
            logger.LogInformation("Skipping full startup migrations (Database:RunStartupMigrations=false).");
            logger.LogInformation("Running incremental schema ensures (portal, branch, booking-finance, maintenance, SaaS)…");

            try
            {
                logger.LogInformation("Ensuring portal schema…");
                await PortalSchemaMigrator.EnsureSchemaAsync(db);

                logger.LogInformation("Ensuring branch schema…");
                await BranchSchemaMigrator.EnsureAsync(db);

                logger.LogInformation("Ensuring booking-finance schema…");
                await BookingFinanceSchemaMigrator.EnsureAsync(db);

                logger.LogInformation("Ensuring maintenance schema…");
                await MaintenanceSchemaMigrator.EnsureAsync(db);

                logger.LogInformation("Ensuring reporting stored procedures…");
                await ReportsSchemaMigrator.EnsureAsync(db);

                logger.LogInformation("Ensuring SaaS tenant schema…");
                await TenantSchemaMigrator.EnsureAsync(db, logger);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Incremental schema bootstrap failed — set Database:RunStartupMigrations=true for a full install, or run npm run *:install scripts.");
            }
        }

        logger.LogInformation("Running database seeder…");
        await DbSeeder.SeedAsync(db, app.Configuration, app.Environment);
        logger.LogInformation("Database ready.");
    }
}



if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseExceptionHandler(errApp =>
    {
        errApp.Run(async ctx =>
        {
            var ex = ctx.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
            var message = ex?.InnerException?.Message ?? ex?.Message;
            if (string.IsNullOrWhiteSpace(message))
                message = ex?.ToString() ?? "An unexpected error occurred.";
            ctx.Response.StatusCode = StatusCodes.Status500InternalServerError;
            ctx.Response.ContentType = "application/json";
            await ctx.Response.WriteAsJsonAsync(new ApiError(message));
        });
    });
}



if (!app.Environment.IsEnvironment("Testing"))
    app.UseRateLimiter();

app.UseResponseCompression();

app.UseCors();

app.UseAuthentication();

app.UseMiddleware<TenantScopeMiddleware>();

app.UseAuthorization();

app.MapControllers();

app.MapGet("/api/health", async (TmsDbContext db) =>

{

    try

    {

        var ok = await db.Database.CanConnectAsync();

        return ok

            ? Results.Ok(new { status = "healthy", service = "TMS Pro API", database = "connected", build = "2026-07-12-hr-get-employee-fix" })

            : Results.Json(new { status = "unhealthy", service = "TMS Pro API", database = "disconnected", build = "2026-07-12-hr-get-employee-fix" }, statusCode: 503);

    }

    catch (Exception ex)

    {

        return Results.Json(new { status = "unhealthy", service = "TMS Pro API", database = "error", message = ex.Message }, statusCode: 503);

    }

});



app.Run();

public partial class Program
{
    static string FormatValidationMessage(string field, string? error)
    {
        if (string.IsNullOrWhiteSpace(error)) return string.Empty;

        var name = field.Trim().TrimStart('$', '.');
        if (name.StartsWith("body.", StringComparison.OrdinalIgnoreCase))
            name = name[5..];
        name = name.Replace("_", " ");
        if (name.Length > 0 && !char.IsUpper(name[0]))
            name = char.ToUpper(name[0]) + name[1..];

        if (string.IsNullOrWhiteSpace(name) || name.Equals("request", StringComparison.OrdinalIgnoreCase))
            return error;

        return error.Contains(name, StringComparison.OrdinalIgnoreCase)
            ? error
            : $"{name}: {error}";
    }
}
