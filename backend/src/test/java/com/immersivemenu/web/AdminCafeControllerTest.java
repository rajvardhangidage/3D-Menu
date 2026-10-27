package com.immersivemenu.web;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.immersivemenu.config.WebConfiguration;
import com.immersivemenu.domain.Admin;
import com.immersivemenu.domain.Cafe;
import com.immersivemenu.security.SecurityConfiguration;
import com.immersivemenu.service.CafeService;
import com.immersivemenu.service.CloudinaryStorageService;
import com.immersivemenu.service.QrCodeService;
import com.immersivemenu.service.TokenService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import com.immersivemenu.web.ApiDtos.MenuResponse;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = {AdminCafeController.class, PublicMenuController.class, AuthController.class})
@Import({SecurityConfiguration.class, WebConfiguration.class, ApiExceptionHandler.class})
@TestPropertySource(properties = {
        "app.security.jwt-secret=01234567890123456789012345678901",
        "app.cors.allowed-origin=https://admin.example",
        "app.frontend-base-url=https://menu.example"
})
class AdminCafeControllerTest {
    @Autowired private MockMvc mvc;
    @MockBean private CafeService cafes;
    @MockBean private QrCodeService qrCodes;
    @MockBean private CloudinaryStorageService storage;
    @MockBean private com.immersivemenu.repository.AdminRepository admins;
    @MockBean private AuthenticationManager authenticationManager;
    @MockBean private TokenService tokens;

    @Test
    void adminEndpointRejectsUnauthenticatedRequest() throws Exception {
        mvc.perform(get("/api/v1/admin/cafes"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
    }

    @Test
    void adminEndpointRejectsNonAdminRole() throws Exception {
        mvc.perform(get("/api/v1/admin/cafes")
                        .with(jwt().authorities(List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER")))))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminEndpointAcceptsAdminAndValidatesPagination() throws Exception {
        mvc.perform(get("/api/v1/admin/cafes")
                        .with(jwt().authorities(List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))))
                        .queryParam("page", "-1"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void adminCreateRejectsInvalidCafeSlug() throws Exception {
        mvc.perform(post("/api/v1/admin/cafes")
                        .with(jwt().authorities(List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Cafe","slug":"../bad","currencyCode":"USD","active":true}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void loginIssuesBearerTokenForValidCredentials() throws Exception {
        when(authenticationManager.authenticate(any(Authentication.class)))
                .thenReturn(new UsernamePasswordAuthenticationToken("admin@example.com", null, List.of()));
        when(tokens.issue("admin@example.com"))
                .thenReturn(new ApiDtos.LoginResponse("signed-token", "Bearer", java.time.Instant.now().plusSeconds(600)));

        mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"admin@example.com","password":"correct-password"}
                                """))
                .andExpect(status().isOk())
                .andExpect(content().json("""
                        {"accessToken":"signed-token","tokenType":"Bearer"}
                        """));
    }

    @Test
    void loginRejectsInvalidCredentials() throws Exception {
        when(authenticationManager.authenticate(any(Authentication.class)))
                .thenThrow(new BadCredentialsException("invalid"));

        mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"admin@example.com","password":"incorrect"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginRejectsMalformedEmailOrMissingPassword() throws Exception {
        mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"not-an-email","password":""}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void publicMenuDoesNotRequireAuthentication() throws Exception {
        UUID cafeId = UUID.randomUUID();
        Cafe cafe = new Cafe("Cafe Aroma", "cafe-aroma", null, null, null, null,
                "USD", true, new Admin("admin@example.com", "hash"));
        when(cafes.getPublicMenu("cafe-aroma")).thenReturn(MenuResponse.from(cafe));

        mvc.perform(get("/api/public/cafes/cafe-aroma/menu"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(content().json("""
                        {"name":"Cafe Aroma","slug":"cafe-aroma","currencyCode":"USD","categories":[]}
                        """));
        verify(cafes).getPublicMenu("cafe-aroma");
    }

}
