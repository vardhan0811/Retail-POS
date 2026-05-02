using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProductService.Migrations
{
    /// <inheritdoc />
    public partial class SetIsRefundableDefault : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE Products SET IsRefundable = 1 WHERE IsRefundable = 0");
            migrationBuilder.Sql("UPDATE Products SET RefundWindowHours = 24 WHERE RefundWindowHours = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
