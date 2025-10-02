package com.example.monitoring.service;

import com.example.monitoring.repo.ProjectRepository;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Service
public class MonitoringService {

    private final WebClient webClient;
    private final ProjectRepository repo;

    public MonitoringService(ProjectRepository repo) {
        this.repo = repo;
        this.webClient = WebClient.builder().build();
    }

    public record CheckResult(String status, int responseTimeMs) {}

    public CheckResult checkAndUpdate(Long apiId, String targetUrl) {
        Instant start = Instant.now();
        String status;

        try {
            String responseStatus = webClient.get()
                    .uri(URI.create(targetUrl))
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, r -> Mono.empty())
                    .toBodilessEntity()
                    .timeout(Duration.ofSeconds(8))
                    .map(e -> e.getStatusCode().is2xxSuccessful() ? "online" : "offline")
                    .blockOptional()
                    .orElse("offline");

            status = responseStatus;
        } catch (Exception e) {
            status = "offline";
        }

        int rt = (int) (Duration.between(start, Instant.now()).toMillis());
        repo.updateApiStatus(apiId, status, rt, Instant.now());
        return new CheckResult(status, rt);
    }

    /**
     * Fetch lightweight metadata from an API that returns:
     * { "version": "1.0.0", "service": "api-name-invoice-job" }
     * Returns an empty map on failure.
     */
    public Map<String, String> fetchServiceInfo(String url) {
        try {
            Map<?, ?> m = webClient.get()
                    .uri(URI.create(url))
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, r -> Mono.empty())
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(3))
                    .blockOptional()
                    .orElse(null);

            Map<String, String> out = new HashMap<>();
            if (m != null) {
                Object version = m.get("version");
                Object service = m.get("service");
                if (version != null) out.put("version", version.toString());
                if (service != null) out.put("service", service.toString());
            }
            return out;
        } catch (Exception e) {
            return Map.of();
        }
    }
}
