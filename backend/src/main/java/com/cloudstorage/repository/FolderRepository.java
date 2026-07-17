package com.cloudstorage.repository;

import com.cloudstorage.entity.Folder;
import com.cloudstorage.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FolderRepository extends JpaRepository<Folder, Long> {

    List<Folder> findByOwnerAndParentIsNullAndIsDeletedFalse(User owner);

    List<Folder> findByOwnerAndParentAndIsDeletedFalse(User owner, Folder parent);

    List<Folder> findByOwnerAndParent(User owner, Folder parent);

    List<Folder> findByOwnerAndIsDeletedTrue(User owner);

    Optional<Folder> findByIdAndOwner(Long id, User owner);

    Optional<Folder> findByNameAndOwnerAndIsDeletedFalse(String name, User owner);

    @Query("SELECT f FROM Folder f WHERE f.owner = :owner AND f.isDeleted = false " +
           "AND LOWER(f.name) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Folder> searchByName(@Param("owner") User owner, @Param("query") String query);

    @Query("SELECT COUNT(f) FROM Folder f WHERE f.owner = :owner AND f.isDeleted = false")
    Long countByOwner(@Param("owner") User owner);
}
