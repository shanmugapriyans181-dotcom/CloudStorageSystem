package com.cloudstorage.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StorageDashboardDto {
    private Long totalStorageQuota;
    private Long storageUsed;
    private Long storageAvailable;
    private Double usagePercentage;
    private Long totalFiles;
    private Long totalFolders;
    private Map<String, Long> storageByType;
    private Map<String, Long> fileCountByType;
    private String userPlan;
}
