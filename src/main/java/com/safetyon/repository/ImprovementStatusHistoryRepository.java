package com.safetyon.repository;

import com.safetyon.model.ImprovementStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ImprovementStatusHistoryRepository extends JpaRepository<ImprovementStatusHistory, Long> {
    List<ImprovementStatusHistory> findAllByImprovement_IdOrderByChangedAtDesc(long improvementId);
}
