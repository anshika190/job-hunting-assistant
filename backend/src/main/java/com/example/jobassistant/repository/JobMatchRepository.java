package com.example.jobassistant.repository;

import com.example.jobassistant.entity.JobMatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JobMatchRepository extends JpaRepository<JobMatch, Long> {
    List<JobMatch> findByUserIdOrderByDiscoveredAtDesc(Long userId);
    boolean existsByUserIdAndDedupHash(Long userId, String dedupHash);
}
