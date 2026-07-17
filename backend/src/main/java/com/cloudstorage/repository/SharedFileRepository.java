package com.cloudstorage.repository;

import com.cloudstorage.entity.FileEntity;
import com.cloudstorage.entity.SharedFile;
import com.cloudstorage.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SharedFileRepository extends JpaRepository<SharedFile, Long> {

    List<SharedFile> findBySharedWith(User sharedWith);

    List<SharedFile> findBySharedBy(User sharedBy);

    List<SharedFile> findByFile(FileEntity file);

    Optional<SharedFile> findByShareToken(String shareToken);

    Optional<SharedFile> findByFileAndSharedWith(FileEntity file, User sharedWith);

    @Query("SELECT sf FROM SharedFile sf WHERE sf.sharedWith = :user OR (sf.isPublic = true AND sf.file.owner != :user)")
    List<SharedFile> findAllSharedWithUser(@Param("user") User user);

    boolean existsByFileAndSharedWith(FileEntity file, User sharedWith);
}
