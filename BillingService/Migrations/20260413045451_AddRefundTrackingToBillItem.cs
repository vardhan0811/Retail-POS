using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BillingService.Migrations
{
    /// <inheritdoc />
    public partial class AddRefundTrackingToBillItem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Bills",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<bool>(
                name: "IsRefundable",
                table: "BillItems",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "RefundedQuantity",
                table: "BillItems",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsRefundable",
                table: "BillItems");

            migrationBuilder.DropColumn(
                name: "RefundedQuantity",
                table: "BillItems");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Bills",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(32)",
                oldMaxLength: 32);
        }
    }
}
