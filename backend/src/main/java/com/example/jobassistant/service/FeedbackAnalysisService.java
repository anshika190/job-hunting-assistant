package com.example.jobassistant.service;

import com.example.jobassistant.entity.Application;
import com.example.jobassistant.entity.ApplicationStatus;
import com.example.jobassistant.repository.ApplicationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedbackAnalysisService {

    private final ApplicationRepository applicationRepository;

    public static class InsightsResult {
        public long totalOutcomes;
        public boolean hasEnoughData;
        public String message;
        public List<String> insightsList = new ArrayList<>();
    }

    public InsightsResult getInsights(Long userId) {
        List<Application> apps = applicationRepository.findByUserId(userId);
        
        // Filter applications with final outcomes (interview or rejected)
        List<Application> outcomes = apps.stream()
                .filter(app -> app.getStatus() == ApplicationStatus.interview || app.getStatus() == ApplicationStatus.rejected)
                .collect(Collectors.toList());

        InsightsResult result = new InsightsResult();
        result.totalOutcomes = outcomes.size();

        if (outcomes.size() < 3) {
            result.hasEnoughData = false;
            result.message = "Not enough data yet - keep applying and checking for updates to unlock insights";
            return result;
        }

        result.hasEnoughData = true;

        // Breakdown eligible/stretch vs actual outcomes
        long eligibleCount = 0;
        long stretchCount = 0;
        long eligibleInterview = 0;
        long stretchInterview = 0;
        long eligibleRejected = 0;
        long stretchRejected = 0;

        for (Application app : outcomes) {
            String elig = app.getJobMatch().getEligibility();
            boolean isInterview = app.getStatus() == ApplicationStatus.interview;
            if ("eligible".equalsIgnoreCase(elig)) {
                eligibleCount++;
                if (isInterview) eligibleInterview++;
                else eligibleRejected++;
            } else if ("stretch".equalsIgnoreCase(elig)) {
                stretchCount++;
                if (isInterview) stretchInterview++;
                else stretchRejected++;
            }
        }

        result.message = String.format("Of your %d applications with outcomes, %d were rated eligible/stretch and resulted in interview vs rejection.", 
                outcomes.size(), eligibleCount + stretchCount);

        // Add correlation insights
        if (eligibleCount > 0) {
            long pct = Math.round(((double) eligibleInterview / eligibleCount) * 100);
            result.insightsList.add(String.format("Eligible matches resulted in a %d%% interview rate (%d interviews, %d rejections).", 
                    pct, eligibleInterview, eligibleRejected));
        }
        if (stretchCount > 0) {
            long pct = Math.round(((double) stretchInterview / stretchCount) * 100);
            result.insightsList.add(String.format("Stretch matches resulted in a %d%% interview rate (%d interviews, %d rejections).", 
                    pct, stretchInterview, stretchRejected));
        }

        // Group by rough role category
        Map<String, List<Application>> categorized = outcomes.stream()
                .collect(Collectors.groupingBy(app -> getRoughCategory(app.getJobMatch().getRoleTitle())));

        for (Map.Entry<String, List<Application>> entry : categorized.entrySet()) {
            String category = entry.getKey();
            List<Application> categoryApps = entry.getValue();
            long total = categoryApps.size();
            long interviews = categoryApps.stream().filter(a -> a.getStatus() == ApplicationStatus.interview).count();
            long rejections = total - interviews;
            long pct = Math.round(((double) interviews / total) * 100);

            result.insightsList.add(String.format("Roles categorized as '%s' have a %d%% positive outcome rate (%d interviews, %d rejections).", 
                    category, pct, interviews, rejections));
        }

        return result;
    }

    public String getHistoricalContextNote(Long userId) {
        List<Application> apps = applicationRepository.findByUserId(userId);
        List<Application> outcomes = apps.stream()
                .filter(app -> app.getStatus() == ApplicationStatus.interview || app.getStatus() == ApplicationStatus.rejected)
                .collect(Collectors.toList());

        if (outcomes.size() < 3) {
            return "";
        }

        List<String> interviewRoles = outcomes.stream()
                .filter(app -> app.getStatus() == ApplicationStatus.interview)
                .map(app -> app.getJobMatch().getRoleTitle())
                .distinct()
                .collect(Collectors.toList());

        List<String> rejectedRoles = outcomes.stream()
                .filter(app -> app.getStatus() == ApplicationStatus.rejected)
                .map(app -> app.getJobMatch().getRoleTitle())
                .distinct()
                .collect(Collectors.toList());

        StringBuilder contextNote = new StringBuilder("\n\nHistorical Context Note (Real Application Outcomes):\n");
        if (!interviewRoles.isEmpty()) {
            contextNote.append("- The candidate has historically gotten interviews for roles similar to: ").append(String.join(", ", interviewRoles)).append(".\n");
        }
        if (!rejectedRoles.isEmpty()) {
            contextNote.append("- The candidate has historically been rejected from roles similar to: ").append(String.join(", ", rejectedRoles)).append(".\n");
        }
        contextNote.append("Please weigh this real outcomes history when evaluating the eligibility and match score of the new job posting.");

        return contextNote.toString();
    }

    private String getRoughCategory(String roleTitle) {
        String title = roleTitle.toLowerCase();
        if (title.contains("front")) {
            return "Frontend Engineering";
        } else if (title.contains("back")) {
            return "Backend Engineering";
        } else if (title.contains("full") || title.contains("stack")) {
            return "Fullstack Engineering";
        } else if (title.contains("data") || title.contains("analyst") || title.contains("science")) {
            return "Data Science/Analytics";
        } else if (title.contains("product") || title.contains("manager")) {
            return "Product Management";
        } else if (title.contains("software") || title.contains("engineer") || title.contains("developer")) {
            return "Software Engineering";
        } else {
            return "Other Technical Roles";
        }
    }
}
