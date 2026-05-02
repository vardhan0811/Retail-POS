using BillingService.DTOs;
using BillingService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BillingService.Controllers
{
    [ApiController]
    [Route("api/bills/reports")]
    [Authorize]
    public class BillingReportController : ControllerBase
    {
        private readonly IBillingService _service;

        public BillingReportController(IBillingService service)
        {
            _service = service;
        }

        [HttpGet("sales-summary")]
        public async Task<IActionResult> GetSalesSummary(
            [FromQuery] Guid? storeId, [FromQuery] DateTime? start, [FromQuery] DateTime? end, [FromQuery] string? status)
        {
            var result = await _service.GetSalesSummaryBIAsync(storeId, start, end, status);
            return Ok(new ApiResponse<BillingSalesSummaryDto> { Success = true, Message = "Sales summary", Data = result });
        }

        [HttpGet("sales-trend")]
        public async Task<IActionResult> GetSalesTrend(
            [FromQuery] Guid? storeId, [FromQuery] DateTime? start, [FromQuery] DateTime? end, [FromQuery] string? status, [FromQuery] string granularity = "day")
        {
            var result = await _service.GetSalesTrendBIAsync(storeId, start, end, status, granularity);
            return Ok(new ApiResponse<List<SalesTrendPointDto>> { Success = true, Message = "Sales trend", Data = result });
        }

        [HttpGet("refund-summary")]
        public async Task<IActionResult> GetRefundSummary(
            [FromQuery] Guid? storeId, [FromQuery] DateTime? start, [FromQuery] DateTime? end, [FromQuery] string? status)
        {
            var result = await _service.GetRefundAnalyticsBIAsync(storeId, start, end, status);
            return Ok(new ApiResponse<BillingRefundSummaryDto> { Success = true, Message = "Refund summary", Data = new BillingRefundSummaryDto { TotalRefundAmount = result.TotalRefundAmount } });
        }

        [HttpGet("refund-analytics")]
        public async Task<IActionResult> GetRefundAnalytics(
            [FromQuery] Guid? storeId, [FromQuery] DateTime? start, [FromQuery] DateTime? end, [FromQuery] string? status)
        {
            var result = await _service.GetRefundAnalyticsBIAsync(storeId, start, end, status);
            return Ok(new ApiResponse<RefundAnalyticsDto> { Success = true, Message = "Refund analytics", Data = result });
        }

        [HttpGet("payment-breakdown")]
        public async Task<IActionResult> GetPaymentBreakdown(
            [FromQuery] Guid? storeId, [FromQuery] DateTime? start, [FromQuery] DateTime? end, [FromQuery] string? status)
        {
            var result = await _service.GetPaymentBreakdownBIAsync(storeId, start, end, status);
            return Ok(new ApiResponse<List<PaymentMethodDto>> { Success = true, Message = "Payment breakdown", Data = result });
        }

        [HttpGet("top-products")]
        public async Task<IActionResult> GetTopProducts(
            [FromQuery] Guid? storeId, [FromQuery] DateTime? start, [FromQuery] DateTime? end, [FromQuery] string? status, [FromQuery] int count = 10)
        {
            var result = await _service.GetTopProductsBIAsync(storeId, start, end, status, count);
            return Ok(new ApiResponse<List<ProductMetricDto>> { Success = true, Message = "Top products", Data = result });
        }
        [HttpGet("dashboard-summary")]
        public async Task<IActionResult> GetDashboardSummary([FromQuery] Guid? storeId)
        {
            var result = await _service.GetDashboardSummaryAsync(storeId);
            return Ok(new ApiResponse<SalesDashboardSummaryDto> { Success = true, Message = "Dashboard summary", Data = result });
        }
    }
}
