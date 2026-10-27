package com.immersivemenu.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.cloudinary.Cloudinary;
import com.immersivemenu.domain.Admin;
import com.immersivemenu.domain.Cafe;
import com.immersivemenu.domain.MenuCategory;
import com.immersivemenu.domain.MenuItem;
import com.immersivemenu.repository.AdminRepository;
import com.immersivemenu.repository.CafeRepository;
import com.immersivemenu.repository.MenuCategoryRepository;
import com.immersivemenu.repository.MenuItemRepository;
import com.immersivemenu.web.ApiDtos.CafeRequest;
import com.immersivemenu.web.ApiDtos.CategoryRequest;
import com.immersivemenu.web.ApiDtos.ItemRequest;
import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.server.ResponseStatusException;

class CafeServiceTest {
    private CafeRepository cafes;
    private AdminRepository admins;
    private MenuCategoryRepository categories;
    private MenuItemRepository items;
    private CafeService service;

    @BeforeEach
    void setUp() {
        cafes = mock(CafeRepository.class);
        admins = mock(AdminRepository.class);
        categories = mock(MenuCategoryRepository.class);
        items = mock(MenuItemRepository.class);
        service = new CafeService(cafes, admins, categories, items,
                new CloudinaryStorageService(new Cloudinary(Map.of()), "", "", ""));
    }

    @Test
    void menuUrlUsesConfiguredFrontendOriginAndStableCafeSlug() {
        Cafe cafe = cafe("cafe-aroma");

        assertThat(service.menuUrl(cafe, "https://menu.example/"))
                .isEqualTo("https://menu.example/cafe/cafe-aroma");
    }

