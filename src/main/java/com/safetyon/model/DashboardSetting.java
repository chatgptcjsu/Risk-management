package com.safetyon.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "dashboard_settings")
public class DashboardSetting {
    @Id
    @Column(name = "setting_key", length = 64, nullable = false)
    private String key;

    @Column(name = "setting_value", columnDefinition = "TEXT", nullable = false)
    private String value;

    protected DashboardSetting() {}

    public DashboardSetting(String key, String value) {
        this.key = key;
        this.value = value;
    }

    public String getKey() { return key; }
    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }
}
