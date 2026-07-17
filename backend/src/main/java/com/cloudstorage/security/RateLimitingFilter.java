package com.cloudstorage.security;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class RateLimitingFilter implements Filter {

    // Simple Token Bucket per IP address
    private static class TokenBucket {
        private final long capacity;
        private double tokens;
        private long lastRefillTime;

        public TokenBucket(long capacity) {
            this.capacity = capacity;
            this.tokens = capacity;
            this.lastRefillTime = System.currentTimeMillis();
        }

        public synchronized boolean tryConsume() {
            refill();
            if (tokens >= 1.0) {
                tokens -= 1.0;
                return true;
            }
            return false;
        }

        private void refill() {
            long now = System.currentTimeMillis();
            long elapsed = now - lastRefillTime;
            if (elapsed > 0) {
                // Refill rate: capacity tokens per 60 seconds (1 minute)
                double refillAmount = elapsed * ((double) capacity / 60000.0);
                tokens = Math.min(capacity, tokens + refillAmount);
                lastRefillTime = now;
            }
        }
    }

    private final Map<String, TokenBucket> limiters = new ConcurrentHashMap<>();

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        String ip = getClientIp(httpRequest);
        String path = httpRequest.getRequestURI();

        // Admin paths do not undergo rate-limiting to support fast dashboard auto-refreshes
        if (path.startsWith("/api/admin")) {
            chain.doFilter(request, response);
            return;
        }

        // Stricter limit of 60 req/min for auth and AI endpoints, 300 req/min for general/file endpoints
        long capacity = (path.contains("/api/auth") || path.contains("/api/ai")) ? 60 : 300;

        TokenBucket bucket = limiters.computeIfAbsent(ip + ":" + (path.contains("/api/auth") || path.contains("/api/ai") ? "auth" : "gen"), 
                k -> new TokenBucket(capacity));

        if (!bucket.tryConsume()) {
            log.warn("Rate limit exceeded for IP: {} on URI: {}", ip, path);
            httpResponse.setStatus(429); // Too Many Requests
            httpResponse.setContentType("application/json");
            httpResponse.getWriter().write("{\"success\":false,\"message\":\"Rate limit exceeded. Please wait a minute.\"}");
            return;
        }

        chain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0].trim();
    }
}
