package com.example.jobassistant.controller;

import com.example.jobassistant.entity.User;
import com.example.jobassistant.repository.UserRepository;
import com.example.jobassistant.service.CustomUserDetails;
import com.example.jobassistant.util.EncryptionUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.view.RedirectView;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@Slf4j
public class GmailController {

    @Value("${spring.security.oauth2.client.registration.google.client-id}")
    private String clientId;

    @Value("${spring.security.oauth2.client.registration.google.client-secret}")
    private String clientSecret;

    @Value("${spring.security.oauth2.client.registration.google.redirect-uri}")
    private String redirectUri;

    @Value("${gmail.token.encryption.key}")
    private String encryptionKey;

    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @GetMapping("/api/gmail/connect")
    public ResponseEntity<?> getConnectUrl(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {
            User user = userDetails.getUser();
            String authUrl = UriComponentsBuilder.fromHttpUrl("https://accounts.google.com/o/oauth2/v2/auth")
                    .queryParam("client_id", clientId)
                    .queryParam("redirect_uri", redirectUri)
                    .queryParam("response_type", "code")
                    .queryParam("scope", "https://www.googleapis.com/auth/gmail.readonly")
                    .queryParam("access_type", "offline")
                    .queryParam("prompt", "consent")
                    .queryParam("state", user.getId().toString())
                    .build()
                    .toUriString();

            return ResponseEntity.ok(Map.of("url", authUrl));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to generate connection URL: " + e.getMessage());
        }
    }

    @GetMapping("/login/oauth2/code/google")
    public RedirectView oauthCallback(
            @RequestParam(value = "code", required = false) String code,
            @RequestParam(value = "state", required = false) String state,
            @RequestParam(value = "error", required = false) String error
    ) {
        if (error != null) {
            log.error("Google OAuth returned error: {}", error);
            return new RedirectView("http://localhost:5173/settings?gmail=error&message=" + URLEncoder.encode(error, StandardCharsets.UTF_8));
        }

        if (code == null || state == null) {
            log.error("Missing code or state in Google OAuth callback");
            return new RedirectView("http://localhost:5173/settings?gmail=error&message=missing_parameters");
        }

        try {
            Long userId = Long.parseLong(state);
            User user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                log.error("User not found for id: {}", state);
                return new RedirectView("http://localhost:5173/settings?gmail=error&message=user_not_found");
            }

            // Exchange authorization code for tokens
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            MultiValueMap<String, String> requestBody = new LinkedMultiValueMap<>();
            requestBody.add("code", code);
            requestBody.add("client_id", clientId);
            requestBody.add("client_secret", clientSecret);
            requestBody.add("redirect_uri", redirectUri);
            requestBody.add("grant_type", "authorization_code");

            HttpEntity<MultiValueMap<String, String>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<String> response = restTemplate.postForEntity("https://oauth2.googleapis.com/token", entity, String.class);

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                log.error("Failed to exchange code: Google token exchange returned status {}", response.getStatusCode());
                return new RedirectView("http://localhost:5173/settings?gmail=error&message=exchange_failed");
            }

            JsonNode root = objectMapper.readTree(response.getBody());
            String refreshToken = root.path("refresh_token").asText();

            if (refreshToken == null || refreshToken.trim().isEmpty()) {
                // If refresh token is missing, check if we already have one stored, or report error
                if (user.getGmailOauthTokenEncrypted() != null) {
                    log.warn("Google did not return a new refresh token, but we have one stored. Continuing...");
                    return new RedirectView("http://localhost:5173/settings?gmail=success");
                }
                log.error("Refresh token was not returned by Google. Ensure access_type=offline and prompt=consent are used.");
                return new RedirectView("http://localhost:5173/settings?gmail=error&message=missing_refresh_token");
            }

            // Encrypt and store the refresh token
            String encryptedToken = EncryptionUtils.encrypt(refreshToken, encryptionKey);
            user.setGmailOauthTokenEncrypted(encryptedToken);
            userRepository.save(user);

            log.info("Successfully connected Gmail OAuth for user ID: {}", userId);
            return new RedirectView("http://localhost:5173/settings?gmail=success");

        } catch (Exception e) {
            log.error("Exception during Google OAuth callback processing", e);
            return new RedirectView("http://localhost:5173/settings?gmail=error&message=" + URLEncoder.encode(e.getMessage(), StandardCharsets.UTF_8));
        }
    }

    @GetMapping("/api/gmail/status")
    public ResponseEntity<?> getGmailStatus(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {
            User user = userDetails.getUser();
            // Refresh user from database to ensure fresh state
            User freshUser = userRepository.findById(user.getId()).orElse(user);
            boolean connected = freshUser.getGmailOauthTokenEncrypted() != null && !freshUser.getGmailOauthTokenEncrypted().trim().isEmpty();
            return ResponseEntity.ok(Map.of("connected", connected));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to check connection status: " + e.getMessage());
        }
    }

    @DeleteMapping("/api/gmail/disconnect")
    public ResponseEntity<?> disconnectGmail(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {
            User user = userDetails.getUser();
            User freshUser = userRepository.findById(user.getId()).orElse(null);
            if (freshUser == null) {
                return ResponseEntity.notFound().build();
            }

            freshUser.setGmailOauthTokenEncrypted(null);
            userRepository.save(freshUser);

            log.info("Disconnected Gmail OAuth for user ID: {}", freshUser.getId());
            return ResponseEntity.ok(Map.of("message", "Gmail account disconnected successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to disconnect Gmail account: " + e.getMessage());
        }
    }
}
