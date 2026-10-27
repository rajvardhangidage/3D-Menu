package com.immersivemenu.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class WebConfigurationTest {
    @Test
    void allowsConfiguredFrontendToPreflightAdminPutRequests() {
        var source = new WebConfiguration("https://admin.example").corsConfigurationSource();
        var request = new MockHttpServletRequest("OPTIONS", "/api/v1/admin/cafes/123");
        request.addHeader("Origin", "https://admin.example");
        request.addHeader("Access-Control-Request-Method", "PUT");
        var cors = source.getCorsConfiguration(request);

        assertThat(cors).isNotNull();
        assertThat(cors.checkOrigin("https://admin.example")).isEqualTo("https://admin.example");
        assertThat(cors.checkOrigin("https://attacker.example")).isNull();
        assertThat(cors.checkHttpMethod(org.springframework.http.HttpMethod.PUT)).isNotNull();
        assertThat(cors.checkHeaders(java.util.List.of("Authorization", "Content-Type"))).containsExactlyInAnyOrder(
                "Authorization", "Content-Type");
    }
}
