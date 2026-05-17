# ScrapIt Backend Starter

## Setup

1. Virtual environment banao:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

2. Packages install karo:

```bash
pip install -r requirements.txt
```

3. `.env.example` ki copy bana kar `.env` naam rakho:

```bash
cp .env.example .env
```

4. `.env` mein apna PostgreSQL password set karo:

```text
DATABASE_URL=postgresql+psycopg://postgres:your_password@localhost:5432/scrapit_db
```

5. Server run karo:

```bash
uvicorn app.main:app --reload
```

6. Browser mein open karo:

```text
http://127.0.0.1:8000
```

Docs:

```text
http://127.0.0.1:8000/docs
```
