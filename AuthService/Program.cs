using AuthService.Authorization;
using AuthService.Data;
using AuthService.Middleware;
using AuthService.Repositories;
using AuthService.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using System.Text;
using Shared.Messaging.RabbitMq;

namespace AuthService
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);
            builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);
            builder.Services.AddMemoryCache();

            builder.Services.AddDbContext<AuthDbContext>(options =>
                options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

            var authConn = builder.Configuration.GetConnectionString("DefaultConnection");
            if (string.IsNullOrWhiteSpace(authConn))
            {
                var localPath = Path.Combine(builder.Environment.ContentRootPath, "appsettings.Local.json");
                throw new InvalidOperationException($"Missing config: ConnectionStrings:DefaultConnection. Put it in '{localPath}' (gitignored).");
            }

            builder.Services.AddHealthChecks()
                .AddCheck<AuthService.HealthChecks.SqlConnectionHealthCheck>("sql")
                .AddCheck<AuthService.HealthChecks.RabbitMqHealthCheck>("rabbitmq");

            var logPath = Path.Combine(AppContext.BaseDirectory, "Logs", "log-.txt");
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
            var issuer = builder.Configuration["Jwt:Issuer"]
                ?? throw new InvalidOperationException("Missing config: Jwt:Issuer");
            const string audience = "auth-service";

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
                var permissions = new[]
                {
                    "CREATE_PRODUCT", "UPDATE_PRODUCT", "DELETE_PRODUCT", "VIEW_PRODUCT",
                    "CREATE_BILL", "VIEW_BILL", "PROCESS_PAYMENT", "CANCEL_BILL", "RETRY_BILL", "REFUND_BILL", "MARK_PAID_BILL", "ADD_NOTE_BILL", "EXPORT_BILL",
                    "CREATE_USER", "DELETE_USER", "MANAGE_USERS", "MANAGE_STORES",
                    "VIEW_REPORTS", "INITIATE_RETURN", "APPROVE_RETURN"
                };

                foreach (var perm in permissions)
                {
                    options.AddPolicy(perm, policy => policy.Requirements.Add(new PermissionRequirement(perm)));
                }

                options.FallbackPolicy = new AuthorizationPolicyBuilder()
                    .RequireAuthenticatedUser()
                    .Build();
            });

            builder.Services.AddScoped<IUserRepository, UserRepository>();
            builder.Services.AddScoped<IAuthService, AuthServices>();
            builder.Services.AddScoped<IJwtService, JwtService>();
            builder.Services.AddSingleton<RegistrationCacheService>();
            builder.Services.AddSingleton<PasswordResetCacheService>();
            builder.Services.AddScoped<RefreshTokenService>();

            var notificationServiceUrl = builder.Configuration["ServiceUrls:NotificationService"] ?? "http://localhost:5005";
            builder.Services.AddHttpClient<NotificationClient>(client =>
            {
                client.BaseAddress = new Uri(notificationServiceUrl.TrimEnd('/') + "/");
                client.Timeout = TimeSpan.FromSeconds(5);
            });

            builder.Services.AddSingleton<IAuthorizationHandler, PermissionHandler>();
            builder.Services.AddSingleton<RabbitMqPublisherBase>();

            builder.Services.AddControllers()
                .ConfigureApiBehaviorOptions(options =>
                {
                    options.SuppressModelStateInvalidFilter = true;
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
                    Description = "Enter 'Bearer <your-token>'"
                });

                options.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme,
                                Id = "Bearer"
                            }
                        },
                        Array.Empty<string>()
                    }
                });
            });

            var app = builder.Build();

            using (var scope = app.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
                int retries = 10;
                while (retries > 0)
                {
                    try
                    {
                        await db.Database.MigrateAsync();
                        break;
                    }
                    catch (Exception ex)
                    {
                        retries--;
                        if (retries == 0) throw;
                        Log.Warning(ex, "Database migration failed. Retrying in 5 seconds ({Retries} retries left)...", retries);
                        await Task.Delay(5000);
                    }
                }
                await DbSeeder.SeedAsync(db);
            }

            app.UseHttpsRedirection();
            app.UseMiddleware<ExceptionMiddleware>();

            // Dependency gate (Development): if dependencies are unhealthy, block all endpoints (except /health)
            app.Use(async (context, next) =>
            {
                if (!app.Environment.IsDevelopment() && !context.Request.Path.StartsWithSegments("/health", StringComparison.OrdinalIgnoreCase))
                {
                    var prodHealth = await context.RequestServices.GetRequiredService<HealthCheckService>()
                        .CheckHealthAsync(context.RequestAborted);

                    if (prodHealth.Status != HealthStatus.Healthy)
                    {
                        Log.Warning("Dependencies unhealthy in production-like environment. Status={Status}", prodHealth.Status);
                    }

                    await next();
                    return;
                }

                if (context.Request.Path.StartsWithSegments("/health", StringComparison.OrdinalIgnoreCase))
                {
                    await next();
                    return;
                }

                var health = await context.RequestServices.GetRequiredService<HealthCheckService>()
                    .CheckHealthAsync(context.RequestAborted);

                if (health.Status == HealthStatus.Healthy)
                {
                    await next();
                    return;
                }

                // Browser -> redirect to /health, API clients -> 503 JSON
                var accept = context.Request.Headers.Accept.ToString();
                var wantsHtml = accept.Contains("text/html", StringComparison.OrdinalIgnoreCase)
                                || context.Request.Path.StartsWithSegments("/swagger", StringComparison.OrdinalIgnoreCase);

                if (wantsHtml)
                {
                    context.Response.Redirect("/health");
                    return;
                }

                context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(new
                {
                    success = false,
                    message = "Service dependencies are unhealthy. Check /health.",
                    status = health.Status.ToString()
                }));
            });

            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            app.UseAuthentication();
            app.UseMiddleware<UnauthorizedResponseMiddleware>();
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
                ResponseWriter = AuthService.HealthChecks.HealthCheckResponseWriter.WriteAsync
            }).AllowAnonymous();

            app.Run();
        }
    }
}
