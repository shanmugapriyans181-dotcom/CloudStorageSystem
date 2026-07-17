package com.cloudstorage.controller;

import com.cloudstorage.dto.ApiResponse;
import com.cloudstorage.dto.FileDto;
import com.cloudstorage.dto.StorageDashboardDto;
import com.cloudstorage.entity.FileEntity;
import com.cloudstorage.entity.User;
import com.cloudstorage.repository.UserRepository;
import com.cloudstorage.service.FileService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.List;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final FileService fileService;
    private final UserRepository userRepository;

    private User getCurrentUser(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
    }

    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<Object>> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folderId", required = false) Long folderId,
            @RequestParam(value = "encrypt", defaultValue = "true") boolean encrypt,
            @RequestParam(value = "duplicateAction", required = false) String duplicateAction,
            @RequestParam(value = "existingFileId", required = false) Long existingFileId,
            @AuthenticationPrincipal UserDetails userDetails,
            HttpServletRequest request) throws Exception {
        User user = getCurrentUser(userDetails);
        Object result = fileService.uploadFile(file, folderId, user, encrypt, duplicateAction, existingFileId, request);
        
        if (result instanceof com.cloudstorage.dto.DuplicateCheckResult) {
            com.cloudstorage.dto.DuplicateCheckResult dup = (com.cloudstorage.dto.DuplicateCheckResult) result;
            return ResponseEntity.ok(ApiResponse.<Object>builder()
                    .success(false)
                    .message(dup.getMessage())
                    .data(dup)
                    .build());
        }
        
        return ResponseEntity.ok(ApiResponse.success("File uploaded successfully", result));
    }

    @GetMapping("/download/{id}")
    public ResponseEntity<org.springframework.core.io.Resource> downloadFile(
            @PathVariable Long id,
            @RequestParam(value = "disposition", defaultValue = "attachment") String disposition,
            @AuthenticationPrincipal UserDetails userDetails,
            HttpServletRequest request) throws Exception {
        User user = getCurrentUser(userDetails);
        FileEntity fileEntity = fileService.getFileEntity(id, user);
        try (InputStream stream = fileService.downloadFile(id, user, request)) {
            byte[] bytes = stream.readAllBytes();
            String contentDisposition = "inline".equalsIgnoreCase(disposition) ? "inline" : "attachment";
            org.springframework.core.io.ByteArrayResource resource = new org.springframework.core.io.ByteArrayResource(bytes) {
                @Override
                public String getFilename() {
                    return fileEntity.getName();
                }
            };

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(fileEntity.getContentType()))
                    .contentLength(bytes.length)
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            contentDisposition + "; filename=\"" + fileEntity.getName() + "\"")
                    .body(resource);
        }
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<FileDto>>> getFiles(
            @RequestParam(value = "folderId", required = false) Long folderId,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        return ResponseEntity.ok(ApiResponse.success(fileService.getFilesInFolder(folderId, user)));
    }

    @GetMapping("/recent")
    public ResponseEntity<ApiResponse<List<FileDto>>> getRecentFiles(
            @RequestParam(value = "limit", defaultValue = "10") int limit,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        return ResponseEntity.ok(ApiResponse.success(fileService.getRecentFiles(user, limit)));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<FileDto>>> searchFiles(
            @RequestParam("q") String query,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        return ResponseEntity.ok(ApiResponse.success(fileService.searchFiles(user, query)));
    }

    @GetMapping("/filter")
    public ResponseEntity<ApiResponse<List<FileDto>>> filterByType(
            @RequestParam("type") String type,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        return ResponseEntity.ok(ApiResponse.success(fileService.filterByType(user, type)));
    }

    @PatchMapping("/{id}/rename")
    public ResponseEntity<ApiResponse<FileDto>> renameFile(
            @PathVariable Long id,
            @RequestParam("name") String name,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        return ResponseEntity.ok(ApiResponse.success(fileService.renameFile(id, name, user)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteFile(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails,
            HttpServletRequest request) {
        User user = getCurrentUser(userDetails);
        fileService.deleteFile(id, user, request);
        return ResponseEntity.ok(ApiResponse.success("File moved to trash", null));
    }

    @PostMapping("/{id}/restore")
    public ResponseEntity<ApiResponse<FileDto>> restoreFile(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        return ResponseEntity.ok(ApiResponse.success(fileService.restoreFile(id, user)));
    }

    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<ApiResponse<Void>> permanentlyDeleteFile(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) throws Exception {
        User user = getCurrentUser(userDetails);
        fileService.permanentlyDelete(id, user);
        return ResponseEntity.ok(ApiResponse.success("File permanently deleted", null));
    }

    @GetMapping("/trash")
    public ResponseEntity<ApiResponse<List<FileDto>>> getTrash(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        return ResponseEntity.ok(ApiResponse.success(fileService.getTrashFiles(user)));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<StorageDashboardDto>> getDashboard(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        return ResponseEntity.ok(ApiResponse.success(fileService.getDashboard(user)));
    }
}
