package com.cloudstorage.repository;

import com.cloudstorage.entity.FileEntity;
import com.cloudstorage.entity.Folder;
import com.cloudstorage.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface FileRepository extends JpaRepository<FileEntity, Long> {

    List<FileEntity> findByOwnerAndIsDeletedFalse(User owner);

    List<FileEntity> findByOwnerAndFolderAndIsDeletedFalse(User owner, Folder folder);

    List<FileEntity> findByOwnerAndFolderIsNullAndIsDeletedFalse(User owner);

    List<FileEntity> findByFolder(Folder folder);

    Page<FileEntity> findByOwnerAndIsDeletedFalse(User owner, Pageable pageable);

    @Query("SELECT f FROM FileEntity f WHERE f.owner = :owner AND f.isDeleted = false " +
           "AND (LOWER(f.name) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(f.originalName) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<FileEntity> searchByName(@Param("owner") User owner, @Param("query") String query);

    @Query("SELECT f FROM FileEntity f WHERE f.owner = :owner AND f.isDeleted = false " +
           "AND f.fileType = :fileType")
    List<FileEntity> findByFileType(@Param("owner") User owner, @Param("fileType") String fileType);

    @Query("SELECT f FROM FileEntity f WHERE f.owner = :owner AND f.isDeleted = false " +
           "ORDER BY f.updatedAt DESC")
    List<FileEntity> findRecentFiles(@Param("owner") User owner, Pageable pageable);

    List<FileEntity> findByOwnerAndIsDeletedTrue(User owner);

    @Query("SELECT SUM(f.fileSize) FROM FileEntity f WHERE f.owner = :owner AND f.isDeleted = false")
    Long getTotalStorageUsed(@Param("owner") User owner);

    @Query("SELECT f.fileType, COUNT(f), SUM(f.fileSize) FROM FileEntity f " +
           "WHERE f.owner = :owner AND f.isDeleted = false GROUP BY f.fileType")
    List<Object[]> getStorageByFileType(@Param("owner") User owner);

    @Query("SELECT COUNT(f) FROM FileEntity f WHERE f.owner = :owner AND f.isDeleted = false")
    Long countByOwner(@Param("owner") User owner);

    @Query("SELECT COUNT(f) FROM FileEntity f WHERE f.createdAt BETWEEN :start AND :end")
    Long countUploadsInPeriod(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT f FROM FileEntity f WHERE f.name = :name AND f.owner = :owner AND f.isDeleted = :isDeleted")
    Optional<FileEntity> findByNameAndOwnerAndIsDeleted(@Param("name") String name, @Param("owner") User owner, @Param("isDeleted") boolean isDeleted);

    @Query("SELECT f FROM FileEntity f WHERE f.checksum = :checksum AND f.owner = :owner AND f.isDeleted = :isDeleted")
    Optional<FileEntity> findByChecksumAndOwnerAndIsDeleted(@Param("checksum") String checksum, @Param("owner") User owner, @Param("isDeleted") boolean isDeleted);

    Optional<FileEntity> findByIdAndOwner(Long id, User owner);

    @Query("SELECT f FROM FileEntity f WHERE f.isDeleted = true AND f.deletedAt < :expiryDate")
    List<FileEntity> findExpiredFiles(@Param("expiryDate") LocalDateTime expiryDate);

    @Query("SELECT f FROM FileEntity f JOIN FETCH f.owner LEFT JOIN FETCH f.folder LEFT JOIN FETCH f.aiMetadata")
    List<FileEntity> findAllEager();

    void deleteAllByOwner(User owner);
}
