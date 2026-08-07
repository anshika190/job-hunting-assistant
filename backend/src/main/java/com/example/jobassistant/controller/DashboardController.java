package com.example.jobassistant.controller;

import com.example.jobassistant.dto.DashboardSummaryResponse;
import com.example.jobassistant.entity.Application;
import com.example.jobassistant.entity.JobMatch;
import com.example.jobassistant.entity.TargetCompany;
import com.example.jobassistant.repository.ApplicationRepository;
import com.example.jobassistant.repository.JobMatchRepository;
import com.example.jobassistant.repository.TargetCompanyRepository;
import com.example.jobassistant.service.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final JobMatchRepository jobMatchRepository;
    private final ApplicationRepository applicationRepository;
    private final TargetCompanyRepository targetCompanyRepository;

    @GetMapping("/summary")
    public ResponseEntity<?> getDashboardSummary(@AuthenticationPrincipal CustomUserDetails userDetails) {
        Long userId = userDetails.getUser().getId();

        // 1. Target Companies Count
        List<TargetCompany> targets = targetCompanyRepository.findByUserId(userId);
        long targetCount = targets.size();

        // 2. Jobs Discovered & Eligibility Breakdown
        List<JobMatch> jobs = jobMatchRepository.findByUserIdOrderByDiscoveredAtDesc(userId);
        long totalJobs = jobs.size();

        Map<String, Long> eligibilityBreakdown = new HashMap<>();
        eligibilityBreakdown.put("eligible", 0L);
        eligibilityBreakdown.put("stretch", 0L);
        eligibilityBreakdown.put("not_eligible", 0L);
        eligibilityBreakdown.put("unscored", 0L);

        for (JobMatch job : jobs) {
            String elig = job.getEligibility();
            if (elig == null || elig.trim().isEmpty() || "unscored".equalsIgnoreCase(elig)) {
                eligibilityBreakdown.put("unscored", eligibilityBreakdown.get("unscored") + 1);
            } else {
                String key = elig.toLowerCase().trim();
                eligibilityBreakdown.put(key, eligibilityBreakdown.getOrDefault(key, 0L) + 1);
            }
        }

        // 3. Applications Breakdown
        List<Application> applications = applicationRepository.findByUserId(userId);
        Map<String, Long> appsBreakdown = new HashMap<>();
        appsBreakdown.put("draft", 0L);
        appsBreakdown.put("reviewed", 0L);
        appsBreakdown.put("submitted", 0L);
        appsBreakdown.put("interview", 0L);
        appsBreakdown.put("rejected", 0L);

        for (Application app : applications) {
            String status = app.getStatus().name().toLowerCase();
            appsBreakdown.put(status, appsBreakdown.getOrDefault(status, 0L) + 1);
        }

        // 4. Recent Activity (10 most recent applications by lastStatusChange or submittedAt)
        // Sort by whichever timestamp is most recent (last_status_change if available, otherwise submitted_at)
        List<DashboardSummaryResponse.RecentActivityItem> recentActivity = applications.stream()
                .sorted((a, b) -> {
                    LocalDateTime timeA = a.getLastStatusChange() != null ? a.getLastStatusChange() : a.getSubmittedAt();
                    if (timeA == null) timeA = LocalDateTime.MIN;
                    LocalDateTime timeB = b.getLastStatusChange() != null ? b.getLastStatusChange() : b.getSubmittedAt();
                    if (timeB == null) timeB = LocalDateTime.MIN;
                    return timeB.compareTo(timeA); // Descending order
                })
                .limit(10)
                .map(app -> {
                    LocalDateTime dt = app.getLastStatusChange() != null ? app.getLastStatusChange() : app.getSubmittedAt();
                    String formattedDate = "N/A";
                    if (dt != null) {
                        formattedDate = dt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
                    }
                    return DashboardSummaryResponse.RecentActivityItem.builder()
                            .company(app.getJobMatch().getCompany())
                            .roleTitle(app.getJobMatch().getRoleTitle())
                            .status(app.getStatus().name())
                            .date(formattedDate)
                            .build();
                })
                .collect(Collectors.toList());

        DashboardSummaryResponse response = DashboardSummaryResponse.builder()
                .totalJobsDiscovered(totalJobs)
                .eligibilityBreakdown(eligibilityBreakdown)
                .applicationsBreakdown(appsBreakdown)
                .targetCompaniesCount(targetCount)
                .recentActivity(recentActivity)
                .build();

        return ResponseEntity.ok(response);
    }
}
