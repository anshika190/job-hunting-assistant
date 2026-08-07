package com.example.jobassistant.service;

import com.example.jobassistant.entity.JobMatch;
import com.example.jobassistant.entity.Profile;
import com.example.jobassistant.repository.JobMatchRepository;
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
public class EligibilityService {

    @Value("${gemini.api.key}")
    private String apiKey;

    private final JobMatchRepository jobMatchRepository;
    private final ObjectMapper objectMapper;
    private final FeedbackAnalysisService feedbackAnalysisService;

    public void scoreJobMatch(JobMatch jobMatch, Profile profile) throws Exception {
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

        String prompt = "You are an AI recruiter screening a candidate's profile against a specific job opportunity.\n\n" +
                "Candidate Profile:\n" +
                "- Experience Level: " + profile.getExperienceLevel() + "\n" +
                "- Skills: " + profile.getSkillsJson() + "\n" +
                "- Target Roles: " + profile.getTargetRolesJson() + "\n" +
                "- Projects: " + profile.getProjectsJson() + "\n\n" +
                "Job Opportunity Details:\n" +
                "- Role Title: " + jobMatch.getRoleTitle() + "\n" +
                "- Company: " + jobMatch.getCompany() + "\n" +
                "- Location: " + jobMatch.getLocation() + "\n\n" +
                "Evaluate the candidate's fit for this role. Classify the eligibility as:\n" +
                "1. 'eligible' - the candidate's skills and experience match the role's requirements well.\n" +
                "2. 'stretch' - the candidate meets some requirements but lacks others, or it is a level up.\n" +
                "3. 'not_eligible' - the candidate's profile does not align with the role at all.\n\n" +
                "You MUST return ONLY a valid JSON object matching this structure:\n" +
                "{\n" +
                "  \"eligibility\": \"eligible\" | \"stretch\" | \"not_eligible\",\n" +
                "  \"reasoning\": \"1-2 sentence explanation of why this classification was chosen.\"\n" +
                "}\n" +
                "Do not include any markdown format (like ```json), no extra explanations, and no trailing characters. Just return the JSON object.";

        // Append historical context note if enough data (>=3 outcomes) exists
        String contextNote = feedbackAnalysisService.getHistoricalContextNote(profile.getUser().getId());
        prompt += contextNote;

        // Build request body for Gemini
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
                break; // Succeeded, exit loop
            } catch (HttpStatusCodeException ex) {
                if (ex.getStatusCode().value() == 429 && retries > 0) {
                    log.warn("Gemini rate limit (429) hit. Waiting 2 seconds before retrying...");
                    Thread.sleep(2000);
                    retries--;
                } else {
                    throw ex; // Bubble up other exceptions or if we are out of retries
                }
            }
        }

        if (response == null || !response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("Gemini API call failed with no response or non-success code");
        }

        // Parse response
        JsonNode root = objectMapper.readTree(response.getBody());
        JsonNode candidate = root.path("candidates").get(0);
        if (candidate == null || candidate.isMissingNode()) {
            throw new RuntimeException("No candidates found in Gemini eligibility response");
        }

        String extractedJsonText = candidate.path("content").path("parts").get(0).path("text").asText();
        extractedJsonText = sanitizeJsonString(extractedJsonText);

        JsonNode resultNode = objectMapper.readTree(extractedJsonText);
        String eligibility = resultNode.path("eligibility").asText("unscored").trim().toLowerCase();
        String reasoning = resultNode.path("reasoning").asText("").trim();

        // Validate value
        if (!"eligible".equals(eligibility) && !"stretch".equals(eligibility) && !"not_eligible".equals(eligibility)) {
            eligibility = "stretch"; // Default fallback
        }

        // Save back to jobMatch
        jobMatch.setEligibility(eligibility);
        jobMatch.setReasoning(reasoning);
        jobMatchRepository.save(jobMatch);
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
