package com.immersivemenu.config;

import com.immersivemenu.domain.Admin;
import com.immersivemenu.repository.AdminRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminBootstrap implements ApplicationRunner {
    private final AdminRepository admins;
    private final PasswordEncoder passwordEncoder;
    private final String email;
    private final String password;

    public AdminBootstrap(
            AdminRepository admins,
            PasswordEncoder passwordEncoder,
            @Value("${app.bootstrap.admin-email}") String email,
            @Value("${app.bootstrap.admin-password}") String password) {
        this.admins = admins;
        this.passwordEncoder = passwordEncoder;
        this.email = email.trim();
        this.password = password;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (email.isBlank() && password.isBlank()) return;
        if (email.isBlank() || password.isBlank()) {
            throw new IllegalStateException("Set both ADMIN_EMAIL and ADMIN_PASSWORD to bootstrap the initial admin");
        }
        if (admins.findByEmailIgnoreCase(email).isEmpty()) {
            admins.save(new Admin(email, passwordEncoder.encode(password)));
        }
    }
}
