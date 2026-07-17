package com.cloudstorage.service;

import com.cloudstorage.dto.FolderDto;
import com.cloudstorage.entity.ActivityLog;
import com.cloudstorage.entity.Folder;
import com.cloudstorage.entity.FileEntity;
import com.cloudstorage.entity.User;
import com.cloudstorage.exception.ResourceNotFoundException;
import com.cloudstorage.repository.FolderRepository;
import com.cloudstorage.repository.FileRepository;
import com.cloudstorage.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FolderService {

    private final FolderRepository folderRepository;
    private final FileRepository fileRepository;
    private final StorageService storageService;
    private final UserRepository userRepository;
    private final ActivityLogService activityLogService;

    @Transactional
    public FolderDto createFolder(String name, Long parentId, User owner, String color) {
        Folder parent = null;
        String path = "/" + name;

        if (parentId != null) {
            parent = folderRepository.findByIdAndOwner(parentId, owner)
                    .orElseThrow(() -> new ResourceNotFoundException("Parent folder not found"));
            path = parent.getPath() + "/" + name;
        }

        Folder folder = Folder.builder()
                .name(name)
                .owner(owner)
                .parent(parent)
                .path(path)
                .color(color != null ? color : "#FFD700")
                .build();

        folder = folderRepository.save(folder);
        activityLogService.log(owner, ActivityLog.Action.CREATE_FOLDER, "FOLDER",
                folder.getId(), folder.getName());
        return FolderDto.from(folder);
    }

    public List<FolderDto> getRootFolders(User owner) {
        return folderRepository.findByOwnerAndParentIsNullAndIsDeletedFalse(owner)
                .stream().map(FolderDto::from).collect(Collectors.toList());
    }

    public List<FolderDto> getSubFolders(Long parentId, User owner) {
        Folder parent = folderRepository.findByIdAndOwner(parentId, owner)
                .orElseThrow(() -> new ResourceNotFoundException("Folder not found"));
        return folderRepository.findByOwnerAndParentAndIsDeletedFalse(owner, parent)
                .stream().map(FolderDto::from).collect(Collectors.toList());
    }

    public FolderDto getFolder(Long folderId, User owner) {
        Folder folder = folderRepository.findByIdAndOwner(folderId, owner)
                .orElseThrow(() -> new ResourceNotFoundException("Folder not found"));
        FolderDto dto = FolderDto.from(folder);
        dto.setSubFolders(
            folderRepository.findByOwnerAndParentAndIsDeletedFalse(owner, folder)
                .stream().map(FolderDto::from).collect(Collectors.toList())
        );
        return dto;
    }

    @Transactional
    public FolderDto renameFolder(Long folderId, String newName, User owner) {
        Folder folder = folderRepository.findByIdAndOwner(folderId, owner)
                .orElseThrow(() -> new ResourceNotFoundException("Folder not found"));
        folder.setName(newName);
        activityLogService.log(owner, ActivityLog.Action.RENAME, "FOLDER", folder.getId(), newName);
        return FolderDto.from(folderRepository.save(folder));
    }

    @Transactional
    public void deleteFolder(Long folderId, User owner) {
        Folder folder = folderRepository.findByIdAndOwner(folderId, owner)
                .orElseThrow(() -> new ResourceNotFoundException("Folder not found"));
        softDeleteFolder(folder);
        activityLogService.log(owner, ActivityLog.Action.DELETE, "FOLDER", folder.getId(), folder.getName());
    }

    private void softDeleteFolder(Folder folder) {
        folder.setIsDeleted(true);
        folder.setDeletedAt(LocalDateTime.now());
        
        // Mark all files in this folder as deleted
        List<FileEntity> files = fileRepository.findByFolder(folder);
        for (FileEntity file : files) {
            file.setIsDeleted(true);
            file.setDeletedAt(LocalDateTime.now());
            fileRepository.save(file);
        }

        // Recursively delete sub-folders
        for (Folder sub : folder.getSubFolders()) {
            softDeleteFolder(sub);
        }
        folderRepository.save(folder);
    }

    @Transactional
    public void permanentlyDeleteFolder(Long folderId, User owner) {
        Folder folder = folderRepository.findByIdAndOwner(folderId, owner)
                .orElseThrow(() -> new ResourceNotFoundException("Folder not found"));
        permanentlyDeleteFolderRecursive(folder, owner);
    }

    private void permanentlyDeleteFolderRecursive(Folder folder, User owner) {
        // Recursively delete subfolders first
        List<Folder> subFolders = new java.util.ArrayList<>(folder.getSubFolders());
        for (Folder sub : subFolders) {
            permanentlyDeleteFolderRecursive(sub, owner);
        }

        // Permanently delete files in this folder
        List<FileEntity> files = fileRepository.findByFolder(folder);
        for (FileEntity file : files) {
            try {
                storageService.delete(file.getStorageKey());
            } catch (Exception e) {
                // ignore storage delete errors
            }
            owner.setStorageUsed(Math.max(0, owner.getStorageUsed() - file.getFileSize()));
            fileRepository.delete(file);
        }
        userRepository.save(owner);
        folderRepository.delete(folder);
    }

    @Transactional
    public FolderDto restoreFolder(Long folderId, User owner) {
        Folder folder = folderRepository.findByIdAndOwner(folderId, owner)
                .orElseThrow(() -> new ResourceNotFoundException("Folder not found"));
        folder.setIsDeleted(false);
        folder.setDeletedAt(null);
        activityLogService.log(owner, ActivityLog.Action.RESTORE, "FOLDER", folder.getId(), folder.getName());
        return FolderDto.from(folderRepository.save(folder));
    }

    public List<FolderDto> getTrashFolders(User owner) {
        return folderRepository.findByOwnerAndIsDeletedTrue(owner)
                .stream().map(FolderDto::from).collect(Collectors.toList());
    }

    public List<FolderDto> searchFolders(User owner, String query) {
        return folderRepository.searchByName(owner, query)
                .stream().map(FolderDto::from).collect(Collectors.toList());
    }
}
