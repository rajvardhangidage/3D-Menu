package com.immersivemenu.web;

import com.immersivemenu.domain.Cafe;
import com.immersivemenu.domain.MenuCategory;
import com.immersivemenu.domain.MenuItem;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Digits;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class ApiDtos {
    private ApiDtos() {}

    public record LoginRequest(
            @NotBlank @Email @Size(max = 320) String email,
            @NotBlank @Size(max = 72) String password) {}
    public record LoginResponse(String accessToken, String tokenType, Instant expiresAt) {}
    public record PageResponse<T>(List<T> content, int page, int size, long totalElements, int totalPages) {
        public static <S, T> PageResponse<T> from(
                org.springframework.data.domain.Page<S> page, java.util.function.Function<S, T> mapper) {
            return new PageResponse<>(page.getContent().stream().map(mapper).toList(), page.getNumber(),
                    page.getSize(), page.getTotalElements(), page.getTotalPages());
        }
    }

    public record CafeRequest(
            @NotBlank @Size(max = 160) String name,
            @NotBlank @Pattern(regexp = "^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$") @Size(max = 160) String slug,
            String logoUrl,
            @Size(max = 255) String logoPublicId,
            @Size(max = 4000) String description,
            @Size(max = 1000) String address,
            @Size(max = 40) String phone,
            @NotBlank @Pattern(regexp = "^[A-Z]{3}$") String currencyCode,
            boolean active) {}

    public record CafeResponse(
            UUID id, String name, String slug, String logoUrl, String logoPublicId, String description, String address,
            String phone, String currencyCode, boolean active, Instant createdAt, Instant updatedAt) {
        public static CafeResponse from(Cafe cafe) {
            return new CafeResponse(cafe.getId(), cafe.getName(), cafe.getSlug(), cafe.getLogoUrl(),
                    cafe.getLogoPublicId(),
                    cafe.getDescription(), cafe.getAddress(), cafe.getPhone(), cafe.getCurrencyCode(), cafe.isActive(),
                    cafe.getCreatedAt(), cafe.getUpdatedAt());
        }
    }

    public record MenuResponse(
            UUID id, String name, String slug, String logoUrl, String description, String address,
            String phone, String currencyCode, List<CategoryResponse> categories) {
        public static MenuResponse from(Cafe cafe) {
            return from(cafe, false);
        }

        public static MenuResponse from(Cafe cafe, boolean availableOnly) {
            return new MenuResponse(cafe.getId(), cafe.getName(), cafe.getSlug(), cafe.getLogoUrl(),
                    cafe.getDescription(), cafe.getAddress(), cafe.getPhone(), cafe.getCurrencyCode(),
                    cafe.getCategories().stream()
                            .sorted((a, b) -> Integer.compare(a.getDisplayOrder(), b.getDisplayOrder()))
                            .map(category -> CategoryResponse.from(category, availableOnly))
                            .toList());
        }
    }

    public record CategoryRequest(@NotBlank @Size(max = 120) String name, @PositiveOrZero int displayOrder) {}
    public record CategorySummaryResponse(UUID id, String name, int displayOrder) {
        public static CategorySummaryResponse from(MenuCategory category) {
            return new CategorySummaryResponse(category.getId(), category.getName(), category.getDisplayOrder());
        }
    }
    public record CategoryResponse(UUID id, String name, int displayOrder, List<ItemResponse> items) {
        public static CategoryResponse from(MenuCategory category) {
            return from(category, false);
        }

        public static CategoryResponse from(MenuCategory category, boolean availableOnly) {
            return new CategoryResponse(category.getId(), category.getName(), category.getDisplayOrder(),
                    category.getItems().stream()
                            .filter(item -> !availableOnly || item.isAvailable())
                            .sorted((a, b) -> Integer.compare(a.getDisplayOrder(), b.getDisplayOrder()))
                            .map(ItemResponse::from)
                            .toList());
        }
    }

    public record ItemRequest(
            @NotNull UUID categoryId,
            @NotBlank @Size(max = 160) String name,
            @Size(max = 4000) String description,
            String imageUrl,
            @Size(max = 255) String imagePublicId,
            @DecimalMin("0.00") @Digits(integer = 8, fraction = 2) BigDecimal halfPrice,
            @NotNull @DecimalMin("0.00") @Digits(integer = 8, fraction = 2) BigDecimal fullPrice,
            boolean available,
            @PositiveOrZero int displayOrder) {}
    public record ItemResponse(
            UUID id, String name, String description, String imageUrl, String imagePublicId, BigDecimal halfPrice,
            BigDecimal fullPrice, boolean available, int displayOrder) {
        public static ItemResponse from(MenuItem item) {
            return new ItemResponse(item.getId(), item.getName(), item.getDescription(), item.getImageUrl(),
                    item.getImagePublicId(),
                    item.getHalfPrice(), item.getFullPrice(), item.isAvailable(), item.getDisplayOrder());
        }
    }

    public record ImageResponse(String secureUrl, String publicId) {}
    public record CafeMenuUrlResponse(String cafeName, String slug, String menuUrl, boolean active) {}
}
