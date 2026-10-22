package com.safetyon.repository;

import com.safetyon.model.ImprovementItem;
import com.safetyon.model.ImprovementStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ImprovementRepository extends JpaRepository<ImprovementItem, Long> {
    List<ImprovementItem> findAllByRiskScoreGreaterThanEqualAndStatusNotOrderByRiskScoreDescUpdatedAtDesc(
            int minimumRiskScore, ImprovementStatus excludedStatus);

    List<ImprovementItem> findAllByStatusOrderByCompletedDateDescIdDesc(ImprovementStatus status);

    List<ImprovementItem> findAllByStatusOrderByCompletedDateAscIdAsc(ImprovementStatus status);

    Optional<ImprovementItem> findFirstByYearAndAssessmentTypeAndTeamAndProcessAndHazardEventIgnoreCase(
            int year, com.safetyon.model.AssessmentType assessmentType, String team, String process, String hazardEvent);
}
