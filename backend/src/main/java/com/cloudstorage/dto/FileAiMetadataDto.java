package com.cloudstorage.dto;

import com.cloudstorage.entity.FileAiMetadata;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileAiMetadataDto {
    private Long id;
    private Long fileId;
    private String summary;
    private String keyPoints;
    private String importantDates;
    private String category;
    private String sensitiveDataFound;
    private Boolean isDuplicate;
    private Long duplicateOfFileId;
    private String duplicateOfFileName;
    private Double confidenceScore;
    private String aiModel;
    private java.time.LocalDateTime classificationTime;

    public static FileAiMetadataDto from(FileAiMetadata meta) {
        if (meta == null) return null;
        return FileAiMetadataDto.builder()
                .id(meta.getId())
                .fileId(meta.getFile().getId())
                .summary(meta.getSummary())
                .keyPoints(meta.getKeyPoints())
                .importantDates(meta.getImportantDates())
                .category(meta.getCategory())
                .sensitiveDataFound(meta.getSensitiveDataFound())
                .isDuplicate(meta.getIsDuplicate())
                .duplicateOfFileId(meta.getDuplicateOf() != null ? meta.getDuplicateOf().getId() : null)
                .duplicateOfFileName(meta.getDuplicateOf() != null ? meta.getDuplicateOf().getName() : null)
                .confidenceScore(meta.getConfidenceScore())
                .aiModel(meta.getAiModel())
                .classificationTime(meta.getClassificationTime())
                .build();
    }
}
