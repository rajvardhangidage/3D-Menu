package com.immersivemenu.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "cafes")
public class Cafe {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(nullable = false, unique = true, length = 160)
    private String slug;

    @Column(name = "logo_url", columnDefinition = "text")
    private String logoUrl;
    @Column(name = "logo_public_id", length = 255)
    private String logoPublicId;
    @Column(columnDefinition = "text")
    private String description;
    @Column(columnDefinition = "text")
    private String address;
    @Column(length = 40)
    private String phone;
    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode = "USD";
    @Column(nullable = false)
    private boolean active = true;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private Admin createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @OneToMany(mappedBy = "cafe", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<MenuCategory> categories = new HashSet<>();

    protected Cafe() {}

    public Cafe(String name, String slug, String logoUrl, String description, String address, String phone,
                String currencyCode, boolean active, Admin createdBy) {
        this(name, slug, logoUrl, null, description, address, phone, currencyCode, active, createdBy);
    }

    public Cafe(String name, String slug, String logoUrl, String logoPublicId, String description, String address,
                String phone, String currencyCode, boolean active, Admin createdBy) {
        this.name = name;
        this.slug = slug;
        this.logoUrl = logoUrl;
        this.logoPublicId = logoPublicId;
        this.description = description;
        this.address = address;
        this.phone = phone;
        this.currencyCode = currencyCode;
        this.active = active;
        this.createdBy = createdBy;
    }

    @PreUpdate
    void updateTimestamp() { updatedAt = Instant.now(); }

    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getSlug() { return slug; }
    public String getLogoUrl() { return logoUrl; }
    public String getLogoPublicId() { return logoPublicId; }
    public String getDescription() { return description; }
    public String getAddress() { return address; }
    public String getPhone() { return phone; }
    public boolean isActive() { return active; }
    public Admin getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public String getCurrencyCode() { return currencyCode; }
    public Set<MenuCategory> getCategories() { return categories; }

    public void update(String name, String slug, String logoUrl, String logoPublicId, String description,
                       String address, String phone, String currencyCode, boolean active) {
        this.name = name;
        this.slug = slug;
        this.logoUrl = logoUrl;
        this.logoPublicId = logoPublicId;
        this.description = description;
        this.address = address;
        this.phone = phone;
        this.currencyCode = currencyCode;
        this.active = active;
    }
}
