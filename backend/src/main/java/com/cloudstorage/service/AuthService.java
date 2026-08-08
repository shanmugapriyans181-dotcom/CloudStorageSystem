package com.cloudstorage.service;

import com.cloudstorage.dto.AuthRequest;
import com.cloudstorage.dto.AuthResponse;
import com.cloudstorage.dto.UserDto;
import com.cloudstorage.entity.ActivityLog;
import com.cloudstorage.entity.User;
import com.cloudstorage.exception.BadRequestException;
import com.cloudstorage.exception.ResourceNotFoundException;
import com.cloudstorage.repository.UserRepository;
import com.cloudstorage.security.JwtTokenProvider;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final ActivityLogService activityLogService;
    private final EmailService emailService;

    @Value("${app.default-storage-quota}")
    private Long defaultStorageQuota;

    @Value("${app.google-client-id:}")
    private String googleClientId;

    @Transactional
    public AuthResponse register(AuthRequest.Register request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already in use");
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BadRequestException("Username already taken");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .storageQuota(defaultStorageQuota)
                .build();

        user = userRepository.save(user);
        emailService.sendWelcomeEmail(user.getEmail(), user.getUsername());

        String accessToken = tokenProvider.generateTokenFromUsername(user.getEmail(), "USER");
        String refreshToken = tokenProvider.generateRefreshToken(user.getEmail());

        activityLogService.log(user, ActivityLog.Action.REGISTER, "USER", user.getId(), user.getUsername());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .user(UserDto.from(user))
                .build();
    }

    @Transactional
    public AuthResponse login(AuthRequest.Login request, HttpServletRequest httpRequest) {
        String identifier = request.getUsernameOrEmail();
        boolean exists = userRepository.existsByEmail(identifier) || userRepository.existsByUsername(identifier);
        if (!exists) {
            throw new BadRequestException("No account found. Please sign up first.");
        }

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsernameOrEmail(), request.getPassword())
        );

        String accessToken = tokenProvider.generateToken(authentication);
        String refreshToken = tokenProvider.generateRefreshToken(
                authentication.getName()
        );

        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setLastLogin(LocalDateTime.now());
        user.setIsOnline(true);
        userRepository.save(user);

        activityLogService.log(user, ActivityLog.Action.LOGIN, "USER", user.getId(),
                user.getUsername(), null, httpRequest, null);

        // Send login notification email
        emailService.sendLoginNotificationEmail(user.getEmail(), user.getUsername(), "Password");

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .user(UserDto.from(user))
                .build();
    }

    public AuthResponse refreshToken(String refreshToken) {
        if (!tokenProvider.validateToken(refreshToken)) {
            throw new BadRequestException("Invalid refresh token");
        }
        String username = tokenProvider.getUsernameFromToken(refreshToken);
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String newAccessToken = tokenProvider.generateTokenFromUsername(username, user.getRole().name());
        String newRefreshToken = tokenProvider.generateRefreshToken(username);

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .user(UserDto.from(user))
                .build();
    }

    @Transactional
    public void changePassword(User user, AuthRequest.ChangePassword request) {
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        activityLogService.log(user, ActivityLog.Action.CHANGE_PASSWORD, "USER", user.getId(), user.getUsername());
    }

    public String getGoogleClientId() {
        return googleClientId;
    }

    @Transactional
    public AuthResponse googleLogin(String idToken, HttpServletRequest httpRequest) {
        String url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken;
        org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
        try {
            java.util.Map<String, Object> response = restTemplate.getForObject(url, java.util.Map.class);
            if (response == null || !response.containsKey("email")) {
                throw new BadRequestException("Invalid Google ID Token");
            }

            String aud = response.get("aud") != null ? String.valueOf(response.get("aud")) : "";
            if (googleClientId != null && !googleClientId.trim().isEmpty() && !googleClientId.equals(aud)) {
                log.warn("Google Client ID mismatch. Expected: {}, Got: {}", googleClientId, aud);
                if (!aud.contains("212001299605") && !aud.equalsIgnoreCase(googleClientId)) {
                    throw new BadRequestException("Google Client ID mismatch");
                }
            }

            String email = String.valueOf(response.get("email"));
            String name = response.get("name") != null ? String.valueOf(response.get("name")) : email.split("@")[0];
            String picture = response.get("picture") != null ? String.valueOf(response.get("picture")) : null;
            Object evObj = response.get("email_verified");
            boolean isEmailVerified = evObj != null && ("true".equalsIgnoreCase(String.valueOf(evObj)) || Boolean.TRUE.equals(evObj));

            if (!isEmailVerified) {
                throw new BadRequestException("Google email address is not verified");
            }

            User user = userRepository.findByEmail(email).orElseGet(() -> {
                // Generate a unique username
                String baseUsername = email.split("@")[0];
                String username = baseUsername;
                int counter = 1;
                while (userRepository.existsByUsername(username)) {
                    username = baseUsername + counter;
                    counter++;
                }

                User newUser = User.builder()
                        .username(username)
                        .email(email)
                        .fullName(name)
                        .profilePicture(picture)
                        .password(passwordEncoder.encode(java.util.UUID.randomUUID().toString()))
                        .storageQuota(defaultStorageQuota)
                        .role(User.Role.USER)
                        .isActive(true)
                        .provider("GOOGLE")
                        .build();
                User saved = userRepository.save(newUser);
                emailService.sendWelcomeEmail(saved.getEmail(), saved.getUsername());
                return saved;
            });

            if (!user.getIsActive()) {
                throw new BadRequestException("User account has been suspended by the administrator");
            }

            user.setLastLogin(LocalDateTime.now());
            userRepository.save(user);

            String accessToken = tokenProvider.generateTokenFromUsername(user.getEmail(), "USER");
            String refreshToken = tokenProvider.generateRefreshToken(user.getEmail());

            activityLogService.log(user, ActivityLog.Action.LOGIN, "USER", user.getId(),
                    user.getUsername() + " (via Google)", null, httpRequest, null);

            // Send login notification email for Google login
            emailService.sendLoginNotificationEmail(user.getEmail(), user.getUsername(), "Google");

            return AuthResponse.builder()
                    .accessToken(accessToken)
                    .refreshToken(refreshToken)
                    .user(UserDto.from(user))
                    .build();
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new BadRequestException("Google token verification failed: " + e.getMessage());
        }
    }

    public AuthResponse adminLogin(AuthRequest.AdminLogin request, HttpServletRequest httpRequest) {
        if (!"spcloud@gmail.com".equalsIgnoreCase(request.getEmail()) || !"spcloud123".equals(request.getPassword())) {
            throw new BadRequestException("Invalid Admin Credentials");
        }

        String accessToken = tokenProvider.generateTokenFromUsername("spcloud@gmail.com", "ADMIN");
        String refreshToken = tokenProvider.generateRefreshToken("spcloud@gmail.com");

        UserDto adminUser = UserDto.builder()
                .id(0L)
                .username("admin")
                .email("spcloud@gmail.com")
                .fullName("System Administrator")
                .role(User.Role.ADMIN)
                .isActive(true)
                .isOnline(true)
                .build();

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .user(adminUser)
                .build();
    }

    @Transactional
    public void forgotPassword(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("No account found with this email."));

        String otp = String.format("%06d", new java.util.Random().nextInt(999999));
        user.setOtpCode(otp);
        user.setOtpExpiry(LocalDateTime.now().plusMinutes(10));
        userRepository.save(user);

        emailService.sendOtpEmail(email, otp);
    }

    @Transactional
    public void resetPassword(String email, String otp, String newPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("No account found with this email."));

        if (user.getOtpCode() == null || !user.getOtpCode().equals(otp)) {
            throw new BadRequestException("Invalid OTP code");
        }

        if (user.getOtpExpiry() == null || user.getOtpExpiry().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Expired OTP code");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setOtpCode(null);
        user.setOtpExpiry(null);
        userRepository.save(user);
    }
}
