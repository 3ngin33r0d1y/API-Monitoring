CREATE TABLE IF NOT EXISTS projects (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS apis (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL,
    url VARCHAR(500) NOT NULL,
    environment VARCHAR(50) DEFAULT 'dev',
    region VARCHAR(50) DEFAULT 'us-east-1',
    status VARCHAR(20) DEFAULT 'unknown',
    response_time INTEGER,
    last_checked TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
