using AdminService.Data;
using AdminService.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Shared.Contracts.Models;

namespace AdminService.Controllers
{
    [ApiController]
    [Route("api/admin/dashboard")]
    [Authorize(Roles = "Admin")]
    public class DashboardController : ControllerBase
    {
        private readonly AdminDbContext _db;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _config;
        private readonly ILogger<DashboardController> _logger;

        public DashboardController(AdminDbContext db, IHttpClientFactory httpClientFactory, IConfiguration config, ILogger<DashboardController> logger)
        {
            _db = db;
            _httpClientFactory = httpClientFactory;
            _config = config;
            _logger = logger;
        }

        private HttpClient CreateClientWithAuth()
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(5);

            var authHeader = Request.Headers.Authorization.ToString();
            if (!string.IsNullOrWhiteSpace(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                var token = authHeader.Substring("Bearer ".Length).Trim();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            }

            return client;
        }

        [Authorize(Policy = "VIEW_ADMIN_DASHBOARD")]
        [HttpGet]
        public async Task<IActionResult> GetDashboard([FromQuery] Guid? storeId = null)
        {
            var summaryTask = GetSummaryInternal(storeId);
            var alertsTask = GetAlertsInternal(storeId);
            var activityTask = GetActivityInternal(storeId);
            var insightsTask = GetInventoryInsightsInternal(storeId);

            await Task.WhenAll(summaryTask, alertsTask, activityTask, insightsTask);

            var totalUsers = await _db.Users.CountAsync();
            var activeUsers = await _db.Users.CountAsync(u => u.Status == UserStatus.Active);
            var totalStores = await _db.Stores.CountAsync();
            var activeStores = await _db.Stores.CountAsync(s => s.IsActive);

            var data = new DashboardResponseDto
            {
                Users = new SummaryBox { Total = totalUsers, Active = activeUsers, Inactive = totalUsers - activeUsers, LastUpdate = DateTime.UtcNow },
                Stores = new SummaryBox { Total = totalStores, Active = activeStores, Inactive = totalStores - activeStores, LastUpdate = DateTime.UtcNow },
                BillingSummary = await summaryTask,
                Alerts = await alertsTask,
                RecentActivity = await activityTask,
                InventoryInsights = await insightsTask
            };

            return Ok(new ApiResponse<DashboardResponseDto>
            {
                Success = true,
                Message = "Dashboard data fetched successfully",
                Data = data
            });
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary([FromQuery] Guid? storeId = null)
        {
            var result = await GetSummaryInternal(storeId);
            return Ok(new ApiResponse<DashboardSummaryDto> { Success = true, Data = result });
        }

        [HttpGet("alerts")]
        public async Task<IActionResult> GetAlerts([FromQuery] Guid? storeId = null)
        {
            var result = await GetAlertsInternal(storeId);
            return Ok(new ApiResponse<DashboardAlertsDto> { Success = true, Data = result });
        }

        [HttpGet("activity")]
        public async Task<IActionResult> GetActivity([FromQuery] Guid? storeId = null)
        {
            var result = await GetActivityInternal(storeId);
            return Ok(new ApiResponse<List<DashboardActivityDto>> { Success = true, Data = result });
        }

        [HttpGet("sales-trend")]
        public async Task<IActionResult> GetSalesTrend([FromQuery] Guid? storeId = null)
        {
            var summary = await GetSummaryInternal(storeId);
            return Ok(new ApiResponse<List<DailySalesTrendDto>> { Success = true, Data = summary.SalesTrend });
        }

        private async Task<DashboardSummaryDto> GetSummaryInternal(Guid? storeId)
        {
            var client = CreateClientWithAuth();
            var billingUrl = _config["ServiceUrls:BillingService"];
            var authUrl = _config["ServiceUrls:AuthService"];
            var summary = new DashboardSummaryDto();

            try
            {
                var resp = await client.GetAsync($"{billingUrl.TrimEnd('/')}/api/bills/reports/dashboard-summary{(storeId.HasValue ? "?storeId=" + storeId : "")}");
                if (resp.IsSuccessStatusCode)
                {
                    var payload = await resp.Content.ReadFromJsonAsync<ApiResponse<DashboardSummaryDto>>();
                    if (payload?.Data != null) summary = payload.Data;
                }

                // Fetch Active Staff Count from AuthService
                var authResp = await client.GetAsync($"{authUrl.TrimEnd('/')}/api/auth/staff/active-count");
                if (authResp.IsSuccessStatusCode)
                {
                    var authPayload = await authResp.Content.ReadFromJsonAsync<ApiResponse<int>>();
                    if (authPayload != null) summary.ActiveStaffCount = authPayload.Data;
                }
            }
            catch (Exception ex) { _logger.LogError(ex, "Failed to fetch dashboard-summary"); }
            return summary;
        }

        private async Task<DashboardAlertsDto> GetAlertsInternal(Guid? storeId)
        {
            var client = CreateClientWithAuth();
            var billingUrl = _config["ServiceUrls:BillingService"];
            var productUrl = _config["ServiceUrls:ProductService"];
            var alerts = new DashboardAlertsDto();

            try
            {
                // Pending Refunds
                var refundResp = await client.GetAsync($"{billingUrl.TrimEnd('/')}/api/bills/refund-requests?status=PENDING{(storeId.HasValue ? "&storeId=" + storeId : "")}");
                if (refundResp.IsSuccessStatusCode)
                {
                    var payload = await refundResp.Content.ReadFromJsonAsync<ApiResponse<List<object>>>();
                    alerts.PendingRefunds = payload?.Data?.Count ?? 0;
                }

                // Low Stock
                var lowStockResp = await client.GetAsync($"{productUrl.TrimEnd('/')}/api/products/low-stock{(storeId.HasValue ? "?storeId=" + storeId : "")}");
                if (lowStockResp.IsSuccessStatusCode)
                {
                    var payload = await lowStockResp.Content.ReadFromJsonAsync<ApiResponse<List<object>>>();
                    alerts.LowStockItems = payload?.Data?.Count ?? 0;
                }

                // Out of Stock
                var outStockResp = await client.GetAsync($"{productUrl.TrimEnd('/')}/api/products/out-of-stock{(storeId.HasValue ? "?storeId=" + storeId : "")}");
                if (outStockResp.IsSuccessStatusCode)
                {
                    var payload = await outStockResp.Content.ReadFromJsonAsync<ApiResponse<List<object>>>();
                    alerts.OutOfStockItems = payload?.Data?.Count ?? 0;
                }
            }
            catch (Exception ex) { _logger.LogError(ex, "Failed to fetch alerts"); }

            return alerts;
        }

        private async Task<List<DashboardActivityDto>> GetActivityInternal(Guid? storeId)
        {
            var client = CreateClientWithAuth();
            var billingUrl = _config["ServiceUrls:BillingService"];
            var activities = new List<DashboardActivityDto>();

            try
            {
                var resp = await client.GetAsync($"{billingUrl.TrimEnd('/')}/api/bills?pageSize=10{(storeId.HasValue ? "&storeId=" + storeId : "")}");
                if (resp.IsSuccessStatusCode)
                {
                    var payload = await resp.Content.ReadFromJsonAsync<ApiResponse<PagedResult<BillViewDto>>>();
                    if (payload?.Data?.Items != null)
                    {
                        activities.AddRange(payload.Data.Items.Select(b => new DashboardActivityDto
                        {
                            Type = "Sale",
                            Message = $"Sale completed - {b.BillNumber}",
                            Timestamp = b.CreatedAt,
                            Status = b.Status
                        }));
                    }
                }

                var refundResp = await client.GetAsync($"{billingUrl.TrimEnd('/')}/api/bills/refund-requests?pageSize=5{(storeId.HasValue ? "&storeId=" + storeId : "")}");
                if (refundResp.IsSuccessStatusCode)
                {
                    var payload = await refundResp.Content.ReadFromJsonAsync<ApiResponse<List<RefundRecordDto>>>();
                    if (payload?.Data != null)
                    {
                        foreach (var r in payload.Data)
                        {
                            activities.Add(new DashboardActivityDto
                            {
                                Type = "Refund",
                                Message = $"Refund request from bill {r.BillNumber}",
                                Timestamp = r.CreatedAt,
                                Status = r.Status
                            });
                        }
                    }
                }
            }
            catch (Exception ex) { _logger.LogError(ex, "Failed to fetch activity"); }

            return activities.OrderByDescending(a => a.Timestamp).Take(15).ToList();
        }

        private async Task<InventoryInsightDto> GetInventoryInsightsInternal(Guid? storeId)
        {
            var client = CreateClientWithAuth();
            var productUrl = _config["ServiceUrls:ProductService"];
            var insights = new InventoryInsightDto();

            try
            {
                var topResp = await client.GetAsync($"{productUrl.TrimEnd('/')}/api/products/top-selling?count=5{(storeId.HasValue ? "&storeId=" + storeId : "")}");
                if (topResp.IsSuccessStatusCode)
                {
                    var payload = await topResp.Content.ReadFromJsonAsync<ApiResponse<List<ProductViewDto>>>();
                    insights.TopSelling = payload?.Data ?? new List<ProductViewDto>();
                }

                var lowResp = await client.GetAsync($"{productUrl.TrimEnd('/')}/api/products/low-stock?threshold=10{(storeId.HasValue ? "&storeId=" + storeId : "")}");
                if (lowResp.IsSuccessStatusCode)
                {
                    var payload = await lowResp.Content.ReadFromJsonAsync<ApiResponse<List<ProductViewDto>>>();
                    insights.LowStockItems = payload?.Data?.Take(5).ToList() ?? new List<ProductViewDto>();
                }
            }
            catch (Exception ex) { _logger.LogError(ex, "Failed to fetch inventory insights"); }

            return insights;
        }
    }
}
