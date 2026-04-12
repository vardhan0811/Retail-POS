using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BillingService.Migrations
{
    /// <inheritdoc />
    public partial class BillingService_LifecycleAndContractHardening : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BillNumber",
                table: "Bills",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.Sql(@"
                UPDATE [Bills]
                SET [BillNumber] = CONCAT('BILL-LEGACY-', REPLACE(CONVERT(varchar(36), [Id]), '-', ''))
                WHERE [BillNumber] IS NULL OR [BillNumber] = '';
            ");

            migrationBuilder.AlterColumn<string>(
                name: "BillNumber",
                table: "Bills",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Bills_BillNumber",
                table: "Bills",
                column: "BillNumber",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Bills_BillNumber",
                table: "Bills");

            migrationBuilder.DropColumn(
                name: "BillNumber",
                table: "Bills");
        }
    }
}
