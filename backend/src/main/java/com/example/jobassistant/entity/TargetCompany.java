package com.example.jobassistant.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "target_companies")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TargetCompany {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "company_name", nullable = false)
    private String companyName;

    @Column(name = "discovery_tier")
    private String discoveryTier;

    @Column(name = "added_at", updatable = false)
    @CreationTimestamp
    private LocalDateTime addedAt;
}
