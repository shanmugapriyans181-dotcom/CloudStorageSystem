package com.cloudstorage.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "file_ai_metadata")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileAiMetadata {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "file_id", nullable = false, unique = true)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private FileEntity file;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(name = "key_points", columnDefinition = "TEXT")
    private String keyPoints;

    @Column(name = "important_dates", columnDefinition = "TEXT")
    private String importantDates;

    @Column(length = 50)
    private String category; // CERTIFICATES, PROJECTS, INVOICES, MEDICAL, CONTRACTS, RESEARCH, PERSONAL

    @Column(name = "extracted_text", columnDefinition = "LONGTEXT")
    private String extractedText;

    @Lob
    @Column(name = "embedding", columnDefinition = "BLOB")
    private byte[] embedding; // Serialized float[] array for semantic vector comparison

    @Column(name = "sensitive_data_found", columnDefinition = "TEXT")
    private String sensitiveDataFound; // Aadhaar, PAN, Passport, Bank Details, Personal Information

    @Column(name = "similarity_hash", length = 255)
    private String similarityHash;

    @Column(name = "is_duplicate", nullable = false)
    @Builder.Default
    private Boolean isDuplicate = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "duplicate_of_file_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private FileEntity duplicateOf;

    @Column(name = "confidence_score")
    private Double confidenceScore;

    @Column(name = "ai_model", length = 100)
    private String aiModel;

    @Column(name = "classification_time")
    private LocalDateTime classificationTime;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
