using Microsoft.EntityFrameworkCore;
using AdminService.Entities;

namespace AdminService.Data
{
    public class AdminDbContext : DbContext
    {
        public AdminDbContext(DbContextOptions<AdminDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<AdminReport> AdminReports { get; set; }
        public DbSet<Store> Stores { get; set; }
        public DbSet<ProcessedMessage> ProcessedMessages { get; set; }


        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            // One User can have many AdminReports
            modelBuilder.Entity<User>()
                .HasMany(u => u.AdminReports)
                .WithOne(r => r.User)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<User>()
                .HasIndex(u => u.StoreId);

            modelBuilder.Entity<Store>()
                .HasIndex(s => s.IsActive);

            modelBuilder.Entity<ProcessedMessage>()
                .HasIndex(pm => pm.MessageId)
                .IsUnique();

        }
    }
}
