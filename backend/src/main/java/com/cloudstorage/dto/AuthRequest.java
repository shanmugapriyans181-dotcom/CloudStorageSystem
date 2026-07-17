package com.cloudstorage.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

public class AuthRequest {

    @Data
    public static class Register {
        @NotBlank
        @Size(min = 3, max = 50)
        private String username;

        @NotBlank
        @Email(message = "Must be a valid email address")
        @Pattern(
            regexp = "^[a-z0-9._%+\\-]+@[a-z0-9.\\-]+\\.[a-z]{2,}$",
            message = "Email must be all lowercase (e.g. user@example.com)"
        )
        private String email;

        @NotBlank
        @Size(min = 8, max = 100, message = "Password must be at least 8 characters")
        @Pattern(
            regexp = "^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\\\\|,.<>\\/?]).{8,}$",
            message = "Password must contain at least one uppercase letter and one special character"
        )
        private String password;

        @Size(max = 100)
        private String fullName;
    }

    @Data
    public static class Login {
        @NotBlank
        private String usernameOrEmail;

        @NotBlank
        private String password;
    }

    @Data
    public static class RefreshToken {
        @NotBlank
        private String refreshToken;
    }

    @Data
    public static class ChangePassword {
        @NotBlank
        private String currentPassword;

        @NotBlank
        @Size(min = 6)
        private String newPassword;
    }

    @Data
    public static class ForgotPassword {
        @NotBlank
        @Email
        private String email;
    }

    @Data
    public static class ResetPassword {
        @NotBlank
        @Email
        private String email;

        @NotBlank
        private String otp;

        @NotBlank
        @Size(min = 6)
        private String newPassword;
    }

    @Data
    public static class AdminLogin {
        @NotBlank
        @Email
        private String email;

        @NotBlank
        private String password;
    }
}
