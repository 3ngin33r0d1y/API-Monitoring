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
import java.util.*;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/enhanced-proxy")
public class EnhancedProxyController {

    public static class CheckRequest {
        public Long apiId;
        @NotBlank
        public String url;
        public String environment; // dev, uat, oat, prod
    }

    public static class ComplianceCheckRequest {
        public List<String> urls;
        public List<String> environments; // corresponding environments for each URL
    }

    private final RestTemplate rest;
    private final ObjectMapper mapper = new ObjectMapper();

    public EnhancedProxyController() {
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
            out.put("environment", req.environment);
            out.put("region", "paris"); // All APIs are in Paris region

            return ResponseEntity.ok(out);
        } catch (RestClientException ex) {
            Map<String, Object> out = new HashMap<>();
            out.put("status", "offline");
            out.put("httpStatus", 0);
            out.put("responseTime", null);
            out.put("version", null);
            out.put("service", null);
            out.put("url", req.url);
            out.put("environment", req.environment);
            out.put("region", "paris");
            out.put("error", ex.getClass().getSimpleName() + ": " + ex.getMessage());
            return ResponseEntity.ok(out);
        } catch (IllegalArgumentException badUrl) {
            return bad("Invalid URL: " + req.url);
        }
    }

    @PostMapping("/compliance-check")
    public ResponseEntity<?> complianceCheck(@Valid @RequestBody ComplianceCheckRequest req) {
        if (req.urls == null || req.environments == null || req.urls.size() != req.environments.size()) {
            return bad("URLs and environments arrays must be provided and have the same length");
        }

        Map<String, Map<String, Object>> results = new HashMap<>();
        List<String> violations = new ArrayList<>();

        // Fetch all API data
        for (int i = 0; i < req.urls.size(); i++) {
            String url = req.urls.get(i);
            String env = req.environments.get(i);
            
            try {
                var resp = rest.getForEntity(URI.create(url), String.class);
                if (resp.getBody() != null && !resp.getBody().isBlank()) {
                    JsonNode node = mapper.readTree(resp.getBody());
                    String version = node.path("version").isTextual() ? node.get("version").asText() : null;
                    String service = node.path("service").isTextual() ? node.get("service").asText() : null;
                    
                    Map<String, Object> envData = new HashMap<>();
                    envData.put("version", version);
                    envData.put("service", service);
                    envData.put("url", url);
                    envData.put("status", "online");
                    
                    results.put(env, envData);
                }
            } catch (Exception ex) {
                Map<String, Object> envData = new HashMap<>();
                envData.put("version", null);
                envData.put("service", null);
                envData.put("url", url);
                envData.put("status", "offline");
                envData.put("error", ex.getMessage());
                
                results.put(env, envData);
            }
        }

        // Perform compliance validation
        violations.addAll(validateVersionCompliance(results));

        Map<String, Object> response = new HashMap<>();
        response.put("results", results);
        response.put("violations", violations);
        response.put("compliant", violations.isEmpty());
        response.put("timestamp", Instant.now().toString());

        return ResponseEntity.ok(response);
    }

    private List<String> validateVersionCompliance(Map<String, Map<String, Object>> results) {
        List<String> violations = new ArrayList<>();
        
        String devVersion = getVersion(results, "dev");
        String uatVersion = getVersion(results, "uat");
        String oatVersion = getVersion(results, "oat");
        String prodVersion = getVersion(results, "prod");

        // Version comparison logic
        if (prodVersion != null && oatVersion != null && compareVersions(prodVersion, oatVersion) > 0) {
            violations.add("CRITICAL: PROD version (" + prodVersion + ") is higher than OAT version (" + oatVersion + ")");
        }
        
        if (prodVersion != null && uatVersion != null && compareVersions(prodVersion, uatVersion) > 0) {
            violations.add("CRITICAL: PROD version (" + prodVersion + ") is higher than UAT version (" + uatVersion + ")");
        }
        
        if (oatVersion != null && uatVersion != null && compareVersions(oatVersion, uatVersion) > 0) {
            violations.add("WARNING: OAT version (" + oatVersion + ") is higher than UAT version (" + uatVersion + ")");
        }

        return violations;
    }

    private String getVersion(Map<String, Map<String, Object>> results, String env) {
        Map<String, Object> envData = results.get(env);
        return envData != null ? (String) envData.get("version") : null;
    }

    private int compareVersions(String version1, String version2) {
        if (version1 == null || version2 == null) return 0;
        
        String[] v1Parts = version1.split("\\.");
        String[] v2Parts = version2.split("\\.");
        
        int maxLength = Math.max(v1Parts.length, v2Parts.length);
        
        for (int i = 0; i < maxLength; i++) {
            int v1Part = i < v1Parts.length ? Integer.parseInt(v1Parts[i]) : 0;
            int v2Part = i < v2Parts.length ? Integer.parseInt(v2Parts[i]) : 0;
            
            if (v1Part != v2Part) {
                return Integer.compare(v1Part, v2Part);
            }
        }
        
        return 0;
    }

    private ResponseEntity<Map<String, Object>> bad(String message) {
        Map<String, Object> err = new HashMap<>();
        err.put("error", message);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
    }
}
