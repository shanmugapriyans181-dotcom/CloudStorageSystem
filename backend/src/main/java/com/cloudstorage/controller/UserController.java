package com.cloudstorage.controller;

import com.cloudstorage.dto.ApiResponse;
import com.cloudstorage.dto.UserDto;
import com.cloudstorage.entity.User;
import com.cloudstorage.exception.BadRequestException;
import com.cloudstorage.repository.UserRepository;
import com.cloudstorage.entity.ActivityLog;
import com.cloudstorage.service.ActivityLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final ActivityLogService activityLogService;
    private final com.cloudstorage.service.StorageService storageService;
    private final com.cloudstorage.service.EmailService emailService;

    @PostMapping(value = "/profile-picture", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<UserDto>> uploadProfilePicture(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @AuthenticationPrincipal UserDetails userDetails) throws Exception {
        User user = getCurrentUser(userDetails);
        
        // Storing without encryption for profile picture
        String key = storageService.store(file, user.getId().toString(), false);
        
        // Delete old profile picture if exists
        if (user.getProfilePicture() != null) {
            try {
                storageService.delete(user.getProfilePicture());
            } catch (Exception e) {
                // Ignore if delete failed
            }
        }
        
        user.setProfilePicture(key);
        user = userRepository.save(user);
        
        activityLogService.log(user, ActivityLog.Action.UPDATE_PROFILE, "USER", user.getId(), "Updated profile picture");
        
        return ResponseEntity.ok(ApiResponse.success("Profile picture updated", UserDto.from(user)));
    }

    @GetMapping("/profile-picture/view/**")
    public ResponseEntity<org.springframework.core.io.InputStreamResource> viewProfilePicture(
            jakarta.servlet.http.HttpServletRequest request) throws Exception {
        try {
            String path = request.getRequestURI();
            String rawKey = path.substring(path.indexOf("/view/") + 6);
            String key = java.net.URLDecoder.decode(rawKey, java.nio.charset.StandardCharsets.UTF_8);
            
            java.io.File debugFile = new java.io.File("debug_log.txt");
            java.nio.file.Files.writeString(debugFile.toPath(), 
                "URI=" + path + "\nrawKey=" + rawKey + "\nkey=" + key + "\n",
                java.nio.file.StandardOpenOption.CREATE, java.nio.file.StandardOpenOption.TRUNCATE_EXISTING);
            
            java.io.InputStream stream = storageService.retrieve(key, false);
            
            String contentType = "image/jpeg";
            if (key.toLowerCase().endsWith(".png")) contentType = "image/png";
            else if (key.toLowerCase().endsWith(".gif")) contentType = "image/gif";
            else if (key.toLowerCase().endsWith(".webp")) contentType = "image/webp";
            return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.parseMediaType(contentType))
                    .body(new org.springframework.core.io.InputStreamResource(stream));
        } catch (Exception ex) {
            java.io.File debugFile = new java.io.File("debug_log.txt");
            java.io.StringWriter sw = new java.io.StringWriter();
            ex.printStackTrace(new java.io.PrintWriter(sw));
            java.nio.file.Files.writeString(debugFile.toPath(), 
                "ERROR: " + sw.toString(),
                java.nio.file.StandardOpenOption.CREATE, java.nio.file.StandardOpenOption.APPEND);
            throw ex;
        }
    }

    @DeleteMapping("/profile-picture")
    public ResponseEntity<ApiResponse<UserDto>> deleteProfilePicture(
            @AuthenticationPrincipal UserDetails userDetails) throws Exception {
        User user = getCurrentUser(userDetails);
        
        if (user.getProfilePicture() != null) {
            try {
                storageService.delete(user.getProfilePicture());
            } catch (Exception e) {
                // Ignore if delete failed
            }
            user.setProfilePicture(null);
            user = userRepository.save(user);
            activityLogService.log(user, ActivityLog.Action.UPDATE_PROFILE, "USER", user.getId(), "Deleted profile picture");
        }
        
        return ResponseEntity.ok(ApiResponse.success("Profile picture deleted", UserDto.from(user)));
    }

    @GetMapping("/activity")
    public ResponseEntity<ApiResponse<List<ActivityLog>>> getActivityLogs(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        Page<ActivityLog> logs = activityLogService.getUserLogs(user, PageRequest.of(0, 10));
        return ResponseEntity.ok(ApiResponse.success(logs.getContent()));
    }

    private User getCurrentUser(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> getProfile(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        return ResponseEntity.ok(ApiResponse.success(UserDto.from(user)));
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<UserDto>> updateProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, String> body) {
        User user = getCurrentUser(userDetails);

        String fullName = body.get("fullName");
        String username = body.get("username");

        if (fullName != null && !fullName.isBlank()) {
            user.setFullName(fullName.trim());
        }

        if (username != null && !username.isBlank() && !username.equals(user.getUsername())) {
            if (userRepository.existsByUsername(username.trim())) {
                throw new BadRequestException("Username already taken");
            }
            user.setUsername(username.trim());
        }

        user = userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success("Profile updated", UserDto.from(user)));
    }

    @PostMapping("/upgrade")
    public ResponseEntity<ApiResponse<UserDto>> upgradePlan(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam String plan) {
        User user = getCurrentUser(userDetails);
        long quota;
        String planName = plan.toUpperCase();
        String storageLimit = "5 GB";
        
        if ("BASIC".equals(planName) || "FREE".equals(planName)) {
            quota = 5L * 1024 * 1024 * 1024; // 5 GB
            planName = "FREE";
            storageLimit = "5 GB";
        } else if ("PRO".equals(planName) || "GO_PRO".equals(planName)) {
            quota = 150L * 1024 * 1024 * 1024; // 150 GB
            planName = "PRO";
            storageLimit = "150 GB";
        } else if ("ENTERPRISE".equals(planName) || "PREMIUM".equals(planName)) {
            quota = 1000L * 1024 * 1024 * 1024; // 1 TB
            planName = "ENTERPRISE";
            storageLimit = "1 TB";
        } else {
            quota = 5L * 1024 * 1024 * 1024; // 5 GB
            planName = "FREE";
            storageLimit = "5 GB";
        }

        user.setPlan(planName);
        user.setStorageQuota(quota);
        user = userRepository.save(user);

        activityLogService.log(user, ActivityLog.Action.UPDATE_PROFILE, "USER", user.getId(),
                "Upgraded plan to " + planName);

        // Send Plan Upgrade Email notification
        try {
            String name = user.getFullName() != null && !user.getFullName().isBlank() ? user.getFullName() : user.getUsername();
            emailService.sendPlanUpgradeEmail(user.getEmail(), name, planName, storageLimit);
        } catch (Exception e) {
            // Log warning but don't fail the response
        }

        return ResponseEntity.ok(ApiResponse.success("Plan upgraded successfully to " + planName, UserDto.from(user)));
    }
}
