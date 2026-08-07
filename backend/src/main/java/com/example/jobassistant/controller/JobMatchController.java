package com.example.jobassistant.controller;

import com.example.jobassistant.dto.JobMatchResponse;
import com.example.jobassistant.entity.JobMatch;
import com.example.jobassistant.entity.Profile;
import com.example.jobassistant.entity.User;
import com.example.jobassistant.repository.JobMatchRepository;
import com.example.jobassistant.repository.ProfileRepository;
import com.example.jobassistant.service.CustomUserDetails;
import com.example.jobassistant.service.EligibilityService;
import com.example.jobassistant.service.JobDiscoveryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class JobMatchController {

    private final JobDiscoveryService jobDiscoveryService;
    private final JobMatchRepository jobMatchRepository;
    private final EligibilityService eligibilityService;
    private final ProfileRepository profileRepository;

    // Track recently failed jobs to avoid retrying the same failing jobs first on subsequent calls
    private static final java.util.Set<Long> recentlyFailedJobIds = java.util.concurrent.ConcurrentHashMap.newKeySet();

    @PostMapping("/job-discovery/run")
    public ResponseEntity<?> runJobDiscovery(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {
            User user = userDetails.getUser();
            int discoveredCount = jobDiscoveryService.runDiscoveryForUser(user);
            return ResponseEntity.ok(Map.of(
                    "message", "Job discovery completed successfully",
                    "discoveredCount", discoveredCount
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("An error occurred during job discovery: " + e.getMessage());
        }
    }

    @PostMapping("/job-matches/score")
    public ResponseEntity<?> scoreJobMatches(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {
            User user = userDetails.getUser();

            // Get user's profile
            Profile profile = profileRepository.findByUserId(user.getId()).orElse(null);
            if (profile == null) {
                return ResponseEntity.badRequest().body("Please upload and parse your resume before scoring eligibility");
            }

            // Get all unscored job matches for the user
            List<JobMatch> matches = jobMatchRepository.findByUserIdOrderByDiscoveredAtDesc(user.getId());
            
            // Filter out recently failed jobs to make sure subsequent calls try different jobs, and cap at 5
            List<JobMatch> unscoredMatches = matches.stream()
                    .filter(m -> m.getEligibility() == null)
                    .filter(m -> !recentlyFailedJobIds.contains(m.getId()))
                    .limit(5)
                    .collect(Collectors.toList());

            // If we've run through all other options, clear the failures list and retry
            if (unscoredMatches.isEmpty()) {
                List<JobMatch> actualUnscored = matches.stream()
                        .filter(m -> m.getEligibility() == null)
                        .collect(Collectors.toList());
                if (!actualUnscored.isEmpty()) {
                    recentlyFailedJobIds.clear();
                    unscoredMatches = actualUnscored.stream().limit(5).collect(Collectors.toList());
                }
            }

            int scoredCount = 0;
            long startTime = System.currentTimeMillis();
            for (JobMatch jm : unscoredMatches) {
                // Return early if request duration exceeds 40 seconds to prevent HTTP gateway timeout
                if (System.currentTimeMillis() - startTime > 40000) {
                    log.warn("Scoring request duration exceeded 40 seconds. Returning scored matches early.");
                    break;
                }
                try {
                    // 1.5s delay between jobs to respect Gemini API rate limits
                    Thread.sleep(1500);
                    eligibilityService.scoreJobMatch(jm, profile);
                    scoredCount++;
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    break;
                } catch (org.springframework.web.client.HttpStatusCodeException ex) {
                    recentlyFailedJobIds.add(jm.getId());
                    if (ex.getStatusCode().value() == 429) {
                        log.warn("Gemini API rate limit or quota exceeded (429) on job match ID {}. Aborting batch.", jm.getId());
                        break;
                    }
                    log.error("Failed to score job match ID {}: {}", jm.getId(), ex.getMessage(), ex);
                } catch (Exception ex) {
                    recentlyFailedJobIds.add(jm.getId());
                    log.error("Failed to score job match ID {}: {}", jm.getId(), ex.getMessage(), ex);
                }
            }

            // Count total remaining unscored matches in the DB (including recently skipped ones)
            long totalRemainingUnscored = matches.stream()
                    .filter(m -> m.getEligibility() == null)
                    .count();

            return ResponseEntity.ok(Map.of(
                    "message", "Capped eligibility scoring completed",
                    "scoredCount", scoredCount,
                    "remainingCount", totalRemainingUnscored
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("An error occurred during eligibility scoring: " + e.getMessage());
        }
    }

    @PostMapping("/job-matches/{id}/score")
    public ResponseEntity<?> scoreSingleJobMatch(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {
            User user = userDetails.getUser();
            JobMatch jm = jobMatchRepository.findById(id).orElse(null);
            if (jm == null || !jm.getUser().getId().equals(user.getId())) {
                return ResponseEntity.notFound().build();
            }

            Profile profile = profileRepository.findByUserId(user.getId()).orElse(null);
            if (profile == null) {
                return ResponseEntity.badRequest().body("Please upload and parse your resume before scoring eligibility");
            }

            eligibilityService.scoreJobMatch(jm, profile);
            return ResponseEntity.ok(mapToResponse(jm));
        } catch (org.springframework.web.client.HttpStatusCodeException ex) {
            if (ex.getStatusCode().value() == 429) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .body("Rate limit reached. Please try again later.");
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Gemini error: " + ex.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("An error occurred during scoring: " + e.getMessage());
        }
    }

    @GetMapping("/job-matches")
    public ResponseEntity<?> getJobMatches(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(value = "sort", required = false) String sort
    ) {
        try {
            User user = userDetails.getUser();
            List<JobMatch> matches = jobMatchRepository.findByUserIdOrderByDiscoveredAtDesc(user.getId());

            // Support optional sorting by eligibility: eligible first, then stretch, then not_eligible
            if ("eligibility".equalsIgnoreCase(sort)) {
                matches.sort((a, b) -> {
                    int scoreA = getEligibilityRank(a.getEligibility());
                    int scoreB = getEligibilityRank(b.getEligibility());
                    if (scoreA != scoreB) {
                        return Integer.compare(scoreA, scoreB);
                    }
                    return b.getDiscoveredAt().compareTo(a.getDiscoveredAt());
                });
            }

            List<JobMatchResponse> response = matches.stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("An error occurred while fetching job matches: " + e.getMessage());
        }
    }

    private int getEligibilityRank(String eligibility) {
        if (eligibility == null) return 4;
        switch (eligibility.toLowerCase()) {
            case "eligible": return 1;
            case "stretch": return 2;
            case "not_eligible": return 3;
            default: return 4;
        }
    }

    private JobMatchResponse mapToResponse(JobMatch jm) {
        return JobMatchResponse.builder()
                .id(jm.getId())
                .company(jm.getCompany())
                .roleTitle(jm.getRoleTitle())
                .location(jm.getLocation())
                .sourceTier(jm.getSourceTier())
                .sourceUrl(jm.getSourceUrl())
                .eligibility(jm.getEligibility())
                .reasoning(jm.getReasoning())
                .discoveredAt(jm.getDiscoveredAt())
                .build();
    }
}
