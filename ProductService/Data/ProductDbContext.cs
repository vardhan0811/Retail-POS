using Microsoft.EntityFrameworkCore;
using ProductService.Entities;
using System.Reflection.Emit;

namespace ProductService.Data
{
    public class ProductDbContext : DbContext
    {
        public ProductDbContext(DbContextOptions<ProductDbContext> options)
            : base(options)
        {
        }

        public DbSet<Product> Products { get; set; }
        public DbSet<ProductStock> ProductStocks { get; set; }
        public DbSet<StockHistory> StockHistories { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<TaxConfiguration> Taxes { get; set; }
        public DbSet<ProcessedMessage> ProcessedMessages { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // GLOBAL CATALOG: Indices on Product Name and SKU (Now global)
            modelBuilder.Entity<Product>()
                .HasIndex(p => p.Name);

            modelBuilder.Entity<Product>()
                .HasIndex(p => p.SKU)
                .IsUnique();

            modelBuilder.Entity<Product>()
                .HasIndex(p => p.Barcode);

            // STORE SPECIFIC STOCK: Composite Key (Product + Store)
            modelBuilder.Entity<ProductStock>()
                .HasKey(ps => new { ps.ProductId, ps.StoreId });

            modelBuilder.Entity<ProductStock>()
                .HasOne(ps => ps.Product)
                .WithMany()
                .HasForeignKey(ps => ps.ProductId);

            // GLOBAL CATEGORIES
            modelBuilder.Entity<Category>()
                .HasIndex(c => c.Name)
                .IsUnique();

            // Precision for Currency
            modelBuilder.Entity<Product>()
                .Property(p => p.MRP)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Product>()
                .Property(p => p.SellingPrice)
                .HasPrecision(18, 2);

            modelBuilder.Entity<TaxConfiguration>()
                .Property(t => t.Percentage)
                .HasPrecision(5, 2);

            // Idempotency guard for consumed events/messages
            modelBuilder.Entity<ProcessedMessage>()
                .HasIndex(pm => pm.MessageId)
                .IsUnique();
        }
    }
}