using AuthService.Entities;

namespace AuthService.Services
{
    public interface IJwtService
    {
        string GenerateToken(User user, List<string> permissions);
    }
}
