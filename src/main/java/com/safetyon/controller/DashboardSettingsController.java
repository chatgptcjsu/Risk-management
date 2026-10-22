package com.safetyon.controller;

import com.safetyon.model.DashboardSetting;
import com.safetyon.repository.DashboardSettingRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/settings")
public class DashboardSettingsController {
    private static final String TITLE_KEY = "dashboard-title";
    private static final String DEFAULT_TITLE = "유해위험요인";

    private final DashboardSettingRepository settings;

    public DashboardSettingsController(DashboardSettingRepository settings) {
        this.settings = settings;
    }

    @GetMapping("/dashboard-title")
    public Map<String, String> getDashboardTitle() {
        String title = settings.findById(TITLE_KEY)
                .map(DashboardSetting::getValue)
                .filter(value -> !value.isBlank())
                .orElse(DEFAULT_TITLE);
        return Map.of("title", title);
    }

    @PutMapping("/dashboard-title")
    public Map<String, String> updateDashboardTitle(@Valid @RequestBody DashboardTitleRequest request) {
        String title = request.title().trim();
        DashboardSetting setting = settings.findById(TITLE_KEY)
                .orElseGet(() -> new DashboardSetting(TITLE_KEY, title));
        setting.setValue(title);
        settings.save(setting);
        return Map.of("title", title);
    }

    public record DashboardTitleRequest(@NotBlank @Size(max = 120) String title) {}
}
