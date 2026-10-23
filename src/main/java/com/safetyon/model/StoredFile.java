package com.safetyon.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "stored_files", indexes = {
        @Index(name = "idx_file_scope", columnList = "assessment_year, assessment_type, category, team, process_name"),
        @Index(name = "idx_file_assessment_type", columnList = "assessment_type, category")
})
public class StoredFile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "assessment_year", nullable = false)
    private Integer year;

    @Enumerated(EnumType.STRING)
    @Column(name = "assessment_type", nullable = false, length = 16)
    private AssessmentType assessmentType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private FileCategory category;

    @Column(nullable = false, length = 80)
    private String team;

    @Column(name = "process_name", nullable = false, length = 120)
    private String process;

    @Column(name = "original_name", nullable = false, length = 255)
    private String originalName;

    @Column(name = "stored_name", nullable = false, unique = true, length = 100)
    private String storedName;

    @Column(name = "content_type", length = 150)
    private String contentType;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @Column(name = "uploaded_by", nullable = false, length = 100)
    private String uploadedBy;

    @Column(name = "uploaded_at", nullable = false)
    private LocalDateTime uploadedAt;

    protected StoredFile() {}

    public StoredFile(int year, AssessmentType assessmentType, FileCategory category, String team,
                      String process, String originalName, String storedName, String contentType,
                      long fileSize, String uploadedBy) {
        this.year = year;
        this.assessmentType = assessmentType;
        this.category = category;
        this.team = team;
        this.process = process;
        this.originalName = originalName;
        this.storedName = storedName;
        this.contentType = contentType;
        this.fileSize = fileSize;
        this.uploadedBy = uploadedBy;
    }

    @PrePersist
    void prePersist() {
        uploadedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public Integer getYear() { return year; }
    public AssessmentType getAssessmentType() { return assessmentType; }
    public FileCategory getCategory() { return category; }
    public String getTeam() { return team; }
    public String getProcess() { return process; }
    public String getOriginalName() { return originalName; }
    public String getStoredName() { return storedName; }
    public String getContentType() { return contentType; }
    public Long getFileSize() { return fileSize; }
    public void updateContentMetadata(String contentType, long fileSize, String uploadedBy) {
        this.contentType = contentType;
        this.fileSize = fileSize;
        this.uploadedBy = uploadedBy;
        this.uploadedAt = LocalDateTime.now();
    }
    public String getUploadedBy() { return uploadedBy; }
    public LocalDateTime getUploadedAt() { return uploadedAt; }
}
