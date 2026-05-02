using BillingService.Data;
using BillingService.HealthChecks;
using BillingService.Middleware;
using BillingService.Repositories;
using BillingService.Services;
using BillingService.DTOs;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using Shared.Messaging.RabbitMq;
using System.Text;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

builder.Services.AddDbContext<BillingDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

var logPath = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "Logs", "log-.txt");
Log.Logger = new LoggerConfiguration()
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File(
        path: logPath,
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 14,
        shared: true,
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {UserEmail} {Message:lj}{NewLine}{Exception}")
    .CreateLogger();
builder.Host.UseSerilog();

var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey))
{
    var localPath = Path.Combine(builder.Environment.ContentRootPath, "appsettings.Local.json");
    throw new InvalidOperationException($"Missing config: Jwt:Key. Put it in '{localPath}' (gitignored).");
}
var issuer = builder.Configuration["Jwt:Issuer"];
var audience = builder.Configuration["Jwt:Audience"];

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = issuer,
            ValidateAudience = true,
            ValidAudience = audience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization(options =>
{
    var adminOrCashierPolicies = new[]
    {
        "CREATE_BILL",
        "VIEW_BILL",
        "CANCEL_BILL",
        "RETRY_BILL",
        "MARK_PAID_BILL",
        "ADD_NOTE_BILL",
        "REFUND_BILL",
        "REPRINT_RECEIPT"
    };

    foreach (var permission in adminOrCashierPolicies)
    {
        options.AddPolicy(permission,
            policy => policy.RequireAssertion(ctx =>
                ctx.User.HasClaim("permission", permission) ||
                ctx.User.IsInRole("Admin") || ctx.User.IsInRole("Cashier")));
    }

    var adminOnlyPolicies = new[] { "EXPORT_BILL", "APPROVE_REFUND" };
    foreach (var permission in adminOnlyPolicies)
    {
        options.AddPolicy(permission,
            policy => policy.RequireAssertion(ctx =>
                ctx.User.HasClaim("permission", permission) ||
                ctx.User.IsInRole("Admin")));
    }

    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});

builder.Services.AddHealthChecks()
    .AddCheck<SqlConnectionHealthCheck>("sql")
    .AddCheck<RabbitMqHealthCheck>("rabbitmq");

builder.Services.AddScoped<IBillingRepository, BillingRepository>();
builder.Services.AddScoped<IBillingService, BillingServices>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IPdfService, PdfService>();

builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("EmailSettings"));

builder.Services.AddSingleton<RabbitMqPublisherBase>();
builder.Services.AddHostedService<RabbitMqConsumerHostedService>();

builder.Services.AddHttpContextAccessor();

var serviceUrls = builder.Configuration.GetSection("ServiceUrls");
var productServiceUrl = serviceUrls["ProductService"] ?? "http://localhost:5002";
var adminServiceUrl = serviceUrls["AdminService"] ?? "http://localhost:5004";

builder.Services.AddHttpClient<IProductClient, ProductClient>(client =>
{
    client.BaseAddress = new Uri(productServiceUrl.TrimEnd('/') + "/");
    client.Timeout = TimeSpan.FromSeconds(5);
});
builder.Services.AddHttpClient<IUserClient, UserClient>(client =>
{
    client.BaseAddress = new Uri(adminServiceUrl.TrimEnd('/') + "/");
});
builder.Services.AddHttpClient<IStoreClient, StoreClient>(client =>
{
    client.BaseAddress = new Uri(adminServiceUrl.TrimEnd('/') + "/");
});
builder.Services.Configure<RefundPolicy>(builder.Configuration.GetSection("RefundPolicy"));

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // CRITICAL: camelCase ensures Angular frontend receives billNumber, subTotal, items etc.
        // Without this, properties serialize as PascalCase and all template bindings break.
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.WriteIndented = true;
    });
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter 'Bearer <token>'"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

app.UseMiddleware<ExceptionMiddleware>();

app.UseHttpsRedirection();

app.Use(async (context, next) =>
{
    // Dependency check (Development): Log health but don't hard-block unless critical
    var healthCheck = await context.RequestServices.GetRequiredService<HealthCheckService>()
        .CheckHealthAsync(context.RequestAborted);

    if (healthCheck.Status != HealthStatus.Healthy)
    {
        Log.Warning("BillingService dependencies are {Status}. Proceeding with caution. Check /health for details.", healthCheck.Status);
    }

    await next();
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseMiddleware<SerilogUserContextMiddleware>();
app.UseAuthorization();
app.UseSerilogRequestLogging();

app.MapGet("/", async (HttpContext ctx) =>
{
    var health = await ctx.RequestServices.GetRequiredService<HealthCheckService>()
        .CheckHealthAsync(ctx.RequestAborted);
    return health.Status == HealthStatus.Healthy
        ? Results.Redirect("/swagger")
        : Results.Redirect("/health");
}).AllowAnonymous();

app.MapControllers();
app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = BillingService.HealthChecks.HealthCheckResponseWriter.WriteAsync
}).AllowAnonymous();

app.Run();
