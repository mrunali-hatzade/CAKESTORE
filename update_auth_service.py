import re

with open('backend/src/main/java/com/cakeplatform/api/modules/auth/service/AuthService.java', 'r') as f:
    content = f.read()

imports = """
import com.cakeplatform.api.modules.auth.repository.PasswordResetTokenRepository;
import com.cakeplatform.api.modules.auth.entity.PasswordResetToken;
import com.cakeplatform.api.modules.email.EmailService;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import org.springframework.beans.factory.annotation.Value;
"""
content = re.sub(r'import lombok\.RequiredArgsConstructor;', imports + '\nimport lombok.RequiredArgsConstructor;', content)

fields = """
    @org.springframework.beans.factory.annotation.Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;
    
    @org.springframework.beans.factory.annotation.Autowired
    private EmailService emailService;
    
    @Value("${FRONTEND_BASE_URL:http://localhost:3001}")
    private String frontendBaseUrl;
"""
content = re.sub(r'private final com\.cakeplatform\.api\.modules\.location\.service\.LocationValidationService locationValidationService;', 'private final com.cakeplatform.api.modules.location.service.LocationValidationService locationValidationService;\n' + fields, content)

methods = """
    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if(hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Failed to hash token", e);
        }
    }

    private String generateSecureToken() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        StringBuilder hexString = new StringBuilder();
        for (byte b : bytes) {
            String hex = Integer.toHexString(0xff & b);
            if(hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        return hexString.toString();
    }

    @Transactional
    public void forgotPassword(String email) {
        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail == null) return;
        
        java.util.Optional<User> userOpt = userRepository.findByEmailIgnoreCase(normalizedEmail);
        if (userOpt.isEmpty()) {
            return;
        }
        
        User user = userOpt.get();
        if (passwordResetTokenRepository != null) {
            passwordResetTokenRepository.invalidateAllTokensForUser(user);
            
            String rawToken = generateSecureToken();
            String tokenHash = hashToken(rawToken);
            
            PasswordResetToken resetToken = new PasswordResetToken();
            resetToken.setUser(user);
            resetToken.setTokenHash(tokenHash);
            resetToken.setExpiryDate(LocalDateTime.now().plusHours(1));
            resetToken.setUsed(false);
            passwordResetTokenRepository.save(resetToken);
            
            String resetLink = frontendBaseUrl + "/reset-password#token=" + rawToken;
            if (emailService != null) emailService.sendPasswordResetEmail(user.getEmail(), resetLink);
        }
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        String tokenHash = hashToken(token);
        PasswordResetToken resetToken = passwordResetTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired token"));
                
        if (resetToken.isUsed() || resetToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Invalid or expired token");
        }
        
        if (newPassword == null || newPassword.length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters long");
        }
        
        User user = resetToken.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        
        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);
    }
}
"""

content = re.sub(r'}\s*$', methods, content)

with open('backend/src/main/java/com/cakeplatform/api/modules/auth/service/AuthService.java', 'w') as f:
    f.write(content)
