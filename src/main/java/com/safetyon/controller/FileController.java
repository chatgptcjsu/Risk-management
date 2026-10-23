package com.safetyon.controller;

import com.safetyon.model.ApiDtos.FileMetadataDto;
import com.safetyon.model.ApiDtos.SpreadsheetEditRequest;
import com.safetyon.model.ApiDtos.UploadResponse;
import com.safetyon.model.AssessmentType;
import com.safetyon.model.FileCategory;
import com.safetyon.model.StoredFile;
import com.safetyon.service.FileStorageService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/files")
@Validated
public class FileController {
    private final FileStorageService storage;

    public FileController(FileStorageService storage) {
        this.storage = storage;
    }

    @GetMapping
    public List<FileMetadataDto> list(
            @RequestParam(required = false) @Min(2000) @Max(2100) Integer year,
            @RequestParam(required = false) AssessmentType assessmentType,
            @RequestParam(required = false) FileCategory category,
            @RequestParam(required = false) String team,
            @RequestParam(required = false) String process) {
        return storage.list(year, assessmentType, category, team, process).stream().map(this::toDto).toList();
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UploadResponse upload(
            @RequestParam @Min(2000) @Max(2100) int year,
            @RequestParam AssessmentType assessmentType,
            @RequestParam FileCategory category,
            @RequestParam String team,
            @RequestParam(defaultValue = "") String process,
            @RequestParam("files") List<MultipartFile> files,
            Authentication authentication) {
        String uploadedBy = actorName(authentication);
        List<StoredFile> saved = storage.store(year, assessmentType, category, team, process, files, uploadedBy);
        return new UploadResponse(saved.stream().map(this::toDto).toList());
    }

    @PutMapping(value = "/{id}/spreadsheet", consumes = MediaType.APPLICATION_JSON_VALUE)
    public FileMetadataDto updateSpreadsheet(@PathVariable long id,
                                             @jakarta.validation.Valid @RequestBody SpreadsheetEditRequest request,
                                             Authentication authentication) {
        return toDto(storage.updateSpreadsheetCells(id, request.edits(), actorName(authentication)));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable long id) {
        StoredFile metadata = storage.getMetadata(id);
        Resource resource = storage.load(id);
        String disposition = ContentDisposition.attachment()
                .filename(metadata.getOriginalName(), StandardCharsets.UTF_8)
                .build().toString();
        MediaType type = safeMediaType(metadata.getContentType());
        return ResponseEntity.ok()
                .contentType(type)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
                .contentLength(metadata.getFileSize())
                .body(resource);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable long id, Authentication authentication) {
        if (!authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 파일을 삭제할 수 있습니다.");
        }
        storage.delete(id);
        return ResponseEntity.noContent().build();
    }

    private String actorName(Authentication authentication) {
        return authentication == null || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken
                ? "비로그인 사용자"
                : authentication.getName();
    }

    private FileMetadataDto toDto(StoredFile file) {
        return new FileMetadataDto(file.getId(), file.getYear(), file.getAssessmentType(), file.getCategory(),
                file.getTeam(), file.getProcess(), file.getOriginalName(), file.getFileSize(),
                file.getContentType(), file.getUploadedBy(), file.getUploadedAt());
    }

    private MediaType safeMediaType(String value) {
        if (value == null || value.isBlank()) return MediaType.APPLICATION_OCTET_STREAM;
        try { return MediaType.parseMediaType(value); }
        catch (IllegalArgumentException ex) { return MediaType.APPLICATION_OCTET_STREAM; }
    }
}
