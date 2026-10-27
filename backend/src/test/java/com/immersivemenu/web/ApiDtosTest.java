package com.immersivemenu.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.immersivemenu.domain.Admin;
import com.immersivemenu.domain.Cafe;
import com.immersivemenu.domain.MenuCategory;
import com.immersivemenu.domain.MenuItem;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class ApiDtosTest {
    @Test
    void publicMenuIncludesOnlyAvailableItemsAndPreservesDisplayOrder() {
        Admin admin = new Admin("admin@example.com", "hash");
        Cafe cafe = new Cafe("Cafe", "cafe", null, null, null, null, "USD", true, admin);
        MenuCategory category = new MenuCategory(cafe, "Mains", 1);
        cafe.getCategories().add(category);
        category.getItems().add(new MenuItem(category, "Unavailable", null, null, null,
                new BigDecimal("10.00"), false, 0));
        category.getItems().add(new MenuItem(category, "Available", null, null, null,
                new BigDecimal("12.00"), true, 1));

        ApiDtos.MenuResponse response = ApiDtos.MenuResponse.from(cafe, true);

        assertThat(response.currencyCode()).isEqualTo("USD");
        assertThat(response.categories()).hasSize(1);
        assertThat(response.categories().getFirst().items())
                .extracting(ApiDtos.ItemResponse::name)
                .containsExactly("Available");
    }

    @Test
    void adminMenuIncludesUnavailableItems() {
        Admin admin = new Admin("admin@example.com", "hash");
        Cafe cafe = new Cafe("Cafe", "cafe", null, null, null, null, "USD", true, admin);
        MenuCategory category = new MenuCategory(cafe, "Mains", 0);
        cafe.getCategories().add(category);
        category.getItems().add(new MenuItem(category, "Unavailable", null, null, null,
                new BigDecimal("10.00"), false, 0));

        ApiDtos.MenuResponse response = ApiDtos.MenuResponse.from(cafe);

        assertThat(response.categories().getFirst().items())
                .extracting(ApiDtos.ItemResponse::name)
                .containsExactly("Unavailable");
    }
}
