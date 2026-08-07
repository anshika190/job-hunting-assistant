package com.example.jobassistant.controller;

import com.example.jobassistant.dto.ProfileResponse;
import com.example.jobassistant.dto.ResumeResponse;
import com.example.jobassistant.entity.Profile;
import com.example.jobassistant.entity.User;
import com.example.jobassistant.repository.ProfileRepository;
import com.example.jobassistant.service.CustomUserDetails;
import com.example.jobassistant.service.GeminiService;
import com.example.jobassistant.service.ResumeParsingService;
import com.example.jobassistant.service.ResumeService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/resumes")
@RequiredArgsConstructor
public class ResumeController {

    private final ResumeService resumeService;
    private final ResumeParsingService resumeParsingService;
    private final GeminiService geminiService;
    private final ProfileRepository profileRepository;
    private final ObjectMapper objectMapper;

    @PostMapping("/upload")
    public ResponseEntity<?> uploadResume(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("Please select a file to upload");
        }

        try {
            User user = userDetails.getUser();
            ResumeResponse response = resumeService.uploadResume(file, user);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("An error occurred while uploading the file: " + e.getMessage());
        }
    }

    @PostMapping("/{id}/parse")
    public ResponseEntity<?> parseResume(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {
            User user = userDetails.getUser();

            // 1. Extract raw text from file path stored in database
            String rawText = resumeParsingService.parseAndSaveResumeText(id);

            // 2. Call Gemini API to convert raw text into structured schema
            ProfileResponse profileResponse = geminiService.extractProfileFromText(rawText);

            // 3. Map and save profiles record to the database
            Profile profile = profileRepository.findByUserId(user.getId())
                    .orElse(Profile.builder().user(user).build());

            profile.setSkillsJson(objectMapper.writeValueAsString(profileResponse.getSkills()));
            profile.setExperienceLevel(profileResponse.getExperienceLevel());
            profile.setTargetRolesJson(objectMapper.writeValueAsString(profileResponse.getTargetRoles()));
            profile.setProjectsJson(objectMapper.writeValueAsString(profileResponse.getProjects()));

            profileRepository.save(profile);

            // 4. Return the structured profile response
            return ResponseEntity.ok(profileResponse);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("An error occurred during resume parsing: " + e.getMessage());
        }
    }
}
