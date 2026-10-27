package com.immersivemenu.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.immersivemenu.domain.Admin;
import com.immersivemenu.repository.AdminRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

class DevelopmentAdminSeedTest {
    private AdminRepository admins;
    private PasswordEncoder passwordEncoder;
    private DevelopmentAdminSeed seed;

    @BeforeEach
    void setUp() {
        admins = mock(AdminRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        seed = new DevelopmentAdminSeed(admins, passwordEncoder);
    }

    @Test
    void seedOnlyRunsWithDevelopmentProfile() {
        assertThat(DevelopmentAdminSeed.class.getAnnotation(Profile.class).value())
                .containsExactly("dev");
    }

    @Test
    void createsHashedDevelopmentAdminWhenDatabaseHasNoAdmins() {
        when(admins.count()).thenReturn(0L);
        when(passwordEncoder.encode("Admin@123")).thenReturn("$2a$12$hashed-password");

        seed.run(new DefaultApplicationArguments(new String[0]));

        verify(passwordEncoder).encode("Admin@123");
        verify(admins).save(any(Admin.class));
        var savedAdmin = org.mockito.ArgumentCaptor.forClass(Admin.class);
        verify(admins).save(savedAdmin.capture());
        assertThat(savedAdmin.getValue().getEmail()).isEqualTo("admin@immersivemenu.com");
        assertThat(savedAdmin.getValue().getPasswordHash()).isEqualTo("$2a$12$hashed-password");
        assertThat(savedAdmin.getValue().getPasswordHash()).isNotEqualTo("Admin@123");
    }

    @Test
    void doesNotCreateDuplicateWhenAnAdminAlreadyExists() {
        when(admins.count()).thenReturn(1L);

        seed.run(new DefaultApplicationArguments(new String[0]));

        verify(admins).count();
        verify(admins, never()).save(any(Admin.class));
        verify(passwordEncoder, never()).encode(any());
    }
}
