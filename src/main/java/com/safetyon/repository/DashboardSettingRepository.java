package com.safetyon.repository;

import com.safetyon.model.DashboardSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DashboardSettingRepository extends JpaRepository<DashboardSetting, String> {
}
