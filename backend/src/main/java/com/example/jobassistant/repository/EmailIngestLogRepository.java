package com.example.jobassistant.repository;

import com.example.jobassistant.entity.EmailIngestLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmailIngestLogRepository extends JpaRepository<EmailIngestLog, Long> {
    List<EmailIngestLog> findByUserId(Long userId);
    boolean existsByUserIdAndGmailMessageId(Long userId, String gmailMessageId);
}
