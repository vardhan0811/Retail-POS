using BillingService.DTOs;
using BillingService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BillingService.Controllers
{
    [ApiController]
    [Route("api/payments")]
    public class PaymentsController : ControllerBase
    {
        private readonly IBillingService _service;

        public PaymentsController(IBillingService service)
        {
            _service = service;
        }

        [Authorize(Policy = "MARK_PAID_BILL")]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreatePaymentRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(new ApiResponse<object> { Success = false, Message = "Invalid request", Data = ModelState });

            var payment = await _service.CreatePaymentAsync(request);
            return Ok(new ApiResponse<PaymentDto>
            {
                Success = true,
                Message = "Payment created successfully",
                Data = payment
            });
        }

        [Authorize(Policy = "VIEW_BILL")]
        [HttpGet("{billId}")]
        public async Task<IActionResult> GetByBill(Guid billId)
        {
            var payments = await _service.GetPaymentsByBillIdAsync(billId);
            return Ok(new ApiResponse<IEnumerable<PaymentDto>>
            {
                Success = true,
                Message = "Payments fetched successfully",
                Data = payments
            });
        }
    }
}
