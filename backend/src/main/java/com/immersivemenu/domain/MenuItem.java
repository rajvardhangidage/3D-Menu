package com.immersivemenu.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "menu_items")
public class MenuItem {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private MenuCategory category;
    @Column(nullable = false, length = 160)
    private String name;
    @Column(columnDefinition = "text")
    private String description;
    @Column(name = "image_url", columnDefinition = "text")
    private String imageUrl;
    @Column(name = "image_public_id", length = 255)
    private String imagePublicId;
    @Column(name = "half_price", precision = 10, scale = 2)
    private BigDecimal halfPrice;
    @Column(name = "full_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal fullPrice;
    @Column(nullable = false)
    private boolean available = true;
    @Column(name = "display_order", nullable = false)
    private int displayOrder = 0;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected MenuItem() {}

    public MenuItem(MenuCategory category, String name, String description, String imageUrl, BigDecimal halfPrice,
                    BigDecimal fullPrice, boolean available, int displayOrder) {
        this(category, name, description, imageUrl, null, halfPrice, fullPrice, available, displayOrder);
    }

    public MenuItem(MenuCategory category, String name, String description, String imageUrl, String imagePublicId,
                    BigDecimal halfPrice, BigDecimal fullPrice, boolean available, int displayOrder) {
        this.category = category;
        this.name = name;
        this.description = description;
        this.imageUrl = imageUrl;
        this.imagePublicId = imagePublicId;
        this.halfPrice = halfPrice;
        this.fullPrice = fullPrice;
        this.available = available;
        this.displayOrder = displayOrder;
    }

    public UUID getId() { return id; }
    public MenuCategory getCategory() { return category; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public String getImageUrl() { return imageUrl; }
    public String getImagePublicId() { return imagePublicId; }
    public BigDecimal getHalfPrice() { return halfPrice; }
    public BigDecimal getFullPrice() { return fullPrice; }
    public boolean isAvailable() { return available; }
    public int getDisplayOrder() { return displayOrder; }
    public Instant getCreatedAt() { return createdAt; }
    public void update(MenuCategory category, String name, String description, String imageUrl, String imagePublicId,
                       BigDecimal halfPrice, BigDecimal fullPrice, boolean available, int displayOrder) {
        this.category = category;
        this.name = name;
        this.description = description;
        this.imageUrl = imageUrl;
        this.imagePublicId = imagePublicId;
        this.halfPrice = halfPrice;
        this.fullPrice = fullPrice;
        this.available = available;
        this.displayOrder = displayOrder;
    }
}
