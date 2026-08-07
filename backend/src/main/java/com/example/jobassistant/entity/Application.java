package com.example.jobassistant.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "applications",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user_id", "dedup_hash"})
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_match_id")
    private JobMatch jobMatch;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "ENUM('draft','reviewed','submitted','interview','rejected','no_response')")
    private ApplicationStatus status;

    @Column(name = "cover_letter_text", columnDefinition = "TEXT")
    private String coverLetterText;

    @Column(name = "dedup_hash")
    private String dedupHash;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "last_status_change")
    @UpdateTimestamp
    private LocalDateTime lastStatusChange;
}
