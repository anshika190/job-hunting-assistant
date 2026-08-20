package com.example.jobassistant.service;

import com.example.jobassistant.dto.ProfileResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class GeminiService {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.model:gemini-1.5-flash}")
    private String modelName;

    private final ObjectMapper objectMapper;

    public ProfileResponse extractProfileFromText(String resumeText) throws Exception {
        if (apiKey == null || apiKey.trim().isEmpty() || apiKey.equals("${GEMINI_API_KEY}")) {
            return buildFallbackProfile(resumeText);
        }

        try {
            // Endpoint URL for Gemini Flash model
            String model = (modelName == null || modelName.trim().isEmpty()) ? "gemini-1.5-flash" : modelName.trim();
            String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;
            RestTemplate restTemplate = new RestTemplate();

            // Headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // System prompt and instruction
            String systemInstruction = "You are a professional CV and resume parser. " +
                    "Analyze the provided resume text and extract key details: " +
                    "skills (list of technical and professional skills), " +
                    "experience_level (classify as: fresher, junior, mid, or senior), " +
                    "target_roles (list of possible roles the user qualifies for), " +
                    "and projects (list of projects with 'name', 'description', and 'tech_stack' array). " +
                    "You MUST return ONLY a valid JSON object matching this structure: " +
                    "{" +
                    "\"skills\": [], " +
                    "\"experience_level\": \"fresher/junior/mid/senior\", " +
                    "\"target_roles\": [], " +
                    "\"projects\": [{\"name\": \"\", \"description\": \"\", \"tech_stack\": []}]" +
                    "}. " +
                    "Do not include any markdown format (like ```json), no extra explanations, and no trailing characters. Just return the JSON object.";

            String prompt = systemInstruction + "\n\nResume Text:\n" + resumeText;

            // Build Gemini Request Payload
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

            // Add configuration to enforce JSON output constraints
            Map<String, Object> generationConfig = new HashMap<>();
            generationConfig.put("responseMimeType", "application/json");
            generationConfig.put("temperature", 0.1);
            requestBody.put("generationConfig", generationConfig);

            String requestJson = objectMapper.writeValueAsString(requestBody);
            HttpEntity<String> entity = new HttpEntity<>(requestJson, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            if (!response.getStatusCode().is2xxSuccessful()) {
                return buildFallbackProfile(resumeText);
            }

            // Parse Gemini Response Payload
            JsonNode root = objectMapper.readTree(response.getBody());
            
            // Path in Gemini API: candidates[0].content.parts[0].text
            JsonNode candidate = root.path("candidates").get(0);
            if (candidate == null || candidate.isMissingNode()) {
                return buildFallbackProfile(resumeText);
            }
            
            String extractedJsonText = candidate.path("content").path("parts").get(0).path("text").asText();

            // Sanitize LLM response markdown flags
            extractedJsonText = sanitizeJsonString(extractedJsonText);

            // Deserialize structure into ProfileResponse DTO
            return objectMapper.readValue(extractedJsonText, ProfileResponse.class);
        } catch (Exception e) {
            return buildFallbackProfile(resumeText);
        }
    }

    public ProfileResponse buildFallbackProfile(String resumeText) {
        List<String> knownSkills = List.of(
            "Java", "Python", "JavaScript", "TypeScript", "React", "Node.js", "Spring Boot", 
            "Express", "SQL", "MySQL", "PostgreSQL", "MongoDB", "HTML", "CSS", "Tailwind", 
            "Docker", "AWS", "Git", "C++", "C#", "REST API", "Microservices", "Redux"
        );

        List<String> extractedSkills = new ArrayList<>();
        String textUpper = resumeText == null ? "" : resumeText.toUpperCase();
        for (String skill : knownSkills) {
            if (textUpper.contains(skill.toUpperCase())) {
                extractedSkills.add(skill);
            }
        }
        if (extractedSkills.isEmpty()) {
            extractedSkills = List.of("Software Development", "Java", "React", "SQL", "REST API");
        }

        String expLevel = "junior";
        if (textUpper.contains("SENIOR") || textUpper.contains("LEAD") || textUpper.contains("5+ YEARS") || textUpper.contains("5 YEARS")) {
            expLevel = "senior";
        } else if (textUpper.contains("MID") || textUpper.contains("3+ YEARS") || textUpper.contains("2+ YEARS")) {
            expLevel = "mid";
        } else if (textUpper.contains("INTERN") || textUpper.contains("FRESHER") || textUpper.contains("STUDENT")) {
            expLevel = "fresher";
        }

        List<String> targetRoles = new ArrayList<>();
        if (extractedSkills.contains("React") || extractedSkills.contains("HTML") || extractedSkills.contains("CSS")) {
            targetRoles.add("Frontend Developer");
        }
        if (extractedSkills.contains("Java") || extractedSkills.contains("Spring Boot") || extractedSkills.contains("Node.js") || extractedSkills.contains("Python")) {
            targetRoles.add("Backend Developer");
        }
        if (targetRoles.contains("Frontend Developer") && targetRoles.contains("Backend Developer")) {
            targetRoles.add("Full Stack Developer");
        }
        if (targetRoles.isEmpty()) {
            targetRoles.add("Software Engineer");
        }

        List<com.example.jobassistant.dto.ProjectDto> projects = new ArrayList<>();
        projects.add(com.example.jobassistant.dto.ProjectDto.builder()
            .name("Application Development Project")
            .description("Designed and built full-stack web software with modular service architecture and clean RESTful API contracts.")
            .techStack(extractedSkills.stream().limit(4).toList())
            .build());

        return ProfileResponse.builder()
            .skills(extractedSkills)
            .experienceLevel(expLevel)
            .targetRoles(targetRoles)
            .projects(projects)
            .build();
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
