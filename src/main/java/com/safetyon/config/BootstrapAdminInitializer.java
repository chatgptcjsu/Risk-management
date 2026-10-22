package com.safetyon.config;

import com.safetyon.model.AppUser;
import com.safetyon.model.UserRole;
import com.safetyon.repository.AppUserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class BootstrapAdminInitializer {
    @Bean
    ApplicationRunner createBootstrapAdmin(
            AppUserRepository users,
            PasswordEncoder passwordEncoder,
            @Value("${safety.bootstrap-admin.username:admin}") String username,
            @Value("${safety.bootstrap-admin.password:}") String password,
            @Value("${safety.bootstrap-admin.display-name:시스템 관리자}") String displayName) {
        return args -> {
            if (users.existsById(username)) return;
            if (password == null || password.length() < 12) {
                throw new IllegalStateException("Set SAFETY_ADMIN_PASSWORD to at least 12 characters before starting the app.");
            }
            users.save(new AppUser(username, passwordEncoder.encode(password), displayName, UserRole.ADMIN));
        };
    }
}