    @Test
    void createsCafeAndNormalizesItsUniqueSlug() {
        when(admins.findByEmailIgnoreCase("admin@example.com")).thenReturn(Optional.of(admin()));
        when(cafes.findBySlug("cafe-aroma")).thenReturn(Optional.empty());
        when(cafes.save(any(Cafe.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Cafe result = service.createCafe(cafeRequest("Cafe-Aroma"),
                new UsernamePasswordAuthenticationToken("admin@example.com", "token"));

        assertThat(result.getName()).isEqualTo("Cafe Aroma");
        assertThat(result.getSlug()).isEqualTo("cafe-aroma");
        assertThat(result.getLogoUrl()).isNull();
    }

    @Test
    void rejectsDuplicateCafeSlugWithConflict() {
        when(admins.findByEmailIgnoreCase("admin@example.com")).thenReturn(Optional.of(admin()));
        when(cafes.findBySlug("cafe-aroma")).thenReturn(Optional.of(cafe("cafe-aroma")));

        assertThatThrownBy(() -> service.createCafe(cafeRequest("cafe-aroma"),
                new UsernamePasswordAuthenticationToken("admin@example.com", "token")))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(exception -> ((ResponseStatusException) exception).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void createsUpdatesAndDeletesCategories() {
        UUID cafeId = UUID.randomUUID();
        Cafe cafe = cafe("cafe");
        when(cafes.findById(cafeId)).thenReturn(Optional.of(cafe));
        when(categories.save(any(MenuCategory.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var created = service.createCategory(cafeId, new CategoryRequest("  Mains ", 0));
        assertThat(created.name()).isEqualTo("Mains");

        UUID categoryId = UUID.randomUUID();
        MenuCategory category = new MenuCategory(cafe, "Mains", 0);
        when(categories.findById(categoryId)).thenReturn(Optional.of(category));
        var updated = service.updateCategory(categoryId, new CategoryRequest("Dinner", 2));
        assertThat(updated.name()).isEqualTo("Dinner");
        assertThat(updated.displayOrder()).isEqualTo(2);
        service.deleteCategory(categoryId);
        verify(categories).delete(category);
    }

    @Test
    void createsUpdatesAndDeletesItemsWithOptionalImagesAndPrices() {
        UUID categoryId = UUID.randomUUID();
        when(categories.findById(categoryId)).thenReturn(Optional.of(category()));
        when(items.save(any(MenuItem.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MenuItem created = service.createItem(new ItemRequest(categoryId, "Soup", null, null, null,
                null, new BigDecimal("12.00"), true, 0));
        assertThat(created.getImageUrl()).isNull();
        assertThat(created.getHalfPrice()).isNull();
        assertThat(created.getFullPrice()).isEqualByComparingTo("12.00");

        UUID itemId = UUID.randomUUID();
        when(items.findById(itemId)).thenReturn(Optional.of(created));
        MenuItem updated = service.updateItem(itemId, new ItemRequest(categoryId, "Soup", null, null, null,
                new BigDecimal("6.00"), new BigDecimal("12.00"), false, 1));
        assertThat(updated.getHalfPrice()).isEqualByComparingTo("6.00");
        assertThat(updated.isAvailable()).isFalse();
        assertThat(updated.getDisplayOrder()).isEqualTo(1);

        service.deleteItem(itemId);
        verify(items).delete(created);
    }

    @Test
    void rejectsHalfPriceAboveFullPrice() {
        UUID categoryId = UUID.randomUUID();
        when(categories.findById(categoryId)).thenReturn(Optional.of(category()));

        assertThatThrownBy(() -> service.createItem(new ItemRequest(categoryId, "Soup", null, null, null,
                new BigDecimal("13.00"), new BigDecimal("12.00"), true, 0)))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(exception -> ((ResponseStatusException) exception).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void publicMenuRejectsInvalidOrInactiveCafeSlug() {
        when(cafes.findBySlugAndActiveTrue("missing-cafe")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getPublicMenu("missing-cafe"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(exception -> ((ResponseStatusException) exception).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void publicMenuIncludesCafeWithoutLogoAndOnlyAvailableItems() {
        Cafe cafe = cafe("cafe-aroma");
        MenuCategory mains = new MenuCategory(cafe, "Mains", 0);
        mains.getItems().add(new MenuItem(mains, "Full price dish", null, null, null,
                null, new BigDecimal("14.00"), true, 0));
        mains.getItems().add(new MenuItem(mains, "Half and full dish", null, null, null,
                new BigDecimal("8.00"), new BigDecimal("15.00"), true, 1));
        mains.getItems().add(new MenuItem(mains, "Unavailable dish", null, null, null,
                null, new BigDecimal("10.00"), false, 2));
        cafe.getCategories().add(mains);
        when(cafes.findBySlugAndActiveTrue("cafe-aroma")).thenReturn(Optional.of(cafe));

        var menu = service.getPublicMenu("cafe-aroma");

        assertThat(menu.logoUrl()).isNull();
        assertThat(menu.categories()).hasSize(1);
        assertThat(menu.categories().getFirst().items())
                .extracting(item -> item.name())
                .containsExactly("Full price dish", "Half and full dish");
        assertThat(menu.categories().getFirst().items().getFirst().halfPrice()).isNull();
        assertThat(menu.categories().getFirst().items().get(1).halfPrice()).isEqualByComparingTo("8.00");
    }

    @Test
    void createsCafeWithoutMenuContent() {
        when(admins.findByEmailIgnoreCase("admin@example.com")).thenReturn(Optional.of(admin()));
        when(cafes.findBySlug("empty-cafe")).thenReturn(Optional.empty());
        when(cafes.save(any(Cafe.class))).thenAnswer(invocation -> invocation.getArgument(0));
        Cafe saved = service.createCafe(cafeRequest("empty-cafe"),
                new UsernamePasswordAuthenticationToken("admin@example.com", "token"));

        assertThat(saved.getCategories()).isEmpty();
        assertThat(saved.getLogoUrl()).isNull();
    }

    private static Cafe cafe(String slug) {
        return new Cafe("Cafe Aroma", slug, null, null, null, null, "USD", true, admin());
    }

    private static Admin admin() {
        return new Admin("admin@example.com", "hash");
    }

    private static MenuCategory category() {
        return new MenuCategory(cafe("cafe"), "Mains", 0);
    }

    private static CafeRequest cafeRequest(String slug) {
        return new CafeRequest(" Cafe Aroma ", slug, null, null, null, null, null, "USD", true);
    }
}
