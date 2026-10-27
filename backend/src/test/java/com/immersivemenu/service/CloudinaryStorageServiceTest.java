package com.immersivemenu.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cloudinary.Cloudinary;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

class CloudinaryStorageServiceTest {
    private final CloudinaryStorageService storage = new CloudinaryStorageService(
            new Cloudinary(Map.of("cloud_name", "test", "api_key", "test", "api_secret", "test")),
            "test", "test", "test");

    @Test
    void rejectsContentThatDoesNotMatchItsImageMimeType() {
        var image = new MockMultipartFile("image", "not-an-image.jpg", "image/jpeg",
                "not an image".getBytes());

        assertThatThrownBy(() -> storage.uploadImage(image))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("valid PNG, JPEG, GIF, or WebP");
    }

    @Test
    void rejectsImagesLargerThanTenMegabytes() {
        var image = new MockMultipartFile("image", "large.png", "image/png",
                new byte[10 * 1024 * 1024 + 1]);

        assertThatThrownBy(() -> storage.uploadImage(image))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("10 MB");
    }
}
