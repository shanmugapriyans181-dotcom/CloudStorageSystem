package com.cloudstorage.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "file_duplicates")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileDuplicate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "original_file_id", nullable = false)
    private FileEntity originalFile;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "duplicate_file_id", nullable = false)
    private FileEntity duplicateFile;

    @Column(name = "similarity_percentage", nullable = false)
    private Double similarityPercentage;

    @Column(name = "detection_type", nullable = false, length = 50)
    private String detectionType; // FILENAME_DUPLICATE, CONTENT_DUPLICATE, SEMANTIC_DUPLICATE

    @CreationTimestamp
    @Column(name = "detection_time", nullable = false, updatable = false)
    private LocalDateTime detectionTime;
}
