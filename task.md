# Task Checklist: Stage 11 - Dashboard (Environment Variables Configuration)

## Phase 1: Security & Config Migration
- [x] Extract database password to `${DB_PASSWORD}` in `application.properties`
- [x] Extract jwt secret key to `${JWT_SECRET}` in `application.properties`
- [x] Confirm no hardcoded API keys or credentials exist in configurations

## Phase 2: Operations
- [x] Stop orphaned backend processes on port `8080`
- [x] Start the Spring Boot backend server supplying the new environment variables
- [x] Start the Vite frontend server on port `5173`
- [x] Verify server liveness and update `walkthrough.md`
