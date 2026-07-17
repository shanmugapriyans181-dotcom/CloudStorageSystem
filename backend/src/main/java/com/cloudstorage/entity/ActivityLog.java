package com.cloudstorage.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "activity_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false)
    private Action action;

    @Column(name = "resource_type", length = 50)
    private String resourceType; // FILE, FOLDER, USER

    @Column(name = "resource_id")
    private Long resourceId;

    @Column(name = "resource_name", length = 255)
    private String resourceName;

    @Column(name = "details", length = 1000)
    private String details;

    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Column(name = "file_size")
    private Long fileSize;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum Action {
        LOGIN, LOGOUT, REGISTER,
        UPLOAD, DOWNLOAD, DELETE, RESTORE,
        CREATE_FOLDER, RENAME, MOVE,
        SHARE, UNSHARE,
        VIEW, SEARCH,
        UPDATE_PROFILE, CHANGE_PASSWORD
    }
}
