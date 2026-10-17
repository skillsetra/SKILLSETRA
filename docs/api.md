# API surface

Public:
- GET /api/health

Protected:
- GET /api/dashboard
- GET /api/competencies
- GET/POST /api/profile
- POST /api/profile/goal
- GET/POST /api/settings
- GET /api/challenges/next
- POST /api/challenges/test
- POST /api/challenges/{id}/submit
- POST /api/challenges/{id}/retest
- GET /api/projects
- POST /api/projects/analyze
- POST /api/projects/upgrades
- GET/POST /api/github
- POST /api/github/repositories/{id}/select
- GET /api/career/roles
- GET /api/career/{role}
- GET /api/resources
- POST /api/resources/summary
- GET/POST /api/roadmap
- GET /api/assessment
- POST /api/assessment/submit
- POST /api/ai/ask
- GET /api/jobs

OpenAPI docs: http://localhost:8000/docs

- GET/POST /api/project-defense
- GET /api/projects/recommendations
