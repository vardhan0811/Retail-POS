using BillingService.DTOs;
using BillingService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BillingService.Controllers
{
    [ApiController]
    [Route("api/bills")]
    public class BillingController : ControllerBase
    {
        private readonly IBillingService _service;

        public BillingController(IBillingService service)
        {
            _service = service;
        }

        [Authorize(Policy = "CREATE_BILL")]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateBillRequest request)
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? throw new UnauthorizedAccessException("Missing NameIdentifier claim.");
            var storeIdStr = User.FindFirst("storeId")?.Value
                ?? throw new UnauthorizedAccessException("Missing storeId claim.");

            if (!Guid.TryParse(userIdStr, out var userId) || !Guid.TryParse(storeIdStr, out var storeId))
            {
                return Unauthorized(new ApiResponse<string>
                {
                    Success = false,
                    Message = "Invalid token",
                    Data = null
                });
            }

            if (!ModelState.IsValid)
                return BadRequest(new ApiResponse<object> { Success = false, Message = "Invalid request", Data = ModelState });

            var result = await _service.CreateBillAsync(userId, storeId, request.Items);
            return Ok(new ApiResponse<BillDto>
            {
                Success = true,
                Message = "Bill created successfully",
                Data = result
            });
        }

        [Authorize(Policy = "CREATE_BILL")]
        [HttpPost("{id}/start-payment")]
        public async Task<IActionResult> StartPayment(Guid id)
        {
            var result = await _service.StartPaymentAsync(id);
            return Ok(new ApiResponse<BillDto>
            {
                Success = true,
                Message = "Bill status updated to awaiting payment",
                Data = result
            });
        }

        [Authorize(Policy = "CREATE_BILL")]
        [HttpPost("{id}/hold")]
        public async Task<IActionResult> Hold(Guid id)
        {
            await _service.HoldAsync(id);
            return Ok(new ApiResponse<CommandResultDto>
            {
                Success = true,
                Message = "Bill put on hold successfully",
                Data = new CommandResultDto { BillId = id, Action = "hold" }
            });
        }

        [Authorize(Policy = "CREATE_BILL")]
        [HttpPost("{id}/resume")]
        public async Task<IActionResult> Resume(Guid id)
        {
            await _service.ResumeAsync(id);
            return Ok(new ApiResponse<CommandResultDto>
            {
                Success = true,
                Message = "Bill resumed successfully",
                Data = new CommandResultDto { BillId = id, Action = "resume" }
            });
        }

        [Authorize(Policy = "MARK_PAID_BILL")]
        [HttpPost("{id}/finalize")]
        public async Task<IActionResult> Finalize(Guid id, [FromBody] FinalizeBillRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(new ApiResponse<object> { Success = false, Message = "Invalid request", Data = ModelState });

            await _service.FinalizeAsync(id, request.PaymentId);
            return Ok(new ApiResponse<CommandResultDto>
            {
                Success = true,
                Message = "Bill finalized successfully",
                Data = new CommandResultDto { BillId = id, Action = "finalize" }
            });
        }

        [Authorize(Policy = "REFUND_BILL")]
        [HttpPost("{id}/refund")]
        public async Task<IActionResult> Refund(Guid id)
        {
            await _service.RefundAsync(id);
            return Ok(new ApiResponse<CommandResultDto>
            {
                Success = true,
                Message = "Refund action processed",
                Data = new CommandResultDto { BillId = id, Action = "refund" }
            });
        }

        [Authorize(Policy = "APPROVE_REFUND")]
        [HttpPost("{id}/approve-refund")]
        public async Task<IActionResult> ApproveRefund(Guid id)
        {
            await _service.ApproveRefundAsync(id);
            return Ok(new ApiResponse<CommandResultDto>
            {
                Success = true,
                Message = "Refund approved and items restocked",
                Data = new CommandResultDto { BillId = id, Action = "approve-refund" }
            });
        }

        [Authorize(Policy = "APPROVE_REFUND")]
        [HttpPost("{id}/reject-refund")]
        public async Task<IActionResult> RejectRefund(Guid id)
        {
            await _service.RejectRefundAsync(id);
            return Ok(new ApiResponse<CommandResultDto>
            {
                Success = true,
                Message = "Refund request rejected",
                Data = new CommandResultDto { BillId = id, Action = "reject-refund" }
            });
        }

        [Authorize(Policy = "CREATE_BILL")]
        [HttpPost("{id}/cancel")]
        public async Task<IActionResult> Cancel(Guid id)
        {
            await _service.CancelAsync(id);
            return Ok(new ApiResponse<CommandResultDto>
            {
                Success = true,
                Message = "Bill cancelled successfully",
                Data = new CommandResultDto { BillId = id, Action = "cancel" }
            });
        }

        [Authorize(Policy = "REPRINT_RECEIPT")]
        [HttpPost("{id}/reprint-receipt")]
        public async Task<IActionResult> ReprintReceipt(Guid id)
        {
            // Implement or remove logic, returning OK for now
            return Ok(new ApiResponse<CommandResultDto>
            {
                Success = true,
                Message = "Receipt reprinted successfully",
                Data = new CommandResultDto { BillId = id, Action = "reprint-receipt" }
            });
        }
    }
}