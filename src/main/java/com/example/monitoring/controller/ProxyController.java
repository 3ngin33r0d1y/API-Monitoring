package com.example.monitoring.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/proxy")
public class ProxyController {

    public static class CheckRequest {
        public Long apiId; // optional – used if you want to persist results
        @NotBlank
        public String url;
    }

    private final RestTemplate rest;
    private final ObjectMapper mapper = new ObjectMapper();

    public ProxyController() {
        // Simple timeouts so checks don't hang
        var f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(5000);
        f.setReadTimeout(5000);
        this.rest = new RestTemplate(f);
    }

    @PostMapping("/check")
    public ResponseEntity<?> check(@Valid @RequestBody CheckRequest req) {
        if (!StringUtils.hasText(req.url)) {
            return bad("Missing required property 'url'. Send: {\"url\":\"https://service/health\"}");
        }
        try {
            var start = Instant.now();
            var resp = rest.getForEntity(URI.create(req.url), String.class);
            var elapsed = Duration.between(start, Instant.now()).toMillis();

            String version = null;
            String service = null;

            if (resp.getBody() != null && !resp.getBody().isBlank()) {
                try {
                    JsonNode node = mapper.readTree(resp.getBody());
                    version = node.path("version").isTextual() ? node.get("version").asText() : null;
                    service = node.path("service").isTextual() ? node.get("service").asText() : null;
                } catch (Exception ignored) {
                    // Body wasn't JSON – treat as plain health response
                }
            }

            Map<String, Object> out = new HashMap<>();
            out.put("status", resp.getStatusCode().value() >= 200 && resp.getStatusCode().value() < 400 ? "online" : "offline");
            out.put("httpStatus", resp.getStatusCode().value());
            out.put("responseTime", (int) Math.min(elapsed, Integer.MAX_VALUE));
            out.put("version", version);
            out.put("service", service);
            out.put("url", req.url);
            out.put("apiId", req.apiId);

            return ResponseEntity.ok(out);
        } catch (RestClientException ex) {
            Map<String, Object> out = new HashMap<>();
            out.put("status", "offline");
            out.put("httpStatus", 0);
            out.put("responseTime", null);
            out.put("version", null);
            out.put("service", null);
            out.put("url", req.url);
            out.put("error", ex.getClass().getSimpleName() + ": " + ex.getMessage());
            return ResponseEntity.ok(out); // 200 with offline details so UI doesn't explode
        } catch (IllegalArgumentException badUrl) {
            return bad("Invalid URL: " + req.url);
        }
    }

    private ResponseEntity<Map<String, Object>> bad(String message) {
        Map<String, Object> err = new HashMap<>();
        err.put("error", message);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
    }
}
