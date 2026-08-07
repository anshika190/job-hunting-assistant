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
public class TargetCompanyResponse {
    private Long id;
    private String companyName;
    private String discoveryTier;
    private LocalDateTime addedAt;
}
