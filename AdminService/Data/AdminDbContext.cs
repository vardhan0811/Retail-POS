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
        public DbSet<UserStore> UserStores { get; set; }
        public DbSet<ProcessedMessage> ProcessedMessages { get; set; }


        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<AdminReport>()
                .HasIndex(r => new { r.StoreId, r.ReportType, r.CreatedAt });

            modelBuilder.Entity<User>()
                .HasIndex(u => u.StoreId);

            modelBuilder.Entity<User>()
                .Property(u => u.StoreId)
                .IsRequired(false);

            modelBuilder.Entity<User>()
                .Property(u => u.Role)
                .IsRequired(false);

            modelBuilder.Entity<Store>()
                .HasIndex(s => s.IsActive);

            modelBuilder.Entity<ProcessedMessage>()
                .HasIndex(pm => pm.MessageId)
                .IsUnique();

            // Configure UserStore Many-to-Many
            modelBuilder.Entity<UserStore>()
                .HasKey(us => new { us.UserId, us.StoreId });

            modelBuilder.Entity<UserStore>()
                .HasOne(us => us.User)
                .WithMany(u => u.UserStores)
                .HasForeignKey(us => us.UserId);

            modelBuilder.Entity<UserStore>()
                .HasOne(us => us.Store)
                .WithMany()
                .HasForeignKey(us => us.StoreId);
        }
    }
}
