package com.example.jobassistant.service;

import com.example.jobassistant.util.EncryptionUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class GmailReadService {

    @Value("${spring.security.oauth2.client.registration.google.client-id}")
    private String clientId;

    @Value("${spring.security.oauth2.client.registration.google.client-secret}")
    private String clientSecret;

    @Value("${gmail.token.encryption.key}")
    private String encryptionKey;

    private final ObjectMapper objectMapper;

    /**
     * Obtains a fresh Google OAuth2 access token using the user's encrypted refresh token.
     */
    private String refreshAccessToken(String encryptedRefreshToken) throws Exception {
        String refreshToken = EncryptionUtils.decrypt(encryptedRefreshToken, encryptionKey);
        
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> requestBody = new LinkedMultiValueMap<>();
        requestBody.add("client_id", clientId);
        requestBody.add("client_secret", clientSecret);
        requestBody.add("refresh_token", refreshToken);
        requestBody.add("grant_type", "refresh_token");

        HttpEntity<MultiValueMap<String, String>> entity = new HttpEntity<>(requestBody, headers);
        
        try {
            ResponseEntity<String> response = restTemplate.postForEntity("https://oauth2.googleapis.com/token", entity, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                return root.path("access_token").asText();
            }
        } catch (HttpClientErrorException ex) {
            if (ex.getStatusCode().value() == 400 || ex.getStatusCode().value() == 401) {
                throw new IllegalStateException("Gmail reconnection needed");
            }
            throw ex;
        }
        
        throw new RuntimeException("Google token refresh did not return a successful code or token");
    }

    /**
     * Queries Gmail API for recent messages containing the company name received after the application submission date.
     * Returns a list of message previews (up to 5).
     */
    public List<Map<String, String>> fetchRelevantEmails(String encryptedRefreshToken, String companyName, LocalDateTime submittedAt) throws Exception {
        String accessToken = refreshAccessToken(encryptedRefreshToken);
        
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        
        // Format query: q="Company Name" after:YYYY/MM/DD
        String formattedDate = submittedAt.toLocalDate().toString().replace("-", "/");
        String query = "\"" + companyName + "\" after:" + formattedDate;
        
        String listUrl = UriComponentsBuilder.fromHttpUrl("https://gmail.googleapis.com/gmail/v1/users/me/messages")
                .queryParam("q", query)
                .queryParam("maxResults", 5)
                .build()
                .toUriString();
        
        HttpEntity<?> entity = new HttpEntity<>(headers);
        ResponseEntity<String> response = restTemplate.exchange(listUrl, HttpMethod.GET, entity, String.class);
        
        List<Map<String, String>> messagePreviews = new ArrayList<>();
        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            return messagePreviews;
        }
        
        JsonNode root = objectMapper.readTree(response.getBody());
        JsonNode messagesNode = root.path("messages");
        
        if (messagesNode.isMissingNode() || !messagesNode.isArray()) {
            return messagePreviews;
        }
        
        for (JsonNode msgSummary : messagesNode) {
            String messageId = msgSummary.path("id").asText();
            if (messageId == null || messageId.trim().isEmpty()) {
                continue;
            }
            
            try {
                String detailUrl = "https://gmail.googleapis.com/gmail/v1/users/me/messages/" + messageId;
                ResponseEntity<String> detailResponse = restTemplate.exchange(detailUrl, HttpMethod.GET, entity, String.class);
                if (detailResponse.getStatusCode().is2xxSuccessful() && detailResponse.getBody() != null) {
                    JsonNode msgDetail = objectMapper.readTree(detailResponse.getBody());
                    String snippet = msgDetail.path("snippet").asText();
                    
                    // Retrieve Subject header
                    String subject = "No Subject";
                    JsonNode headersNode = msgDetail.path("payload").path("headers");
                    if (headersNode.isArray()) {
                        for (JsonNode header : headersNode) {
                            if ("Subject".equalsIgnoreCase(header.path("name").asText())) {
                                subject = header.path("value").asText();
                                break;
                            }
                        }
                    }
                    
                    Map<String, String> preview = new HashMap<>();
                    preview.put("id", messageId);
                    preview.put("subject", subject);
                    preview.put("snippet", snippet);
                    messagePreviews.add(preview);
                }
            } catch (Exception e) {
                log.error("Failed to fetch message details for message ID: " + messageId, e);
            }
        }
        
        return messagePreviews;
    }
}
