package com.example.jobassistant.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ResumeResponse {
    private Long id;
    private String filePath;
    private String rawText;
    private LocalDateTime uploadedAt;
    private Long userId;
}
