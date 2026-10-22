package com.safetyon.service;

import com.safetyon.model.ApiDtos.ImprovementCreateRequest;
import com.safetyon.model.ApiDtos.ImprovementItemDto;
import com.safetyon.model.ApiDtos.StatusChangeDto;
import com.safetyon.model.ApiDtos.StatusUpdateRequest;
import com.safetyon.model.AssessmentType;
import com.safetyon.model.ImprovementItem;
import com.safetyon.model.ImprovementStatus;
import com.safetyon.model.ImprovementStatusHistory;
import com.safetyon.repository.ImprovementRepository;
import com.safetyon.repository.ImprovementStatusHistoryRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class ImprovementService {
    public static final int HIGH_RISK_THRESHOLD = 8;

    private final ImprovementRepository improvements;
    private final ImprovementStatusHistoryRepository history;

    public ImprovementService(ImprovementRepository improvements, ImprovementStatusHistoryRepository history) {
        this.improvements = improvements;
        this.history = history;
    }

    @Transactional(readOnly = true)
    public List<ImprovementItemDto> getHighRiskOpenItems() {
        return improvements.findAllByRiskScoreGreaterThanEqualAndStatusNotOrderByRiskScoreDescUpdatedAtDesc(
                HIGH_RISK_THRESHOLD, ImprovementStatus.COMPLETED).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<ImprovementItemDto> getCompletedItems(String sort) {
        List<ImprovementItem> items = "asc".equalsIgnoreCase(sort)
                ? improvements.findAllByStatusOrderByCompletedDateAscIdAsc(ImprovementStatus.COMPLETED)
                : improvements.findAllByStatusOrderByCompletedDateDescIdDesc(ImprovementStatus.COMPLETED);
        return items.stream().map(this::toDto).toList();
    }

    @Transactional
    public ImprovementItemDto create(ImprovementCreateRequest request, String username) {
        if (request.assessmentType() == AssessmentType.AD_HOC && request.frequency() == null) {
            throw new IllegalArgumentException("수시 평가 개선 건에도 빈도 값을 입력해야 합니다.");
        }
        ImprovementItem item = new ImprovementItem(
                request.year(), request.assessmentType(), request.team().trim(), clean(request.process()),
                request.hazardEvent().trim(), request.improvementAction().trim(), request.frequency(),
                request.severity(), request.plannedDate(), clean(request.assignee()), username);
        return toDto(improvements.save(item));
    }

    @Transactional
    public ImprovementItemDto updateStatus(long id, StatusUpdateRequest request, String username) {
        ImprovementItem item = improvements.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("개선 항목을 찾을 수 없습니다."));
        ImprovementStatus before = item.getStatus();
        LocalDate completedDate = request.status() == ImprovementStatus.COMPLETED
                ? (request.completedDate() == null ? LocalDate.now() : request.completedDate())
                : null;
        item.updateStatus(request.status(), completedDate, username);
        improvements.save(item);
        if (before != request.status()) {
            history.save(new ImprovementStatusHistory(item, before, request.status(), completedDate, username));
        }
        return toDto(item);
    }

    @Transactional(readOnly = true)
    public List<StatusChangeDto> getHistory(long id) {
        if (!improvements.existsById(id)) throw new EntityNotFoundException("개선 항목을 찾을 수 없습니다.");
        return history.findAllByImprovement_IdOrderByChangedAtDesc(id).stream()
                .map(change -> new StatusChangeDto(change.getId(), change.getPreviousStatus(),
                        change.getNewStatus(), change.getCompletedDate(), change.getChangedBy(), change.getChangedAt()))
                .toList();
    }

    private ImprovementItemDto toDto(ImprovementItem item) {
        return new ImprovementItemDto(item.getId(), item.getYear(), item.getAssessmentType(), item.getTeam(),
                item.getProcess(), item.getHazardEvent(), item.getImprovementAction(), item.getFrequency(),
                item.getSeverity(), item.getRiskScore(), item.getStatus(), item.getPlannedDate(),
                item.getCompletedDate(), item.getAssignee(), item.getCreatedBy(), item.getCreatedAt(), item.getUpdatedAt());
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }
}
