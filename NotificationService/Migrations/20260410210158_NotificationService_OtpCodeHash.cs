using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NotificationService.Migrations
{
    /// <inheritdoc />
    public partial class NotificationService_OtpCodeHash : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Otps_Email",
                table: "Otps");

            migrationBuilder.DropColumn(
                name: "Code",
                table: "Otps");

            migrationBuilder.AddColumn<string>(
                name: "CodeHash",
                table: "Otps",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Otps_Email_CreatedAt",
                table: "Otps",
                columns: new[] { "Email", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Otps_ExpiryTime",
                table: "Otps",
                column: "ExpiryTime");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Otps_Email_CreatedAt",
                table: "Otps");

            migrationBuilder.DropIndex(
                name: "IX_Otps_ExpiryTime",
                table: "Otps");

            migrationBuilder.DropColumn(
                name: "CodeHash",
                table: "Otps");

            migrationBuilder.AddColumn<string>(
                name: "Code",
                table: "Otps",
                type: "nvarchar(6)",
                maxLength: 6,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Otps_Email",
                table: "Otps",
                column: "Email");
        }
    }
}
