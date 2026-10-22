package com.safetyon.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "app_users")
public class AppUser {
    @Id
    @Column(length = 100, nullable = false)
    private String username;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private UserRole role;

    @Column(nullable = false)
    private boolean enabled = true;

    protected AppUser() {}

    public AppUser(String username, String passwordHash, String displayName, UserRole role) {
        this.username = username;
        this.passwordHash = passwordHash;
        this.displayName = displayName;
        this.role = role;
        this.enabled = true;
    }

    public String getUsername() { return username; }
    public String getPasswordHash() { return passwordHash; }
    public String getDisplayName() { return displayName; }
    public UserRole getRole() { return role; }
    public boolean isEnabled() { return enabled; }

    public void setRole(UserRole role) { this.role = role; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
}
