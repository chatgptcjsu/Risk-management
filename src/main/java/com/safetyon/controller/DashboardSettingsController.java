package com.safetyon.controller;

import com.safetyon.model.AssessmentType;
import com.safetyon.model.DashboardSetting;
import com.safetyon.model.FileCategory;
import com.safetyon.model.StoredFile;
import com.safetyon.repository.DashboardSettingRepository;
import com.safetyon.repository.StoredFileRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.validation.annotation.Validated;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.LinkedHashSet;

@RestController
@RequestMapping("/api/settings")
@Validated
public class DashboardSettingsController {
    private static final String TITLE_KEY = "dashboard-title";
    private static final String DEFAULT_TITLE = "유해위험요인";
    private static final String HAZARD_LABEL_KEY = "hazard-risk-label";
    private static final String DEFAULT_HAZARD_LABEL = "유해∙위험요인";
    private static final String TEAM_PROCESSES_KEY = "team-processes";
    private final DashboardSettingRepository settings;
    private final StoredFileRepository files;
    private final ObjectMapper objectMapper;

    public DashboardSettingsController(DashboardSettingRepository settings, StoredFileRepository files, ObjectMapper objectMapper) {
        this.settings = settings;
        this.files = files;
        this.objectMapper = objectMapper;
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

    @GetMapping("/hazard-risk-label")
    public Map<String, String> getHazardRiskLabel() {
        String label = settings.findById(HAZARD_LABEL_KEY)
                .map(DashboardSetting::getValue)
                .filter(value -> !value.isBlank())
                .orElse(DEFAULT_HAZARD_LABEL);
        return Map.of("label", label);
    }

    @PutMapping("/hazard-risk-label")
    public Map<String, String> updateHazardRiskLabel(@Valid @RequestBody DashboardTitleRequest request) {
        String label = request.title().trim();
        DashboardSetting setting = settings.findById(HAZARD_LABEL_KEY)
                .orElseGet(() -> new DashboardSetting(HAZARD_LABEL_KEY, label));
        setting.setValue(label);
        settings.save(setting);
        return Map.of("label", label);
    }

    @GetMapping("/team-processes")
    public Map<String, List<String>> getTeamProcesses() {
        return settings.findById(TEAM_PROCESSES_KEY)
                .map(DashboardSetting::getValue)
                .map(this::parseTeamProcesses)
                .orElseGet(this::defaultTeamProcesses);
    }

    @PutMapping("/team-processes")
    public Map<String, List<String>> updateTeamProcesses(@Valid @RequestBody TeamProcessesRequest request) {
        Map<String, List<String>> normalized = normalizeTeamProcesses(request.teams());
        try {
            String json = objectMapper.writeValueAsString(normalized);
            DashboardSetting setting = settings.findById(TEAM_PROCESSES_KEY)
                    .orElseGet(() -> new DashboardSetting(TEAM_PROCESSES_KEY, json));
            setting.setValue(json);
            settings.save(setting);
            return normalized;
        } catch (Exception ex) {
            throw new IllegalStateException("팀·공정 분류를 저장하지 못했습니다.", ex);
        }
    }

    private Map<String, List<String>> parseTeamProcesses(String json) {
        try {
            return normalizeTeamProcesses(objectMapper.readValue(json, new TypeReference<Map<String, List<String>>>() {}));
        } catch (Exception ex) {
            return defaultTeamProcesses();
        }
    }

    private Map<String, List<String>> normalizeTeamProcesses(Map<String, List<String>> teams) {
        if (teams == null || teams.isEmpty() || teams.size() > 50) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "팀은 1~50개까지 설정할 수 있습니다.");
        }
        Map<String, List<String>> normalized = new LinkedHashMap<>();
        int totalProcesses = 0;
        for (Map.Entry<String, List<String>> entry : teams.entrySet()) {
            String team = entry.getKey() == null ? "" : entry.getKey().trim();
            List<String> processes = entry.getValue();
            if (team.isBlank() || team.length() > 80 || processes == null || processes.size() > 25) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "팀 또는 공정 이름과 개수를 확인해 주세요.");
            }
            List<String> cleanedProcesses = new ArrayList<>();
            List<String> seen = new ArrayList<>();
            for (String rawProcess : processes) {
                String process = rawProcess == null ? "" : rawProcess.trim();
                String normalizedKey = process.toLowerCase(Locale.ROOT);
                if (process.isBlank() || process.length() > 80 || seen.contains(normalizedKey)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "공정 이름이 비어 있거나 중복되었습니다.");
                }
                seen.add(normalizedKey);
                cleanedProcesses.add(process);
                totalProcesses++;
            }
            normalized.put(team, cleanedProcesses);
        }
        if (totalProcesses > 200) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "공정은 전체 200개까지 설정할 수 있습니다.");
        return normalized;
    }

    @GetMapping("/department-participation")
    public DepartmentParticipationResponse getDepartmentParticipation(@org.springframework.web.bind.annotation.RequestParam @Min(2000) @Max(2100) int year) {
        Map<String, List<String>> teams = settings.findById(TEAM_PROCESSES_KEY)
                .map(DashboardSetting::getValue)
                .map(this::parseTeamProcesses)
                .orElseGet(this::defaultTeamProcesses);
        Map<String, Integer> goals = readParticipationGoals(year);
        List<StoredFile> assessments = files.findAllByYearAndAssessmentTypeAndCategoryOrderByUploadedAtDesc(
                year, AssessmentType.REGULAR, FileCategory.HAZARD_RISK);
        List<DepartmentParticipationSummary> summaries = new ArrayList<>();

        for (Map.Entry<String, List<String>> entry : teams.entrySet()) {
            String team = entry.getKey();
            List<String> processes = entry.getValue();
            Set<String> completedUnits = new LinkedHashSet<>();
            for (StoredFile file : assessments) {
                if (!team.equals(file.getTeam())) continue;
                String process = file.getProcess() == null ? "" : file.getProcess().trim();
                if (processes.isEmpty()) {
                    if (process.isBlank()) completedUnits.add(team);
                } else if (processes.contains(process)) {
                    completedUnits.add(process);
                }
            }
            int availableUnits = Math.max(1, processes.size());
            int targetPercent = goals.getOrDefault(team, 100);
            int completed = completedUnits.size();
            int participationPercent = availableUnits == 0 ? 0
                    : (int) Math.round(completed * 100.0 / availableUnits);
            summaries.add(new DepartmentParticipationSummary(team, completed, availableUnits,
                    participationPercent, targetPercent, participationPercent >= targetPercent));
        }
        return new DepartmentParticipationResponse(year, summaries);
    }

    @PutMapping("/department-participation/goals")
    public DepartmentParticipationResponse updateDepartmentParticipationGoals(@Valid @RequestBody ParticipationGoalsRequest request) {
        Map<String, List<String>> teams = settings.findById(TEAM_PROCESSES_KEY)
                .map(DashboardSetting::getValue)
                .map(this::parseTeamProcesses)
                .orElseGet(this::defaultTeamProcesses);
        Map<String, Integer> goals = readParticipationGoals(request.year());
        for (Map.Entry<String, Integer> entry : request.goals().entrySet()) {
            String team = entry.getKey() == null ? "" : entry.getKey().trim();
            Integer goal = entry.getValue();
            if (!teams.containsKey(team) || goal == null || goal < 1 || goal > 100) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "부서별 목표 참여율은 1~100%로 설정해 주세요.");
            }
            goals.put(team, goal);
        }
        try {
            String json = objectMapper.writeValueAsString(goals);
            String key = participationGoalsKey(request.year());
            DashboardSetting setting = settings.findById(key).orElseGet(() -> new DashboardSetting(key, json));
            setting.setValue(json);
            settings.save(setting);
        } catch (Exception ex) {
            throw new IllegalStateException("부서별 참여 목표를 저장하지 못했습니다.", ex);
        }
        return getDepartmentParticipation(request.year());
    }

    private Map<String, Integer> readParticipationGoals(int year) {
        String key = participationGoalsKey(year);
        return settings.findById(key).map(DashboardSetting::getValue).map(json -> {
            try {
                return objectMapper.readValue(json, new TypeReference<Map<String, Integer>>() {});
            } catch (Exception ignored) {
                return new LinkedHashMap<String, Integer>();
            }
        }).orElseGet(LinkedHashMap::new);
    }

    private String participationGoalsKey(int year) {
        return "participation-goals-" + year;
    }

    private Map<String, List<String>> defaultTeamProcesses() {
        Map<String, List<String>> defaults = new LinkedHashMap<>();
        defaults.put("제지생산1팀", List.of("원질", "초지"));
        defaults.put("제지생산2팀", List.of("카타", "포장"));
        defaults.put("화장지생산팀", List.of("초지", "가공"));
        defaults.put("패드생산팀", List.of());
        defaults.put("PS품질보증팀", List.of());
        defaults.put("HL품질보증팀", List.of());
        defaults.put("환경에너지팀", List.of("에너지", "환경"));
        defaults.put("공무팀", List.of());
        defaults.put("전기팀", List.of());
        defaults.put("구매1팀", List.of());
        return defaults;
    }

    public record TeamProcessesRequest(@NotNull Map<String, List<String>> teams) {}
    public record ParticipationGoalsRequest(
            @NotNull @Min(2000) @Max(2100) Integer year,
            @NotNull @Size(min = 1, max = 50) Map<String, Integer> goals) {}
    public record DepartmentParticipationResponse(int year, List<DepartmentParticipationSummary> departments) {}
    public record DepartmentParticipationSummary(String team, int completed, int availableUnits,
                                                 int participationPercent, int targetPercent, boolean targetMet) {}
    public record DashboardTitleRequest(@NotBlank @Size(max = 120) String title) {}
}
