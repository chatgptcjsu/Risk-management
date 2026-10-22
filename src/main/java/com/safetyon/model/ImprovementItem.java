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
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "improvement_items", indexes = {
        @Index(name = "idx_improvement_year_type", columnList = "assessment_year, assessment_type"),
        @Index(name = "idx_improvement_score_status", columnList = "risk_score, status"),
        @Index(name = "idx_improvement_completed", columnList = "completed_date")
})
public class ImprovementItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "assessment_year", nullable = false)
    private Integer year;

    @Enumerated(EnumType.STRING)
    @Column(name = "assessment_type", nullable = false, length = 16)
    private AssessmentType assessmentType;

    @Column(nullable = false, length = 80)
    private String team;

    @Column(length = 120)
    private String process;

    @Column(name = "hazard_event", nullable = false, columnDefinition = "TEXT")
    private String hazardEvent;

    @Column(name = "improvement_action", nullable = false, columnDefinition = "TEXT")
    private String improvementAction;

    @Column(nullable = false)
    private Integer frequency;

    @Column(nullable = false)
    private Integer severity;

    @Column(name = "risk_score", nullable = false)
    private Integer riskScore;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ImprovementStatus status = ImprovementStatus.IN_PROGRESS;

    @Column(name = "planned_date")
    private LocalDate plannedDate;

    @Column(name = "completed_date")
    private LocalDate completedDate;

    @Column(length = 100)
    private String assignee;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "updated_by", nullable = false, length = 100)
    private String updatedBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected ImprovementItem() {}

    public ImprovementItem(int year, AssessmentType assessmentType, String team, String process,
                           String hazardEvent, String improvementAction, int frequency, int severity,
                           LocalDate plannedDate, String assignee, String createdBy) {
        this.year = year;
        this.assessmentType = assessmentType;
        this.team = team;
        this.process = process;
        this.hazardEvent = hazardEvent;
        this.improvementAction = improvementAction;
        this.frequency = frequency;
        this.severity = severity;
        this.riskScore = frequency * severity;
        this.plannedDate = plannedDate;
        this.assignee = assignee;
        this.createdBy = createdBy;
        this.updatedBy = createdBy;
        this.status = ImprovementStatus.IN_PROGRESS;
    }

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (riskScore == null && frequency != null && severity != null) riskScore = frequency * severity;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
        if (frequency != null && severity != null) riskScore = frequency * severity;
    }

    public Long getId() { return id; }
    public Integer getYear() { return year; }
    public AssessmentType getAssessmentType() { return assessmentType; }
    public String getTeam() { return team; }
    public String getProcess() { return process; }
    public String getHazardEvent() { return hazardEvent; }
    public String getImprovementAction() { return improvementAction; }
    public Integer getFrequency() { return frequency; }
    public Integer getSeverity() { return severity; }
    public Integer getRiskScore() { return riskScore; }
    public ImprovementStatus getStatus() { return status; }
    public LocalDate getPlannedDate() { return plannedDate; }
    public LocalDate getCompletedDate() { return completedDate; }
    public String getAssignee() { return assignee; }
    public String getCreatedBy() { return createdBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public void updateStatus(ImprovementStatus status, LocalDate completedDate, String updatedBy) {
        this.status = status;
        this.completedDate = status == ImprovementStatus.COMPLETED
                ? (completedDate == null ? LocalDate.now() : completedDate)
                : null;
        this.updatedBy = updatedBy;
    }
}
