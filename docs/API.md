# API
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/encounters`
- `GET /api/v1/encounters`
- `POST /api/v1/encounters/:id/note`
- `POST /api/v1/encounters/:id/analyze`
- `GET /api/v1/reviews/pending`
- `POST /api/v1/reviews`

All encounter and review routes require bearer authentication and permission checks.

## Phase 2 Documentation APIs
- `POST /api/v1/encounters/:id/documentation/analyze`
- `GET /api/v1/encounters/:id/documentation/gaps`
- `GET /api/v1/encounters/:id/documentation/score`
- `GET /api/v1/providers/:id/quality`

## Phase 5 Operations APIs
- `GET|POST /api/v1/queues`
- `GET /api/v1/work-items`
- `PATCH /api/v1/work-items/:id`
- `GET|POST /api/v1/denials`
- `POST /api/v1/appeals`
- `GET /api/v1/reimbursements`
- `GET /api/v1/operations/dashboard`

## Phase 7 ModelOps APIs
- `GET|POST /api/v1/models`
- `GET /api/v1/models/:id/versions`
- `GET /api/v1/training/runs`
- `GET /api/v1/predictions`
- `GET /api/v1/drift`
- `POST /api/v1/drift/check`
