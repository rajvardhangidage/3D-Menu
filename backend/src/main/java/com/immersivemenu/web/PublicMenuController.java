package com.immersivemenu.web;

import com.immersivemenu.service.CafeService;
import com.immersivemenu.web.ApiDtos.MenuResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/v1/public/cafes", "/api/public/cafes"})
public class PublicMenuController {
    private final CafeService cafes;

    public PublicMenuController(CafeService cafes) {
        this.cafes = cafes;
    }

    @GetMapping("/{slug}/menu")
    public MenuResponse getMenu(@PathVariable String slug) {
        return cafes.getPublicMenu(slug);
    }
}
