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
            @NotBlank @Size(max = 80) String team,
            @Size(max = 120) String process,
            @Size(max = 500) String workContent,
            @Size(max = 2000) String currentState,
            @NotBlank @Size(max = 4000) String hazardEvent,
            @NotBlank @Size(max = 4000) String improvementAction,
            @NotNull @Min(1) @Max(5) Integer frequency,
            @NotNull @Min(1) @Max(4) Integer severity,
            @Min(1) @Max(5) Integer afterFrequency,
            @Min(1) @Max(4) Integer afterSeverity,
            LocalDate plannedDate,
            String assignee,
            @Size(max = 2000) String note,
            Long sourceHazardFileId
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
            String workContent,
            String currentState,
            String hazardEvent,
            String improvementAction,
            int frequency,
            int severity,
            int riskScore,
            Integer afterFrequency,
            Integer afterSeverity,
            Integer afterRiskScore,
            String note,
            Long sourceHazardFileId,
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

    public record HazardAssessmentCreateRequest(
            @NotNull @Min(2000) @Max(2100) Integer year,
            @NotBlank @Size(max = 80) String team,
            @Size(max = 120) String process,
            @NotBlank @Size(max = 500) String workContent,
            @NotBlank @Size(max = 4000) String hazardEvent,
            @Size(max = 2000) String currentState,
            @NotNull @Min(1) @Max(5) Integer frequency,
            @NotNull @Min(1) @Max(4) Integer severity,
            @NotNull LocalDate assessmentDate,
            @Size(max = 2000) String note
    ) {}

    public record HazardAssessmentResponse(long fileId, int riskScore, boolean requiresImprovement, FileMetadataDto file) {}

    public record PresentationDocumentDto(String fileName, double width, double height, List<PresentationSlideDto> slides) {}
    public record PresentationSlideDto(int slideIndex, List<PresentationShapeDto> shapes) {}
    public record PresentationShapeDto(int shapeIndex, String kind, double x, double y, double width,
                                      double height, String text, List<List<String>> table) {}

    public record PresentationEditRequest(@NotNull @Size(min = 1, max = 300) List<@Valid PresentationTextEdit> edits) {}

    public record PresentationTextEdit(
            @NotNull @Min(0) Integer slideIndex,
            @NotNull @Min(0) Integer shapeIndex,
            @Min(0) Integer rowIndex,
            @Min(0) Integer columnIndex,
            @NotNull @Size(max = 8192) String value
    ) {}

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
