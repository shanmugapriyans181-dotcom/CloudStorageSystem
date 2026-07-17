package com.cloudstorage.service;

import com.cloudstorage.dto.FileDto;
import com.cloudstorage.dto.DuplicateCheckResult;
import com.cloudstorage.dto.StorageDashboardDto;
import com.cloudstorage.entity.*;
import com.cloudstorage.exception.BadRequestException;
import com.cloudstorage.exception.ResourceNotFoundException;
import com.cloudstorage.exception.StorageQuotaExceededException;
import com.cloudstorage.repository.*;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileService {

    private final FileRepository fileRepository;
    private final FolderRepository folderRepository;
    private final UserRepository userRepository;
    private final FileVersionRepository fileVersionRepository;
    private final StorageService storageService;
    private final ActivityLogService activityLogService;
    private final AiService aiService;
    private final FileAiMetadataRepository fileAiMetadataRepository;
    private final FavoriteRepository favoriteRepository;
    private final FileDuplicateRepository fileDuplicateRepository;

    @Transactional
    public FileDto uploadFile(MultipartFile multipartFile, Long folderId,
                               User owner, boolean encrypt, HttpServletRequest request) throws Exception {
        Object result = uploadFile(multipartFile, folderId, owner, encrypt, null, null, request);
        if (result instanceof FileDto) {
            return (FileDto) result;
        }
        return (FileDto) uploadFile(multipartFile, folderId, owner, encrypt, "KEEP_BOTH", null, request);
    }

    @Transactional
    public Object uploadFile(MultipartFile multipartFile, Long folderId, User owner, boolean encrypt,
                             String duplicateAction, Long existingFileId, HttpServletRequest request) throws Exception {
        // Check quota
        long fileSize = multipartFile.getSize();
        if (owner.getStorageUsed() + fileSize > owner.getStorageQuota()) {
            throw new StorageQuotaExceededException("Storage quota exceeded");
        }

        // Check upload size limit by plan
        long maxUploadSize;
        String plan = owner.getPlan() != null ? owner.getPlan().toUpperCase() : "FREE";
        if ("PRO".equals(plan)) {
            maxUploadSize = 4L * 1024 * 1024 * 1024; // 4 GB
        } else if ("ENTERPRISE".equals(plan)) {
            maxUploadSize = 16L * 1024 * 1024 * 1024; // 16 GB
        } else {
            maxUploadSize = 1024L * 1024 * 1024; // 1 GB
        }

        if (fileSize > maxUploadSize) {
            throw new BadRequestException("Upload size limit exceeded. Your plan (" + plan + 
                ") allows files up to " + (maxUploadSize / (1024 * 1024 * 1024)) + " GB.");
        }

        Folder folder = null;
        if (folderId != null) {
            folder = folderRepository.findByIdAndOwner(folderId, owner)
                    .orElseThrow(() -> new ResourceNotFoundException("Folder not found"));
        }

        // Security check: Extension and MIME signature check
        String originalFilename = multipartFile.getOriginalFilename();
        if (originalFilename != null) {
            String lowerName = originalFilename.toLowerCase();
            if (lowerName.endsWith(".exe") || lowerName.endsWith(".bat") || lowerName.endsWith(".sh") || lowerName.endsWith(".cmd") || lowerName.endsWith(".msi") || lowerName.endsWith(".vbs")) {
                throw new BadRequestException("Uploading executable files is restricted for security reasons.");
            }
        }

        byte[] bytes = multipartFile.getBytes();
        String contentType = multipartFile.getContentType();
        try {
            org.apache.tika.Tika tika = new org.apache.tika.Tika();
            String detectedType = tika.detect(bytes, originalFilename);
            if (detectedType != null) {
                if (detectedType.contains("x-dosexec") || detectedType.contains("x-msdownload") || detectedType.contains("x-sh") || detectedType.contains("application/x-executable")) {
                    throw new BadRequestException("Spoofed or executable binary file detected.");
                }
                if (contentType == null || contentType.equals("application/octet-stream")) {
                    contentType = detectedType;
                }
            }
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Tika signature check failed: {}", e.getMessage());
        }

        // Compute checksum
        String checksum = computeChecksum(bytes);

        // Pre-upload Duplicate Check
        if (duplicateAction == null) {
            // Temporarily extract text for content similarity comparison
            String extractedText = "";
            try {
                java.io.File tempFile = java.io.File.createTempFile("dup_check_", "_" + originalFilename);
                try (java.io.FileOutputStream fos = new java.io.FileOutputStream(tempFile)) {
                    fos.write(bytes);
                }
                extractedText = aiService.extractTextWithOcr(
                    FileEntity.builder().name(originalFilename).contentType(contentType).build(),
                    tempFile
                );
                tempFile.delete();
            } catch (Exception e) {
                log.warn("Could not extract text for pre-upload duplicate check: {}", e.getMessage());
            }

            DuplicateCheckResult dupResult = performDuplicateCheck(multipartFile, owner, checksum, extractedText);
            if (dupResult.isDuplicate()) {
                return dupResult;
            }
        }

        // Action: REPLACE
        if ("REPLACE".equalsIgnoreCase(duplicateAction) && existingFileId != null) {
            FileEntity existingFile = fileRepository.findByIdAndOwner(existingFileId, owner)
                    .orElseThrow(() -> new ResourceNotFoundException("File to replace not found"));

            // Store new file content
            String storageKey = storageService.store(multipartFile, owner.getId().toString(), encrypt);

            // Calculate size diff
            long oldSize = existingFile.getFileSize();
            long newSize = fileSize;

            // Increment version
            int nextVersion = existingFile.getVersion() + 1;

            // Update existing file Entity
            existingFile.setChecksum(checksum);
            existingFile.setFileSize(newSize);
            existingFile.setVersion(nextVersion);
            existingFile.setStorageKey(storageKey);
            existingFile.setStoragePath(storageKey);
            existingFile.setUpdatedAt(LocalDateTime.now());

            existingFile = fileRepository.save(existingFile);

            // Save version record
            saveFileVersion(existingFile, storageKey, newSize, checksum, owner, "Replaced via Duplicate Engine");

            // Update storage used quota
            owner.setStorageUsed(owner.getStorageUsed() - oldSize + newSize);
            userRepository.save(owner);

            // Log activity
            activityLogService.log(owner, ActivityLog.Action.UPLOAD, "FILE",
                    existingFile.getId(), existingFile.getName(), null, request, newSize);

            // Run AI analysis pipeline
            FileAiMetadata aiMeta = null;
            try {
                java.io.File tempFile = java.io.File.createTempFile("ai_upload_", "_" + originalFilename);
                try (java.io.FileOutputStream fos = new java.io.FileOutputStream(tempFile)) {
                    fos.write(bytes);
                }
                // Clear existing metadata record safely
                Optional<FileAiMetadata> existingMeta = fileAiMetadataRepository.findByFileId(existingFile.getId());
                existingMeta.ifPresent(fileAiMetadataRepository::delete);
                
                aiMeta = aiService.analyzeFile(existingFile, tempFile);
                tempFile.delete();
            } catch (Exception e) {
                log.error("AI Analysis failed on replace for file: {}", existingFile.getName(), e);
            }

            boolean isFav = favoriteRepository.existsByUserIdAndFileId(owner.getId(), existingFile.getId());
            return FileDto.from(existingFile, aiMeta, isFav);
        }

        // Action: KEEP_BOTH or standard upload
        String targetFilename = originalFilename;
        boolean hasDuplicateContext = false;
        DuplicateCheckResult cachedCheck = null;

        if ("KEEP_BOTH".equalsIgnoreCase(duplicateAction)) {
            // Find duplicate matching file context for linking in DB
            String extractedText = "";
            try {
                java.io.File tempFile = java.io.File.createTempFile("dup_link_", "_" + originalFilename);
                try (java.io.FileOutputStream fos = new java.io.FileOutputStream(tempFile)) {
                    fos.write(bytes);
                }
                extractedText = aiService.extractTextWithOcr(
                    FileEntity.builder().name(originalFilename).contentType(contentType).build(),
                    tempFile
                );
                tempFile.delete();
            } catch (Exception e) {
                log.warn("Could not extract text for duplicate link: {}", e.getMessage());
            }

            cachedCheck = performDuplicateCheck(multipartFile, owner, checksum, extractedText);
            hasDuplicateContext = cachedCheck.isDuplicate();
            
            // Auto rename filename to avoid collision
            targetFilename = generateUniqueName(originalFilename, owner);
        }

        // Store file
        String storageKey = storageService.store(multipartFile, owner.getId().toString(), encrypt);

        // Determine file type
        String fileType = determineFileType(contentType, targetFilename);

        FileEntity file = FileEntity.builder()
                .name(targetFilename)
                .originalName(originalFilename)
                .storagePath(storageKey)
                .storageKey(storageKey)
                .contentType(contentType)
                .fileSize(fileSize)
                .fileType(fileType)
                .owner(owner)
                .folder(folder)
                .isEncrypted(encrypt)
                .checksum(checksum)
                .build();

        file = fileRepository.save(file);

        // Save first version
        saveFileVersion(file, storageKey, fileSize, checksum, owner, "Initial upload");

        // Save duplicate record in DB if KEEP_BOTH was triggered
        if (hasDuplicateContext && cachedCheck != null && cachedCheck.getExistingFile() != null) {
            FileEntity origFile = fileRepository.findById(cachedCheck.getExistingFile().getId()).orElse(null);
            if (origFile != null) {
                FileDuplicate fileDuplicate = FileDuplicate.builder()
                        .originalFile(origFile)
                        .duplicateFile(file)
                        .similarityPercentage(cachedCheck.getSimilarity())
                        .detectionType(cachedCheck.getType())
                        .build();
                fileDuplicateRepository.save(fileDuplicate);
                log.info("Logged duplicate link between file {} and duplicate file {}", origFile.getId(), file.getId());
            }
        }

        // Update storage used
        owner.setStorageUsed(owner.getStorageUsed() + fileSize);
        userRepository.save(owner);

        activityLogService.log(owner, ActivityLog.Action.UPLOAD, "FILE",
                file.getId(), file.getName(), null, request, fileSize);

        // Run AI analysis pipeline
        FileAiMetadata aiMeta = null;
        try {
            java.io.File tempFile = java.io.File.createTempFile("ai_upload_", "_" + targetFilename);
            try (java.io.FileOutputStream fos = new java.io.FileOutputStream(tempFile)) {
                fos.write(bytes);
            }
            aiMeta = aiService.analyzeFile(file, tempFile);
            tempFile.delete();
        } catch (Exception e) {
            log.error("AI Analysis failed on upload for file: {}", file.getName(), e);
        }

        boolean isFav = favoriteRepository.existsByUserIdAndFileId(owner.getId(), file.getId());
        return FileDto.from(file, aiMeta, isFav);
    }

    public DuplicateCheckResult performDuplicateCheck(MultipartFile multipartFile, User owner, String checksum, String extractedText) {
        String filename = multipartFile.getOriginalFilename();
        
        // 1. Filename collision (not in trash)
        Optional<FileEntity> nameDuplicate = fileRepository.findByNameAndOwnerAndIsDeleted(filename, owner, false);
        if (nameDuplicate.isPresent()) {
            return DuplicateCheckResult.builder()
                    .duplicate(true)
                    .type("FILENAME_DUPLICATE")
                    .message("This file already exists.")
                    .similarity(100.0)
                    .existingFile(new DuplicateCheckResult.ExistingFileDetails(nameDuplicate.get().getId(), nameDuplicate.get().getName()))
                    .build();
        }

        // 2. Exact content duplicate (via checksum, not in trash)
        if (checksum != null) {
            Optional<FileEntity> contentDuplicate = fileRepository.findByChecksumAndOwnerAndIsDeleted(checksum, owner, false);
            if (contentDuplicate.isPresent()) {
                return DuplicateCheckResult.builder()
                        .duplicate(true)
                        .type("CONTENT_DUPLICATE")
                        .message("This document is exactly the same as an existing file.")
                        .similarity(100.0)
                        .existingFile(new DuplicateCheckResult.ExistingFileDetails(contentDuplicate.get().getId(), contentDuplicate.get().getName()))
                        .build();
            }
        }

        // 3. Semantic similarity (Jaccard/Cosine on extracted text, similarity >= 70%)
        if (extractedText != null && !extractedText.trim().isEmpty() && !extractedText.contains("Empty document")) {
            List<FileAiMetadata> allMeta = fileAiMetadataRepository.findByFileOwnerId(owner.getId());
            double maxSimilarity = 0.0;
            FileEntity similarFile = null;

            for (FileAiMetadata other : allMeta) {
                if (other.getFile().getIsDeleted()) {
                    continue;
                }
                String otherText = other.getExtractedText();
                if (otherText == null || otherText.trim().isEmpty()) {
                    continue;
                }
                double similarity = calculateTextSimilarity(extractedText, otherText);
                if (similarity > maxSimilarity) {
                    maxSimilarity = similarity;
                    similarFile = other.getFile();
                }
            }

            double similarityPct = maxSimilarity * 100.0;
            if (similarityPct >= 70.0 && similarFile != null) {
                String message = similarityPct >= 90.0
                        ? "This document is highly similar to an existing document."
                        : "This document appears to be a different version of an existing document.";

                return DuplicateCheckResult.builder()
                        .duplicate(true)
                        .type("SEMANTIC_DUPLICATE")
                        .message(message)
                        .similarity(Math.round(similarityPct * 10.0) / 10.0) // 1 decimal place
                        .existingFile(new DuplicateCheckResult.ExistingFileDetails(similarFile.getId(), similarFile.getName()))
                        .build();
            }
        }

        return DuplicateCheckResult.builder().duplicate(false).build();
    }

    private Map<String, Integer> getWordFrequencies(String text) {
        Map<String, Integer> freqs = new HashMap<>();
        if (text == null) return freqs;
        String[] words = text.toLowerCase().split("\\W+");
        for (String w : words) {
            if (w.length() < 3) continue;
            freqs.put(w, freqs.getOrDefault(w, 0) + 1);
        }
        return freqs;
    }

    private double calculateTextSimilarity(String text1, String text2) {
        if (text1 == null || text2 == null) return 0.0;
        text1 = text1.trim();
        text2 = text2.trim();
        if (text1.isEmpty() && text2.isEmpty()) return 1.0;
        if (text1.isEmpty() || text2.isEmpty()) return 0.0;

        Map<String, Integer> freq1 = getWordFrequencies(text1);
        Map<String, Integer> freq2 = getWordFrequencies(text2);

        Set<String> allWords = new HashSet<>(freq1.keySet());
        allWords.addAll(freq2.keySet());

        double dotProduct = 0.0;
        double normA = 0.0;
        double normB = 0.0;

        for (String word : allWords) {
            int val1 = freq1.getOrDefault(word, 0);
            int val2 = freq2.getOrDefault(word, 0);
            dotProduct += val1 * val2;
            normA += val1 * val1;
            normB += val2 * val2;
        }

        if (normA == 0.0 || normB == 0.0) return 0.0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    private String generateUniqueName(String originalName, User owner) {
        String nameWithoutExt = originalName;
        String ext = "";
        int lastDot = originalName.lastIndexOf('.');
        if (lastDot != -1) {
            nameWithoutExt = originalName.substring(0, lastDot);
            ext = originalName.substring(lastDot);
        }
        
        String candidate = originalName;
        int counter = 1;
        while (fileRepository.findByNameAndOwnerAndIsDeleted(candidate, owner, false).isPresent()) {
            candidate = nameWithoutExt + " (" + counter + ")" + ext;
            counter++;
        }
        return candidate;
    }

    public InputStream downloadFile(Long fileId, User user, HttpServletRequest request) throws Exception {
        FileEntity file = fileRepository.findByIdAndOwner(fileId, user)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        if (file.getIsDeleted()) {
            throw new BadRequestException("File is in trash");
        }

        file.setDownloadCount(file.getDownloadCount() + 1);
        fileRepository.save(file);

        activityLogService.log(user, ActivityLog.Action.DOWNLOAD, "FILE",
                file.getId(), file.getName(), null, request, file.getFileSize());

        return storageService.retrieve(file.getStorageKey(), file.getIsEncrypted());
    }

    public FileEntity getFileEntity(Long fileId, User user) {
        return fileRepository.findByIdAndOwner(fileId, user)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));
    }

    private FileDto toDto(FileEntity file, User user) {
        FileAiMetadata aiMeta = fileAiMetadataRepository.findByFileId(file.getId()).orElse(null);
        boolean isFav = favoriteRepository.existsByUserIdAndFileId(user.getId(), file.getId());
        return FileDto.from(file, aiMeta, isFav);
    }

    public List<FileDto> getFilesInFolder(Long folderId, User user) {
        List<FileEntity> files;
        if (folderId == null) {
            files = fileRepository.findByOwnerAndFolderIsNullAndIsDeletedFalse(user);
        } else {
            Folder folder = folderRepository.findByIdAndOwner(folderId, user)
                    .orElseThrow(() -> new ResourceNotFoundException("Folder not found"));
            files = fileRepository.findByOwnerAndFolderAndIsDeletedFalse(user, folder);
        }
        return files.stream().map(f -> toDto(f, user)).collect(Collectors.toList());
    }

    public List<FileDto> getRecentFiles(User user, int limit) {
        return fileRepository.findRecentFiles(user, PageRequest.of(0, limit))
                .stream().map(f -> toDto(f, user)).collect(Collectors.toList());
    }

    public List<FileDto> searchFiles(User user, String query) {
        return fileRepository.searchByName(user, query)
                .stream().map(f -> toDto(f, user)).collect(Collectors.toList());
    }

    public List<FileDto> filterByType(User user, String fileType) {
        return fileRepository.findByFileType(user, fileType.toUpperCase())
                .stream().map(f -> toDto(f, user)).collect(Collectors.toList());
    }

    @Transactional
    public FileDto renameFile(Long fileId, String newName, User user) {
        FileEntity file = fileRepository.findByIdAndOwner(fileId, user)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));
        file.setName(newName);
        FileEntity saved = fileRepository.save(file);
        return toDto(saved, user);
    }

    @Transactional
    public void deleteFile(Long fileId, User user, HttpServletRequest request) {
        FileEntity file = fileRepository.findByIdAndOwner(fileId, user)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));
        file.setIsDeleted(true);
        file.setDeletedAt(LocalDateTime.now());
        fileRepository.save(file);
        activityLogService.log(user, ActivityLog.Action.DELETE, "FILE",
                file.getId(), file.getName(), null, request, null);
    }

    @Transactional
    public FileDto restoreFile(Long fileId, User user) {
        FileEntity file = fileRepository.findByIdAndOwner(fileId, user)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));
        file.setIsDeleted(false);
        file.setDeletedAt(null);
        FileEntity saved = fileRepository.save(file);
        activityLogService.log(user, ActivityLog.Action.RESTORE, "FILE", file.getId(), file.getName());
        return toDto(saved, user);
    }

    @Transactional
    public void permanentlyDelete(Long fileId, User user) throws Exception {
        FileEntity file = fileRepository.findByIdAndOwner(fileId, user)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));
        storageService.delete(file.getStorageKey());
        user.setStorageUsed(Math.max(0, user.getStorageUsed() - file.getFileSize()));
        userRepository.save(user);
        fileRepository.delete(file);
    }

    public List<FileDto> getTrashFiles(User user) {
        return fileRepository.findByOwnerAndIsDeletedTrue(user)
                .stream().map(f -> toDto(f, user)).collect(Collectors.toList());
    }

    public StorageDashboardDto getDashboard(User user) {
        Long storageUsed = user.getStorageUsed();
        Long quota = user.getStorageQuota();
        Long totalFiles = fileRepository.countByOwner(user);
        Long totalFolders = folderRepository.countByOwner(user);

        List<Object[]> storageData = fileRepository.getStorageByFileType(user);
        Map<String, Long> storageByType = new HashMap<>();
        Map<String, Long> fileCountByType = new HashMap<>();
        for (Object[] row : storageData) {
            storageByType.put((String) row[0], ((Number) row[2]).longValue());
            fileCountByType.put((String) row[0], ((Number) row[1]).longValue());
        }

        return StorageDashboardDto.builder()
                .totalStorageQuota(quota)
                .storageUsed(storageUsed)
                .storageAvailable(quota - storageUsed)
                .usagePercentage(quota > 0 ? (storageUsed * 100.0 / quota) : 0)
                .totalFiles(totalFiles)
                .totalFolders(totalFolders)
                .storageByType(storageByType)
                .fileCountByType(fileCountByType)
                .userPlan(user.getPlan())
                .build();
    }

    private void saveFileVersion(FileEntity file, String storagePath, Long fileSize,
                                  String checksum, User uploadedBy, String changeNotes) {
        int versionNumber = fileVersionRepository.findMaxVersionNumber(file).orElse(0) + 1;
        FileVersion version = FileVersion.builder()
                .file(file)
                .versionNumber(versionNumber)
                .storagePath(storagePath)
                .fileSize(fileSize)
                .checksum(checksum)
                .uploadedBy(uploadedBy)
                .changeNotes(changeNotes)
                .build();
        fileVersionRepository.save(version);
    }

    private String computeChecksum(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data);
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            return null;
        }
    }

    private String determineFileType(String contentType, String filename) {
        if (contentType == null) return "OTHER";
        if (contentType.startsWith("image/")) return "IMAGE";
        if (contentType.startsWith("video/")) return "VIDEO";
        if (contentType.equals("application/pdf")) return "PDF";
        if (contentType.contains("word") || contentType.contains("document") ||
            contentType.contains("spreadsheet") || contentType.contains("presentation") ||
            contentType.contains("text/")) return "DOCUMENT";
        return "OTHER";
    }
}
