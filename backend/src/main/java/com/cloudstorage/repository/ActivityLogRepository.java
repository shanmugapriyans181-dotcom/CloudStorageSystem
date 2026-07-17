package com.cloudstorage.repository;

import com.cloudstorage.entity.ActivityLog;
import com.cloudstorage.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {

    Page<ActivityLog> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);

    Page<ActivityLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT a FROM ActivityLog a WHERE " +
           "LOWER(a.user.username) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(COALESCE(a.user.fullName, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(CAST(a.action AS string)) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(COALESCE(a.resourceName, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(COALESCE(a.ipAddress, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "CAST(FUNCTION('DATE_FORMAT', a.createdAt, '%d/%m/%Y %H:%i:%s') AS string) LIKE CONCAT('%', :search, '%') OR " +
           "CAST(FUNCTION('DATE_FORMAT', a.createdAt, '%Y-%m-%d %H:%i:%s') AS string) LIKE CONCAT('%', :search, '%') OR " +
           "CAST(FUNCTION('DATE_FORMAT', a.createdAt, '%M') AS string) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<ActivityLog> searchLogs(@Param("search") String search, Pageable pageable);

    @Query("SELECT a FROM ActivityLog a WHERE a.createdAt BETWEEN :start AND :end ORDER BY a.createdAt DESC")
    List<ActivityLog> findByDateRange(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT a.action, COUNT(a) FROM ActivityLog a WHERE a.user = :user GROUP BY a.action")
    List<Object[]> getActionCountsByUser(@Param("user") User user);

    @Query("SELECT SUM(a.fileSize) FROM ActivityLog a WHERE a.action = 'UPLOAD' " +
           "AND a.createdAt BETWEEN :start AND :end")
    Long getTotalUploadedSize(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(a) FROM ActivityLog a WHERE a.action = 'DOWNLOAD' " +
           "AND a.createdAt BETWEEN :start AND :end")
    Long countDownloads(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(a) FROM ActivityLog a WHERE a.action = 'UPLOAD' " +
           "AND a.createdAt BETWEEN :start AND :end")
    Long countUploads(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT DATE(a.createdAt), COUNT(a) FROM ActivityLog a " +
           "WHERE a.action = :action AND a.createdAt >= :since GROUP BY DATE(a.createdAt)")
    List<Object[]> getDailyStats(@Param("action") ActivityLog.Action action, @Param("since") LocalDateTime since);
}
