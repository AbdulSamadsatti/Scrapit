# Travel Scrapers

These scrapers follow the same `scraping_engine` style as the existing jobs scrapers.

Approved travel sources:

- Kipgo
- Sastaticket
- Bookme

## Files

```text
scraping_engine/configs/travel_config.py
scraping_engine/playwright_scraper/travel_common.py
scraping_engine/playwright_scraper/kipgo.py
scraping_engine/playwright_scraper/sastaticket.py
scraping_engine/playwright_scraper/bookme.py
scraping_engine/core/travel_runner.py
```

## Run All Travel Scrapers

```python
from scraping_engine.core.travel_runner import run_all_travel_scrapers

results = run_all_travel_scrapers("Hunza tour", max_items_per_site=5)
print(results)
```

## Output Format

Each source returns:

```python
{
    "data": [...],
    "source": "kipgo",
    "count": 5
}
```

Each travel item contains:

```text
title
description
price
currency
image_url
images
location
city
country
offer_type
origin
destination
departure_at
return_at
airline
hotel_name
nights
travelers
booking_url
source_url
source
source_label
raw_data
```

The frontend should use:

```text
source_url
```

or:

```text
booking_url
```

to open the original website when a user taps a travel item.

## Important Note

Live flight prices often require selecting dates, passengers, origin, and destination. These first scrapers focus on public cards/pages and source links. Later, we can add route/date-specific scraping once the frontend decides the exact travel search fields.
