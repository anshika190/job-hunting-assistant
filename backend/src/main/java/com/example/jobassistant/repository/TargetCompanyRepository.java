package com.example.jobassistant.repository;

import com.example.jobassistant.entity.TargetCompany;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TargetCompanyRepository extends JpaRepository<TargetCompany, Long> {
    List<TargetCompany> findByUserId(Long userId);
    boolean existsByUserIdAndCompanyNameIgnoreCase(Long userId, String companyName);
}
