package com.cakeplatform.api.security;

import com.cakeplatform.api.modules.user.User;
import com.cakeplatform.api.modules.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        if (username == null || username.trim().isEmpty()) {
            throw new UsernameNotFoundException("Identifier cannot be empty");
        }

        String trimmed = username.trim();
        // Check if username looks like a phone number (normalize Indian mobile)
        String normalizedMobile = com.cakeplatform.api.modules.auth.service.AuthService.normalizeIndianMobile(trimmed);

        User user = null;
        if (normalizedMobile != null && !normalizedMobile.isEmpty()) {
            user = userRepository.findByMobile(normalizedMobile).orElse(null);
        }

        if (user == null) {
            String normalizedEmail = com.cakeplatform.api.modules.auth.service.AuthService.normalizeEmail(trimmed);
            user = userRepository.findByEmailIgnoreCase(normalizedEmail != null ? normalizedEmail : trimmed)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found with identifier: " + trimmed));
        }

        return new CustomUserDetails(user);
    }
}
