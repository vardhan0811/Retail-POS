using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AdminService.Migrations
{
    /// <inheritdoc />
    public partial class UpdateAdminReportSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AdminReports_Users_UserId",
                table: "AdminReports");

            migrationBuilder.DropIndex(
                name: "IX_AdminReports_UserId",
                table: "AdminReports");

            migrationBuilder.RenameColumn(
                name: "UserId",
                table: "AdminReports",
                newName: "StoreId");

            migrationBuilder.AlterColumn<string>(
                name: "ReportType",
                table: "AdminReports",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.CreateIndex(
                name: "IX_AdminReports_StoreId_ReportType_CreatedAt",
                table: "AdminReports",
                columns: new[] { "StoreId", "ReportType", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AdminReports_StoreId_ReportType_CreatedAt",
                table: "AdminReports");

            migrationBuilder.RenameColumn(
                name: "StoreId",
                table: "AdminReports",
                newName: "UserId");

            migrationBuilder.AlterColumn<string>(
                name: "ReportType",
                table: "AdminReports",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.CreateIndex(
                name: "IX_AdminReports_UserId",
                table: "AdminReports",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_AdminReports_Users_UserId",
                table: "AdminReports",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
