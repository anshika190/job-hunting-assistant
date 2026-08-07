package com.example.jobassistant.repository;

import com.example.jobassistant.entity.Application;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ApplicationRepository extends JpaRepository<Application, Long> {
    List<Application> findByUserId(Long userId);
    Optional<Application> findByUserIdAndDedupHash(Long userId, String dedupHash);
    Optional<Application> findByUserIdAndJobMatchId(Long userId, Long jobMatchId);
}
