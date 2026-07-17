package com.cloudstorage.controller;

import com.cloudstorage.dto.ApiResponse;
import com.cloudstorage.dto.FileDto;
import com.cloudstorage.entity.User;
import com.cloudstorage.repository.UserRepository;
import com.cloudstorage.service.FavoriteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private final FavoriteService favoriteService;
    private final UserRepository userRepository;

    private User getCurrentUser(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<FileDto>>> getFavorites(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        List<FileDto> favorites = favoriteService.getFavorites(user);
        return ResponseEntity.ok(ApiResponse.success(favorites));
    }

    @PostMapping("/{fileId}")
    public ResponseEntity<ApiResponse<Void>> addFavorite(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long fileId) {
        User user = getCurrentUser(userDetails);
        favoriteService.addFavorite(user, fileId);
        return ResponseEntity.ok(ApiResponse.success("File added to favorites", null));
    }

    @DeleteMapping("/{fileId}")
    public ResponseEntity<ApiResponse<Void>> removeFavorite(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long fileId) {
        User user = getCurrentUser(userDetails);
        favoriteService.removeFavorite(user, fileId);
        return ResponseEntity.ok(ApiResponse.success("File removed from favorites", null));
    }
}
