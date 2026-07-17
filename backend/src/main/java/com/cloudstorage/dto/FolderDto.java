package com.cloudstorage.dto;

import com.cloudstorage.entity.Folder;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FolderDto {
    private Long id;
    private String name;
    private Long parentId;
    private String parentName;
    private Long ownerId;
    private String ownerName;
    private String color;
    private String path;
    private Boolean isDeleted;
    private LocalDateTime deletedAt;
    private List<FolderDto> subFolders;
    private List<FileDto> files;
    private Integer fileCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static FolderDto from(Folder folder) {
        return FolderDto.builder()
                .id(folder.getId())
                .name(folder.getName())
                .parentId(folder.getParent() != null ? folder.getParent().getId() : null)
                .parentName(folder.getParent() != null ? folder.getParent().getName() : null)
                .ownerId(folder.getOwner().getId())
                .ownerName(folder.getOwner().getUsername())
                .color(folder.getColor())
                .path(folder.getPath())
                .isDeleted(folder.getIsDeleted())
                .deletedAt(folder.getDeletedAt())
                .createdAt(folder.getCreatedAt())
                .updatedAt(folder.getUpdatedAt())
                .build();
    }
}
