package com.cloudstorage.repository;

import com.cloudstorage.entity.FileAiMetadata;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FileAiMetadataRepository extends JpaRepository<FileAiMetadata, Long> {
    Optional<FileAiMetadata> findByFileId(Long fileId);
    List<FileAiMetadata> findByCategory(String category);
    List<FileAiMetadata> findByIsDuplicate(Boolean isDuplicate);
    List<FileAiMetadata> findByFileOwnerId(Long ownerId);
    List<FileAiMetadata> findBySimilarityHash(String similarityHash);
}
