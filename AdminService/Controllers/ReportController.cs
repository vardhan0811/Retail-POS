using AdminService.DTOs;
using AdminService.Entities;
using AdminService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http.Headers;
using System.Text;

namespace AdminService.Controllers
{
    [ApiController]
    [Route("api/admin/reports")]
    [Authorize(Roles = "Admin")]
    public class ReportController : ControllerBase
    {
        private readonly IAdminReportService    _reportService;
        private readonly ILogger<ReportController> _logger;

        public ReportController(IAdminReportService reportService, ILogger<ReportController> logger)
        {
            _reportService = reportService;
            _logger        = logger;
        }

        // ─── Filter extraction helper ─────────────────────────────────────────
        private ReportFilter ExtractFilter(
            DateTime? startDate, DateTime? endDate,
            Guid? storeId, string? status,
            string timezone = "UTC", string? granularity = null)
        {
            var tz     = string.IsNullOrWhiteSpace(timezone) ? "UTC" : timezone;
            var offset = TimeSpan.Zero;
            try 
            { 
                var zone = GetTimeZone(tz);
                offset = zone.GetUtcOffset(DateTime.UtcNow); 
            }
            catch { /* fallback to UTC */ }

            // Default to 7-day window
            var end   = (endDate   ?? DateTime.UtcNow).Add(-offset);
            var start = (startDate ?? DateTime.UtcNow.AddDays(-6)).Add(-offset);
            start = start.Date;
            end   = end.Date.AddDays(1).AddTicks(-1);

            return new ReportFilter
            {
                StartDate   = start,
                EndDate     = end,
                StoreId     = storeId,
                Status      = status,
                Timezone    = tz,
                Granularity = granularity
            };
        }

