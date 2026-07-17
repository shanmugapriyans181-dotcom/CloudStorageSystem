package com.cloudstorage.controller;

import com.cloudstorage.dto.ApiResponse;
import com.cloudstorage.dto.ShareRequest;
import com.cloudstorage.entity.FileEntity;
import com.cloudstorage.entity.SharedFile;
import com.cloudstorage.entity.User;
import com.cloudstorage.repository.UserRepository;
import com.cloudstorage.service.ShareService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.io.InputStream;
import java.util.List;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class ShareController {

    private final ShareService shareService;
    private final UserRepository userRepository;

    private User getCurrentUser(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
    }

    @PostMapping("/share")
    public ResponseEntity<ApiResponse<SharedFile>> shareFile(
            @Valid @RequestBody ShareRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        SharedFile share = shareService.shareFile(request, user);
        return ResponseEntity.ok(ApiResponse.success("File shared successfully", share));
    }

    @GetMapping("/shared/with-me")
    public ResponseEntity<ApiResponse<List<SharedFile>>> getSharedWithMe(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        return ResponseEntity.ok(ApiResponse.success(shareService.getFilesSharedWithMe(user)));
    }

    @GetMapping("/shared/by-me")
    public ResponseEntity<ApiResponse<List<SharedFile>>> getSharedByMe(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        return ResponseEntity.ok(ApiResponse.success(shareService.getFilesSharedByMe(user)));
    }

    @GetMapping("/shared/public/{token}")
    public ResponseEntity<?> viewSharedFile(@PathVariable String token) {
        FileEntity file = shareService.getSharedFileForView(token);
        return ResponseEntity.ok(ApiResponse.success(file));
    }

    @GetMapping("/shared/download/{token}")
    public ResponseEntity<InputStreamResource> downloadSharedFile(
            @PathVariable String token,
            @AuthenticationPrincipal UserDetails userDetails) throws Exception {
        User user = userDetails != null ? getCurrentUser(userDetails) : null;
        InputStream stream = shareService.downloadSharedFile(token, user);
        FileEntity file = shareService.getSharedFileForView(token);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + file.getName() + "\"")
                .body(new InputStreamResource(stream));
    }

    @DeleteMapping("/share/{shareId}")
    public ResponseEntity<ApiResponse<Void>> revokeShare(
            @PathVariable Long shareId,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        shareService.revokeShare(shareId, user);
        return ResponseEntity.ok(ApiResponse.success("Share revoked", null));
    }
}
