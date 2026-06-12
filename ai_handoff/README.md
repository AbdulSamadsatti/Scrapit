# AI Handoff

This folder contains the contract and sample data for the **AI Handoff** feature.

- **README.md** – Overview of the folder.
- **API_CONTRACT.md** – Detailed API specification for the new AI endpoints.
- **sample_ecommerce.json**, **sample_jobs.json**, **sample_property.json** – Example payloads used for testing.
- **postman_collection.json** – A Postman collection to quickly import the endpoints.
- **env.example** – Example environment variables required by the backend.

The backend implementation lives in `backend/app/routes/ai.py` and exposes the following endpoints:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/ai/dataset` | Retrieve a paginated dataset for a given domain (ecommerce, jobs, property).
| GET | `/api/ai/item` | Retrieve a single item by its ID.
| GET | `/api/ai/search` | Search items across a domain with optional filters.
| POST | `/api/ai/events` | Record an analytics event.
| GET | `/api/ai/recommendations` | Get AI‑generated recommendations for a user.
