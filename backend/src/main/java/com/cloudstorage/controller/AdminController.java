package com.cloudstorage.controller;

import com.cloudstorage.dto.ApiResponse;
import com.cloudstorage.dto.UserDto;
import com.cloudstorage.entity.*;
import com.cloudstorage.repository.*;
import com.cloudstorage.service.ActivityLogService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
public class AdminController {

    private final UserRepository userRepository;
    private final FileRepository fileRepository;
    private final PaymentRepository paymentRepository;
    private final AdminSettingRepository adminSettingRepository;
    private final ActivityLogRepository activityLogRepository;
    private final ActivityLogService activityLogService;
    private final jakarta.persistence.EntityManager entityManager;

    // Helper to get admin settings or initialize default values
    private AdminSetting getOrInitSettings() {
        List<AdminSetting> settingsList = adminSettingRepository.findAll();
        if (settingsList.isEmpty()) {
            AdminSetting defaults = AdminSetting.builder()
                    .upiId("admin@upi")
                    .adminName("SmartCloud Admin")
                    .qrCodeUrl("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'><rect width='150' height='150' fill='white'/><path d='M20 20h30v30H20zm10 10h10v10H30zM100 20h30v30h-30zm10 10h10v10h-10zM20 100h30v30H20zm10 10h10v10H30zm60-80h10v10H80zm20 20h10v10h-10zm-20 20h15v10H80zm10 20h10v20H90zm20 10h10v10h-10z' fill='black'/></svg>")
                    .freeStorageLimit(5368709120L) // 5 GB
                    .basicStorageLimit(10737418240L) // 10 GB
                    .proStorageLimit(161061273600L) // 150 GB
                    .enterpriseStorageLimit(1073741824000L) // 1 TB
                    .basicPrice(199.0)
                    .proPrice(499.0)
                    .enterprisePrice(999.0)
                    .build();
            return adminSettingRepository.save(defaults);
        }
        return settingsList.getFirst();
    }

    /**
     * GET /api/admin/analytics
     */
    @GetMapping("/analytics")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAnalytics() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", userRepository.countByRole(User.Role.USER));
        stats.put("totalFiles", fileRepository.count());

        Long totalStorageUsed = userRepository.sumStorageUsed();
        stats.put("totalStorageUsed", totalStorageUsed != null ? totalStorageUsed : 0L);

        Double totalRevenue = paymentRepository.sumApprovedRevenue();
        stats.put("totalRevenue", totalRevenue != null ? totalRevenue : 0.0);

        // Upload trends mock or derived
        List<Map<String, Object>> uploadsByDay = new ArrayList<>();
        uploadsByDay.add(Map.of("date", "Mon", "count", 12));
        uploadsByDay.add(Map.of("date", "Tue", "count", 19));
        uploadsByDay.add(Map.of("date", "Wed", "count", 32));
        uploadsByDay.add(Map.of("date", "Thu", "count", 24));
        uploadsByDay.add(Map.of("date", "Fri", "count", 40));
        uploadsByDay.add(Map.of("date", "Sat", "count", 15));
        uploadsByDay.add(Map.of("date", "Sun", "count", 22));
        stats.put("uploadsByDay", uploadsByDay);

