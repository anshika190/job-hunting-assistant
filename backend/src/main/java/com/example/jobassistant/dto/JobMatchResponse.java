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
public class JobMatchResponse {
    private Long id;
    private String company;
    private String roleTitle;
    private String location;
    private String sourceTier;
    private String sourceUrl;
    private String eligibility;
    private String reasoning;
    private LocalDateTime discoveredAt;
}
