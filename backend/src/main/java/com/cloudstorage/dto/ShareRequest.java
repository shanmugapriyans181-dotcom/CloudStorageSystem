package com.cloudstorage.dto;

import com.cloudstorage.entity.SharedFile;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ShareRequest {
    @NotNull
    private Long fileId;

    private String sharedWithEmail;

    private SharedFile.Permission permission = SharedFile.Permission.VIEW;

    private LocalDateTime expiresAt;

    private Boolean isPublic = false;
}
