# API Monitoring Dashboard (Spring Boot 3.2 + React + Tailwind)

## Quick Start (Dev)
```bash
cd backend
# H2 memory DB by default. For Postgres set env vars below.
mvn -DskipTests package
java -jar target/api-monitoring-dashboard-1.0.0.jar
```

Then open http://localhost:8080/.

### Authentication (required)
Use one of the exact credentials:
- admin / admin123
- dashboard / password
- user / user123
- demo / demo
- manager / manager2024
- developer / dev@2024

### Environment Variables for PostgreSQL
```
DATABASE_URL=jdbc:postgresql://host:port/database
DATABASE_USERNAME=username
DATABASE_PASSWORD=password
DATABASE_DRIVER=org.postgresql.Driver
JWT_SECRET=change-this-very-secret-key
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

## API Endpoints
- POST `/api/auth/login`
- POST `/api/auth/logout`
- GET  `/api/data/projects`
- POST `/api/data/projects`
- DELETE `/api/data/projects/{id}`
- POST `/api/data/projects/{id}/apis`
- DELETE `/api/data/apis/{id}`
- POST `/api/proxy/check`

## Notes
- Uses BIGSERIAL-compatible schema.
- Uses `INSERT ... RETURNING id` for reliable ID retrieval (PostgreSQL mode).
- Auto-refresh every 30s on the frontend.
- Compliance metrics computed on the client as specified.
- Single JAR packaging includes built React app in `src/main/resources/static`.
