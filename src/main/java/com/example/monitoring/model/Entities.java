package com.example.monitoring.model;

import java.time.Instant;

public class Entities {
    public record Project(Long id, String name, Instant createdAt) {}
    public record Api(
            Long id, Long projectId, String url, String environment, String region, String status,
            Integer responseTime, Instant lastChecked, Instant createdAt) {}
}
