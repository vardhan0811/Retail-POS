using BillingService.DTOs;
using BillingService.Entities;
using BillingService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BillingService.Controllers
{
    [ApiController]
    [Route("api/refunds")]
    public class RefundsController : ControllerBase
    {
        private readonly IBillingService _service;

        public RefundsController(IBillingService service)
        {
            _service = service;
        }

        [Authorize(Policy = "APPROVE_REFUND")]
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] Guid? storeId, [FromQuery] RefundStatus? status)
        {
            var result = await _service.GetRefundRequestsV2Async(storeId, status);
            return Ok(new ApiResponse<IEnumerable<RefundRequestDto>>
            {
                Success = true,
                Message = "Refund requests retrieved successfully",
                Data = result
            });
        }

        [Authorize(Policy = "REFUND_BILL")]
        [HttpPost("request")]
        public async Task<IActionResult> RequestRefund([FromBody] RefundProcessRequest request)
        {
            if (request == null || request.BillId == Guid.Empty)
                return BadRequest(new ApiResponse<object> { Success = false, Message = "Bill ID is required" });

            var result = await _service.RequestRefundV2Async(request);
            return Ok(new ApiResponse<RefundRequestDto>
            {
                Success = true,
                Message = "Refund request created successfully",
                Data = result
            });
        }

        [Authorize(Policy = "APPROVE_REFUND")]
        [HttpPost("{id}/approve")]
        public async Task<IActionResult> ApproveRefund(Guid id)
        {
            var result = await _service.ApproveRefundV2Async(id);
            return Ok(new ApiResponse<RefundRequestDto>
            {
                Success = true,
                Message = "Refund request approved",
                Data = result
            });
        }

        [Authorize(Policy = "APPROVE_REFUND")]
        [HttpPost("{id}/reject")]
        public async Task<IActionResult> RejectRefund(Guid id, [FromBody] string reason)
        {
            var result = await _service.RejectRefundV2Async(id, reason);
            return Ok(new ApiResponse<RefundRequestDto>
            {
                Success = true,
                Message = "Refund request rejected",
                Data = result
            });
        }

        [Authorize(Policy = "APPROVE_REFUND")]
        [HttpPost("{id}/settle")]
        public async Task<IActionResult> SettleRefund(Guid id)
        {
            var result = await _service.SettleRefundV2Async(id);
            return Ok(new ApiResponse<RefundRequestDto>
            {
                Success = true,
                Message = "Refund settled and inventory updated",
                Data = result
            });
        }
    }
}
