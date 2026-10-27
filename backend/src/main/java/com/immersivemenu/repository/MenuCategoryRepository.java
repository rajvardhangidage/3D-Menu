package com.immersivemenu.repository;

import com.immersivemenu.domain.MenuCategory;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MenuCategoryRepository extends JpaRepository<MenuCategory, UUID> {
    List<MenuCategory> findAllByCafeIdOrderByDisplayOrderAsc(UUID cafeId);
    Page<MenuCategory> findAllByCafeId(UUID cafeId, Pageable pageable);
}
