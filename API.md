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
