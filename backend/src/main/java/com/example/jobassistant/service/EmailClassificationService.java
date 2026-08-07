package com.example.jobassistant.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailClassificationService {

    @Value("${gemini.api.key}")
    private String apiKey;

    private final ObjectMapper objectMapper;

    public static class ClassificationResult {
        public String classification; // interview, assessment, rejection, no_action, no_match
        public String reasoning;
        public String gmailMessageId;
    }

    public ClassificationResult classifyEmails(String companyName, List<Map<String, String>> emails) throws Exception {
        ClassificationResult result = new ClassificationResult();
        result.classification = "no_match";
        result.reasoning = "No relevant updates found in retrieved emails.";
        result.gmailMessageId = null;

        if (emails == null || emails.isEmpty()) {
            return result;
        }

        if (apiKey == null || apiKey.trim().isEmpty() || apiKey.equals("${GEMINI_API_KEY}")) {
            throw new IllegalStateException("Gemini API key is not configured. Please set the GEMINI_API_KEY environment variable.");
        }

        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=" + apiKey;
        
        org.springframework.http.client.SimpleClientHttpRequestFactory requestFactory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5000);
        requestFactory.setReadTimeout(5000);
        RestTemplate restTemplate = new RestTemplate(requestFactory);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // Serialize emails list for the prompt
        StringBuilder emailsText = new StringBuilder();
        for (Map<String, String> email : emails) {
            emailsText.append("Message ID: ").append(email.get("id")).append("\n")
                    .append("Subject: ").append(email.get("subject")).append("\n")
                    .append("Snippet: ").append(email.get("snippet")).append("\n")
                    .append("--------------------------------------------------\n");
        }

        String prompt = "You are an AI assistant tracking application status updates from email notifications for a candidate.\n" +
                "Evaluate the recent emails received from or containing the company \"" + companyName + "\" and classify the application update status.\n\n" +
                "Email Messages:\n" + emailsText.toString() + "\n" +
                "Classify the status as one of:\n" +
                "1. 'interview' - The email indicates the candidate is invited to an interview, schedule selection, or next-round discussion.\n" +
                "2. 'assessment' - The email contains a test link, take-home task, hacking task, or assessment criteria to complete.\n" +
                "3. 'rejection' - The email explicitly indicates that the application has been rejected, declined, or they are moving forward with other candidates.\n" +
                "4. 'no_action' - The email is just a confirmation receipt (\"We received your application\") or newsletter, requiring no action or status change.\n" +
                "5. 'no_match' - None of the emails contain any update from this company or they correspond to completely unrelated topics.\n\n" +
                "If multiple emails are present, classify based on the most relevant, recent status update.\n\n" +
                "You MUST return ONLY a valid JSON object matching this structure:\n" +
                "{\n" +
                "  \"classification\": \"interview\" | \"assessment\" | \"rejection\" | \"no_action\" | \"no_match\",\n" +
                "  \"reasoning\": \"1-2 sentence explanation of why this classification was chosen.\",\n" +
                "  \"gmailMessageId\": \"the Message ID of the email that triggered this classification (or null if no_match or no_action)\"\n" +
                "}\n" +
                "Do not include any markdown format (like ```json), no extra explanations, and no trailing characters. Just return the JSON object.";

        Map<String, Object> requestBody = new HashMap<>();
        List<Map<String, Object>> contents = new ArrayList<>();
        Map<String, Object> contentMap = new HashMap<>();
        List<Map<String, String>> parts = new ArrayList<>();
        Map<String, String> partMap = new HashMap<>();
        partMap.put("text", prompt);
        parts.add(partMap);
        contentMap.put("parts", parts);
        contents.add(contentMap);
        requestBody.put("contents", contents);

        Map<String, Object> generationConfig = new HashMap<>();
        generationConfig.put("responseMimeType", "application/json");
        generationConfig.put("temperature", 0.1);
        requestBody.put("generationConfig", generationConfig);

        String requestJson = objectMapper.writeValueAsString(requestBody);
        HttpEntity<String> entity = new HttpEntity<>(requestJson, headers);

        int retries = 1;
        ResponseEntity<String> response = null;

        while (retries >= 0) {
            try {
                response = restTemplate.postForEntity(url, entity, String.class);
                break;
            } catch (HttpStatusCodeException ex) {
                if (ex.getStatusCode().value() == 429 && retries > 0) {
                    log.warn("Gemini rate limit (429) hit during email classification. Waiting 2 seconds...");
                    Thread.sleep(2000);
                    retries--;
                } else {
                    throw ex;
                }
            }
        }

        if (response == null || !response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("Gemini email classification call failed with no response or non-success code");
        }

        JsonNode root = objectMapper.readTree(response.getBody());
        JsonNode candidate = root.path("candidates").get(0);
        if (candidate == null || candidate.isMissingNode()) {
            throw new RuntimeException("No candidates found in Gemini classification response");
        }

        String extractedJsonText = candidate.path("content").path("parts").get(0).path("text").asText();
        extractedJsonText = sanitizeJsonString(extractedJsonText);

        JsonNode resultNode = objectMapper.readTree(extractedJsonText);
        result.classification = resultNode.path("classification").asText("no_match").trim().toLowerCase();
        result.reasoning = resultNode.path("reasoning").asText("").trim();
        result.gmailMessageId = resultNode.path("gmailMessageId").isNull() ? null : resultNode.path("gmailMessageId").asText(null);

        // Sanity validation of classification enum
        if (!List.of("interview", "assessment", "rejection", "no_action", "no_match").contains(result.classification)) {
            result.classification = "no_match";
        }

        return result;
    }

    private String sanitizeJsonString(String jsonStr) {
        jsonStr = jsonStr.trim();
        if (jsonStr.startsWith("```json")) {
            jsonStr = jsonStr.substring(7);
        } else if (jsonStr.startsWith("```")) {
            jsonStr = jsonStr.substring(3);
        }

        if (jsonStr.endsWith("```")) {
            jsonStr = jsonStr.substring(0, jsonStr.length() - 3);
        }
        return jsonStr.trim();
    }
}
