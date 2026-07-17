package com.cloudstorage.dto;

import com.cloudstorage.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {
    private Long id;
    private String username;
    private String email;
    private String fullName;
    private String profilePicture;
    private User.Role role;
    private Long storageQuota;
    private Long storageUsed;
    private String plan;
    private String previousPlan;
    private Boolean isActive;
    private Boolean isOnline;
    private LocalDateTime lastLogin;
    private LocalDateTime createdAt;
    private String provider;

    public static UserDto from(User user) {
        // Consider online if heartbeat received within last 2 minutes
        boolean online = user.getLastHeartbeat() != null
                && user.getLastHeartbeat().isAfter(LocalDateTime.now().minusMinutes(2));
        return UserDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .profilePicture(user.getProfilePicture())
                .role(user.getRole())
                .storageQuota(user.getStorageQuota())
                .storageUsed(user.getStorageUsed())
                .plan(user.getPlan())
                .previousPlan(user.getPreviousPlan())
                .isActive(user.getIsActive())
                .isOnline(online)
                .lastLogin(user.getLastLogin())
                .createdAt(user.getCreatedAt())
                .provider(user.getProvider())
                .build();
    }
}
