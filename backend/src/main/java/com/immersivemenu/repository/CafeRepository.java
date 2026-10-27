package com.immersivemenu.repository;

import com.immersivemenu.domain.Cafe;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CafeRepository extends JpaRepository<Cafe, UUID> {
    Optional<Cafe> findBySlug(String slug);
    @EntityGraph(attributePaths = {"categories", "categories.items"})
    Optional<Cafe> findBySlugAndActiveTrue(String slug);
    @EntityGraph(attributePaths = {"categories", "categories.items"})
    @Query("select cafe from Cafe cafe where cafe.id = :id")
    Optional<Cafe> findWithMenuById(@Param("id") UUID id);
}
