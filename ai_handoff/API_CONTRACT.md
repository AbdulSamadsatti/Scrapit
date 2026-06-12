# API_CONTRACT.md

## AI Handoff Endpoints

| Method | Path | Query Parameters | Description |
|--------|------|------------------|-------------|
| GET | `/api/ai/dataset` | `domain` (ecommerce, jobs, property), `limit` (default 500), `offset` (default 0) | Returns a paginated list of items for the specified domain.
| GET | `/api/ai/item` | `domain`, `id` | Returns a single item by its unique identifier.
| GET | `/api/ai/search` | `domain`, `q` (search term), `limit`, `offset` | Searches items in the domain and returns matching results.
| POST | `/api/ai/events` | JSON body describing an event (e.g., user interaction) | Records the event for analytics.
| GET | `/api/ai/recommendations` | `user_id`, `limit` | Returns AI‑generated recommendations for the user.

All responses are JSON objects with a `status` field (`"success"` or `"error"`) and a `data` field containing the payload.
