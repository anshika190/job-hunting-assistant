package com.example.jobassistant.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "job_matches")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobMatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String company;

    @Column(name = "role_title", nullable = false)
    private String roleTitle;

    private String location;

    @Column(name = "source_tier")
    private String sourceTier;

    @Column(name = "source_url", columnDefinition = "TEXT")
    private String sourceUrl;

    @Column(name = "match_score")
    private Double matchScore;

    private String eligibility;

    @Column(columnDefinition = "TEXT")
    private String reasoning;

    @Column(name = "dedup_hash")
    private String dedupHash;

    @Column(name = "discovered_at", updatable = false)
    @CreationTimestamp
    private LocalDateTime discoveredAt;
}
