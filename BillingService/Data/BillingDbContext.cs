using BillingService.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace BillingService.Data
{
    public class BillingDbContext : DbContext
    {
        public BillingDbContext(DbContextOptions<BillingDbContext> options)
            : base(options)
        {
        }

        public DbSet<Bill> Bills { get; set; }
        public DbSet<BillItem> BillItems { get; set; }
        public DbSet<Payment> Payments { get; set; }
        public DbSet<RefundRequest> RefundRequests { get; set; }
        public DbSet<RefundItem> RefundItems { get; set; }
        public DbSet<RefundRecord> RefundRecords { get; set; }
        public DbSet<BillAuditLog> BillAuditLogs { get; set; }
        public DbSet<IdempotencyRecord> IdempotencyRecords { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Bill>()
                .HasMany(b => b.Items)
                .WithOne(i => i.Bill)
                .HasForeignKey(i => i.BillId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Bill>()
                .HasMany(b => b.Payments)
                .WithOne(p => p.Bill)
                .HasForeignKey(p => p.BillId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Bill>()
                .HasMany(b => b.RefundRequests)
                .WithOne(r => r.Bill)
                .HasForeignKey(r => r.BillId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<RefundRequest>()
                .HasMany(r => r.Items)
                .WithOne(i => i.RefundRequest)
                .HasForeignKey(i => i.RefundRequestId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<RefundItem>()
                .HasOne(i => i.BillItem)
                .WithMany()
                .HasForeignKey(i => i.BillItemId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<Bill>()
                .HasMany(b => b.AuditLogs)
                .WithOne(a => a.Bill)
                .HasForeignKey(a => a.BillId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<IdempotencyRecord>()
                .HasKey(i => i.Id);

            modelBuilder.Entity<RefundRecord>()
                .Property(r => r.Status)
                .HasConversion<string>()
                .HasMaxLength(32);

            modelBuilder.Entity<RefundRequest>()
                .Property(r => r.Status)
                .HasConversion<string>()
                .HasMaxLength(32);

            modelBuilder.Entity<RefundRequest>()
                .Property(r => r.TotalRefundAmount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<RefundItem>()
                .Property(i => i.SystemCalculatedAmount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<RefundItem>()
                .Property(i => i.RefundAmount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<RefundItem>()
                .Property(i => i.TaxReversalAmount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<RefundItem>()
                .Property(i => i.UnitPriceAtTimeOfSale)
                .HasPrecision(18, 2);

            modelBuilder.Entity<RefundItem>()
                .Property(i => i.TaxPercentageAtTimeOfSale)
                .HasPrecision(5, 2);

            modelBuilder.Entity<RefundRecord>()
                .Property(r => r.RefundAmount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<RefundRecord>()
                .Property(r => r.TaxReversalAmount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Bill>()
                .Property(b => b.Status)
                .HasConversion<string>()
                .HasMaxLength(32)
                .IsRequired();

            modelBuilder.Entity<Bill>()
                .HasIndex(b => b.StoreId);

            modelBuilder.Entity<Bill>()
                .HasIndex(b => b.CreatedAt);

            modelBuilder.Entity<Bill>()
                .HasIndex(b => b.BillNumber)
                .IsUnique();

            modelBuilder.Entity<Payment>()
                .Property(p => p.Status)
                .HasConversion<string>();

            modelBuilder.Entity<Payment>()
                .Property(p => p.Amount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Payment>()
                .HasIndex(p => p.BillId);

            modelBuilder.Entity<Bill>()
                .Property(b => b.TotalAmount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Bill>()
                .Property(b => b.TaxAmount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Bill>()
                .Property(b => b.FinalAmount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<BillItem>()
                .Property(i => i.MRP)
                .HasPrecision(18, 2);

            modelBuilder.Entity<BillItem>()
                .Property(i => i.UnitPrice)
                .HasPrecision(18, 2);

            modelBuilder.Entity<BillItem>()
                .Property(i => i.TaxPercentage)
                .HasPrecision(5, 2);

            modelBuilder.Entity<BillItem>()
                .Property(i => i.TotalPrice)
                .HasPrecision(18, 2);

            // 🔹 Global UTC DateTime Converter
            // Ensures all dates from the DB are treated as UTC, allowing frontend correct local conversion
            var dateTimeConverter = new ValueConverter<DateTime, DateTime>(
                v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

            var nullableDateTimeConverter = new ValueConverter<DateTime?, DateTime?>(
                v => v, v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v);

            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                foreach (var property in entityType.GetProperties())
                {
                    if (property.ClrType == typeof(DateTime))
                    {
                        property.SetValueConverter(dateTimeConverter);
                    }
                    else if (property.ClrType == typeof(DateTime?))
                    {
                        property.SetValueConverter(nullableDateTimeConverter);
                    }
                }
            }
        }
    }
}