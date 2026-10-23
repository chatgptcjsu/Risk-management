package com.safetyon.model;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public final class ApiDtos {
    private ApiDtos() {}

    public record ImprovementCreateRequest(
            @NotNull @Min(2000) @Max(2100) Integer year,
            @NotNull AssessmentType assessmentType,
            @NotBlank String team,
            String process,
            @NotBlank String hazardEvent,
            @NotBlank String improvementAction,
            @NotNull @Min(1) @Max(5) Integer frequency,
            @NotNull @Min(1) @Max(4) Integer severity,
            LocalDate plannedDate,
            String assignee
    ) {}

    public record StatusUpdateRequest(
            @NotNull ImprovementStatus status,
            LocalDate completedDate
    ) {}

    public record ImprovementItemDto(
            long id,
            int year,
            AssessmentType assessmentType,
            String team,
            String process,
            String hazardEvent,
            String improvementAction,
            int frequency,
            int severity,
            int riskScore,
            ImprovementStatus status,
            LocalDate plannedDate,
            LocalDate completedDate,
            String assignee,
            String createdBy,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {}

    public record FileMetadataDto(
            long id,
            int year,
            AssessmentType assessmentType,
            FileCategory category,
            String team,
            String process,
            String originalName,
            long fileSize,
            String contentType,
            String uploadedBy,
            LocalDateTime uploadedAt
    ) {}

    public record UploadResponse(List<FileMetadataDto> files) {}

    public record SpreadsheetEditRequest(@NotNull @Size(min = 1, max = 500) List<@Valid SpreadsheetCellEdit> edits) {}

    public record SpreadsheetCellEdit(
            @Min(0) @Max(1_048_575) int row,
            @Min(0) @Max(16_383) int column,
            @NotBlank @Size(max = 8) String cellType,
            @NotNull @Size(max = 8_192) String value,
            @NotBlank @Size(max = 31) String sheetName
    ) {}

    public record CurrentUserDto(String username, String displayName, String role) {}

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {}

    public record CreateUserRequest(
            @NotBlank String username,
            @NotBlank String password,
            @NotBlank String displayName,
            @NotBlank String role
    ) {}

    public record UserDto(String username, String displayName, String role, boolean enabled) {}

    public record StatusChangeDto(
            long id,
            ImprovementStatus previousStatus,
            ImprovementStatus newStatus,
            LocalDate completedDate,
            String changedBy,
            LocalDateTime changedAt
    ) {}
}
