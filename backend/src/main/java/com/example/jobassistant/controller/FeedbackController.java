package com.example.jobassistant.controller;

import com.example.jobassistant.service.CustomUserDetails;
import com.example.jobassistant.service.FeedbackAnalysisService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/feedback")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackAnalysisService feedbackAnalysisService;

    @GetMapping("/insights")
    public ResponseEntity<?> getInsights(@AuthenticationPrincipal CustomUserDetails userDetails) {
        Long userId = userDetails.getUser().getId();
        return ResponseEntity.ok(feedbackAnalysisService.getInsights(userId));
    }
}
