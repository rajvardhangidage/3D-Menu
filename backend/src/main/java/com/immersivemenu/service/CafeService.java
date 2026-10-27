package com.immersivemenu.service;

import com.immersivemenu.domain.Admin;
import com.immersivemenu.domain.Cafe;
import com.immersivemenu.domain.MenuCategory;
import com.immersivemenu.domain.MenuItem;
import com.immersivemenu.repository.AdminRepository;
import com.immersivemenu.repository.CafeRepository;
import com.immersivemenu.repository.MenuCategoryRepository;
import com.immersivemenu.repository.MenuItemRepository;
import com.immersivemenu.web.ApiDtos.CafeRequest;
import com.immersivemenu.web.ApiDtos.CafeResponse;
import com.immersivemenu.web.ApiDtos.CategoryRequest;
import com.immersivemenu.web.ApiDtos.CategoryResponse;
import com.immersivemenu.web.ApiDtos.CategorySummaryResponse;
import com.immersivemenu.web.ApiDtos.ItemRequest;
import com.immersivemenu.web.ApiDtos.ItemResponse;
import com.immersivemenu.web.ApiDtos.MenuResponse;
import com.immersivemenu.web.ApiDtos.PageResponse;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CafeService {
    private final CafeRepository cafes;
    private final AdminRepository admins;
    private final MenuCategoryRepository categories;
    private final MenuItemRepository items;
    private final CloudinaryStorageService storage;

    public CafeService(CafeRepository cafes, AdminRepository admins,
                       MenuCategoryRepository categories, MenuItemRepository items, CloudinaryStorageService storage) {
        this.cafes = cafes;
        this.admins = admins;
        this.categories = categories;
        this.items = items;
        this.storage = storage;
    }

    @Transactional(readOnly = true)
    public PageResponse<CafeResponse> listCafes(int page, int size) {
        return PageResponse.from(cafes.findAll(PageRequest.of(page, size,
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by("id")))),
                CafeResponse::from);
    }

    @Transactional(readOnly = true)
    public Cafe getCafe(UUID id) {
        return cafes.findById(id).orElseThrow(() -> notFound("Cafe"));
    }

    @Transactional(readOnly = true)
    public MenuResponse getAdminMenu(UUID id) {
        Cafe cafe = cafes.findWithMenuById(id).orElseThrow(() -> notFound("Cafe"));
        return MenuResponse.from(cafe);
    }

    @Transactional
    public Cafe createCafe(CafeRequest request, Authentication authentication) {
        validateImageAsset(request.logoUrl(), request.logoPublicId());
        Admin creator = admins.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> notFound("Admin"));
        String slug = normalizeSlug(request.slug());
        if (cafes.findBySlug(slug).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cafe slug already exists");
        }
        return cafes.save(new Cafe(request.name().trim(), slug, request.logoUrl(), request.logoPublicId(),
                request.description(), request.address(), request.phone(), request.currencyCode(),
                request.active(), creator));
    }

    @Transactional
    public Cafe updateCafe(UUID id, CafeRequest request) {
        validateImageAsset(request.logoUrl(), request.logoPublicId());
        Cafe cafe = getCafe(id);
        String slug = normalizeSlug(request.slug());
        cafes.findBySlug(slug).filter(existing -> !existing.getId().equals(id)).ifPresent(existing -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cafe slug already exists");
        });
        String oldLogoPublicId = cafe.getLogoPublicId();
        String newLogoPublicId = request.logoPublicId() == null
                && Objects.equals(cafe.getLogoUrl(), request.logoUrl()) ? oldLogoPublicId : request.logoPublicId();
        cafe.update(request.name().trim(), slug, request.logoUrl(), newLogoPublicId, request.description(),
                request.address(), request.phone(), request.currencyCode(), request.active());
        if (!Objects.equals(oldLogoPublicId, newLogoPublicId)) {
            storage.deleteImageAfterCommit(oldLogoPublicId);
        }
        return cafe;
    }

    @Transactional
    public void deleteCafe(UUID id) {
        Cafe cafe = cafes.findWithMenuById(id).orElseThrow(() -> notFound("Cafe"));
        cafe.getCategories().stream()
                .flatMap(category -> category.getItems().stream())
                .map(MenuItem::getImagePublicId)
                .forEach(storage::deleteImageAfterCommit);
        storage.deleteImageAfterCommit(cafe.getLogoPublicId());
        cafes.delete(cafe);
    }

    @Transactional(readOnly = true)
    public MenuResponse getPublicMenu(String slug) {
        Cafe cafe = cafes.findBySlugAndActiveTrue(slug)
                .orElseThrow(() -> notFound("Active cafe"));
        return MenuResponse.from(cafe, true);
    }

    @Transactional(readOnly = true)
    public PageResponse<CategorySummaryResponse> listCategories(UUID cafeId, int page, int size) {
        getCafe(cafeId);
        return PageResponse.from(categories.findAllByCafeId(cafeId, PageRequest.of(page, size,
                Sort.by(Sort.Direction.ASC, "displayOrder").and(Sort.by("id")))),
                CategorySummaryResponse::from);
    }

    @Transactional(readOnly = true)
    public CategoryResponse getCategoryResponse(UUID categoryId) {
        return CategoryResponse.from(getCategory(categoryId));
    }

    @Transactional
    public CategoryResponse createCategory(UUID cafeId, CategoryRequest request) {
        Cafe cafe = getCafe(cafeId);
        MenuCategory category = categories.save(new MenuCategory(cafe, request.name().trim(), request.displayOrder()));
        return CategoryResponse.from(category);
    }

    @Transactional
    public CategoryResponse updateCategory(UUID categoryId, CategoryRequest request) {
        MenuCategory category = categories.findById(categoryId)
                .orElseThrow(() -> notFound("Category"));
        category.update(request.name().trim(), request.displayOrder());
        return CategoryResponse.from(category);
    }

    @Transactional
    public void deleteCategory(UUID categoryId) {
        MenuCategory category = categories.findById(categoryId).orElseThrow(() -> notFound("Category"));
        category.getItems().stream().map(MenuItem::getImagePublicId).forEach(storage::deleteImageAfterCommit);
        categories.delete(category);
    }

    @Transactional(readOnly = true)
    public PageResponse<ItemResponse> listItems(UUID categoryId, int page, int size) {
        getCategory(categoryId);
        return PageResponse.from(items.findAllByCategoryId(categoryId, PageRequest.of(page, size,
                Sort.by(Sort.Direction.ASC, "displayOrder").and(Sort.by("id")))),
                ItemResponse::from);
    }

    @Transactional(readOnly = true)
    public ItemResponse getItem(UUID itemId) {
        return items.findById(itemId)
                .map(ItemResponse::from)
                .orElseThrow(() -> notFound("Menu item"));
    }

    @Transactional
    public MenuItem createItem(ItemRequest request) {
        validateImageAsset(request.imageUrl(), request.imagePublicId());
        MenuCategory category = getCategory(request.categoryId());
        validatePrices(request);
        return items.save(new MenuItem(category, request.name().trim(), request.description(), request.imageUrl(),
                request.imagePublicId(),
                request.halfPrice(), request.fullPrice(), request.available(), request.displayOrder()));
    }

    @Transactional
    public MenuItem updateItem(UUID itemId, ItemRequest request) {
        validateImageAsset(request.imageUrl(), request.imagePublicId());
        MenuItem item = items.findById(itemId).orElseThrow(() -> notFound("Menu item"));
        MenuCategory category = getCategory(request.categoryId());
        validatePrices(request);
        String oldImagePublicId = item.getImagePublicId();
        String newImagePublicId = request.imagePublicId() == null
                && Objects.equals(item.getImageUrl(), request.imageUrl()) ? oldImagePublicId : request.imagePublicId();
        item.update(category, request.name().trim(), request.description(), request.imageUrl(), newImagePublicId,
                request.halfPrice(), request.fullPrice(), request.available(), request.displayOrder());
        if (!Objects.equals(oldImagePublicId, newImagePublicId)) {
            storage.deleteImageAfterCommit(oldImagePublicId);
        }
        return item;
    }

    @Transactional
    public void deleteItem(UUID itemId) {
        MenuItem item = items.findById(itemId).orElseThrow(() -> notFound("Menu item"));
        storage.deleteImageAfterCommit(item.getImagePublicId());
        items.delete(item);
    }

    @Transactional(readOnly = true)
    public String menuUrl(Cafe cafe, String baseUrl) {
        return baseUrl.replaceAll("/+$", "") + "/cafe/" + cafe.getSlug();
    }

    private MenuCategory getCategory(UUID id) {
        return categories.findById(id).orElseThrow(() -> notFound("Category"));
    }

    private static String normalizeSlug(String slug) {
        return slug.trim().toLowerCase(Locale.ROOT);
    }

    private static void validatePrices(ItemRequest request) {
        if (request.halfPrice() != null && request.halfPrice().compareTo(request.fullPrice()) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Half price cannot exceed full price");
        }
    }

    private static void validateImageAsset(String url, String publicId) {
        if (publicId != null && (!publicId.startsWith("immersive-menu/") || url == null || url.isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Image URL and managed Cloudinary identifier must be provided together");
        }
    }

    private static ResponseStatusException notFound(String resource) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, resource + " not found");
    }
}
