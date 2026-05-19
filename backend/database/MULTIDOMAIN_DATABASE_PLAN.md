# ScrapIt Multi-Domain Database

ScrapIt should use one PostgreSQL database, not five separate databases.

The five domains are:

- E-commerce
- Real Estate
- Jobs
- Flights & Travel
- Automobiles

## Why One Database

Users, Firebase auth, search history, chatbot history, saved items, websites, scrape runs, and raw scraper data are shared concepts. Keeping them in one database makes the backend easier to query and maintain.

## Core Flow

```text
scraper
  -> scrape_runs
  -> raw_scraped_items
  -> cleaner / normalizer
  -> items
  -> domain detail table
```

## Important Tables

Shared tables:

- `domains`
- `users`
- `websites`
- `scrape_runs`
- `raw_scraped_items`
- `items`
- `item_price_history`
- `saved_items`
- `search_history`
- `chatbot_messages`

Domain detail tables:

- `ecommerce_items`
- `real_estate_items`
- `job_items`
- `travel_items`
- `automobile_items`

## How A Scraper Should Save Data

Every scraper should save raw data first:

```text
raw_scraped_items.raw_data
```

Then a cleaner should create/update:

```text
items
```

Then the cleaner should create/update the correct domain table:

```text
ecommerce_items
real_estate_items
job_items
travel_items
automobile_items
```

## Deduplication Rule

The first deduplication rule is:

```text
one website + one item URL = one item
```

Implemented through:

```sql
UNIQUE (website_id, item_url)
```

Raw data also has protection for:

```text
website_id + source_url
website_id + source_item_id
```

## Running The Upgrade

In pgAdmin, open `scrapit_db`, open Query Tool, paste the contents of:

```text
002_upgrade_to_multidomain_scraper_schema.sql
```

Then execute it.

After running it, check these tables:

```text
domains
scrape_runs
raw_scraped_items
items
ecommerce_items
real_estate_items
job_items
travel_items
automobile_items
saved_items
item_price_history
```
