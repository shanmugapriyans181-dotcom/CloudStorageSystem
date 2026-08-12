package com.cloudstorage.config;

import com.cloudstorage.entity.User;
import com.cloudstorage.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final com.cloudstorage.repository.FileRepository fileRepository;
    private final PasswordEncoder passwordEncoder;

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // Auto-seed database from seed_old_data.sql if missing files in Railway DB
        if (fileRepository.count() == 0) {
            log.info("Seeding database with old records from seed_old_data.sql...");
            try {
                ClassPathResource resource = new ClassPathResource("seed_old_data.sql");
                if (resource.exists()) {
                    try (BufferedReader reader = new BufferedReader(
                            new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
                        String line;
                        while ((line = reader.readLine()) != null) {
                            line = line.trim();
                            if (line.isEmpty() || line.startsWith("--")) continue;
                            try {
                                entityManager.createNativeQuery(line).executeUpdate();
                            } catch (Exception e) {
                                log.warn("Query seed warning: {}", e.getMessage());
                            }
                        }
                    }
                    log.info("Successfully seeded database with old local records!");
                }
            } catch (Exception e) {
                log.error("Failed to seed old database records: {}", e.getMessage());
            }
        }

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

        userRepository.findByEmail("24ada54@karpagamtech.ac.in").ifPresent(user -> {
            user.setPassword(passwordEncoder.encode("User@1234"));
            userRepository.save(user);
            log.info("Reset password for 24ada54@karpagamtech.ac.in to User@1234");
        });

        userRepository.findByEmail("shanmugapriyans181@gmail.com").ifPresent(user -> {
            user.setPassword(passwordEncoder.encode("User@1234"));
            userRepository.save(user);
            log.info("Reset password for shanmugapriyans181@gmail.com to User@1234");
        });

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
