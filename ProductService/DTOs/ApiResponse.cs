namespace ProductService.DTOs
{
    public class ApiResponse<T>
    {
        public string Message { get; set; } = string.Empty;
        public bool Success { get; set; }
        public T? Data { get; set; }
    }
}
