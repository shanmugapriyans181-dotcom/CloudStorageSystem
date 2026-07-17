package com.cloudstorage.config;

import com.cloudstorage.entity.User;
import com.cloudstorage.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.findByEmail("admin@cloudstorage.com").isEmpty()) {
            User admin = User.builder()
                    .username("admin")
                    .email("admin@cloudstorage.com")
                    .password(passwordEncoder.encode("Admin@1234"))
                    .fullName("System Administrator")
                    .role(User.Role.ADMIN)
                    .isActive(true)
                    .isEmailVerified(true)
                    .storageQuota(1000L * 1024 * 1024 * 1024) // 1 TB for admin
                    .build();
            userRepository.save(admin);
            log.info("Initialized default system administrator user: admin@cloudstorage.com");
        }

        // Align all existing users' quotas to their plan types
        Iterable<User> users = userRepository.findAll();
        for (User u : users) {
            if (u.getRole() == User.Role.ADMIN) continue;
            
            String planName = u.getPlan() != null ? u.getPlan().toUpperCase() : "FREE";
            long quota;
            if ("PRO".equals(planName) || "GO_PRO".equals(planName)) {
                quota = 150L * 1024 * 1024 * 1024; // 150 GB
                planName = "PRO";
            } else if ("ENTERPRISE".equals(planName)) {
                quota = 1000L * 1024 * 1024 * 1024; // 1 TB
            } else {
                quota = 5L * 1024 * 1024 * 1024; // 5 GB
                planName = "FREE";
            }
            
            u.setPlan(planName);
            u.setStorageQuota(quota);
            userRepository.save(u);
        }
        log.info("Aligned existing user storage quotas to updated plan limits (FREE=5GB, PRO=150GB, ENTERPRISE=1TB)");
    }
}
