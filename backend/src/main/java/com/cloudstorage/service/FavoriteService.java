package com.cloudstorage.service;

import com.cloudstorage.dto.FileDto;
import com.cloudstorage.entity.Favorite;
import com.cloudstorage.entity.FileEntity;
import com.cloudstorage.entity.User;
import com.cloudstorage.repository.FavoriteRepository;
import com.cloudstorage.repository.FileRepository;
import com.cloudstorage.repository.FileAiMetadataRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;
    private final FileRepository fileRepository;
    private final FileAiMetadataRepository fileAiMetadataRepository;

    @Transactional
    public void addFavorite(User user, Long fileId) {
        FileEntity file = fileRepository.findById(fileId)
                .orElseThrow(() -> new IllegalArgumentException("File not found"));
        if (!file.getOwner().getId().equals(user.getId()) && !user.getRole().name().equals("ADMIN")) {
            throw new SecurityException("Unauthorized access to this file");
        }
        if (!favoriteRepository.existsByUserIdAndFileId(user.getId(), fileId)) {
            Favorite favorite = Favorite.builder()
                    .user(user)
                    .file(file)
                    .build();
            favoriteRepository.save(favorite);
        }
    }

    @Transactional
    public void removeFavorite(User user, Long fileId) {
        if (favoriteRepository.existsByUserIdAndFileId(user.getId(), fileId)) {
            favoriteRepository.deleteByUserIdAndFileId(user.getId(), fileId);
        }
    }

    @Transactional(readOnly = true)
    public List<FileDto> getFavorites(User user) {
        List<Favorite> favorites = favoriteRepository.findByUserId(user.getId());
        return favorites.stream()
                .map(fav -> {
                    FileEntity file = fav.getFile();
                    var aiMeta = fileAiMetadataRepository.findByFileId(file.getId()).orElse(null);
                    return FileDto.from(file, aiMeta, true);
                })
                .collect(Collectors.toList());
    }

    public boolean isFavorite(Long userId, Long fileId) {
        return favoriteRepository.existsByUserIdAndFileId(userId, fileId);
    }
}
