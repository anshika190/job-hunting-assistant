package com.example.jobassistant.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class DashboardSummaryResponse {
    private long totalJobsDiscovered;
    private Map<String, Long> eligibilityBreakdown;
    private Map<String, Long> applicationsBreakdown;
    private long targetCompaniesCount;
    private List<RecentActivityItem> recentActivity;

    @Data
    @Builder
    public static class RecentActivityItem {
        private String company;
        private String roleTitle;
        private String status;
        private String date;
    }
}
