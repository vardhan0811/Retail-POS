namespace ProductService.Entities
{
    public class Category
    {
        public Guid Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;
    }
}