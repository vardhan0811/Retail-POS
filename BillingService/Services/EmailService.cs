using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;
using Serilog;
using BillingService.Middleware;
namespace BillingService.Services
{
    public class EmailSettings
    {
        public string FromEmail { get; set; } = string.Empty;
        public string AppPassword { get; set; } = string.Empty;
        public string SmtpHost { get; set; } = "smtp.gmail.com";
        public int SmtpPort { get; set; } = 587;
    }

    public class EmailService : IEmailService
    {
        private readonly EmailSettings _settings;

        public EmailService(IOptions<EmailSettings> options)
        {
            _settings = options.Value;
        }

        public async Task SendEmailWithAttachmentAsync(string to, string subject, string body, byte[] attachment, string fileName)
        {
            try
            {
                Log.Information("Sending receipt email to {Recipient} via {Host}", to, _settings.SmtpHost);

                using var smtpClient = new SmtpClient(_settings.SmtpHost)
                {
                    Port = _settings.SmtpPort,
                    Credentials = new NetworkCredential(_settings.FromEmail, _settings.AppPassword),
                    EnableSsl = true,
                };

                using var mail = new MailMessage(_settings.FromEmail, to)
                {
                    Subject = subject,
                    Body = body,
                    IsBodyHtml = true
                };

                if (attachment != null && attachment.Length > 0)
                {
                    using var ms = new MemoryStream(attachment);
                    mail.Attachments.Add(new Attachment(ms, fileName, "application/pdf"));
                    await smtpClient.SendMailAsync(mail);
                }
                else
                {
                    await smtpClient.SendMailAsync(mail);
                }

                Log.Information("Receipt email successfully delivered to {Recipient}", to);
            }
            catch (SmtpException smtpEx)
            {
                Log.Error(smtpEx, "SMTP Error sending to {Recipient}: {Message}", to, smtpEx.Message);
                throw new BusinessException($"Email delivery failed: {smtpEx.Message}. Check FromEmail and AppPassword in config.");
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Unexpected error sending email to {Recipient}", to);
                throw;
            }
        }
    }
}
