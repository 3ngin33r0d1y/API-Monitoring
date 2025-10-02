package com.example.monitoring.repo;

import com.example.monitoring.model.Entities.Project;
import com.example.monitoring.model.Entities.Api;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

@Repository
public class ProjectRepository {

    private final JdbcTemplate jdbc;

    public ProjectRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static class ProjectRow implements RowMapper<Project> {
        @Override public Project mapRow(ResultSet rs, int rowNum) throws SQLException {
            return new Project(
                    rs.getLong("id"),
                    rs.getString("name"),
                    rs.getTimestamp("created_at").toInstant()
            );
        }
    }

    private static class ApiRow implements RowMapper<Api> {
        @Override public Api mapRow(ResultSet rs, int rowNum) throws SQLException {
            Timestamp ts = rs.getTimestamp("last_checked");
            Instant lastChecked = ts != null ? ts.toInstant() : null;
            Integer responseTime = (Integer) rs.getObject("response_time");
            return new Api(
                    rs.getLong("id"),
                    rs.getLong("project_id"),
                    rs.getString("url"),
                    rs.getString("environment"),
                    rs.getString("region"),
                    rs.getString("status"),
                    responseTime,
                    lastChecked,
                    rs.getTimestamp("created_at").toInstant()
            );
        }
    }

    public List<Project> findAllProjects() {
        return jdbc.query("SELECT * FROM projects ORDER BY created_at DESC", new ProjectRow());
    }

    public List<Api> findApisByProject(Long projectId) {
        return jdbc.query("SELECT * FROM apis WHERE project_id=? ORDER BY created_at DESC", new ApiRow(), projectId);
    }

    public List<Api> findAllApis() {
        return jdbc.query("SELECT * FROM apis ORDER BY created_at DESC", new ApiRow());
    }

    public long createProject(String name) {
        return jdbc.queryForObject("INSERT INTO projects(name) VALUES (?) RETURNING id", Long.class, name);
    }

    public int deleteProject(Long id) {
        return jdbc.update("DELETE FROM projects WHERE id=?", id);
    }

    public long addApi(Long projectId, String url, String environment, String region) {
        return jdbc.queryForObject(
                "INSERT INTO apis(project_id,url,environment,region) VALUES (?,?,?,?) RETURNING id",
                Long.class, projectId, url, environment, region
        );
    }

    public int deleteApi(Long apiId) {
        return jdbc.update("DELETE FROM apis WHERE id=?", apiId);
    }

    public void updateApiStatus(Long apiId, String status, Integer responseTime, Instant lastChecked) {
        jdbc.update("UPDATE apis SET status=?, response_time=?, last_checked=? WHERE id=?",
                status, responseTime, Timestamp.from(lastChecked), apiId);
    }
}
