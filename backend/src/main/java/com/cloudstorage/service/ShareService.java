package com.cloudstorage.service;

import com.cloudstorage.dto.ShareRequest;
import com.cloudstorage.entity.*;
import com.cloudstorage.exception.BadRequestException;
import com.cloudstorage.exception.ResourceNotFoundException;
import com.cloudstorage.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ShareService {

    private final SharedFileRepository sharedFileRepository;
    private final FileRepository fileRepository;
    private final UserRepository userRepository;
    private final StorageService storageService;
    private final EmailService emailService;
    private final ActivityLogService activityLogService;

    @Transactional
    public SharedFile shareFile(ShareRequest request, User sharedBy) {
        FileEntity file = fileRepository.findByIdAndOwner(request.getFileId(), sharedBy)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        User sharedWith = null;
        if (request.getSharedWithEmail() != null) {
            sharedWith = userRepository.findByEmail(request.getSharedWithEmail())
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));

            if (sharedWith.getId().equals(sharedBy.getId())) {
                throw new BadRequestException("Cannot share file with yourself");
            }
        }

        String shareToken = UUID.randomUUID().toString();

        SharedFile share = SharedFile.builder()
                .file(file)
                .sharedBy(sharedBy)
                .sharedWith(sharedWith)
                .shareToken(shareToken)
                .permission(request.getPermission())
                .expiresAt(request.getExpiresAt())
                .isPublic(request.getIsPublic() != null ? request.getIsPublic() : false)
                .build();

        share = sharedFileRepository.save(share);

        // Send email notification
        if (sharedWith != null) {
            String shareLink = "http://localhost:3000/shared/" + shareToken;
            emailService.sendFileSharedNotification(
                    sharedWith.getEmail(),
                    sharedBy.getUsername(),
                    file.getName(),
                    shareLink
            );
        }

        activityLogService.log(sharedBy, ActivityLog.Action.SHARE, "FILE",
                file.getId(), file.getName());

        return share;
    }

    public List<SharedFile> getFilesSharedWithMe(User user) {
        return sharedFileRepository.findBySharedWith(user);
    }

    public List<SharedFile> getFilesSharedByMe(User user) {
        return sharedFileRepository.findBySharedBy(user);
    }

    public InputStream downloadSharedFile(String shareToken, User requestingUser) throws Exception {
        SharedFile share = sharedFileRepository.findByShareToken(shareToken)
                .orElseThrow(() -> new ResourceNotFoundException("Share link not found or expired"));

        // Check expiry
        if (share.getExpiresAt() != null && share.getExpiresAt().isBefore(java.time.LocalDateTime.now())) {
            throw new BadRequestException("Share link has expired");
        }

        // Check permissions
        if (!share.getIsPublic() && requestingUser != null
                && !share.getSharedWith().getId().equals(requestingUser.getId())) {
            throw new BadRequestException("Access denied");
        }

        if (share.getPermission() == SharedFile.Permission.VIEW) {
            throw new BadRequestException("Download not permitted for this share");
        }

        share.setAccessCount(share.getAccessCount() + 1);
        sharedFileRepository.save(share);

        FileEntity file = share.getFile();
        return storageService.retrieve(file.getStorageKey(), file.getIsEncrypted());
    }

    public FileEntity getSharedFileForView(String shareToken) {
        SharedFile share = sharedFileRepository.findByShareToken(shareToken)
                .orElseThrow(() -> new ResourceNotFoundException("Share link not found"));

        if (share.getExpiresAt() != null && share.getExpiresAt().isBefore(java.time.LocalDateTime.now())) {
            throw new BadRequestException("Share link has expired");
        }

        share.setAccessCount(share.getAccessCount() + 1);
        sharedFileRepository.save(share);
        return share.getFile();
    }

    @Transactional
    public void revokeShare(Long shareId, User user) {
        SharedFile share = sharedFileRepository.findById(shareId)
                .orElseThrow(() -> new ResourceNotFoundException("Share not found"));
        if (!share.getSharedBy().getId().equals(user.getId())) {
            throw new BadRequestException("Not authorized to revoke this share");
        }
        sharedFileRepository.delete(share);
        activityLogService.log(user, ActivityLog.Action.UNSHARE, "FILE",
                share.getFile().getId(), share.getFile().getName());
    }
}
