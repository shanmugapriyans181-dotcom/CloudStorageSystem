package com.cloudstorage.repository;

import com.cloudstorage.entity.Favorite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    List<Favorite> findByUserId(Long userId);
    Optional<Favorite> findByUserIdAndFileId(Long userId, Long fileId);
    boolean existsByUserIdAndFileId(Long userId, Long fileId);
    void deleteByUserIdAndFileId(Long userId, Long fileId);
}
