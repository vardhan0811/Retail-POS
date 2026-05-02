using AuthService.Entities;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace AuthService.Services
{
    public class JwtService : IJwtService
    {
        private readonly string _key;
        private readonly string _issuer;
        private readonly string[] _tokenAudiences;

        public JwtService(IConfiguration config)
        {
            _key = config["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key missing");
            _issuer = config["Jwt:Issuer"] ?? throw new InvalidOperationException("JWT Issuer missing");

            _tokenAudiences = config.GetSection("Jwt:TokenAudiences").Get<string[]>()
                ?? throw new InvalidOperationException("JWT token audiences missing (Jwt:TokenAudiences)");
            if (_tokenAudiences.Length == 0)
                throw new InvalidOperationException("JWT token audiences is empty (Jwt:TokenAudiences)");
        }

        public string GenerateToken(User user, List<string> permissions, Guid? sessionId = null, Guid? terminalId = null)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Name),
                new Claim(ClaimTypes.Email, user.Email),
            };

            if (user.Role != null)
            {
                claims.Add(new Claim(ClaimTypes.Role, user.Role.Name));
            }

            if (user.StoreId.HasValue)
            {
                claims.Add(new Claim("storeId", user.StoreId.Value.ToString()));
            }
            
            if (sessionId.HasValue)
            {
                claims.Add(new Claim("sessionId", sessionId.Value.ToString()));
            }
            
            if (terminalId.HasValue)
            {
                claims.Add(new Claim("terminalId", terminalId.Value.ToString()));
            }

            claims.Add(new Claim("status", user.Status.ToString()));

            foreach (var permission in permissions)
                claims.Add(new Claim("permission", permission));

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_key));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _issuer,
                audience: null,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(120),
                signingCredentials: creds
            );

            foreach (var aud in _tokenAudiences)
            {
                if (!token.Payload.ContainsKey("aud"))
                {
                    token.Payload.Add("aud", aud);
                    continue;
                }

                if (token.Payload["aud"] is IList<object> list)
                {
                    list.Add(aud);
                    continue;
                }

                token.Payload["aud"] = new List<object> { token.Payload["aud"]!, aud };
            }

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
