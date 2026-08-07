package com.example.jobassistant.controller;

import com.example.jobassistant.dto.TargetCompanyRequest;
import com.example.jobassistant.dto.TargetCompanyResponse;
import com.example.jobassistant.entity.TargetCompany;
import com.example.jobassistant.entity.User;
import com.example.jobassistant.repository.TargetCompanyRepository;
import com.example.jobassistant.service.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/target-companies")
@RequiredArgsConstructor
public class TargetCompanyController {

    private final TargetCompanyRepository targetCompanyRepository;

    private static final List<Map<String, String>> SUGGESTIONS = Arrays.asList(
            // Tier 1 (direct API)
            createSuggestion("Razorpay", "tier_1"),
            createSuggestion("Postman", "tier_1"),
            createSuggestion("Groww", "tier_1"),
            createSuggestion("Zomato", "tier_1"),
            createSuggestion("Swiggy", "tier_1"),
            createSuggestion("Paytm", "tier_1"),
            createSuggestion("CRED", "tier_1"),
            createSuggestion("Zerodha", "tier_1"),

            // Tier 2 (email-alert)
            createSuggestion("Google", "tier_2"),
            createSuggestion("Microsoft", "tier_2"),
            createSuggestion("TCS", "tier_2"),
            createSuggestion("Wipro", "tier_2"),
            createSuggestion("Infosys", "tier_2"),
            createSuggestion("KPMG", "tier_2"),
            createSuggestion("Accenture", "tier_2"),
            createSuggestion("Cognizant", "tier_2"),
            createSuggestion("LinkedIn", "tier_2"),
            createSuggestion("Naukri", "tier_2"),
            createSuggestion("Amazon", "tier_2"),
            createSuggestion("Deloitte", "tier_2")
    );

    private static Map<String, String> createSuggestion(String name, String tier) {
        Map<String, String> map = new HashMap<>();
        map.put("companyName", name);
        map.put("discoveryTier", tier);
        return map;
    }

    @GetMapping("/suggestions")
    public ResponseEntity<List<Map<String, String>>> getSuggestions() {
        return ResponseEntity.ok(SUGGESTIONS);
    }

    @PostMapping
    public ResponseEntity<?> addTargetCompany(
            @RequestBody TargetCompanyRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {
            User user = userDetails.getUser();

            if (request.getCompanyName() == null || request.getCompanyName().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Company name is required");
            }
            if (request.getDiscoveryTier() == null || request.getDiscoveryTier().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Discovery tier is required");
            }

            String tier = request.getDiscoveryTier().trim().toLowerCase();
            if (!"tier_1".equals(tier) && !"tier_2".equals(tier)) {
                return ResponseEntity.badRequest().body("Invalid discovery tier. Must be tier_1 or tier_2");
            }

            String companyName = request.getCompanyName().trim();

            // Duplicate Validation
            if (targetCompanyRepository.existsByUserIdAndCompanyNameIgnoreCase(user.getId(), companyName)) {
                return ResponseEntity.badRequest().body("Company is already in your target list");
            }

            TargetCompany targetCompany = TargetCompany.builder()
                    .user(user)
                    .companyName(companyName)
                    .discoveryTier(tier)
                    .build();

            TargetCompany saved = targetCompanyRepository.save(targetCompany);

            return ResponseEntity.ok(mapToResponse(saved));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("An error occurred while adding the target company: " + e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<?> listTargetCompanies(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {
            User user = userDetails.getUser();
            List<TargetCompany> targets = targetCompanyRepository.findByUserId(user.getId());
            List<TargetCompanyResponse> response = targets.stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("An error occurred while fetching target companies: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> removeTargetCompany(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {
            User user = userDetails.getUser();
            TargetCompany targetCompany = targetCompanyRepository.findById(id)
                    .orElse(null);

            if (targetCompany == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Target company not found");
            }

            if (!targetCompany.getUser().getId().equals(user.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied");
            }

            targetCompanyRepository.delete(targetCompany);
            return ResponseEntity.ok(Map.of("message", "Target company removed successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("An error occurred while removing target company: " + e.getMessage());
        }
    }

    private TargetCompanyResponse mapToResponse(TargetCompany tc) {
        return TargetCompanyResponse.builder()
                .id(tc.getId())
                .companyName(tc.getCompanyName())
                .discoveryTier(tc.getDiscoveryTier())
                .addedAt(tc.getAddedAt())
                .build();
    }
}
