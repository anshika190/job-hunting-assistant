package com.example.jobassistant.service;

import com.example.jobassistant.entity.JobMatch;
import com.example.jobassistant.entity.TargetCompany;
import com.example.jobassistant.entity.User;
import com.example.jobassistant.repository.JobMatchRepository;
import com.example.jobassistant.repository.TargetCompanyRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class JobDiscoveryService {

    private final TargetCompanyRepository targetCompanyRepository;
    private final JobMatchRepository jobMatchRepository;
    private final ObjectMapper objectMapper;

    // Mapping for known company names to their Greenhouse slugs
    private static final Map<String, String> GREENHOUSE_MAPPINGS = new HashMap<>();
    static {
        // Core mappings required by the prompt
        GREENHOUSE_MAPPINGS.put("razorpay", "razorpaysoftwareprivatelimited");
        GREENHOUSE_MAPPINGS.put("postman", "postman");
        
        // Add other common tech slugs just in case
        GREENHOUSE_MAPPINGS.put("groww", "groww");
        GREENHOUSE_MAPPINGS.put("zomato", "zomato");
        GREENHOUSE_MAPPINGS.put("swiggy", "swiggy");
        GREENHOUSE_MAPPINGS.put("paytm", "paytm");
        GREENHOUSE_MAPPINGS.put("cred", "cred");
        GREENHOUSE_MAPPINGS.put("zerodha", "zerodha");
    }

    public int runDiscoveryForUser(User user) {
        // 1. Get all target companies where discovery_tier = 'tier_1'
        List<TargetCompany> targetCompanies = targetCompanyRepository.findByUserId(user.getId());
        
        int jobsDiscovered = 0;
        RestTemplate restTemplate = new RestTemplate();

        for (TargetCompany tc : targetCompanies) {
            if (!"tier_1".equalsIgnoreCase(tc.getDiscoveryTier())) {
                continue; // Skip Tier 2 companies
            }

            String companyName = tc.getCompanyName();
            String key = companyName.trim().toLowerCase();
            String slug = GREENHOUSE_MAPPINGS.get(key);

            if (slug == null) {
                log.info("No Greenhouse slug mapping found for target company '{}'. Skipping.", companyName);
                continue;
            }

            try {
                log.info("Fetching jobs from Greenhouse for '{}' using slug '{}'", companyName, slug);
                String url = "https://boards-api.greenhouse.io/v1/boards/" + slug + "/jobs";
                
                ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
                if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                    log.warn("Greenhouse API returned non-success code or empty body for company '{}'", companyName);
                    continue;
                }

                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode jobsNode = root.path("jobs");
                
                if (jobsNode.isArray()) {
                    for (JsonNode job : jobsNode) {
                        String roleTitle = job.path("title").asText("").trim();
                        String sourceUrl = job.path("absolute_url").asText("").trim();
                        
                        // Extract location name, default to "Unknown" if not found
                        String location = job.path("location").path("name").asText("").trim();
                        if (location.isEmpty()) {
                            location = "Remote / Multiple Locations";
                        }

                        if (roleTitle.isEmpty() || sourceUrl.isEmpty()) {
                            continue; // Skip invalid records
                        }

                        // Compute dedup_hash = SHA-256 of (company + role_title + location, lowercased and trimmed)
                        String rawConcat = (companyName.trim() + roleTitle + location).toLowerCase();
                        String dedupHash = computeSha256(rawConcat);

                        // Save only if dedup_hash doesn't already exist for this user
                        if (!jobMatchRepository.existsByUserIdAndDedupHash(user.getId(), dedupHash)) {
                            JobMatch jobMatch = JobMatch.builder()
                                    .user(user)
                                    .company(companyName)
                                    .roleTitle(roleTitle)
                                    .location(location)
                                    .sourceTier("tier_1")
                                    .sourceUrl(sourceUrl)
                                    .dedupHash(dedupHash)
                                    .build();
                            
                            jobMatchRepository.save(jobMatch);
                            jobsDiscovered++;
                        }
                    }
                }

            } catch (Exception e) {
                // Log and continue gracefully, don't crash the whole loop
                log.error("Error running job discovery for company '{}': {}", companyName, e.getMessage(), e);
            }
        }
        
        return jobsDiscovered;
    }

    private String computeSha256(String text) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(text.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception ex) {
            throw new RuntimeException("SHA-256 initialization failed", ex);
        }
    }
}
