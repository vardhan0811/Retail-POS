using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProductService.Migrations
{
    /// <inheritdoc />
    public partial class BusinessLogic_EnforceRefundRules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Reset all products to refundable (Business Logic Default = TRUE)
            migrationBuilder.Sql("UPDATE Products SET IsRefundable = 1;");

            // 2. Enforce Non-Refundable status for Perishables based on store category rules
            // Targeted items: Milk, Curd, Ice Cream
            migrationBuilder.Sql("UPDATE Products SET IsRefundable = 0 WHERE Name LIKE '%Milk%' OR Name LIKE '%Curd%' OR Name LIKE '%Ice Cream%';");
            
            // 3. Ensure window hours are reasonable for refundable items (Default 24h)
            migrationBuilder.Sql("UPDATE Products SET RefundWindowHours = 24 WHERE IsRefundable = 1 AND (RefundWindowHours IS NULL OR RefundWindowHours = 0);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Reverting would be hard as it's a data fix, but we can set all to 0 or 1.
            // Keeping it simple for now.
        }
    }
}
