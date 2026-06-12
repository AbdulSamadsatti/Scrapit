"""
property_search_services.py  —  scraping_engine/property_search_services.py

Jobs ke `search_services.py` ka exact counterpart (top-level, core/ mein nahi).
Flow:
  1) force_scrape=False -> pehle DB check (search_in_db)
  2) DB miss / force_scrape=True -> live scrape (run_all_property_scrapers) + DB save

NOTE: Redis caching yahan NAHI hai — bilkul jobs jaisa, woh endpoint level par
`app.services.redis_client` (get_cache/set_cache/redis_lock) se hoti hai (main.py).
"""

import logging
from typing import Any, Dict, List

from scraping_engine.core.property_runner import (
    flatten_property_results,
    run_all_property_scrapers,
)
from scraping_engine.core.property_storage import save_property_listings

logger = logging.getLogger(__name__)


def _get_db():
    try:
        from app.database import SessionLocal
        return SessionLocal()
    except Exception as exc:
        logger.error("[PropertySearch] DB connection FAILED: %s", exc)
        return None


def _row_to_dict(row) -> Dict[str, Any]:
    return {
        "id": str(row.id),
        "title": row.title,
        "price": row.price,
        "price_amount": float(row.price_amount) if row.price_amount is not None else None,
        "currency": row.currency,
        "location": row.location,
        "beds": row.beds,
        "baths": row.baths,
        "area": row.area,
        "purpose": row.purpose,
        "property_type": row.property_type,
        "image_url": row.image_url,
        "listing_url": row.listing_url,
        "description": row.description,
        "agent_name": row.agent_name,
        "posted_at": row.posted_at,
        "source": row.source,
        "source_label": row.source_label,
    }


def search_in_db(query: str, shuffle: bool = False, limit: int = 60) -> List[Dict[str, Any]]:
    db = _get_db()
    if not db:
        return []
    try:
        from app.models import PropertyListing
        db_query = db.query(PropertyListing).filter(
            PropertyListing.query.ilike(f"%{query.lower()}%")
        )
        if shuffle:
            import random
            total = db_query.count()
            offset = random.randint(0, max(total - limit, 0))
            rows = db_query.offset(offset).limit(limit).all()
        else:
            rows = db_query.order_by(PropertyListing.scraped_at.desc()).limit(limit).all()
        if not rows:
            logger.info("[PropertySearch] DB miss for '%s'", query)
            return []
        logger.info("[PropertySearch] DB hit: %s listings for '%s'", len(rows), query)
        return [_row_to_dict(r) for r in rows]
    except Exception as exc:
        logger.error("[PropertySearch] search_in_db error: %s", exc)
        return []
    finally:
        db.close()


def search_property(
    query: str,
    max_listings_per_site: int = 20,
    force_scrape: bool = False,
    shuffle: bool = False,
) -> Dict[str, Any]:
    logger.info("[PropertySearch] Query='%s' force_scrape=%s", query, force_scrape)
    # Step 1: DB first
    if not force_scrape:
        cached = search_in_db(query, shuffle=shuffle, limit=max_listings_per_site * 3)
        if cached:
            return {
                "status": "success",
                "source": "database",
                "total_results": len(cached),
                "listings": cached,
            }
    # Step 2: Live scrape
    raw = run_all_property_scrapers(query, max_listings_per_site=max_listings_per_site)
    listings = flatten_property_results(raw)
    logger.info("[PropertySearch] Scraped %s total listings", len(listings))
    # Step 3: Save to DB
    if listings:
        stats = save_property_listings(query, listings)
        logger.info(
            "[PropertySearch] save: found=%s saved=%s failed=%s",
            stats["found"], stats["saved"], stats["failed"],
        )
    return {
        "status": "success",
        "source": "live_scrape",
        "total_results": len(listings),
        "listings": listings,
    }
