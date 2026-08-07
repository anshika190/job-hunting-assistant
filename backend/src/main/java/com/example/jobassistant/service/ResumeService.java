package com.example.jobassistant.service;

import com.example.jobassistant.dto.ResumeResponse;
import com.example.jobassistant.entity.Resume;
import com.example.jobassistant.entity.User;
import com.example.jobassistant.repository.ResumeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ResumeService {

    private final ResumeRepository resumeRepository;

    @Value("${app.upload.dir}")
    private String uploadDir;

    @Transactional
    public ResumeResponse uploadResume(MultipartFile file, User user) throws IOException {
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null) {
            throw new IllegalArgumentException("Invalid file name");
        }

        // Validate file extension
        String extension = "";
        int lastIndex = originalFilename.lastIndexOf('.');
        if (lastIndex >= 0) {
            extension = originalFilename.substring(lastIndex).toLowerCase();
        }

        if (!extension.equals(".pdf") && !extension.equals(".docx")) {
            throw new IllegalArgumentException("Only PDF and DOCX files are allowed");
        }

        // Generate unique filename to avoid overwrites
        String uniqueFilename = UUID.randomUUID().toString() + extension;

        // Ensure upload directory exists
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        // Copy file to target location
        Path filePath = uploadPath.resolve(uniqueFilename);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        // Save resume metadata to the database
        Resume resume = Resume.builder()
                .user(user)
                .filePath(filePath.toString())
                .rawText("") // Empty for now as per instructions
                .build();

        Resume savedResume = resumeRepository.save(resume);

        return ResumeResponse.builder()
                .id(savedResume.getId())
                .filePath(savedResume.getFilePath())
                .rawText(savedResume.getRawText())
                .uploadedAt(savedResume.getUploadedAt())
                .userId(user.getId())
                .build();
    }
}
