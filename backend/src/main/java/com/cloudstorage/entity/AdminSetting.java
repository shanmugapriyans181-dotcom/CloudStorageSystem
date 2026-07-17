package com.cloudstorage.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "admin_settings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "upi_id", nullable = false, length = 100)
    private String upiId;

    @Column(name = "admin_name", nullable = false, length = 100)
    private String adminName;

    @Column(name = "qr_code_url", columnDefinition = "LONGTEXT")
    private String qrCodeUrl; // Configurable Base64 image or URL for Admin UPI QR Code

    @Column(name = "free_storage_limit")
    private Long freeStorageLimit; // 5 GB

    @Column(name = "basic_storage_limit")
    private Long basicStorageLimit; // 10 GB

    @Column(name = "pro_storage_limit")
    private Long proStorageLimit; // 50 GB

    @Column(name = "enterprise_storage_limit")
    private Long enterpriseStorageLimit; // 100 GB

    @Column(name = "basic_price")
    private Double basicPrice;

    @Column(name = "pro_price")
    private Double proPrice;

    @Column(name = "enterprise_price")
    private Double enterprisePrice;

    @Column(name = "gemini_api_key", length = 200)
    private String geminiApiKey;
}
