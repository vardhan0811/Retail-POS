using BillingService.DTOs;
using BillingService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using BillingService.Entities;

using Microsoft.Extensions.Logging;

namespace BillingService.Controllers
{
    [ApiController]
    [Route("api/bills")]
    public class BillingController : ControllerBase
    {
        private readonly IBillingService _service;
        private readonly ILogger<BillingController> _logger;

        public BillingController(IBillingService service, ILogger<BillingController> logger)
        {
            _service = service;
            _logger = logger;
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
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? throw new UnauthorizedAccessException("Missing NameIdentifier claim.");
            if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            await _service.HoldAsync(id, userId);
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
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? throw new UnauthorizedAccessException("Missing NameIdentifier claim.");
            var role = User.FindFirst(ClaimTypes.Role)?.Value ?? "Cashier";
            if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            await _service.ResumeAsync(id, userId, role);
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



        [Authorize(Policy = "CREATE_BILL")]
        [HttpPost("{id}/cancel")]
        public async Task<IActionResult> Cancel(Guid id)
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? throw new UnauthorizedAccessException("Missing NameIdentifier claim.");
            var role = User.FindFirst(ClaimTypes.Role)?.Value ?? "Cashier";
            if (!Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            await _service.CancelAsync(id, userId, role);
            return Ok(new ApiResponse<CommandResultDto>
            {
                Success = true,
                Message = "Bill cancelled successfully",
                Data = new CommandResultDto { BillId = id, Action = "cancel" }
            });
        }

    }
}