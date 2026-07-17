package com.cloudstorage.service;

import com.cloudstorage.entity.ActivityLog;
import com.cloudstorage.entity.User;
import com.cloudstorage.repository.ActivityLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ActivityLogService {

    private final ActivityLogRepository activityLogRepository;

    @Async
    public void log(User user, ActivityLog.Action action, String resourceType,
                    Long resourceId, String resourceName, String details,
                    HttpServletRequest request, Long fileSize) {
        ActivityLog log = ActivityLog.builder()
                .user(user)
                .action(action)
                .resourceType(resourceType)
                .resourceId(resourceId)
                .resourceName(resourceName)
                .details(details)
                .ipAddress(getClientIp(request))
                .userAgent(request != null ? request.getHeader("User-Agent") : null)
                .fileSize(fileSize)
                .build();
        activityLogRepository.save(log);
    }

    @Async
    public void log(User user, ActivityLog.Action action, String resourceType,
                    Long resourceId, String resourceName) {
        log(user, action, resourceType, resourceId, resourceName, null, null, null);
    }

    public Page<ActivityLog> getUserLogs(User user, Pageable pageable) {
        return activityLogRepository.findByUserOrderByCreatedAtDesc(user, pageable);
    }

    public Page<ActivityLog> getAllLogs(Pageable pageable) {
        return activityLogRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    public List<ActivityLog> getLogsByDateRange(LocalDateTime start, LocalDateTime end) {
        return activityLogRepository.findByDateRange(start, end);
    }

    public Long countUploads(LocalDateTime start, LocalDateTime end) {
        return activityLogRepository.countUploads(start, end);
    }

    public Long countDownloads(LocalDateTime start, LocalDateTime end) {
        return activityLogRepository.countDownloads(start, end);
    }

    public List<Object[]> getDailyStats(ActivityLog.Action action, LocalDateTime since) {
        return activityLogRepository.getDailyStats(action, since);
    }

    private String getClientIp(HttpServletRequest request) {
        if (request == null) return null;
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty()) {
            ip = request.getRemoteAddr();
        }
        return ip;
    }
}
