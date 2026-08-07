package com.example.jobassistant.controller;

import com.example.jobassistant.dto.ApplicationResponse;
import com.example.jobassistant.entity.*;
import com.example.jobassistant.repository.ApplicationRepository;
import com.example.jobassistant.repository.EmailIngestLogRepository;
import com.example.jobassistant.repository.JobMatchRepository;
import com.example.jobassistant.repository.ProfileRepository;
import com.example.jobassistant.service.CoverLetterService;
import com.example.jobassistant.service.CustomUserDetails;
import com.example.jobassistant.service.EmailClassificationService;
import com.example.jobassistant.service.GmailReadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class ApplicationController {

    private final CoverLetterService coverLetterService;
    private final ApplicationRepository applicationRepository;
    private final JobMatchRepository jobMatchRepository;
    private final ProfileRepository profileRepository;
    private final GmailReadService gmailReadService;
    private final EmailClassificationService emailClassificationService;
    private final EmailIngestLogRepository emailIngestLogRepository;

    @PostMapping("/job-matches/{id}/cover-letter")
    public ResponseEntity<?> generateCoverLetter(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {
            User user = userDetails.getUser();
            JobMatch jm = jobMatchRepository.findById(id).orElse(null);
            if (jm == null) {
                return ResponseEntity.notFound().build();
            }
            if (!jm.getUser().getId().equals(user.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied: You do not own this job match");
            }

            Profile profile = profileRepository.findByUserId(user.getId()).orElse(null);
            if (profile == null) {
                return ResponseEntity.badRequest().body("Please upload and parse your resume before generating a cover letter");
            }

            // Generate cover letter
            String coverLetterText = coverLetterService.generateCoverLetter(jm, profile);

            // Look up existing application for this job match
            Application app = applicationRepository.findByUserIdAndJobMatchId(user.getId(), jm.getId()).orElse(null);
            if (app == null) {
                app = Application.builder()
                        .user(user)
                        .jobMatch(jm)
                        .status(ApplicationStatus.draft)
                        .coverLetterText(coverLetterText)
                        .dedupHash(jm.getDedupHash())
                        .build();
            } else {
                app.setCoverLetterText(coverLetterText);
            }

            applicationRepository.save(app);
            return ResponseEntity.ok(mapToResponse(app));

        } catch (org.springframework.web.client.HttpStatusCodeException ex) {
            if (ex.getStatusCode().value() == 429) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .body("Rate limit reached. Please try again later.");
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Gemini error: " + ex.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("An error occurred during cover letter generation: " + e.getMessage());
        }
    }

    @GetMapping("/applications/{jobMatchId}")
    public ResponseEntity<?> getApplication(
            @PathVariable("jobMatchId") Long jobMatchId,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {
            User user = userDetails.getUser();
            
            // Resource ownership check
            JobMatch jm = jobMatchRepository.findById(jobMatchId).orElse(null);
            if (jm != null && !jm.getUser().getId().equals(user.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied: You do not own this job match");
            }

            Application app = applicationRepository.findByUserIdAndJobMatchId(user.getId(), jobMatchId).orElse(null);
            if (app == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(mapToResponse(app));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("An error occurred while retrieving the application: " + e.getMessage());
        }
    }

    @GetMapping("/applications")
    public ResponseEntity<?> getApplications(
            @RequestParam(value = "status", required = false) String status,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {
            User user = userDetails.getUser();
            List<Application> apps = applicationRepository.findByUserId(user.getId());
            
            // Filter by status if provided
            if (status != null && !status.trim().isEmpty()) {
                apps = apps.stream()
                        .filter(app -> app.getStatus().name().equalsIgnoreCase(status.trim()))
                        .collect(Collectors.toList());
            }

            List<ApplicationResponse> response = apps.stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("An error occurred while retrieving applications: " + e.getMessage());
        }
    }

    @PutMapping("/applications/{jobMatchId}")
    public ResponseEntity<?> updateApplication(
            @PathVariable("jobMatchId") Long jobMatchId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {
            User user = userDetails.getUser();
            
            // Resource ownership check
            JobMatch jm = jobMatchRepository.findById(jobMatchId).orElse(null);
            if (jm != null && !jm.getUser().getId().equals(user.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied: You do not own this job match");
            }

            Application app = applicationRepository.findByUserIdAndJobMatchId(user.getId(), jobMatchId).orElse(null);
            if (app == null) {
                return ResponseEntity.notFound().build();
            }

            String newText = body.get("coverLetterText");
            if (newText == null) {
                newText = body.get("cover_letter_text");
            }

            if (newText == null) {
                return ResponseEntity.badRequest().body("coverLetterText field is required");
            }

            app.setDedupHash(jm.getDedupHash()); // Ensure dedupHash is synced
            app.setCoverLetterText(newText);
            applicationRepository.save(app);
            return ResponseEntity.ok(mapToResponse(app));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("An error occurred while updating the application: " + e.getMessage());
        }
    }

    @PutMapping("/applications/{jobMatchId}/approve")
    public ResponseEntity<?> approveApplication(
            @PathVariable("jobMatchId") Long jobMatchId,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {
            User user = userDetails.getUser();

            // Resource ownership check
            JobMatch jm = jobMatchRepository.findById(jobMatchId).orElse(null);
            if (jm != null && !jm.getUser().getId().equals(user.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied: You do not own this job match");
            }

            Application app = applicationRepository.findByUserIdAndJobMatchId(user.getId(), jobMatchId).orElse(null);
            if (app == null) {
                return ResponseEntity.notFound().build();
            }

            app.setStatus(ApplicationStatus.reviewed);
            applicationRepository.save(app);
            return ResponseEntity.ok(mapToResponse(app));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("An error occurred while approving the application: " + e.getMessage());
        }
    }

    @PutMapping("/applications/{jobMatchId}/mark-submitted")
    public ResponseEntity<?> markSubmitted(
            @PathVariable("jobMatchId") Long jobMatchId,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {
            User user = userDetails.getUser();

            // Resource ownership check
            JobMatch jm = jobMatchRepository.findById(jobMatchId).orElse(null);
            if (jm != null && !jm.getUser().getId().equals(user.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied: You do not own this job match");
            }

            Application app = applicationRepository.findByUserIdAndJobMatchId(user.getId(), jobMatchId).orElse(null);
            if (app == null) {
                return ResponseEntity.notFound().build();
            }

            app.setStatus(ApplicationStatus.submitted);
            app.setSubmittedAt(LocalDateTime.now());
            applicationRepository.save(app);
            return ResponseEntity.ok(mapToResponse(app));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("An error occurred while marking the application as submitted: " + e.getMessage());
        }
    }

    @PostMapping("/applications/{jobMatchId}/check-status")
    public ResponseEntity<?> checkApplicationStatus(
            @PathVariable("jobMatchId") Long jobMatchId,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {
            User user = userDetails.getUser();

            // Resource ownership check
            JobMatch jm = jobMatchRepository.findById(jobMatchId).orElse(null);
            if (jm == null) {
                return ResponseEntity.notFound().build();
            }
            if (!jm.getUser().getId().equals(user.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied: You do not own this job match");
            }

            Application app = applicationRepository.findByUserIdAndJobMatchId(user.getId(), jobMatchId).orElse(null);
            if (app == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Application record not found");
            }

            if (app.getStatus() != ApplicationStatus.submitted) {
                return ResponseEntity.badRequest().body("Only submitted applications can be checked for updates");
            }

            // Gmail connection check
            if (user.getGmailOauthTokenEncrypted() == null || user.getGmailOauthTokenEncrypted().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Gmail reconnection needed");
            }

            // 1. Fetch relevant emails from Gmail
            List<Map<String, String>> emails;
            try {
                emails = gmailReadService.fetchRelevantEmails(
                        user.getGmailOauthTokenEncrypted(),
                        jm.getCompany(),
                        app.getSubmittedAt()
                );
            } catch (IllegalStateException e) {
                if ("Gmail reconnection needed".equalsIgnoreCase(e.getMessage())) {
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Gmail reconnection needed");
                }
                throw e;
            }

            if (emails.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                        "updated", false,
                        "message", "No relevant emails found for this company since submission."
                ));
            }

            // 2. Classify retrieved emails via Gemini
            EmailClassificationService.ClassificationResult classificationResult;
            try {
                classificationResult = emailClassificationService.classifyEmails(jm.getCompany(), emails);
            } catch (org.springframework.web.client.HttpStatusCodeException ex) {
                if (ex.getStatusCode().value() == 429) {
                    return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                            .body("Gemini rate limit reached. Please try again later.");
                }
                throw ex;
            }

            // 3. Map classification to application status updates
            ApplicationStatus newStatus = null;
            if ("interview".equalsIgnoreCase(classificationResult.classification)) {
                newStatus = ApplicationStatus.interview;
            } else if ("assessment".equalsIgnoreCase(classificationResult.classification)) {
                newStatus = ApplicationStatus.interview; // map assessment round to interview state
            } else if ("rejection".equalsIgnoreCase(classificationResult.classification)) {
                newStatus = ApplicationStatus.rejected;
            }

            if (newStatus != null) {
                // Ensure duplicate ingestion check
                String msgId = classificationResult.gmailMessageId != null ? classificationResult.gmailMessageId : "unknown";
                boolean alreadyLogged = emailIngestLogRepository.existsByUserIdAndGmailMessageId(user.getId(), msgId);

                if (!alreadyLogged) {
                    app.setStatus(newStatus);
                    applicationRepository.save(app);

                    // Log the status ingestion audit
                    EmailIngestLog logEntry = EmailIngestLog.builder()
                            .user(user)
                            .gmailMessageId(msgId)
                            .parsedStatus(classificationResult.classification)
                            .application(app)
                            .build();
                    emailIngestLogRepository.save(logEntry);

                    return ResponseEntity.ok(Map.of(
                            "updated", true,
                            "newStatus", newStatus.name(),
                            "classification", classificationResult.classification,
                            "reasoning", classificationResult.reasoning,
                            "application", mapToResponse(app)
                    ));
                }
            }

            return ResponseEntity.ok(Map.of(
                    "updated", false,
                    "message", "No new updates found. Status is still: " + app.getStatus().name(),
                    "reasoning", classificationResult.reasoning
            ));

        } catch (Exception e) {
            log.error("Failed to check status for job match ID: " + jobMatchId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("An error occurred during status tracking check: " + e.getMessage());
        }
    }

    @DeleteMapping("/applications/{jobMatchId}")
    public ResponseEntity<?> deleteApplication(
            @PathVariable("jobMatchId") Long jobMatchId,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {
            User user = userDetails.getUser();

            // Resource ownership check
            JobMatch jm = jobMatchRepository.findById(jobMatchId).orElse(null);
            if (jm != null && !jm.getUser().getId().equals(user.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied: You do not own this job match");
            }

            Application app = applicationRepository.findByUserIdAndJobMatchId(user.getId(), jobMatchId).orElse(null);
            if (app == null) {
                return ResponseEntity.notFound().build();
            }

            applicationRepository.delete(app);
            return ResponseEntity.ok(Map.of("message", "Application skipped and deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("An error occurred while deleting the application: " + e.getMessage());
        }
    }

    private ApplicationResponse mapToResponse(Application app) {
        JobMatch jm = app.getJobMatch();
        return ApplicationResponse.builder()
                .id(app.getId())
                .jobMatchId(jm.getId())
                .status(app.getStatus().name())
                .coverLetterText(app.getCoverLetterText())
                .submittedAt(app.getSubmittedAt())
                .lastStatusChange(app.getLastStatusChange())
                .company(jm.getCompany())
                .roleTitle(jm.getRoleTitle())
                .location(jm.getLocation())
                .sourceUrl(jm.getSourceUrl())
                .eligibility(jm.getEligibility())
                .reasoning(jm.getReasoning())
                .build();
    }
}
