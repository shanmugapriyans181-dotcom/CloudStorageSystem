package com.cloudstorage.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DuplicateCheckResult {
    private boolean duplicate;
    private String type; // FILENAME_DUPLICATE, CONTENT_DUPLICATE, SEMANTIC_DUPLICATE
    private String message;
    private Double similarity;
    private ExistingFileDetails existingFile;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExistingFileDetails {
        private Long id;
        private String name;
    }
}
