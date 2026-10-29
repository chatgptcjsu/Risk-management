package com.safetyon.service;

import com.safetyon.model.ApiDtos.ImprovementCreateRequest;
import com.safetyon.model.ApiDtos.ImprovementItemDto;
import com.safetyon.model.ApiDtos.StatusChangeDto;
import com.safetyon.model.ApiDtos.StatusUpdateRequest;
import com.safetyon.model.AssessmentType;
import com.safetyon.model.ImprovementItem;
import com.safetyon.model.ImprovementStatus;
import com.safetyon.model.ImprovementStatusHistory;
import com.safetyon.model.FileCategory;
import com.safetyon.model.StoredFile;
import com.safetyon.repository.StoredFileRepository;
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
    private final StoredFileRepository files;
    private final FileStorageService fileStorage;

    public ImprovementService(ImprovementRepository improvements, ImprovementStatusHistoryRepository history,
                             StoredFileRepository files, FileStorageService fileStorage) {
        this.improvements = improvements;
        this.history = history;
        this.files = files;
        this.fileStorage = fileStorage;
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
        int riskScore = request.frequency() * request.severity();
        if (request.assessmentType() == AssessmentType.REGULAR && riskScore < HIGH_RISK_THRESHOLD) {
            throw new IllegalArgumentException("정기 평가 개선요청은 위험도 8 이상인 항목만 등록할 수 있습니다.");
        }
        if (request.afterFrequency() != null && request.afterSeverity() == null
                || request.afterFrequency() == null && request.afterSeverity() != null) {
            throw new IllegalArgumentException("개선 후 빈도와 강도는 함께 입력해야 합니다.");
        }
        if (request.afterFrequency() != null && request.afterFrequency() * request.afterSeverity() >= riskScore) {
            throw new IllegalArgumentException("개선 후 위험도는 개선 전 위험도보다 낮아야 합니다.");
        }
        if (request.sourceHazardFileId() != null) {
            StoredFile source = files.findById(request.sourceHazardFileId())
                    .orElseThrow(() -> new EntityNotFoundException("연결할 위험성평가 엑셀 파일을 찾을 수 없습니다."));
            if (request.assessmentType() != AssessmentType.REGULAR || source.getCategory() != FileCategory.HAZARD_RISK
                    || !java.util.Objects.equals(source.getYear(), request.year()) || !source.getTeam().equals(request.team().trim())
                    || !source.getProcess().equals(clean(request.process()))) {
                throw new IllegalArgumentException("위험요인 원본 파일과 개선요청 평가 대상이 일치하지 않습니다.");
            }
        }
        ImprovementItem item = new ImprovementItem(
                request.year(), request.assessmentType(), request.team().trim(), clean(request.process()),
                request.assessmentAt() == null ? java.time.LocalDateTime.now() : request.assessmentAt(),
                clean(request.evaluator()), clean(request.participants()), clean(request.assessmentReason()),
                clean(request.workContent()), clean(request.currentState()), request.hazardEvent().trim(),
                request.improvementAction().trim(), request.frequency(), request.severity(),
                request.afterFrequency(), request.afterSeverity(), request.plannedDate(),
                clean(request.assignee()), clean(request.note()), request.sourceHazardFileId(), null, username);
        StoredFile presentation = fileStorage.createImprovementPresentation(request, username);
        item.setPresentationFileId(presentation.getId());
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
                item.getProcess(), item.getAssessmentAt(), item.getEvaluator(), item.getParticipants(), item.getAssessmentReason(),
                item.getWorkContent(), item.getCurrentState(), item.getHazardEvent(),
                item.getImprovementAction(), item.getFrequency(), item.getSeverity(), item.getRiskScore(),
                item.getAfterFrequency(), item.getAfterSeverity(), item.getAfterRiskScore(), item.getNote(),
                item.getSourceHazardFileId(), item.getPresentationFileId(), item.getStatus(), item.getPlannedDate(), item.getCompletedDate(), item.getAssignee(),
                item.getCreatedBy(), item.getCreatedAt(), item.getUpdatedAt());
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }
}
