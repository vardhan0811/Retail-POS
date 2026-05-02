using BillingService.DTOs;
using BillingService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BillingService.Controllers
{
    [ApiController]
    [Route("api/bills")]
    public class BillingQueryController : ControllerBase
    {
        private readonly IBillingService _service;

        public BillingQueryController(IBillingService service)
        {
            _service = service;
        }

        [Authorize(Policy = "VIEW_BILL")]
        [HttpGet]
        public async Task<IActionResult> Query(
            [FromQuery] Guid? userId = null,
            [FromQuery] Guid? storeId = null,
            [FromQuery] string? status = null,
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null,
            [FromQuery] string? search = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? sortBy = "date_desc")
        {
            var result = await _service.GetPagedAsync(page, pageSize, status, userId, storeId, from, to, sortBy, search);
            return Ok(new ApiResponse<PagedResult<BillDto>>
            {
                Success = true,
                Message = "Bills fetched successfully",
                Data = result
            });
        }

        [Authorize(Policy = "VIEW_BILL")]
        [HttpGet("{id}")]
        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result == null)
                return NotFound(new ApiResponse<object> { Success = false, Message = "Bill not found", Data = null });

            return Ok(new ApiResponse<BillDto>
            {
                Success = true,
                Message = "Bill fetched successfully",
                Data = result
            });
        }

        [Authorize(Policy = "VIEW_BILL")]
        [HttpGet("dashboard/summary")]
        public async Task<IActionResult> GetDashboardSummary()
        {
            var storeIdStr = User.FindFirst("storeId")?.Value;
            Guid? storeId = null;
            if (!string.IsNullOrEmpty(storeIdStr) && Guid.TryParse(storeIdStr, out var parsedStoreId))
            {
                storeId = parsedStoreId;
            }

            var summary = await _service.GetDashboardSummaryAsync(storeId);
            return Ok(new ApiResponse<SalesDashboardSummaryDto>
            {
                Success = true,
                Message = "Dashboard summary retrieved successfully",
                Data = summary
            });
        }

        [Authorize(Policy = "VIEW_BILL")]
        [HttpGet("dashboard/operator-summary")]
        public async Task<IActionResult> GetOperatorSummary()
        {
            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
            {
                return Unauthorized(new ApiResponse<object> { Success = false, Message = "User ID not found in token." });
            }

            var summary = await _service.GetOperatorSummaryAsync(userId);
            return Ok(new ApiResponse<OperatorSummaryDto>
            {
                Success = true,
                Message = "Operator summary retrieved successfully",
                Data = summary
            });
        }

        [Authorize(Policy = "EXPORT_BILL")]
        [HttpGet("export/csv")]
        public async Task<IActionResult> ExportCsv()
        {
            var csv = await _service.ExportCsvAsync();
            return File(System.Text.Encoding.UTF8.GetBytes(csv), "text/csv", "bills.csv");
        }
    }
}