        private TimeZoneInfo GetTimeZone(string id)
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById(id); }
            catch
            {
                // Simple mapping for common IANA -> Windows IDs
                var mapping = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
                {
                    { "Asia/Kolkata", "India Standard Time" },
                    { "Asia/Calcutta", "India Standard Time" },
                    { "UTC", "UTC" }
                };
                if (mapping.TryGetValue(id, out var winId))
                    return TimeZoneInfo.FindSystemTimeZoneById(winId);
                throw;
            }
        }

        private string ExtractBearer()
        {
            var header = Request.Headers.Authorization.ToString();
            return header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
                ? header["Bearer ".Length..].Trim()
                : string.Empty;
        }

        // ─── 1. KPI Summary ───────────────────────────────────────────────────
        [Authorize(Policy = "VIEW_REPORTS")]
        [HttpGet("kpi-summary")]
        public async Task<IActionResult> GetKpiSummary(
            [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate,
            [FromQuery] Guid? storeId, [FromQuery] string? status,
            [FromQuery] string timezone = "UTC")
        {
            var filter = ExtractFilter(startDate, endDate, storeId, status, timezone);
            var result = await _reportService.GetKpiSummaryAsync(filter, ExtractBearer());
            return Ok(new ApiResponse<KpiSummaryDto> { Success = true, Message = "KPI summary", Data = result });
        }

        // ─── 2. Sales Trend ───────────────────────────────────────────────────
        [Authorize(Policy = "VIEW_REPORTS")]
        [HttpGet("sales-trend")]
        public async Task<IActionResult> GetSalesTrend(
            [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate,
            [FromQuery] Guid? storeId, [FromQuery] string? status,
            [FromQuery] string timezone = "UTC", [FromQuery] string? granularity = null)
        {
            var filter = ExtractFilter(startDate, endDate, storeId, status, timezone, granularity);
            var result = await _reportService.GetSalesTrendAsync(filter, ExtractBearer());
            return Ok(new ApiResponse<List<SalesTrendPointDto>> { Success = true, Message = "Sales trend", Data = result });
        }

        // ─── 3. Transaction Ledger (paginated) ────────────────────────────────
        [Authorize(Policy = "VIEW_REPORTS")]
        [HttpGet("sales")]
        public async Task<IActionResult> GetSales(
            [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate,
            [FromQuery] Guid? storeId, [FromQuery] string? status,
            [FromQuery] string timezone = "UTC",
            [FromQuery] int page = 1, [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null, [FromQuery] string? sortBy = null)
        {
            var filter = ExtractFilter(startDate, endDate, storeId, status, timezone);
            var bearer = ExtractBearer();
            var billingUrl = HttpContext.RequestServices
                .GetRequiredService<IConfiguration>()["ServiceUrls:BillingService"]!.TrimEnd('/');

            var qp = $"page={page}&pageSize={pageSize}";
            if (filter.StartDate.HasValue) qp += $"&start={filter.StartDate.Value:O}";
            if (filter.EndDate.HasValue)   qp += $"&end={filter.EndDate.Value:O}";
            if (filter.StoreId.HasValue)   qp += $"&storeId={filter.StoreId}";
            if (!string.IsNullOrWhiteSpace(status)) qp += $"&status={status}";
            if (!string.IsNullOrWhiteSpace(search)) qp += $"&search={Uri.EscapeDataString(search)}";
            if (!string.IsNullOrWhiteSpace(sortBy)) qp += $"&sortBy={sortBy}";

            var client = HttpContext.RequestServices.GetRequiredService<IHttpClientFactory>().CreateClient();
            client.Timeout = TimeSpan.FromSeconds(10);
            if (!string.IsNullOrWhiteSpace(bearer))
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearer);

            try
            {
                var resp = await client.GetAsync($"{billingUrl}/api/bills?{qp}");
                if (resp.IsSuccessStatusCode)
                {
                    var content = await resp.Content.ReadAsStringAsync();
                    return Content(content, "application/json");
                }
            }
            catch (Exception ex) { _logger.LogError(ex, "GetSales proxy failed"); }

            return Ok(new ApiResponse<object> { Success = true, Data = new { items = new object[0], totalCount = 0, page, pageSize } });
        }

        // ─── 4. Top Products ─────────────────────────────────────────────────
        [Authorize(Policy = "VIEW_REPORTS")]
        [HttpGet("top-products")]
        public async Task<IActionResult> GetTopProducts(
            [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate,
            [FromQuery] Guid? storeId, [FromQuery] string? status,
            [FromQuery] string timezone = "UTC", [FromQuery] int count = 10)
        {
            var filter = ExtractFilter(startDate, endDate, storeId, status, timezone);
            var result = await _reportService.GetTopProductsAsync(filter, ExtractBearer(), count);
            return Ok(new ApiResponse<List<ProductMetricDto>> { Success = true, Message = "Top products", Data = result });
        }

        // ─── 5. Refund Analytics ─────────────────────────────────────────────
        [Authorize(Policy = "VIEW_REPORTS")]
        [HttpGet("refund-analytics")]
        public async Task<IActionResult> GetRefundAnalytics(
            [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate,
            [FromQuery] Guid? storeId, [FromQuery] string? status,
            [FromQuery] string timezone = "UTC")
        {
            var filter = ExtractFilter(startDate, endDate, storeId, status, timezone);
            var result = await _reportService.GetRefundAnalyticsAsync(filter, ExtractBearer());
            return Ok(new ApiResponse<RefundAnalyticsDto> { Success = true, Message = "Refund analytics", Data = result });
        }

        // ─── 6. Payment Breakdown ─────────────────────────────────────────────
        [Authorize(Policy = "VIEW_REPORTS")]
        [HttpGet("payment-breakdown")]
        public async Task<IActionResult> GetPaymentBreakdown(
            [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate,
            [FromQuery] Guid? storeId, [FromQuery] string? status,
            [FromQuery] string timezone = "UTC")
        {
            var filter = ExtractFilter(startDate, endDate, storeId, status, timezone);
            var result = await _reportService.GetPaymentBreakdownAsync(filter, ExtractBearer());
            return Ok(new ApiResponse<List<PaymentMethodDto>> { Success = true, Message = "Payment breakdown", Data = result });
        }

        // ─── 7. Export CSV ───────────────────────────────────────────────────
        [Authorize(Policy = "VIEW_REPORTS")]
        [HttpGet("export-csv")]
        public async Task<IActionResult> ExportCsv(
            [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate,
            [FromQuery] Guid? storeId, [FromQuery] string? status,
            [FromQuery] string timezone = "UTC")
        {
            var filter = ExtractFilter(startDate, endDate, storeId, status, timezone);
            var csv    = await _reportService.ExportCsvAsync(filter, ExtractBearer());
            var bytes  = Encoding.UTF8.GetBytes(csv);
            return File(bytes, "text/csv", $"report_{DateTime.UtcNow:yyyyMMdd}.csv");
        }

        // ─── Legacy (kept for backward compat) ───────────────────────────────
        [Authorize(Policy = "VIEW_REPORTS")]
        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary([FromQuery] Guid? storeId, [FromQuery] DateTime? date)
        {
            var summary = await _reportService.GetStoreSummaryAsync(storeId, date ?? DateTime.UtcNow);
            return Ok(new ApiResponse<ReportDataDto> { Success = true, Message = "Summary", Data = summary ?? new ReportDataDto() });
        }
    }
}
