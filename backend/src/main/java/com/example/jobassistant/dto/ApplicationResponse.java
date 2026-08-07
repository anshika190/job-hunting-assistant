package com.example.jobassistant.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApplicationResponse {
    private Long id;
    private Long jobMatchId;
    private String status;
    private String coverLetterText;
    private LocalDateTime submittedAt;
    private LocalDateTime lastStatusChange;
    
    // Joined job match details
    private String company;
    private String roleTitle;
    private String location;
    private String sourceUrl;
    private String eligibility;
    private String reasoning;
}
