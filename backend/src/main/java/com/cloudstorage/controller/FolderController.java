package com.cloudstorage.controller;

import com.cloudstorage.dto.ApiResponse;
import com.cloudstorage.dto.FolderDto;
import com.cloudstorage.entity.User;
import com.cloudstorage.repository.UserRepository;
import com.cloudstorage.service.FolderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/folders")
@RequiredArgsConstructor
public class FolderController {

    private final FolderService folderService;
    private final UserRepository userRepository;

    private User getCurrentUser(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
    }

    @PostMapping
    public ResponseEntity<ApiResponse<FolderDto>> createFolder(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        String name = (String) body.get("name");
        Long parentId = body.get("parentId") != null ? Long.valueOf(body.get("parentId").toString()) : null;
        String color = (String) body.get("color");
        return ResponseEntity.ok(ApiResponse.success(folderService.createFolder(name, parentId, user, color)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<FolderDto>>> getRootFolders(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        return ResponseEntity.ok(ApiResponse.success(folderService.getRootFolders(user)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<FolderDto>> getFolder(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        return ResponseEntity.ok(ApiResponse.success(folderService.getFolder(id, user)));
    }

    @GetMapping("/{id}/subfolders")
    public ResponseEntity<ApiResponse<List<FolderDto>>> getSubFolders(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        return ResponseEntity.ok(ApiResponse.success(folderService.getSubFolders(id, user)));
    }

    @PatchMapping("/{id}/rename")
    public ResponseEntity<ApiResponse<FolderDto>> renameFolder(
            @PathVariable Long id,
            @RequestParam("name") String name,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        return ResponseEntity.ok(ApiResponse.success(folderService.renameFolder(id, name, user)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteFolder(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        folderService.deleteFolder(id, user);
        return ResponseEntity.ok(ApiResponse.success("Folder moved to trash", null));
    }

    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<ApiResponse<Void>> permanentlyDeleteFolder(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        folderService.permanentlyDeleteFolder(id, user);
        return ResponseEntity.ok(ApiResponse.success("Folder permanently deleted", null));
    }

    @PostMapping("/{id}/restore")
    public ResponseEntity<ApiResponse<FolderDto>> restoreFolder(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        return ResponseEntity.ok(ApiResponse.success(folderService.restoreFolder(id, user)));
    }

    @GetMapping("/trash")
    public ResponseEntity<ApiResponse<List<FolderDto>>> getTrashFolders(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        return ResponseEntity.ok(ApiResponse.success(folderService.getTrashFolders(user)));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<FolderDto>>> searchFolders(
            @RequestParam("q") String query,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        return ResponseEntity.ok(ApiResponse.success(folderService.searchFolders(user, query)));
    }
}
