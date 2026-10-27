package com.immersivemenu.web;

import com.immersivemenu.service.CafeService;
import com.immersivemenu.service.CloudinaryStorageService;
import com.immersivemenu.service.QrCodeService;
import com.immersivemenu.web.ApiDtos.CafeRequest;
import com.immersivemenu.web.ApiDtos.CafeMenuUrlResponse;
import com.immersivemenu.web.ApiDtos.CafeResponse;
import com.immersivemenu.web.ApiDtos.CategoryRequest;
import com.immersivemenu.web.ApiDtos.CategoryResponse;
import com.immersivemenu.web.ApiDtos.CategorySummaryResponse;
import com.immersivemenu.web.ApiDtos.ImageResponse;
import com.immersivemenu.web.ApiDtos.ItemRequest;
import com.immersivemenu.web.ApiDtos.ItemResponse;
import com.immersivemenu.web.ApiDtos.MenuResponse;
import com.immersivemenu.web.ApiDtos.PageResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.io.IOException;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping({"/api/v1/admin", "/api/admin"})
@SecurityRequirement(name = "bearerAuth")
public class AdminCafeController {
    private final CafeService cafes;
    private final QrCodeService qrCodes;
    private final CloudinaryStorageService storage;
    private final String frontendBaseUrl;

    public AdminCafeController(CafeService cafes, QrCodeService qrCodes, CloudinaryStorageService storage,
                               @Value("${app.frontend-base-url}") String frontendBaseUrl) {
        this.cafes = cafes;
        this.qrCodes = qrCodes;
        this.storage = storage;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    @GetMapping("/cafes")
    public PageResponse<CafeResponse> listCafes(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        validatePagination(page, size);
        return cafes.listCafes(page, size);
    }

    @PostMapping("/cafes")
    @ResponseStatus(HttpStatus.CREATED)
    public CafeResponse createCafe(@Valid @RequestBody CafeRequest request, Authentication authentication) {
        return CafeResponse.from(cafes.createCafe(request, authentication));
    }

    @GetMapping("/cafes/{cafeId}")
    public CafeResponse getCafe(@PathVariable UUID cafeId) {
        return CafeResponse.from(cafes.getCafe(cafeId));
    }

    @GetMapping("/cafes/{cafeId}/menu")
    public MenuResponse getCafeMenu(@PathVariable UUID cafeId) {
        return cafes.getAdminMenu(cafeId);
    }

    @PutMapping("/cafes/{cafeId}")
    public CafeResponse updateCafe(@PathVariable UUID cafeId, @Valid @RequestBody CafeRequest request) {
        return CafeResponse.from(cafes.updateCafe(cafeId, request));
    }

    @DeleteMapping("/cafes/{cafeId}")
    public ResponseEntity<Void> deleteCafe(@PathVariable UUID cafeId) {
        cafes.deleteCafe(cafeId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/cafes/{cafeId}/categories")
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryResponse createCategory(@PathVariable UUID cafeId, @Valid @RequestBody CategoryRequest request) {
        return cafes.createCategory(cafeId, request);
    }

    @GetMapping("/cafes/{cafeId}/categories")
    public PageResponse<CategorySummaryResponse> listCategories(
            @PathVariable UUID cafeId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        validatePagination(page, size);
        return cafes.listCategories(cafeId, page, size);
    }

    @GetMapping("/categories/{categoryId}")
    public CategoryResponse getCategory(@PathVariable UUID categoryId) {
        return cafes.getCategoryResponse(categoryId);
    }

    @PutMapping("/categories/{categoryId}")
    public CategoryResponse updateCategory(@PathVariable UUID categoryId, @Valid @RequestBody CategoryRequest request) {
        return cafes.updateCategory(categoryId, request);
    }

    @DeleteMapping("/categories/{categoryId}")
    public ResponseEntity<Void> deleteCategory(@PathVariable UUID categoryId) {
        cafes.deleteCategory(categoryId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/categories/{categoryId}/items")
    public PageResponse<ItemResponse> listItems(
            @PathVariable UUID categoryId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        validatePagination(page, size);
        return cafes.listItems(categoryId, page, size);
    }

    @PostMapping("/items")
    @ResponseStatus(HttpStatus.CREATED)
    public ItemResponse createItem(@Valid @RequestBody ItemRequest request) {
        return ItemResponse.from(cafes.createItem(request));
    }

    @GetMapping("/items/{itemId}")
    public ItemResponse getItem(@PathVariable UUID itemId) {
        return cafes.getItem(itemId);
    }

    @PutMapping("/items/{itemId}")
    public ItemResponse updateItem(@PathVariable UUID itemId, @Valid @RequestBody ItemRequest request) {
        return ItemResponse.from(cafes.updateItem(itemId, request));
    }

    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<Void> deleteItem(@PathVariable UUID itemId) {
        cafes.deleteItem(itemId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ImageResponse uploadImage(@RequestPart("image") MultipartFile image) throws IOException {
        var uploaded = storage.uploadImage(image);
        return new ImageResponse(uploaded.secureUrl(), uploaded.publicId());
    }

    @DeleteMapping("/images")
    public ResponseEntity<Void> deleteImage(@RequestParam String publicId) throws IOException {
        storage.deleteImage(publicId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/cafes/{cafeId}/qr")
    public ResponseEntity<byte[]> getQrCode(@PathVariable UUID cafeId) throws IOException {
        var cafe = cafes.getCafe(cafeId);
        String url = cafes.menuUrl(cafe, frontendBaseUrl);
        byte[] image = qrCodes.createPng(url);
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment()
                                .filename("menu-" + cafe.getSlug() + ".png").build().toString())
                .body(image);
    }

    @GetMapping("/cafes/{cafeId}/qr/url")
    public CafeMenuUrlResponse getCafeMenuUrl(@PathVariable UUID cafeId) {
        var cafe = cafes.getCafe(cafeId);
        return new CafeMenuUrlResponse(cafe.getName(), cafe.getSlug(),
                cafes.menuUrl(cafe, frontendBaseUrl), cafe.isActive());
    }

    @GetMapping("/cafes/{cafeId}/qr.pdf")
    public ResponseEntity<byte[]> getPrintableQrCode(@PathVariable UUID cafeId) throws IOException {
        var cafe = cafes.getCafe(cafeId);
        String url = cafes.menuUrl(cafe, frontendBaseUrl);
        byte[] pdf = qrCodes.createPrintablePdf(cafe.getName(), url);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename("menu-" + cafe.getSlug() + ".pdf").build().toString())
                .body(pdf);
    }

    private static void validatePagination(int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Pagination requires page >= 0 and size between 1 and 100");
        }
    }
}
