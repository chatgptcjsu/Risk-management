package com.safetyon.service;

import com.safetyon.model.ApiDtos.HazardAssessmentCreateRequest;
import com.safetyon.model.ApiDtos.PresentationDocumentDto;
import com.safetyon.model.ApiDtos.PresentationEditRequest;
import com.safetyon.model.ApiDtos.PresentationShapeDto;
import com.safetyon.model.ApiDtos.PresentationSlideDto;
import com.safetyon.model.ApiDtos.SpreadsheetCellEdit;
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
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFShape;
import org.apache.poi.xslf.usermodel.XSLFSlide;
import org.apache.poi.xslf.usermodel.XSLFTable;
import org.apache.poi.xslf.usermodel.XSLFTableCell;
import org.apache.poi.xslf.usermodel.XSLFTextParagraph;
import org.apache.poi.xslf.usermodel.XSLFTextRun;
import org.apache.poi.xslf.usermodel.XSLFTextShape;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.AtomicMoveNotSupportedException;
import java.awt.geom.Rectangle2D;
import java.time.LocalDate;
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

    @Transactional
    public StoredFile updateSpreadsheetCells(long id, List<SpreadsheetCellEdit> edits, String editedBy) {
        StoredFile metadata = getMetadata(id);
        if (metadata.getCategory() != FileCategory.HAZARD_RISK) {
            throw new IllegalArgumentException("유해∙위험요인 엑셀 파일만 편집할 수 있습니다.");
        }
        String extension = extensionOf(metadata.getOriginalName());
        if (!extension.equals("xlsx") && !extension.equals("xls")) {
            throw new IllegalArgumentException("XLS 또는 XLSX 파일만 편집할 수 있습니다.");
        }
        if (metadata.getFileSize() > MAX_FILE_SIZE) throw new IllegalArgumentException("50MB를 초과하는 엑셀 파일은 편집할 수 없습니다.");
        if (edits == null || edits.isEmpty() || edits.size() > 500) {
            throw new IllegalArgumentException("수정할 셀은 1개 이상, 500개 이하여야 합니다.");
        }
        Path originalPath = storedPath(metadata);
        Path tempPath = null;
        try {
            try (InputStream input = Files.newInputStream(originalPath); Workbook workbook = WorkbookFactory.create(input)) {
                java.util.HashSet<String> seenCells = new java.util.HashSet<>();
                for (SpreadsheetCellEdit edit : edits) {
                    if (edit.row() < 0 || edit.column() < 0) throw new IllegalArgumentException("셀 위치가 올바르지 않습니다.");
                    String cellKey = edit.sheetName() + "!" + edit.row() + ":" + edit.column();
                    if (!seenCells.add(cellKey)) throw new IllegalArgumentException("같은 셀이 중복으로 전송되었습니다.");
                    int sheetIndex = workbook.getSheetIndex(edit.sheetName());
                    if (sheetIndex < 0) throw new IllegalArgumentException("엑셀 시트를 찾을 수 없습니다: " + edit.sheetName());
                    Sheet sheet = workbook.getSheetAt(sheetIndex);
                    int maxRows = "xls".equals(extension) ? 65_536 : 1_048_576;
                    int maxColumns = "xls".equals(extension) ? 256 : 16_384;
                    if (edit.row() >= maxRows || edit.column() >= maxColumns) throw new IllegalArgumentException("선택한 파일 형식에서 지원하지 않는 셀 위치입니다.");
                    Row row = sheet.getRow(edit.row());
                    if (row == null) throw new IllegalArgumentException("기존 행에 있는 셀만 수정할 수 있습니다.");
                    if (row.getCell(edit.column()) == null) throw new IllegalArgumentException("기존 셀에만 값을 입력할 수 있습니다.");
                    Cell cell = row.getCell(edit.column());
                    if ("n".equalsIgnoreCase(edit.cellType()) && !edit.value().isBlank()) {
                        double number;
                        try { number = Double.parseDouble(edit.value().trim()); }
                        catch (NumberFormatException ex) { throw new IllegalArgumentException("숫자 셀에는 숫자만 입력할 수 있습니다."); }
                        if (!Double.isFinite(number)) throw new IllegalArgumentException("숫자 셀 값이 올바르지 않습니다.");
                        cell.setCellValue(number);
                    } else if ("d".equalsIgnoreCase(edit.cellType()) && !edit.value().isBlank()) {
                        try { cell.setCellValue(java.sql.Date.valueOf(java.time.LocalDate.parse(edit.value().trim()))); }
                        catch (java.time.DateTimeException ex) { throw new IllegalArgumentException("날짜 셀은 YYYY-MM-DD 형식으로 입력해 주세요."); }
                    } else {
                        cell.setCellType(CellType.STRING);
                        cell.setCellValue(edit.value());
                    }
                }
                tempPath = Files.createTempFile(originalPath.getParent(), ".spreadsheet-edit-", ".tmp");
                try (OutputStream output = Files.newOutputStream(tempPath)) {
                    workbook.write(output);
                }
            }
            long updatedSize = Files.size(tempPath);
            if (updatedSize > MAX_FILE_SIZE) throw new IllegalArgumentException("수정 후 파일이 50MB 한도를 초과합니다.");
            try {
                Files.move(tempPath, originalPath, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            } catch (AtomicMoveNotSupportedException ignored) {
                Files.move(tempPath, originalPath, StandardCopyOption.REPLACE_EXISTING);
            }
            metadata.updateContentMetadata(metadata.getContentType(), updatedSize, editedBy);
            return files.save(metadata);
        } catch (IOException ex) {
            throw new IllegalStateException("엑셀 파일을 저장하지 못했습니다.", ex);
        } catch (org.apache.poi.EncryptedDocumentException ex) {
            throw new IllegalArgumentException("암호화되었거나 지원하지 않는 엑셀 파일입니다.", ex);
        } finally {
            if (tempPath != null) {
                try { Files.deleteIfExists(tempPath); } catch (IOException ignored) {}
            }
        }
    }

    @Transactional
    public HazardAssessmentWriteResult addHazardAssessment(HazardAssessmentCreateRequest request, String username) {
        if (request.year() < 2000 || request.year() > 2100) throw new IllegalArgumentException("평가 연도를 확인해 주세요.");
        String team = request.team().trim();
        String process = clean(request.process());
        if (team.isBlank()) throw new IllegalArgumentException("부서 / 팀을 선택해 주세요.");
        int riskScore = request.frequency() * request.severity();
        List<StoredFile> candidates = list(request.year(), AssessmentType.REGULAR, FileCategory.HAZARD_RISK, team, process);
        StoredFile target = candidates.stream()
                .filter(file -> file.getOriginalName().toLowerCase(Locale.ROOT).endsWith(".xlsx"))
                .findFirst().orElse(null);
        Path targetPath;
        boolean created = target == null;
        if (created) {
            String storedName = UUID.randomUUID() + ".xlsx";
            Path directory = scopedDirectory(request.year(), AssessmentType.REGULAR, FileCategory.HAZARD_RISK, team, process);
            targetPath = directory.resolve(storedName).normalize();
            if (!targetPath.startsWith(storageRoot)) throw new IllegalArgumentException("잘못된 파일 경로입니다.");
            try {
                Files.createDirectories(directory);
                org.springframework.core.io.ClassPathResource template = new org.springframework.core.io.ClassPathResource("templates/hazard-assessment-template.xlsx");
                try (InputStream input = template.getInputStream()) {
                    Files.copy(input, targetPath, StandardCopyOption.REPLACE_EXISTING);
                }
                target = new StoredFile(request.year(), AssessmentType.REGULAR, FileCategory.HAZARD_RISK,
                        team, process, "유해위험요인 위험성평가.xlsx", storedName,
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", Files.size(targetPath), username);
                target = files.save(target);
            } catch (IOException ex) {
                throw new IllegalStateException("위험성평가 엑셀 양식을 생성하지 못했습니다.", ex);
            }
        } else {
            targetPath = storedPath(target);
        }

        Path tempPath = null;
        try {
            try (InputStream input = Files.newInputStream(targetPath); Workbook workbook = WorkbookFactory.create(input)) {
                Sheet sheet = workbook.getNumberOfSheets() == 0 ? workbook.createSheet("위험성평가") : workbook.getSheetAt(0);
                int rowIndex = findAssessmentRow(sheet);
                Row row = sheet.getRow(rowIndex);
                if (row == null) row = sheet.createRow(rowIndex);
                Row styleRow = sheet.getRow(Math.min(8, sheet.getLastRowNum()));
                if (styleRow != null && rowIndex > sheet.getLastRowNum()) copyRowStyles(styleRow, row);
                setTextCell(row, 0, String.valueOf(rowIndex - 7));
                setTextCell(row, 1, request.workContent().trim());
                setTextCell(row, 2, request.hazardEvent().trim());
                setTextCell(row, 5, clean(request.currentState()));
                setNumberCell(row, 6, request.frequency());
                setNumberCell(row, 7, request.severity());
                setNumberCell(row, 8, riskScore);
                setTextCell(row, 9, riskScore >= 8 ? "개선요청 작성 필요" : "");
                setTextCell(row, 14, clean(request.note()));
                Row assessmentHeader = sheet.getRow(5);
                if (assessmentHeader != null) setTextCell(assessmentHeader, 3, request.assessmentDate().toString());
                Row teamHeader = sheet.getRow(2);
                if (teamHeader != null) setTextCell(teamHeader, 0, team + " · " + process);
                Row processHeader = sheet.getRow(4);
                if (processHeader != null) setTextCell(processHeader, 3, process.isBlank() ? "팀 전체" : process);
                if (rowIndex >= 8 && rowIndex <= 20) setTextCell(row, 0, String.valueOf(rowIndex - 7));
                tempPath = Files.createTempFile(targetPath.getParent(), ".hazard-assessment-", ".tmp");
                try (OutputStream output = Files.newOutputStream(tempPath)) { workbook.write(output); }
            }
            replaceAtomically(tempPath, targetPath);
            long size = Files.size(targetPath);
            target.updateContentMetadata(target.getContentType(), size, username);
            target = files.save(target);
            return new HazardAssessmentWriteResult(target, riskScore);
        } catch (IOException ex) {
            throw new IllegalStateException("위험요인 평가 내용을 엑셀에 저장하지 못했습니다.", ex);
        } finally {
            if (tempPath != null) try { Files.deleteIfExists(tempPath); } catch (IOException ignored) {}
        }
    }

    @Transactional(readOnly = true)
    public PresentationDocumentDto getPresentation(long id) {
        StoredFile metadata = getMetadata(id);
        validatePresentationFile(metadata);
        try (InputStream input = Files.newInputStream(storedPath(metadata)); XMLSlideShow deck = new XMLSlideShow(input)) {
            java.awt.Dimension page = deck.getPageSize();
            List<PresentationSlideDto> slides = new ArrayList<>();
            for (int slideIndex = 0; slideIndex < deck.getSlides().size(); slideIndex++) {
                XSLFSlide slide = deck.getSlides().get(slideIndex);
                List<PresentationShapeDto> shapes = new ArrayList<>();
                for (int shapeIndex = 0; shapeIndex < slide.getShapes().size(); shapeIndex++) {
                    XSLFShape shape = slide.getShapes().get(shapeIndex);
                    Rectangle2D anchor = shape.getAnchor();
                    String kind = "shape";
                    String text = "";
                    List<List<String>> tableRows = List.of();
                    if (shape instanceof XSLFTable table) {
                        kind = "table";
                        List<List<String>> rows = new ArrayList<>();
                        for (var tableRow : table.getRows()) {
                            List<String> cells = new ArrayList<>();
                            for (XSLFTableCell cell : tableRow.getCells()) cells.add(cell.getText());
                            rows.add(cells);
                        }
                        tableRows = rows;
                    } else if (shape instanceof XSLFTextShape textShape) {
                        kind = "text";
                        text = textShape.getText();
                    }
                    shapes.add(new PresentationShapeDto(shapeIndex, kind, anchor.getX(), anchor.getY(),
                            anchor.getWidth(), anchor.getHeight(), text, tableRows));
                }
                slides.add(new PresentationSlideDto(slideIndex, shapes));
            }
            return new PresentationDocumentDto(metadata.getOriginalName(), page.getWidth(), page.getHeight(), slides);
        } catch (IOException ex) {
            throw new IllegalStateException("파워포인트 파일을 브라우저용으로 읽지 못했습니다.", ex);
        }
    }

    @Transactional
    public StoredFile updatePresentation(long id, PresentationEditRequest request, String editedBy) {
        StoredFile metadata = getMetadata(id);
        validatePresentationFile(metadata);
        Path originalPath = storedPath(metadata);
        Path tempPath = null;
        try {
            try (InputStream input = Files.newInputStream(originalPath); XMLSlideShow deck = new XMLSlideShow(input)) {
                java.util.HashSet<String> seen = new java.util.HashSet<>();
                for (var edit : request.edits()) {
                    if (edit.slideIndex() >= deck.getSlides().size()) throw new IllegalArgumentException("슬라이드 위치가 올바르지 않습니다.");
                    XSLFSlide slide = deck.getSlides().get(edit.slideIndex());
                    if (edit.shapeIndex() >= slide.getShapes().size()) throw new IllegalArgumentException("도형 위치가 올바르지 않습니다.");
                    XSLFShape shape = slide.getShapes().get(edit.shapeIndex());
                    String key = edit.slideIndex() + ":" + edit.shapeIndex() + ":" + edit.rowIndex() + ":" + edit.columnIndex();
                    if (!seen.add(key)) throw new IllegalArgumentException("같은 파워포인트 항목이 중복으로 전송되었습니다.");
                    if (shape instanceof XSLFTable table) {
                        if (edit.rowIndex() == null || edit.columnIndex() == null
                                || edit.rowIndex() >= table.getNumberOfRows()
                                || edit.columnIndex() >= table.getNumberOfColumns()) {
                            throw new IllegalArgumentException("표 셀 위치가 올바르지 않습니다.");
                        }
                        table.getCell(edit.rowIndex(), edit.columnIndex()).setText(edit.value());
                    } else if (shape instanceof XSLFTextShape textShape && edit.rowIndex() == null && edit.columnIndex() == null) {
                        replaceText(textShape, edit.value());
                    } else {
                        throw new IllegalArgumentException("편집할 수 있는 텍스트 항목이 아닙니다.");
                    }
                }
                tempPath = Files.createTempFile(originalPath.getParent(), ".presentation-edit-", ".tmp");
                try (OutputStream output = Files.newOutputStream(tempPath)) { deck.write(output); }
            }
            replaceAtomically(tempPath, originalPath);
            metadata.updateContentMetadata(metadata.getContentType(), Files.size(originalPath), editedBy);
            return files.save(metadata);
        } catch (IOException ex) {
            throw new IllegalStateException("파워포인트 파일을 저장하지 못했습니다.", ex);
        } finally {
            if (tempPath != null) try { Files.deleteIfExists(tempPath); } catch (IOException ignored) {}
        }
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

    private int findAssessmentRow(Sheet sheet) {
        for (int index = 8; index <= Math.max(20, sheet.getLastRowNum()); index++) {
            Row row = sheet.getRow(index);
            if (row == null || (isBlank(row.getCell(1)) && isBlank(row.getCell(2)) && isBlank(row.getCell(5))
                    && isBlank(row.getCell(6)) && isBlank(row.getCell(7)) && isBlank(row.getCell(8)))) return index;
        }
        return sheet.getLastRowNum() + 1;
    }

    private boolean isBlank(Cell cell) {
        return cell == null || cell.getCellType() == CellType.BLANK ||
                (cell.getCellType() == CellType.STRING && cell.getStringCellValue().isBlank());
    }

    private void setTextCell(Row row, int column, String value) {
        Cell cell = row.getCell(column, Row.MissingCellPolicy.CREATE_NULL_AS_BLANK);
        cell.setCellType(CellType.STRING);
        cell.setCellValue(value == null ? "" : value);
    }

    private void setNumberCell(Row row, int column, int value) {
        Cell cell = row.getCell(column, Row.MissingCellPolicy.CREATE_NULL_AS_BLANK);
        cell.setCellValue(value);
    }

    private void copyRowStyles(Row source, Row destination) {
        destination.setHeight(source.getHeight());
        for (int column = 0; column < source.getLastCellNum(); column++) {
            Cell sourceCell = source.getCell(column);
            if (sourceCell != null) destination.createCell(column).setCellStyle(sourceCell.getCellStyle());
        }
    }

    private void replaceAtomically(Path tempPath, Path originalPath) throws IOException {
        try {
            Files.move(tempPath, originalPath, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (AtomicMoveNotSupportedException ignored) {
            Files.move(tempPath, originalPath, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    private void validatePresentationFile(StoredFile metadata) {
        if (metadata.getCategory() != FileCategory.IMPROVEMENT_REQUEST
                || !extensionOf(metadata.getOriginalName()).equals("pptx")) {
            throw new IllegalArgumentException("개선요청 PPTX 파일만 브라우저에서 열고 편집할 수 있습니다.");
        }
        if (metadata.getFileSize() > MAX_FILE_SIZE) throw new IllegalArgumentException("50MB를 초과하는 PPTX 파일은 편집할 수 없습니다.");
    }

    private void replaceText(XSLFTextShape shape, String value) {
        List<XSLFTextRun> runs = shape.getTextParagraphs().stream().flatMap(paragraph -> paragraph.getTextRuns().stream()).toList();
        if (runs.isEmpty()) {
            XSLFTextParagraph paragraph = shape.addNewTextParagraph();
            paragraph.addNewTextRun().setText(value);
            return;
        }
        runs.get(0).setText(value);
        for (int index = 1; index < runs.size(); index++) runs.get(index).setText("");
    }

    public record HazardAssessmentWriteResult(StoredFile file, int riskScore) {}

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
