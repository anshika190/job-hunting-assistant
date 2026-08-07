package com.example.jobassistant.service;

import com.example.jobassistant.entity.Resume;
import com.example.jobassistant.repository.ResumeRepository;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Service
@RequiredArgsConstructor
public class ResumeParsingService {

    private final ResumeRepository resumeRepository;

    @Transactional
    public String parseAndSaveResumeText(Long resumeId) throws IOException {
        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new IllegalArgumentException("Resume not found with ID: " + resumeId));

        String rawText = extractText(resume.getFilePath());
        
        // Remove null bytes and clean text to prevent SQL/JSON parsing issues
        rawText = rawText.replace("\u0000", "").trim();

        resume.setRawText(rawText);
        resumeRepository.save(resume);

        return rawText;
    }

    private String extractText(String filePathString) throws IOException {
        Path path = Paths.get(filePathString);
        if (!Files.exists(path)) {
            throw new IOException("File does not exist on disk: " + filePathString);
        }

        File file = path.toFile();
        String originalFilename = file.getName().toLowerCase();

        if (originalFilename.endsWith(".pdf")) {
            return extractTextFromPdf(file);
        } else if (originalFilename.endsWith(".docx")) {
            return extractTextFromDocx(file);
        } else {
            throw new IllegalArgumentException("Unsupported file format for parsing. Must be PDF or DOCX.");
        }
    }

    private String extractTextFromPdf(File file) throws IOException {
        try (PDDocument document = PDDocument.load(file)) {
            if (document.isEncrypted()) {
                throw new IOException("Cannot parse encrypted PDF file.");
            }
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        }
    }

    private String extractTextFromDocx(File file) throws IOException {
        try (FileInputStream fis = new FileInputStream(file);
             XWPFDocument document = new XWPFDocument(fis);
             XWPFWordExtractor extractor = new XWPFWordExtractor(document)) {
            return extractor.getText();
        }
    }
}
