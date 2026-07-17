package com.cloudstorage.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Async
    public void sendFileSharedNotification(String recipientEmail, String senderName,
                                            String fileName, String shareLink) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail, "Smart Cloud AI");
            helper.setTo(recipientEmail);
            helper.setSubject(senderName + " shared a file with you");
            helper.setText(buildShareEmailHtml(senderName, fileName, shareLink), true);
            mailSender.send(message);
            log.info("Share notification sent to {}", recipientEmail);
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", recipientEmail, e.getMessage());
        }
    }

    @Async
    public void sendWelcomeEmail(String recipientEmail, String username) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail, "Smart Cloud AI");
            helper.setTo(recipientEmail);
            helper.setReplyTo(fromEmail);
            helper.setSubject("Account Successfully Created - Smart Cloud AI");
            helper.setText("Hi " + username + ", your Smart Cloud AI account has been successfully created! You have 5 GB of free storage.",
                           buildWelcomeEmailHtml(username, recipientEmail));
            mailSender.send(message);
            log.info("Welcome email sent to {}", recipientEmail);
        } catch (Exception e) {
            log.error("Failed to send welcome email: {}", e.getMessage());
        }
    }

    @Async
    public void sendLoginNotificationEmail(String recipientEmail, String username, String loginMethod) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail, "Smart Cloud AI");
            helper.setTo(recipientEmail);
            helper.setReplyTo(fromEmail);
            helper.setSubject("Login Successful - Smart Cloud AI");
            helper.setText("Hi " + username + ", you have successfully logged in to your Smart Cloud AI account.",
                           buildLoginNotificationHtml(username, recipientEmail, loginMethod));
            mailSender.send(message);
            log.info("Login notification email sent to {}", recipientEmail);
        } catch (Exception e) {
            log.error("Failed to send login notification email to {}: {}", recipientEmail, e.getMessage());
        }
    }

    @Async
    public void sendOtpEmail(String recipientEmail, String otp) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail, "Smart Cloud AI");
            helper.setTo(recipientEmail);
            helper.setReplyTo(fromEmail);
            helper.setSubject("Your Password Reset Code - Smart Cloud AI");
            helper.setText("Your Smart Cloud AI password reset OTP is: " + otp + ". This code is valid for 10 minutes. Do not share it with anyone.",
                           buildOtpEmailHtml(otp, recipientEmail));
            mailSender.send(message);
            log.info("OTP email sent to {}", recipientEmail);
        } catch (Exception e) {
            log.error("Failed to send OTP email to {}: {}", recipientEmail, e.getMessage());
        }
    }

    private String buildShareEmailHtml(String senderName, String fileName, String shareLink) {
        return """
            <html><body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
            <div style="background: white; border-radius: 8px; padding: 30px; max-width: 500px; margin: 0 auto;">
              <h2 style="color: #4f46e5;">File Shared With You</h2>
              <p><strong>%s</strong> has shared a file with you.</p>
              <p>File: <strong>%s</strong></p>
              <a href="%s" style="background: #4f46e5; color: white; padding: 12px 24px;
                 text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">
                View File
              </a>
            </div></body></html>
            """.formatted(senderName, fileName, shareLink);
    }

    private String buildWelcomeEmailHtml(String username, String email) {
        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Welcome to Smart Cloud AI</title>
            </head>
            <body style="margin:0;padding:0;background:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:40px 0;">
                <tr>
                  <td align="center">
                    <table width="580" cellpadding="0" cellspacing="0" style="background:linear-gradient(145deg,#1a1a2e,#16213e);border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5);">

                      <!-- Header -->
                      <tr>
                        <td style="background:linear-gradient(135deg,#6d28d9,#4f46e5);padding:36px 40px;text-align:center;">
                          <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:16px;padding:14px 18px;margin-bottom:14px;">
                            <span style="font-size:36px;">☁️</span>
                          </div>
                          <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Smart Cloud AI</h1>
                          <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:12px;text-transform:uppercase;letter-spacing:2px;font-weight:600;">Intelligent File Hub</p>
                        </td>
                      </tr>

                      <!-- Body -->
                      <tr>
                        <td style="padding:40px 40px 30px;">
                          <!-- Success badge -->
                          <div style="text-align:center;margin-bottom:28px;">
                            <div style="display:inline-block;background:#22c55e20;border:1px solid #22c55e50;border-radius:50px;padding:10px 24px;">
                              <span style="color:#22c55e;font-weight:700;font-size:14px;">✅ Account Successfully Created</span>
                            </div>
                          </div>

                          <h2 style="color:#fff;font-size:22px;margin:0 0 10px;font-weight:700;">Welcome, <span style="color:#a78bfa;">%s</span>! 🎉</h2>
                          <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 24px;">
                            Your account has been <strong style="color:#c4b5fd;">successfully created</strong> on <strong style="color:#fff;">Smart Cloud AI</strong>.
                            You now have access to an intelligent, secure cloud storage platform powered by AI.
                          </p>

                          <!-- Account Info Card -->
                          <div style="background:#ffffff0d;border:1px solid #ffffff15;border-radius:14px;padding:20px 24px;margin-bottom:24px;">
                            <p style="margin:0 0 10px;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">Account Details</p>
                            <table width="100%%">
                              <tr>
                                <td style="color:#94a3b8;font-size:13px;padding:5px 0;">Username</td>
                                <td style="color:#e2e8f0;font-size:13px;font-weight:600;text-align:right;">%s</td>
                              </tr>
                              <tr>
                                <td style="color:#94a3b8;font-size:13px;padding:5px 0;">Email</td>
                                <td style="color:#e2e8f0;font-size:13px;font-weight:600;text-align:right;">%s</td>
                              </tr>
                              <tr>
                                <td style="color:#94a3b8;font-size:13px;padding:5px 0;">Free Storage</td>
                                <td style="color:#e2e8f0;font-size:13px;font-weight:600;text-align:right;">5 GB</td>
                              </tr>
                            </table>
                          </div>

                          <!-- Features -->
                          <div style="margin-bottom:28px;">
                            <p style="margin:0 0 14px;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">What You Can Do</p>
                            <div style="display:flex;flex-direction:column;gap:10px;">
                              <div style="background:#4f46e510;border-left:3px solid #6d28d9;border-radius:0 8px 8px 0;padding:12px 16px;">
                                <span style="color:#c4b5fd;font-size:13px;">🤖 <strong>AI-Powered Search</strong> – Find files instantly with natural language</span>
                              </div>
                              <div style="background:#4f46e510;border-left:3px solid #6d28d9;border-radius:0 8px 8px 0;padding:12px 16px;">
                                <span style="color:#c4b5fd;font-size:13px;">🔒 <strong>Secure Storage</strong> – End-to-end encrypted file management</span>
                              </div>
                              <div style="background:#4f46e510;border-left:3px solid #6d28d9;border-radius:0 8px 8px 0;padding:12px 16px;">
                                <span style="color:#c4b5fd;font-size:13px;">🔗 <strong>File Sharing</strong> – Share files with custom expiry links</span>
                              </div>
                            </div>
                          </div>

                          <!-- CTA Button -->
                          <div style="text-align:center;margin-bottom:10px;">
                            <a href="http://localhost:5173/login" style="display:inline-block;background:linear-gradient(135deg,#6d28d9,#4f46e5);color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:14px 40px;border-radius:12px;letter-spacing:0.3px;">
                              🚀 Go to Dashboard
                            </a>
                          </div>
                        </td>
                      </tr>

                      <!-- Yellow Important Section -->
                      <tr>
                        <td style="padding:0 40px 40px;">
                          <div style="background:linear-gradient(135deg,#fef08a,#fde047);border-radius:14px;padding:20px 24px;">
                            <p style="margin:0 0 8px;color:#713f12;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;font-weight:800;">⚠️ Important Information</p>
                            <ul style="margin:0;padding-left:18px;color:#92400e;font-size:13px;line-height:1.9;">
                              <li><strong>Keep your login credentials safe</strong> – never share your password with anyone.</li>
                              <li>Your free storage quota is <strong>5 GB</strong>. You can upgrade anytime from your dashboard.</li>
                              <li>If you did not create this account, please <strong>contact support immediately</strong>.</li>
                              <li>Enable two-factor authentication for <strong>enhanced account security</strong>.</li>
                            </ul>
                          </div>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="background:#ffffff05;border-top:1px solid #ffffff10;padding:20px 40px;text-align:center;">
                          <p style="margin:0;color:#475569;font-size:12px;">© 2025 Smart Cloud AI · All rights reserved</p>
                          <p style="margin:6px 0 0;color:#334155;font-size:11px;">This email was sent to <span style="color:#6d28d9;">%s</span></p>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(username, username, email, email);
    }

    private String buildLoginNotificationHtml(String username, String email, String loginMethod) {
        String methodBadge = "Google".equalsIgnoreCase(loginMethod)
            ? "<span style='background:#ea433520;color:#ea4335;border:1px solid #ea433540;border-radius:6px;padding:2px 10px;font-size:12px;font-weight:700;'>🔵 Google Sign-In</span>"
            : "<span style='background:#4f46e520;color:#818cf8;border:1px solid #4f46e540;border-radius:6px;padding:2px 10px;font-size:12px;font-weight:700;'>🔐 Password Login</span>";

        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Login Successful – Smart Cloud AI</title>
            </head>
            <body style="margin:0;padding:0;background:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:40px 0;">
                <tr>
                  <td align="center">
                    <table width="580" cellpadding="0" cellspacing="0" style="background:linear-gradient(145deg,#1a1a2e,#16213e);border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5);">

                      <!-- Header -->
                      <tr>
                        <td style="background:linear-gradient(135deg,#6d28d9,#4f46e5);padding:36px 40px;text-align:center;">
                          <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:16px;padding:14px 18px;margin-bottom:14px;">
                            <span style="font-size:36px;">☁️</span>
                          </div>
                          <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Smart Cloud AI</h1>
                          <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:12px;text-transform:uppercase;letter-spacing:2px;font-weight:600;">Intelligent File Hub</p>
                        </td>
                      </tr>

                      <!-- Body -->
                      <tr>
                        <td style="padding:40px 40px 30px;">
                          <!-- Success badge -->
                          <div style="text-align:center;margin-bottom:28px;">
                            <div style="display:inline-block;background:#22c55e20;border:1px solid #22c55e50;border-radius:50px;padding:10px 24px;">
                              <span style="color:#22c55e;font-weight:700;font-size:14px;">✅ Login Successfully</span>
                            </div>
                          </div>

                          <h2 style="color:#fff;font-size:22px;margin:0 0 10px;font-weight:700;">Hello, <span style="color:#a78bfa;">%s</span>! 👋</h2>
                          <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 24px;">
                            You have <strong style="color:#22c55e;">successfully logged in</strong> to your <strong style="color:#fff;">Smart Cloud AI</strong> account.
                            If this was you, no action is needed.
                          </p>

                          <!-- Login Details Card -->
                          <div style="background:#ffffff0d;border:1px solid #ffffff15;border-radius:14px;padding:20px 24px;margin-bottom:24px;">
                            <p style="margin:0 0 10px;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">Login Details</p>
                            <table width="100%%">
                              <tr>
                                <td style="color:#94a3b8;font-size:13px;padding:5px 0;">Account</td>
                                <td style="color:#e2e8f0;font-size:13px;font-weight:600;text-align:right;">%s</td>
                              </tr>
                              <tr>
                                <td style="color:#94a3b8;font-size:13px;padding:5px 0;">Email</td>
                                <td style="color:#e2e8f0;font-size:13px;font-weight:600;text-align:right;">%s</td>
                              </tr>
                              <tr>
                                <td style="color:#94a3b8;font-size:13px;padding:5px 0;">Login Method</td>
                                <td style="text-align:right;">%s</td>
                              </tr>
                            </table>
                          </div>

                          <!-- Warning -->
                          <div style="background:#ef444415;border:1px solid #ef444430;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
                            <p style="margin:0;color:#fca5a5;font-size:13px;line-height:1.6;">
                              🔴 <strong>Not you?</strong> If you did not initiate this login, please immediately
                              <strong>change your password</strong> and contact our support team.
                            </p>
                          </div>
                        </td>
                      </tr>

                      <!-- Yellow Important Section -->
                      <tr>
                        <td style="padding:0 40px 40px;">
                          <div style="background:linear-gradient(135deg,#fef08a,#fde047);border-radius:14px;padding:20px 24px;">
                            <p style="margin:0 0 8px;color:#713f12;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;font-weight:800;">⚠️ Security Reminder</p>
                            <ul style="margin:0;padding-left:18px;color:#92400e;font-size:13px;line-height:1.9;">
                              <li><strong>Never share your password</strong> or OTP codes with anyone, including support staff.</li>
                              <li>Always log out from <strong>shared or public devices</strong> after use.</li>
                              <li>If you notice suspicious activity, <strong>reset your password immediately</strong>.</li>
                              <li>Smart Cloud AI will <strong>never ask for your password</strong> via email or phone.</li>
                            </ul>
                          </div>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="background:#ffffff05;border-top:1px solid #ffffff10;padding:20px 40px;text-align:center;">
                          <p style="margin:0;color:#475569;font-size:12px;">© 2025 Smart Cloud AI · All rights reserved</p>
                          <p style="margin:6px 0 0;color:#334155;font-size:11px;">This email was sent to <span style="color:#6d28d9;">%s</span></p>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(username, username, email, methodBadge, email);
    }

    private String buildOtpEmailHtml(String otp, String email) {
        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Password Reset OTP – Smart Cloud AI</title>
            </head>
            <body style="margin:0;padding:0;background:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:40px 0;">
                <tr>
                  <td align="center">
                    <table width="580" cellpadding="0" cellspacing="0" style="background:linear-gradient(145deg,#1a1a2e,#16213e);border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5);">

                      <!-- Header -->
                      <tr>
                        <td style="background:linear-gradient(135deg,#6d28d9,#4f46e5);padding:36px 40px;text-align:center;">
                          <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:16px;padding:14px 18px;margin-bottom:14px;">
                            <span style="font-size:36px;">☁️</span>
                          </div>
                          <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Smart Cloud AI</h1>
                          <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:12px;text-transform:uppercase;letter-spacing:2px;font-weight:600;">Password Reset</p>
                        </td>
                      </tr>

                      <!-- Body -->
                      <tr>
                        <td style="padding:40px 40px 30px;">
                          <h2 style="color:#fff;font-size:22px;margin:0 0 10px;font-weight:700;">Password Reset Request 🔑</h2>
                          <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 28px;">
                            We received a request to reset the password for your <strong style="color:#fff;">Smart Cloud AI</strong> account.
                            Use the 6-digit OTP below to complete your password reset.
                          </p>

                          <!-- OTP Display -->
                          <div style="text-align:center;margin-bottom:28px;">
                            <p style="margin:0 0 12px;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">Your OTP Code</p>
                            <div style="display:inline-block;background:linear-gradient(135deg,#6d28d920,#4f46e520);border:2px solid #6d28d950;border-radius:16px;padding:20px 40px;">
                              <span style="font-size:44px;font-weight:900;color:#a78bfa;letter-spacing:14px;font-family:'Courier New',monospace;">%s</span>
                            </div>
                            <p style="margin:14px 0 0;color:#f59e0b;font-size:13px;font-weight:600;">⏱️ Valid for 10 minutes only</p>
                          </div>

                          <!-- Steps -->
                          <div style="background:#ffffff0d;border:1px solid #ffffff15;border-radius:14px;padding:20px 24px;margin-bottom:24px;">
                            <p style="margin:0 0 12px;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">How to Reset</p>
                            <div style="color:#94a3b8;font-size:13px;line-height:2;">
                              <p style="margin:0;">① Go to the <strong style="color:#c4b5fd;">Forgot Password</strong> page</p>
                              <p style="margin:0;">② Enter your email address</p>
                              <p style="margin:0;">③ Enter the OTP code above</p>
                              <p style="margin:0;">④ Set your <strong style="color:#c4b5fd;">new password</strong></p>
                            </div>
                          </div>
                        </td>
                      </tr>

                      <!-- Yellow Important Section -->
                      <tr>
                        <td style="padding:0 40px 40px;">
                          <div style="background:linear-gradient(135deg,#fef08a,#fde047);border-radius:14px;padding:20px 24px;">
                            <p style="margin:0 0 8px;color:#713f12;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;font-weight:800;">⚠️ Important Security Notice</p>
                            <ul style="margin:0;padding-left:18px;color:#92400e;font-size:13px;line-height:1.9;">
                              <li>This OTP is <strong>valid for 10 minutes only</strong> – do not delay.</li>
                              <li><strong>Do not share</strong> this code with anyone. Smart Cloud AI staff will never ask for it.</li>
                              <li>If you did not request a password reset, <strong>ignore this email</strong> – your account is safe.</li>
                              <li>After resetting, <strong>log out from all devices</strong> if you suspect unauthorized access.</li>
                            </ul>
                          </div>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="background:#ffffff05;border-top:1px solid #ffffff10;padding:20px 40px;text-align:center;">
                          <p style="margin:0;color:#475569;font-size:12px;">© 2025 Smart Cloud AI · All rights reserved</p>
                          <p style="margin:6px 0 0;color:#334155;font-size:11px;">This email was sent to <span style="color:#6d28d9;">%s</span></p>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(otp, email);
    }

    @Async
    public void sendPlanUpgradeEmail(String recipientEmail, String username, String newPlan, String storageLimit) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail, "Smart Cloud AI");
            helper.setTo(recipientEmail);
            helper.setReplyTo(fromEmail);
            helper.setSubject("Plan Upgraded Successfully - Smart Cloud AI");
            helper.setText("Hi " + username + ", your account has been successfully upgraded to the " + newPlan + " plan with " + storageLimit + " of storage.",
                           buildPlanUpgradeEmailHtml(username, recipientEmail, newPlan, storageLimit));
            mailSender.send(message);
            log.info("Plan upgrade confirmation email sent to {}", recipientEmail);
        } catch (Exception e) {
            log.error("Failed to send plan upgrade confirmation email: {}", e.getMessage());
        }
    }

    private String buildPlanUpgradeEmailHtml(String username, String email, String newPlan, String storageLimit) {
        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Plan Upgraded Successfully – Smart Cloud AI</title>
            </head>
            <body style="margin:0;padding:0;background:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:40px 0;">
                <tr>
                  <td align="center">
                    <table width="580" cellpadding="0" cellspacing="0" style="background:linear-gradient(145deg,#1a1a2e,#16213e);border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
                      <!-- Header -->
                      <tr>
                        <td style="background:linear-gradient(135deg,#6d28d9,#4f46e5);padding:36px 40px;text-align:center;">
                          <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:16px;padding:14px 18px;margin-bottom:14px;">
                            <span style="font-size:36px;">🚀</span>
                          </div>
                          <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Smart Cloud AI</h1>
                          <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:12px;text-transform:uppercase;letter-spacing:2px;font-weight:600;">Plan Upgrade</p>
                        </td>
                      </tr>
                      <!-- Body -->
                      <tr>
                        <td style="padding:40px 40px 30px;">
                          <div style="text-align:center;margin-bottom:28px;">
                            <div style="display:inline-block;background:#22c55e20;border:1px solid #22c55e50;border-radius:50px;padding:10px 24px;">
                              <span style="color:#22c55e;font-weight:700;font-size:14px;">🌟 Subscription Upgraded Successfully</span>
                            </div>
                          </div>
                          <h2 style="color:#fff;font-size:22px;margin:0 0 10px;font-weight:700;">Congratulations, <span style="color:#a78bfa;">%s</span>! 🎉</h2>
                          <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 24px;">
                            Your account storage limit has been <strong style="color:#a78bfa;">upgraded successfully</strong> to the <strong style="color:#fff;">%s Plan</strong>.
                            Enjoy expanded capabilities and cloud storage capacity.
                          </p>
                          <!-- Upgrade Details Card -->
                          <div style="background:#ffffff0d;border:1px solid #ffffff15;border-radius:14px;padding:20px 24px;margin-bottom:24px;">
                            <p style="margin:0 0 10px;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">New Storage Details</p>
                            <table width="100%%">
                              <tr>
                                <td style="color:#94a3b8;font-size:13px;padding:5px 0;">New Active Plan</td>
                                <td style="color:#a78bfa;font-size:13px;font-weight:700;text-align:right;text-transform:uppercase;">%s</td>
                              </tr>
                              <tr>
                                <td style="color:#94a3b8;font-size:13px;padding:5px 0;">New Storage Quota</td>
                                <td style="color:#e2e8f0;font-size:13px;font-weight:600;text-align:right;">%s</td>
                              </tr>
                              <tr>
                                <td style="color:#94a3b8;font-size:13px;padding:5px 0;">Billing Interval</td>
                                <td style="color:#e2e8f0;font-size:13px;font-weight:600;text-align:right;">Lifetime Access / Custom</td>
                              </tr>
                            </table>
                          </div>
                          <!-- CTA Button -->
                          <div style="text-align:center;margin-bottom:10px;">
                            <a href="http://localhost:5173/" style="display:inline-block;background:linear-gradient(135deg,#6d28d9,#4f46e5);color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:14px 40px;border-radius:12px;letter-spacing:0.3px;">
                              👉 Go to Dashboard
                            </a>
                          </div>
                        </td>
                      </tr>
                      <!-- Footer -->
                      <tr>
                        <td style="background:#ffffff05;border-top:1px solid #ffffff10;padding:20px 40px;text-align:center;">
                          <p style="margin:0;color:#475569;font-size:12px;">© 2025 Smart Cloud AI · All rights reserved</p>
                          <p style="margin:6px 0 0;color:#334155;font-size:11px;">This email was sent to <span style="color:#6d28d9;">%s</span></p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(username, newPlan, newPlan, storageLimit, email);
    }
}
