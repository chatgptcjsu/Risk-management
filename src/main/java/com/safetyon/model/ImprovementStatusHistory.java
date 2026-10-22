package com.safetyon.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "improvement_status_history")
public class ImprovementStatusHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "improvement_id", nullable = false)
    private ImprovementItem improvement;

    @Enumerated(EnumType.STRING)
    @Column(name = "previous_status", length = 20)
    private ImprovementStatus previousStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", nullable = false, length = 20)
    private ImprovementStatus newStatus;

    @Column(name = "completed_date")
    private LocalDate completedDate;

    @Column(name = "changed_by", nullable = false, length = 100)
    private String changedBy;

    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt;

    protected ImprovementStatusHistory() {}

    public ImprovementStatusHistory(ImprovementItem improvement, ImprovementStatus previousStatus,
                                    ImprovementStatus newStatus, LocalDate completedDate, String changedBy) {
        this.improvement = improvement;
        this.previousStatus = previousStatus;
        this.newStatus = newStatus;
        this.completedDate = completedDate;
        this.changedBy = changedBy;
    }

    @PrePersist
    void prePersist() { changedAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public ImprovementStatus getPreviousStatus() { return previousStatus; }
    public ImprovementStatus getNewStatus() { return newStatus; }
    public LocalDate getCompletedDate() { return completedDate; }
    public String getChangedBy() { return changedBy; }
    public LocalDateTime getChangedAt() { return changedAt; }
}