        // File type distributions
        List<Map<String, Object>> storageByUser = userRepository.findAll().stream()
                .filter(u -> u.getStorageUsed() > 0)
                .map(u -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("username", u.getUsername());
                    map.put("storageUsed", u.getStorageUsed());
                    return map;
                })
                .sorted((a, b) -> Long.compare((Long) b.get("storageUsed"), (Long) a.get("storageUsed")))
                .limit(5)
                .collect(Collectors.toList());
        stats.put("storageByUser", storageByUser);

        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    /**
     * GET /api/admin/users
     */
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<UserDto>>> getUsers() {
        List<UserDto> list = userRepository.findAll().stream()
                .filter(u -> u.getRole() != User.Role.ADMIN)
                .map(UserDto::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    /**
     * PATCH /api/admin/users/{id}/status
     */
    @PatchMapping("/users/{id}/status")
    public ResponseEntity<ApiResponse<UserDto>> toggleUserStatus(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setIsActive(!user.getIsActive());
        userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success("User status updated", UserDto.from(user)));
    }

    /**
     * DELETE /api/admin/users/{id}
     */
    @DeleteMapping("/users/{id}")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable Long id) {
        if (!userRepository.existsById(id)) {
            throw new IllegalArgumentException("User not found");
        }

        // Delete dependencies referencing user
        entityManager.createNativeQuery("DELETE FROM shared_files WHERE shared_by = :userId OR shared_with = :userId")
                .setParameter("userId", id).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM favorites WHERE user_id = :userId")
                .setParameter("userId", id).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM activity_logs WHERE user_id = :userId")
                .setParameter("userId", id).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM notifications WHERE user_id = :userId")
                .setParameter("userId", id).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM file_versions WHERE uploaded_by = :userId")
                .setParameter("userId", id).executeUpdate();

        // Delete dependencies referencing files owned by user
        entityManager.createNativeQuery("DELETE fv FROM file_versions fv JOIN files f ON fv.file_id = f.id WHERE f.user_id = :userId")
                .setParameter("userId", id).executeUpdate();
        entityManager.createNativeQuery("DELETE fam FROM file_ai_metadata fam JOIN files f ON fam.file_id = f.id WHERE f.user_id = :userId")
                .setParameter("userId", id).executeUpdate();
        entityManager.createNativeQuery("DELETE fav FROM favorites fav JOIN files f ON fav.file_id = f.id WHERE f.user_id = :userId")
                .setParameter("userId", id).executeUpdate();
        entityManager.createNativeQuery("DELETE sf FROM shared_files sf JOIN files f ON sf.file_id = f.id WHERE f.user_id = :userId")
                .setParameter("userId", id).executeUpdate();

        // Delete actual files and folders owned by user
        entityManager.createNativeQuery("DELETE FROM files WHERE user_id = :userId")
                .setParameter("userId", id).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM folders WHERE user_id = :userId")
                .setParameter("userId", id).executeUpdate();

        // Delete the user record
        entityManager.createNativeQuery("DELETE FROM users WHERE id = :userId")
                .setParameter("userId", id).executeUpdate();

        return ResponseEntity.ok(ApiResponse.success("User deleted successfully", null));
    }

    /**
     * PATCH /api/admin/users/{id}/storage-quota
     */
    @PatchMapping("/users/{id}/storage-quota")
    public ResponseEntity<ApiResponse<UserDto>> updateStorageQuota(
            @PathVariable Long id,
            @RequestParam Long quotaBytes) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setStorageQuota(quotaBytes);
        userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success("Storage quota updated successfully", UserDto.from(user)));
    }

    /**
     * GET /api/admin/payments/pending
     */
    @GetMapping("/payments/pending")
    public ResponseEntity<ApiResponse<List<Payment>>> getPendingPayments() {
        List<Payment> list = paymentRepository.findAllByStatusOrderByCreatedAtDesc(Payment.Status.PENDING);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    /**
     * GET /api/admin/payments/history
     */
    @GetMapping("/payments/history")
    public ResponseEntity<ApiResponse<List<Payment>>> getPaymentHistory() {
        List<Payment> list = paymentRepository.findAllByOrderByCreatedAtDesc();
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    /**
     * POST /api/admin/payments/verify
     */
    @PostMapping("/payments/verify")
    @Transactional
    public ResponseEntity<ApiResponse<Payment>> verifyPayment(
            @RequestParam Long paymentId,
            @RequestParam String action) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment record not found"));

        if (payment.getStatus() != Payment.Status.PENDING) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Payment is already verified."));
        }

        AdminSetting settings = getOrInitSettings();

        if ("APPROVE".equalsIgnoreCase(action)) {
            payment.setStatus(Payment.Status.APPROVED);
            User user = payment.getUser();
            user.setPreviousPlan(user.getPlan());
            user.setPlan(payment.getPlanName());
            
            // Update storage limits based on setting caps
            long cap = switch (payment.getPlanName().toUpperCase()) {
                case "BASIC" -> settings.getBasicStorageLimit();
                case "PRO" -> settings.getProStorageLimit();
                case "ENTERPRISE" -> settings.getEnterpriseStorageLimit();
                default -> settings.getFreeStorageLimit();
            };
            user.setStorageQuota(cap);
            userRepository.save(user);
        } else {
            payment.setStatus(Payment.Status.REJECTED);
        }

        paymentRepository.save(payment);
        return ResponseEntity.ok(ApiResponse.success("Payment transaction " + action.toLowerCase() + "d", payment));
    }

    /**
     * GET /api/admin/settings
     */
    @GetMapping("/settings")
    public ResponseEntity<ApiResponse<AdminSetting>> getSettings() {
        return ResponseEntity.ok(ApiResponse.success(getOrInitSettings()));
    }

    /**
     * PUT /api/admin/settings
     */
    @PutMapping("/settings")
    public ResponseEntity<ApiResponse<AdminSetting>> updateSettings(@RequestBody AdminSetting newSettings) {
        AdminSetting settings = getOrInitSettings();
        settings.setUpiId(newSettings.getUpiId());
        settings.setAdminName(newSettings.getAdminName());
        if (newSettings.getQrCodeUrl() != null && !newSettings.getQrCodeUrl().isEmpty()) {
            settings.setQrCodeUrl(newSettings.getQrCodeUrl());
        }
        settings.setFreeStorageLimit(newSettings.getFreeStorageLimit());
        settings.setBasicStorageLimit(newSettings.getBasicStorageLimit());
        settings.setProStorageLimit(newSettings.getProStorageLimit());
        settings.setEnterpriseStorageLimit(newSettings.getEnterpriseStorageLimit());
        settings.setBasicPrice(newSettings.getBasicPrice());
        settings.setProPrice(newSettings.getProPrice());
        settings.setEnterprisePrice(newSettings.getEnterprisePrice());
        settings.setGeminiApiKey(newSettings.getGeminiApiKey());

        adminSettingRepository.save(settings);
        return ResponseEntity.ok(ApiResponse.success("Settings updated successfully", settings));
    }

    /**
     * GET /api/admin/logs
     */
    @GetMapping("/logs")
    public ResponseEntity<ApiResponse<Page<ActivityLog>>> getLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search) {
        Page<ActivityLog> logs;
        if (search != null && !search.trim().isEmpty()) {
            logs = activityLogRepository.searchLogs(
                    search.trim(),
                    PageRequest.of(page, size, Sort.by("createdAt").descending())
            );
        } else {
            logs = activityLogRepository.findAll(
                    PageRequest.of(page, size, Sort.by("createdAt").descending())
            );
        }
        return ResponseEntity.ok(ApiResponse.success(logs));
    }

    /**
     * GET /api/admin/files
     */
    @GetMapping("/files")
    public ResponseEntity<ApiResponse<List<com.cloudstorage.dto.FileDto>>> getAllFiles() {
        List<com.cloudstorage.dto.FileDto> dtos = fileRepository.findAllEager().stream()
                .map(com.cloudstorage.dto.FileDto::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    /**
     * GET /api/admin/reports
     */
    @GetMapping("/reports")
    public ResponseEntity<byte[]> downloadReport(@RequestParam String type) {
        StringBuilder csv = new StringBuilder();
        if ("users".equalsIgnoreCase(type)) {
            csv.append("ID,Username,Email,FullName,Plan,StorageUsed,Role,Status\n");
            userRepository.findAll().forEach(u -> csv.append(String.format("%d,%s,%s,%s,%s,%d,%s,%s\n",
                    u.getId(), u.getUsername(), u.getEmail(), u.getFullName(), u.getPlan(),
                    u.getStorageUsed(), u.getRole().name(), u.getIsActive() ? "ACTIVE" : "SUSPENDED")));
        } else if ("revenue".equalsIgnoreCase(type)) {
            csv.append("TransactionID,User,Plan,Amount,Status,Date\n");
            paymentRepository.findAll().forEach(p -> csv.append(String.format("%d,%s,%s,%.2f,%s,%s\n",
                    p.getId(), p.getUser().getUsername(), p.getPlanName(), p.getAmount(), p.getStatus().name(), p.getCreatedAt())));
        } else {
            csv.append("Metric,Value\n");
            csv.append(String.format("Total Users,%d\n", userRepository.count()));
            csv.append(String.format("Total Files,%d\n", fileRepository.count()));
        }

        byte[] fileBytes = csv.toString().getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=report_" + type + ".csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(fileBytes);
    }
}
