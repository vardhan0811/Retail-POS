using BillingService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BillingService.Middleware;
using BillingService.DTOs;
using System;
using System.Threading.Tasks;

namespace BillingService.Controllers
{
    [ApiController]
    [Route("api/bills/{id}")]
    [Authorize]
    public class ReceiptController : ControllerBase
    {
        private readonly IBillingService _service;

        public ReceiptController(IBillingService service)
        {
            _service = service;
        }

        [HttpGet("receipt")]
        public async Task<IActionResult> GetReceipt(Guid id)
        {
            try
            {
                var storeIdStr = User.FindFirst("storeId")?.Value;
                if (string.IsNullOrEmpty(storeIdStr) || !Guid.TryParse(storeIdStr, out var storeId))
                {
                    return Unauthorized(new ApiResponse<object> { Success = false, Message = "Missing or invalid Store ID in token." });
                }

                var receipt = await _service.GetReceiptAsync(id, storeId);
                return Ok(new ApiResponse<ReceiptDto>
                {
                    Success = true,
                    Message = "Receipt generated successfully",
                    Data = receipt
                });
            }
            catch (NotFoundException ex)
            {
                return NotFound(new ApiResponse<object> { Success = false, Message = ex.Message });
            }
            catch (BusinessException ex)
            {
                return BadRequest(new ApiResponse<object> { Success = false, Message = ex.Message });
            }
        }
    }
}
