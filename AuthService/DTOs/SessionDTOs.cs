using System;
using System.ComponentModel.DataAnnotations;

namespace AuthService.DTOs
{
    public class StartSessionRequest
    {
        [Required]
        public Guid UserId { get; set; }

        public Guid? TerminalId { get; set; }

        [Required]
        public Guid StoreId { get; set; }
    }
}
