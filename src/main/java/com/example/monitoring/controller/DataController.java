package com.example.monitoring.controller;

import com.example.monitoring.repo.ProjectRepository;
import com.example.monitoring.model.Entities.Api;
import com.example.monitoring.model.Entities.Project;
import com.example.monitoring.service.MonitoringService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/data")
public class DataController {

    private final ProjectRepository repo;
    private final MonitoringService monitoring;

    public DataController(ProjectRepository repo, MonitoringService monitoring) {
        this.repo = repo;
        this.monitoring = monitoring;
    }

    // ---------- DTOs ----------
    public record CreateProjectRequest(String name) {}
    public record AddApiRequest(String url, String environment, String region) {}

    // ---------- READ ----------
    /**
     * Returns:
     *  - projects: [ { id, name, createdAt, apis: Api[] } ]
     *  - apis: Api[]
     *  - allApis: Api[]    (alias)
     *  - apisMeta: { [apiId]: { service, version } }
     */
    @GetMapping("/projects")
    public ResponseEntity<?> getAll() {
        List<Project> projects = Optional.ofNullable(repo.findAllProjects()).orElseGet(List::of);
        List<Api> apis = Optional.ofNullable(repo.findAllApis()).orElseGet(List::of);

        // Group APIs by project id
        Map<Long, List<Api>> byProject = new HashMap<>();
        for (Api a : apis) {
            byProject.computeIfAbsent(a.projectId(), k -> new ArrayList<>()).add(a);
        }

        // Build per-project view
        List<Map<String, Object>> out = new ArrayList<>();
        for (Project p : projects) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", p.id());
            row.put("name", p.name());
            row.put("createdAt", p.createdAt());
            row.put("apis", byProject.getOrDefault(p.id(), List.of())); // always an array
            out.add(row);
        }

        // Probe metadata for each API (service/version). Keep fast with 3s timeout inside service.
        Map<Long, Map<String, String>> metaById = new HashMap<>();
        for (Api a : apis) {
            Map<String, String> meta = monitoring.fetchServiceInfo(a.url());
            metaById.put(a.id(), meta);
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("projects", out);
        payload.put("apis", apis);
        payload.put("allApis", apis);
        payload.put("apisMeta", metaById); // <-- used by All APIs tab to render one-line-per-service
        payload.put("fetchedAt", Instant.now());
        return ResponseEntity.ok(payload);
    }

    // ---------- CREATE PROJECT ----------
    @PostMapping("/projects")
    public ResponseEntity<?> createProject(@RequestBody CreateProjectRequest body) {
        if (body == null || body.name() == null || body.name().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Project name is required"));
        }
        long id = repo.createProject(body.name().trim());
        return ResponseEntity.ok(Map.of("id", id, "name", body.name().trim()));
    }

    // ---------- DELETE PROJECT ----------
    @DeleteMapping("/projects/{id}")
    public ResponseEntity<?> deleteProject(@PathVariable("id") Long id) {
        int rows = repo.deleteProject(id);
        if (rows == 0) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }

    // ---------- ADD API TO PROJECT ----------
    @PostMapping("/projects/{id}/apis")
    public ResponseEntity<?> addApi(@PathVariable("id") Long projectId,
                                    @RequestBody AddApiRequest body) {
        if (body == null || body.url() == null || body.url().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "API url is required"));
        }
        String env = (body.environment() == null || body.environment().isBlank()) ? "dev" : body.environment().trim();
        String region = (body.region() == null || body.region().isBlank()) ? "us-east-1" : body.region().trim();

        long apiId = repo.addApi(projectId, body.url().trim(), env, region);

        // Optionally: perform a first check & meta probe to warm data
        monitoring.checkAndUpdate(apiId, body.url().trim());
        Map<String, String> meta = monitoring.fetchServiceInfo(body.url().trim());

        return ResponseEntity.ok(Map.of(
                "id", apiId,
                "projectId", projectId,
                "url", body.url().trim(),
                "environment", env,
                "region", region,
                "status", "unknown",
                "meta", meta
        ));
    }

    // ---------- DELETE API ----------
    @DeleteMapping("/apis/{id}")
    public ResponseEntity<?> deleteApi(@PathVariable("id") Long apiId) {
        int rows = repo.deleteApi(apiId);
        if (rows == 0) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }
}
