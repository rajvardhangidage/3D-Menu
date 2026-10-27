package com.immersivemenu.config;

import com.immersivemenu.domain.Admin;
import com.immersivemenu.repository.AdminRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Profile("dev")
public class DevelopmentAdminSeed implements ApplicationRunner {
    private static final Logger logger = LoggerFactory.getLogger(DevelopmentAdminSeed.class);
    private static final String EMAIL = "admin@immersivemenu.com";
    private static final String PASSWORD = "Admin@123";

    private final AdminRepository admins;
    private final PasswordEncoder passwordEncoder;

    public DevelopmentAdminSeed(AdminRepository admins, PasswordEncoder passwordEncoder) {
        this.admins = admins;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (admins.count() > 0) {
            return;
        }

        admins.save(new Admin(EMAIL, passwordEncoder.encode(PASSWORD)));
        logger.info("Created development admin account: {}", EMAIL);
    }
}
