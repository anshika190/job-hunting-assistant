package com.example.jobassistant.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ProfileResponse {
    private List<String> skills;

    @JsonProperty("experience_level")
    private String experienceLevel;

    @JsonProperty("target_roles")
    private List<String> targetRoles;

    private List<ProjectDto> projects;
}
