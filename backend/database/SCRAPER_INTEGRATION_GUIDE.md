# ScrapIt Scraper Integration Guide

This guide explains how a scraper should store data in the ScrapIt backend.

## Simple Idea

Scraper ko database mein direct data insert nahi karna.

Correct flow:

```text
scraper
  -> FastAPI endpoint
  -> raw_scraped_items table
  -> cleaner
  -> items table
  -> domain detail table
```

The scraper should send data to:

```text
POST http://127.0.0.1:8000/scraper/ingest
```

## Step 1: Start Backend

In VS Code terminal:

```bash
source .venv/bin/activate
uvicorn app.main:app --reload
```

Open docs:

```text
http://127.0.0.1:8000/docs
```

## Step 2: Check Domains

Use:

```text
GET /domains
```

Expected domains:

```text
1 = ecommerce
2 = real_estate
3 = jobs
4 = flights_travel
5 = automobiles
```

The exact IDs can be checked from `GET /domains`.

## Step 3: Create Website Source

Before scraper sends data, create the website once:

```text
POST /websites
```

Example for Daraz ecommerce:

```json
{
  "domain_id": 1,
  "name": "Daraz",
  "base_url": "https://www.daraz.pk/",
  "logo_url": "https://example.com/daraz-logo.png"
}
```

Response will include:

```json
{
  "id": 1,
  "domain_id": 1,
  "name": "Daraz"
}
```

The `id` is the `website_id`.

## Step 4: Scraper Sends Data

Use:

```text
POST /scraper/ingest
```

Example ecommerce item:

```json
{
  "scraper_name": "daraz_ecommerce_scraper",
  "normalize": true,
  "items": [
    {
      "domain_id": 1,
      "website_id": 1,
      "source_url": "https://www.daraz.pk/products/iphone-15",
      "source_item_id": "iphone-15-daraz",
      "raw_title": "Apple iPhone 15 128GB",
      "raw_price": "Rs. 250000",
      "raw_location": "Karachi",
      "raw_data": {
        "title": "Apple iPhone 15 128GB",
        "price": "Rs. 250000",
        "url": "https://www.daraz.pk/products/iphone-15",
        "image_url": "https://example.com/iphone.jpg",
        "city": "Karachi",
        "country": "Pakistan",
        "availability": "in_stock",
        "brand": "Apple",
        "category": "phones",
        "specs": {
          "storage": "128GB",
          "color": "Black"
        }
      },
      "detail_data": {
        "brand": "Apple",
        "category": "phones",
        "availability": "in_stock",
        "specs": {
          "storage": "128GB",
          "color": "Black"
        }
      }
    }
  ]
}
```

## What Happens After This

Backend stores raw data in:

```text
raw_scraped_items
```

Backend stores clean searchable data in:

```text
items
```

Backend stores ecommerce-specific data in:

```text
ecommerce_items
```

For jobs it will store detail data in:

```text
job_items
```

For real estate:

```text
real_estate_items
```

For travel:

```text
travel_items
```

For automobiles:

```text
automobile_items
```

## Step 5: Check Stored Data

Use:

```text
GET /items
```

You can filter by domain:

```text
GET /items?domain_id=1
```

## Python Scraper Example

```python
import requests

API_URL = "http://127.0.0.1:8000/scraper/ingest"

payload = {
    "scraper_name": "daraz_ecommerce_scraper",
    "normalize": True,
    "items": [
        {
            "domain_id": 1,
            "website_id": 1,
            "source_url": "https://www.daraz.pk/products/iphone-15",
            "source_item_id": "iphone-15-daraz",
            "raw_title": "Apple iPhone 15 128GB",
            "raw_price": "Rs. 250000",
            "raw_location": "Karachi",
            "raw_data": {
                "title": "Apple iPhone 15 128GB",
                "price": "Rs. 250000",
                "url": "https://www.daraz.pk/products/iphone-15",
                "image_url": "https://example.com/iphone.jpg",
                "city": "Karachi",
                "country": "Pakistan",
                "availability": "in_stock",
                "brand": "Apple",
                "category": "phones",
                "specs": {
                    "storage": "128GB",
                    "color": "Black",
                },
            },
            "detail_data": {
                "brand": "Apple",
                "category": "phones",
                "availability": "in_stock",
                "specs": {
                    "storage": "128GB",
                    "color": "Black",
                },
            },
        }
    ],
}

response = requests.post(API_URL, json=payload, timeout=30)
response.raise_for_status()
print(response.json())
```

## Important Notes

- Do not push `.env` to GitHub.
- Push `.env.example`.
- Every team member should create their own `.env`.
- If everyone uses local PostgreSQL, each person must run the SQL files.
- If everyone uses one shared cloud database, everyone should use the same `DATABASE_URL`.

## Files To Run For Database Setup

Run these in pgAdmin Query Tool:

```text
001_create_scrapit_schema.sql
002_upgrade_to_multidomain_scraper_schema.sql
```

## What To Tell The Scraper Developer

Do not insert directly into PostgreSQL.

Send scraped data to:

```text
POST /scraper/ingest
```

Required fields:

```text
domain_id
website_id
source_url
raw_title
raw_price
raw_data
detail_data
```

Backend will handle database storage.
