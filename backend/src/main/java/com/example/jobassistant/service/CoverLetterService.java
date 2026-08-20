package com.example.jobassistant.service;

import com.example.jobassistant.entity.JobMatch;
import com.example.jobassistant.entity.Profile;
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
public class CoverLetterService {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.model:gemini-1.5-flash}")
    private String modelName;

    private final ObjectMapper objectMapper;

    public String generateCoverLetter(JobMatch jobMatch, Profile profile) throws Exception {
        if (apiKey == null || apiKey.trim().isEmpty() || apiKey.equals("${GEMINI_API_KEY}")) {
            throw new IllegalStateException("Gemini API key is not configured. Please set the GEMINI_API_KEY environment variable.");
        }

        String model = (modelName == null || modelName.trim().isEmpty()) ? "gemini-1.5-flash" : modelName.trim();
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;
        
        org.springframework.http.client.SimpleClientHttpRequestFactory requestFactory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(6000);
        requestFactory.setReadTimeout(12000); // 12 seconds read timeout for long text generation
        RestTemplate restTemplate = new RestTemplate(requestFactory);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        String prompt = "Write a concise, professional cover letter (3-4 short paragraphs, under 300 words total) tailored to this specific job opportunity.\n\n" +
                "Candidate Background Info:\n" +
                "- Experience Level: " + profile.getExperienceLevel() + "\n" +
                "- Skills: " + profile.getSkillsJson() + "\n" +
                "- Target Roles: " + profile.getTargetRolesJson() + "\n" +
                "- Key Projects: " + profile.getProjectsJson() + "\n\n" +
                "Job Opportunity Details:\n" +
                "- Role Title: " + jobMatch.getRoleTitle() + "\n" +
                "- Company: " + jobMatch.getCompany() + "\n" +
                "- Location: " + jobMatch.getLocation() + "\n\n" +
                "Requirements:\n" +
                "1. Explicitly reference specific real skills and/or projects from the candidate background. Do not invent details.\n" +
                "2. Maintain a highly professional, polite, and enthusiastic tone.\n" +
                "3. Keep it strictly under 300 words and make it 3-4 paragraphs.\n" +
                "4. Do not include placeholders like '[Date]', '[Recruiter Name]', or '[Insert Company Name Here]'. Write the actual details where known, or start directly with 'Dear Hiring Team at " + jobMatch.getCompany() + ",'.\n" +
                "5. Avoid clichés and empty filler text.";

        // Build request body for Gemini (text mode)
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
        generationConfig.put("temperature", 0.7);
        requestBody.put("generationConfig", generationConfig);

        String requestJson = objectMapper.writeValueAsString(requestBody);
        HttpEntity<String> entity = new HttpEntity<>(requestJson, headers);

        int retries = 1;
        ResponseEntity<String> response = null;

        while (retries >= 0) {
            try {
                response = restTemplate.postForEntity(url, entity, String.class);
                break; // Success
            } catch (HttpStatusCodeException ex) {
                if (ex.getStatusCode().value() == 429 && retries > 0) {
                    log.warn("Gemini rate limit (429) hit during cover letter generation. Retrying in 2 seconds...");
                    Thread.sleep(2000);
                    retries--;
                } else {
                    throw ex;
                }
            }
        }

        if (response == null || !response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("Gemini API call failed with no response or non-success code");
        }

        JsonNode root = objectMapper.readTree(response.getBody());
        JsonNode candidate = root.path("candidates").get(0);
        if (candidate == null || candidate.isMissingNode()) {
            throw new RuntimeException("No candidates found in Gemini response");
        }

        String letterText = candidate.path("content").path("parts").get(0).path("text").asText();
        if (letterText == null || letterText.trim().isEmpty()) {
            throw new RuntimeException("Empty cover letter text returned from Gemini");
        }

        return letterText.trim();
    }
}
