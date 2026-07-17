package com.cloudstorage.repository;

import com.cloudstorage.entity.FileDuplicate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FileDuplicateRepository extends JpaRepository<FileDuplicate, Long> {
    List<FileDuplicate> findByOriginalFileIdOrDuplicateFileId(Long originalFileId, Long duplicateFileId);
}
