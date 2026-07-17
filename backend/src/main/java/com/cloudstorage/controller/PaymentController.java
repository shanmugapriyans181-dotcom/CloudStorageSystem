package com.cloudstorage.controller;

import com.cloudstorage.dto.ApiResponse;
import com.cloudstorage.entity.AdminSetting;
import com.cloudstorage.entity.Payment;
import com.cloudstorage.entity.User;
import com.cloudstorage.repository.AdminSettingRepository;
import com.cloudstorage.repository.PaymentRepository;
import com.cloudstorage.repository.UserRepository;
import com.cloudstorage.entity.ActivityLog;
import com.cloudstorage.service.ActivityLogService;
import org.springframework.transaction.annotation.Transactional;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final PaymentRepository paymentRepository;
    private final AdminSettingRepository adminSettingRepository;
    private final UserRepository userRepository;
    private final ActivityLogService activityLogService;

    private User getCurrentUser(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
    }

    private AdminSetting getOrInitSettings() {
        List<AdminSetting> settingsList = adminSettingRepository.findAll();
        AdminSetting settings;
        if (settingsList.isEmpty()) {
            AdminSetting defaults = AdminSetting.builder()
                    .upiId("admin@upi")
                    .adminName("SmartCloud Admin")
                    .qrCodeUrl("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'><rect width='150' height='150' fill='white'/><path d='M20 20h30v30H20zm10 10h10v10H30zM100 20h30v30h-30zm10 10h10v10h-10zM20 100h30v30H20zm10 10h10v10H30zm60-80h10v10H80zm20 20h10v10h-10zm-20 20h15v10H80zm10 20h10v20H90zm20 10h10v10h-10z' fill='black'/></svg>")
                    .freeStorageLimit(5L * 1024 * 1024 * 1024) // 5 GB
                    .basicStorageLimit(10L * 1024 * 1024 * 1024) // 10 GB
                    .proStorageLimit(150L * 1024 * 1024 * 1024) // 150 GB
                    .enterpriseStorageLimit(1000L * 1024 * 1024 * 1024) // 1 TB
                    .basicPrice(199.0)
                    .proPrice(499.0)
                    .enterprisePrice(999.0)
                    .build();
            settings = adminSettingRepository.save(defaults);
        } else {
            settings = settingsList.get(0);
            settings.setFreeStorageLimit(5L * 1024 * 1024 * 1024); // 5 GB
            settings.setProStorageLimit(150L * 1024 * 1024 * 1024); // 150 GB
            settings.setEnterpriseStorageLimit(1000L * 1024 * 1024 * 1024); // 1 TB
            settings = adminSettingRepository.save(settings);
        }
        return settings;
    }

    /**
     * GET /api/payment/settings
     */
    @GetMapping("/settings")
    public ResponseEntity<ApiResponse<AdminSetting>> getPaymentSettings() {
        return ResponseEntity.ok(ApiResponse.success(getOrInitSettings()));
    }

    /**
     * POST /api/payment/submit
     */
    @PostMapping("/submit")
    @Transactional
    public ResponseEntity<ApiResponse<Payment>> submitPaymentVerification(
            @RequestBody PaymentSubmission submission,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            User user = getCurrentUser(userDetails);
            AdminSetting settings = getOrInitSettings();
            String pName = submission.getPlanName().toUpperCase();
            long cap;
            
            if ("PRO".equals(pName) || "GO_PRO".equals(pName)) {
                cap = settings.getProStorageLimit();
                pName = "PRO";
            } else if ("ENTERPRISE".equals(pName) || "PREMIUM".equals(pName)) {
                cap = settings.getEnterpriseStorageLimit();
                pName = "ENTERPRISE";
            } else {
                cap = settings.getFreeStorageLimit();
                pName = "FREE";
            }
            
            // Instantly apply the plan upgrade and new quota to the user
            user.setPreviousPlan(user.getPlan());
            user.setPlan(pName);
            user.setStorageQuota(cap);
            userRepository.save(user);

            // Create and auto-approve the payment record
            Payment payment = Payment.builder()
                    .user(user)
                    .planName(pName)
                    .amount(submission.getAmount())
                    .upiId(submission.getUpiId())
                    .transactionReference(submission.getTransactionReference())
                    .screenshotUrl(submission.getScreenshotUrl())
                    .status(Payment.Status.APPROVED)
                    .build();

            payment = paymentRepository.save(payment);

            // Log activity log
            activityLogService.log(user, ActivityLog.Action.UPDATE_PROFILE, "USER", user.getId(),
                    "Upgraded plan to " + pName);

            return ResponseEntity.ok(ApiResponse.success("Your plan has been upgraded successfully to " + pName + "!", payment));
        } catch (Exception e) {
            log.error("Failed to submit manual payment verification: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to process payment. Ensure Transaction Reference is unique."));
        }
    }

    @Data
    public static class PaymentSubmission {
        private String planName;
        private Double amount;
        private String upiId;
        private String transactionReference;
        private String screenshotUrl;
    }
}
