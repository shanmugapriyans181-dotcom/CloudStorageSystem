package com.cloudstorage.dto;

import com.cloudstorage.entity.FileEntity;
import com.cloudstorage.entity.FileAiMetadata;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileDto {
    private Long id;
    private String name;
    private String originalName;
    private String contentType;
    private Long fileSize;
    private String fileType;
    private Long folderId;
    private String folderName;
    private Long ownerId;
    private String ownerName;
    private Boolean isDeleted;
    private LocalDateTime deletedAt;
    private Boolean isEncrypted;
    private Integer version;
    private Long downloadCount;
    private String thumbnailPath;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private FileAiMetadataDto aiMetadata;
    private Boolean isFavorite;

    public static FileDto from(FileEntity file) {
        return from(file, file.getAiMetadata(), false);
    }

    public static FileDto from(FileEntity file, FileAiMetadata aiMetadata, boolean isFavorite) {
        return FileDto.builder()
                .id(file.getId())
                .name(file.getName())
                .originalName(file.getOriginalName())
                .contentType(file.getContentType())
                .fileSize(file.getFileSize())
                .fileType(file.getFileType())
                .folderId(file.getFolder() != null ? file.getFolder().getId() : null)
                .folderName(file.getFolder() != null ? file.getFolder().getName() : null)
                .ownerId(file.getOwner().getId())
                .ownerName(file.getOwner().getUsername())
                .isDeleted(file.getIsDeleted())
                .deletedAt(file.getDeletedAt())
                .isEncrypted(file.getIsEncrypted())
                .version(file.getVersion())
                .downloadCount(file.getDownloadCount())
                .thumbnailPath(file.getThumbnailPath())
                .description(file.getDescription())
                .createdAt(file.getCreatedAt())
                .updatedAt(file.getUpdatedAt())
                .aiMetadata(FileAiMetadataDto.from(aiMetadata))
                .isFavorite(isFavorite)
                .build();
    }
}
