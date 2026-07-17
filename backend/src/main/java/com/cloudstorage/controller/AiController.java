package com.cloudstorage.controller;

import com.cloudstorage.dto.ApiResponse;
import com.cloudstorage.dto.FileDto;
import com.cloudstorage.dto.FileAiMetadataDto;
import com.cloudstorage.entity.FileEntity;
import com.cloudstorage.entity.FileAiMetadata;
import com.cloudstorage.entity.User;
import com.cloudstorage.repository.UserRepository;
import com.cloudstorage.repository.FileAiMetadataRepository;
import com.cloudstorage.service.AiService;
import com.cloudstorage.service.FavoriteService;
import com.cloudstorage.service.GeminiClient;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;
    private final FavoriteService favoriteService;
    private final UserRepository userRepository;
    private final FileAiMetadataRepository fileAiMetadataRepository;
    private final GeminiClient geminiClient;

    private User getCurrentUser(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
    }

    @PostMapping("/ask")
    public ResponseEntity<ApiResponse<String>> askQuestion(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, Object> body) {
        User user = getCurrentUser(userDetails);
        if (!"PRO".equalsIgnoreCase(user.getPlan()) && !"ENTERPRISE".equalsIgnoreCase(user.getPlan())) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Ask AI (Chat with Document) is only available on Pro and Enterprise plans. Please upgrade first."));
        }

        if (!geminiClient.checkInternetConnection()) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("No internet connection. Please check your network and try again."));
        }

        String fileIdStr = (String) body.get("fileId");
        String question = (String) body.get("question");

        if (fileIdStr == null || question == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Missing fileId or question"));
        }

        // Extract conversation history if provided
        @SuppressWarnings("unchecked")
        java.util.List<java.util.Map<String, String>> history = null;
        Object historyObj = body.get("history");
        if (historyObj instanceof java.util.List) {
            try {
                history = new java.util.ArrayList<>();
                for (Object item : (java.util.List<?>) historyObj) {
                    if (item instanceof java.util.Map) {
                        @SuppressWarnings("unchecked")
                        java.util.Map<String, String> msgMap = (java.util.Map<String, String>) item;
                        history.add(msgMap);
                    }
                }
                // Limit history to last 10 messages to prevent token overflow
                if (history.size() > 10) {
                    history = history.subList(history.size() - 10, history.size());
                }
            } catch (Exception e) {
                history = null;
            }
        }

        Long fileId = Long.parseLong(fileIdStr);
        String answer = aiService.askQuestion(fileId, question, history);
        return ResponseEntity.ok(ApiResponse.success("Answer generated successfully", answer));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<FileDto>>> semanticSearch(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam String query) {
        User user = getCurrentUser(userDetails);

        if (!geminiClient.checkInternetConnection()) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("No internet connection. Please check your network and try again."));
        }

        List<FileEntity> files = aiService.semanticSearch(user.getId(), query);
        List<FileDto> dtos = files.stream()
                .map(file -> {
                    FileAiMetadata aiMeta = fileAiMetadataRepository.findByFileId(file.getId()).orElse(null);
                    boolean isFav = favoriteService.isFavorite(user.getId(), file.getId());
                    return FileDto.from(file, aiMeta, isFav);
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/metadata/{fileId}")
    public ResponseEntity<ApiResponse<FileAiMetadataDto>> getAiMetadata(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long fileId) {
        User user = getCurrentUser(userDetails);
        FileAiMetadata aiMeta = fileAiMetadataRepository.findByFileId(fileId).orElse(null);
        if (aiMeta == null) {
            return ResponseEntity.ok(ApiResponse.success(null));
        }

        FileAiMetadataDto dto = FileAiMetadataDto.from(aiMeta);
        
        // Plan restrictions enforcement
        if ("FREE".equalsIgnoreCase(user.getPlan())) {
            // Free plan only gets category classification. Hide summaries, dates, key points, and sensitive info warnings.
            dto.setSummary(null);
            dto.setKeyPoints(null);
            dto.setImportantDates(null);
            dto.setSensitiveDataFound(null);
        }

        return ResponseEntity.ok(ApiResponse.success(dto));
    }
}
