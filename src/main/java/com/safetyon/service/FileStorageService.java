package com.safetyon.service;

import com.safetyon.model.AssessmentType;
import com.safetyon.model.FileCategory;
import com.safetyon.model.StoredFile;
import com.safetyon.repository.StoredFileRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class FileStorageService {
    private static final long MAX_FILE_SIZE = 50L * 1024 * 1024;

    private final StoredFileRepository files;
    private final Path storageRoot;

    public FileStorageService(StoredFileRepository files,
                              @Value("${safety.storage-directory:./data/uploads}") String storageDirectory) {
        this.files = files;
        this.storageRoot = Path.of(storageDirectory).toAbsolutePath().normalize();
    }

    @Transactional(readOnly = true)
    public List<StoredFile> list(Integer year, AssessmentType type, FileCategory category,
                                 String team, String process) {
        List<StoredFile> results = year == null
                ? files.findAllByOrderByUploadedAtDesc()
                : files.findAllByYearOrderByUploadedAtDesc(year);
        return results.stream()
                .filter(file -> type == null || file.getAssessmentType() == type)
                .filter(file -> category == null || file.getCategory() == category)
                .filter(file -> team == null || file.getTeam().equals(team))
                .filter(file -> process == null || file.getProcess().equals(process))
                .toList();
    }

    @Transactional
    public List<StoredFile> store(int year, AssessmentType type, FileCategory category,
                                  String team, String process, List<MultipartFile> uploads,
                                  String username) {
        validateScope(type, category);
        if (year < 2000 || year > 2100) throw new IllegalArgumentException("연도를 확인해 주세요.");
        if (team == null || team.isBlank()) throw new IllegalArgumentException("팀을 선택해 주세요.");
        if (uploads == null || uploads.isEmpty()) throw new IllegalArgumentException("파일을 선택해 주세요.");

        long totalBytes = uploads.stream().mapToLong(MultipartFile::getSize).sum();
        if (totalBytes > 100L * 1024 * 1024) throw new IllegalArgumentException("한 번에 올릴 수 있는 총 용량은 100MB입니다.");

        List<StoredFile> saved = new ArrayList<>();
        for (MultipartFile upload : uploads) {
            validateFile(upload, category);
            String originalName = safeOriginalName(upload.getOriginalFilename());
            String extension = extensionOf(originalName);
            String storedName = UUID.randomUUID() + "." + extension;
            Path directory = scopedDirectory(year, type, category, team, process);
            Path destination = directory.resolve(storedName).normalize();
            if (!destination.startsWith(storageRoot)) throw new IllegalArgumentException("잘못된 파일 경로입니다.");
            try {
                Files.createDirectories(directory);
                Files.copy(upload.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
                StoredFile entity = new StoredFile(year, type, category, team.trim(), clean(process),
                        originalName, storedName, upload.getContentType(), upload.getSize(), username);
                saved.add(files.save(entity));
            } catch (IOException ex) {
                throw new IllegalStateException("파일을 저장하지 못했습니다.", ex);
            }
        }
        return saved;
    }

    @Transactional(readOnly = true)
    public StoredFile getMetadata(long id) {
        return files.findById(id).orElseThrow(() -> new EntityNotFoundException("파일을 찾을 수 없습니다."));
    }

    public Resource load(long id) {
        StoredFile metadata = getMetadata(id);
        Path path = storedPath(metadata);
        try {
            Resource resource = new UrlResource(path.toUri());
            if (!resource.exists() || !resource.isReadable()) throw new EntityNotFoundException("저장 파일을 찾을 수 없습니다.");
            return resource;
        } catch (IOException ex) {
            throw new IllegalStateException("파일을 읽을 수 없습니다.", ex);
        }
    }

    @Transactional
    public void delete(long id) {
        StoredFile metadata = getMetadata(id);
        Path path = storedPath(metadata);
        files.delete(metadata);
        try {
            Files.deleteIfExists(path);
        } catch (IOException ex) {
            throw new IllegalStateException("파일 메타데이터는 삭제했지만 실제 파일 삭제에 실패했습니다.", ex);
        }
    }

    private void validateScope(AssessmentType type, FileCategory category) {
        if (category == FileCategory.HAZARD_RISK && type != AssessmentType.REGULAR) {
            throw new IllegalArgumentException("유해위험요인 엑셀은 정기 위험성평가에만 등록할 수 있습니다.");
        }
        if (category == FileCategory.IMPROVEMENT_REQUEST && type == null) {
            throw new IllegalArgumentException("평가 유형을 선택해 주세요.");
        }
    }

    private void validateFile(MultipartFile file, FileCategory category) {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("빈 파일은 업로드할 수 없습니다.");
        if (file.getSize() > MAX_FILE_SIZE) throw new IllegalArgumentException("파일 한 개의 최대 용량은 50MB입니다.");
        String originalName = safeOriginalName(file.getOriginalFilename());
        String extension = extensionOf(originalName);
        boolean valid = category == FileCategory.HAZARD_RISK
                ? extension.equals("xlsx") || extension.equals("xls")
                : extension.equals("pptx") || extension.equals("ppt");
        if (!valid) {
            throw new IllegalArgumentException(category == FileCategory.HAZARD_RISK
                    ? "정기 위험성평가 유해위험요인에는 XLS 또는 XLSX 파일만 등록할 수 있습니다."
                    : "개선요청 건에는 PPT 또는 PPTX 파일만 등록할 수 있습니다.");
        }
    }

    private Path scopedDirectory(int year, AssessmentType type, FileCategory category, String team, String process) {
        return storageRoot.resolve(Integer.toString(year))
                .resolve(type.name().toLowerCase(Locale.ROOT))
                .resolve(category.name().toLowerCase(Locale.ROOT))
                .resolve(safeSegment(team))
                .resolve(safeSegment(clean(process).isBlank() ? "_team" : process));
    }

    private Path storedPath(StoredFile metadata) {
        Path path = scopedDirectory(metadata.getYear(), metadata.getAssessmentType(), metadata.getCategory(),
                metadata.getTeam(), metadata.getProcess()).resolve(metadata.getStoredName()).normalize();
        if (!path.startsWith(storageRoot)) throw new IllegalStateException("저장된 파일 경로가 유효하지 않습니다.");
        return path;
    }

    private String safeOriginalName(String name) {
        if (name == null || name.isBlank()) throw new IllegalArgumentException("파일명이 없습니다.");
        String clean = StringUtils.cleanPath(name).replace('\\', '/');
        String basename = clean.substring(clean.lastIndexOf('/') + 1);
        if (basename.isBlank() || basename.contains("..")) throw new IllegalArgumentException("파일명이 유효하지 않습니다.");
        return basename.length() > 250 ? basename.substring(basename.length() - 250) : basename;
    }

    private String extensionOf(String name) {
        int dot = name.lastIndexOf('.');
        if (dot < 0 || dot == name.length() - 1) throw new IllegalArgumentException("파일 확장자를 확인해 주세요.");
        return name.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private String safeSegment(String value) {
        String safe = value.replaceAll("[^\\p{L}\\p{N}._-]", "_");
        if (safe.isBlank() || safe.equals(".") || safe.equals("..")) return "_";
        return safe.length() > 100 ? safe.substring(0, 100) : safe;
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }
}
