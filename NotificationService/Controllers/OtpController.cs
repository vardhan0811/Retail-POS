using Microsoft.AspNetCore.Mvc;
using NotificationService.Services;
using NotificationService.DTOs;
using Microsoft.AspNetCore.Authorization;

namespace NotificationService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [AllowAnonymous]
    public class OtpController : ControllerBase
    {
        private readonly OtpService _otpService;

        public OtpController(OtpService otpService)
        {
            _otpService = otpService;
        }

        [HttpPost("send")]
        public async Task<IActionResult> SendOtp([FromBody] SendOtpRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Validation failed",
                    Data = ModelState.Where(x => x.Value?.Errors.Count > 0)
                        .ToDictionary(
                            x => x.Key,
                            x => x.Value!.Errors.Select(e => string.IsNullOrWhiteSpace(e.ErrorMessage) ? "Invalid value" : e.ErrorMessage).ToArray())
                });

            await _otpService.GenerateOtpAsync(request.Email);
            return Ok(new ApiResponse<string>
            {
                Success = true,
                Message = "OTP sent to email.",
                Data = null
            });
        }

        [HttpPost("verify")]
        public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Validation failed",
                    Data = ModelState.Where(x => x.Value?.Errors.Count > 0)
                        .ToDictionary(
                            x => x.Key,
                            x => x.Value!.Errors.Select(e => string.IsNullOrWhiteSpace(e.ErrorMessage) ? "Invalid value" : e.ErrorMessage).ToArray())
                });

            var result = await _otpService.VerifyOtpAsync(request.Email, request.Otp);
            if (result)
            {
                return Ok(new ApiResponse<string>
                {
                    Success = true,
                    Message = "OTP verified.",
                    Data = null
                });
            }

            return BadRequest(new ApiResponse<string>
            {
                Success = false,
                Message = "Invalid or expired OTP.",
                Data = null
            });
        }
    }
}

