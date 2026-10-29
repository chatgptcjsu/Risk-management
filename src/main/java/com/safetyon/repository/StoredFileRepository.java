package com.safetyon.repository;

import com.safetyon.model.AssessmentType;
import com.safetyon.model.FileCategory;
import com.safetyon.model.StoredFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StoredFileRepository extends JpaRepository<StoredFile, Long> {
    List<StoredFile> findAllByOrderByUploadedAtDesc();

    List<StoredFile> findAllByYearOrderByUploadedAtDesc(int year);

    List<StoredFile> findAllByYearAndAssessmentTypeAndCategoryOrderByUploadedAtDesc(
            int year, AssessmentType assessmentType, FileCategory category);

    List<StoredFile> findAllByYearAndAssessmentTypeAndCategoryAndTeamAndProcessOrderByUploadedAtDesc(
            int year, AssessmentType assessmentType, FileCategory category, String team, String process);
}
