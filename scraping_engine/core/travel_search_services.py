"""
travel_search_services.py — DB-first travel search + save.

Flow:
  1) force_scrape=False -> DB check first (search_in_db)
  2) DB miss / force_scrape -> live SerpApi scrape + save to DB

Dedup logic: uses booking_url when available, falls back to (title + source)
fingerprint so the same hotel is never inserted twice even without a URL.
"""

import hashlib
import logging
import re
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List

from scraping_engine.core.travel_runner import flatten_travel_results, run_all_travel_scrapers

logger = logging.getLogger(__name__)

# No TTL — listings are kept forever in the DB


def _get_db():
    try:
        from app.database import SessionLocal
        return SessionLocal()
    except Exception as exc:
        logger.error("[TravelSearch] DB connection FAILED: %s", exc)
        return None


def _fingerprint(item: Dict[str, Any]) -> str:
    """Unique key for an item — URL if available, else title+source hash."""
    url = (item.get("booking_url") or item.get("source_url") or "").strip()
    if url:
        return url
    raw = f"{item.get('title', '').strip().lower()}|{item.get('source', '').strip().lower()}"
    return hashlib.md5(raw.encode()).hexdigest()


# Words that carry no location/type meaning — stripped before keyword search
_STOP_WORDS = {
    "in", "at", "the", "a", "an", "for", "of", "near", "around",
    "hotels", "hotel", "flights", "flight", "tours", "tour",
    "packages", "package", "trip", "travel", "booking",
}


def _keywords(query: str) -> List[str]:
    """Extract meaningful search keywords from a free-text query."""
    words = re.split(r"[\s,/\-]+", query.lower().strip())
    return [w for w in words if len(w) >= 3 and w not in _STOP_WORDS]


def _db_search(db, model, keywords: List[str], limit: int):
    """
    Search TravelListing across title / city / location / query / hotel_name.
    Returns rows matching ANY keyword (broad) — caller narrows if needed.
    """
    from sqlalchemy import or_

    conditions = []
    for kw in keywords:
        conditions.append(or_(
            model.query.ilike(f"%{kw}%"),
            model.title.ilike(f"%{kw}%"),
            model.city.ilike(f"%{kw}%"),
            model.location.ilike(f"%{kw}%"),
            model.hotel_name.ilike(f"%{kw}%"),
        ))

    q = db.query(model).filter(or_(*conditions)).order_by(model.scraped_at.desc())
    if limit > 0:
        q = q.limit(limit)
    return q.all()


def search_in_db(query: str, limit: int = 0) -> List[Dict[str, Any]]:
    db = _get_db()
    if not db:
        return []
    try:
        from app.models import TravelListing

        clean = query.lower().strip()
        generic = {"pakistan travel", "travel", ""}

        # Generic / empty query → return everything
        if clean in generic:
            q = db.query(TravelListing).order_by(TravelListing.scraped_at.desc())
            if limit > 0:
                q = q.limit(limit)
            rows = q.all()
            logger.info("[TravelSearch] generic query → %d rows", len(rows))
            return [_row_to_dict(r) for r in rows]

        # --- Pass 1: keyword search across multiple fields ---
        kws = _keywords(clean)
        rows = _db_search(db, TravelListing, kws, limit) if kws else []

        # --- Pass 2: fuzzy / typo fallback (prefix of each keyword) ---
        if not rows and kws:
            prefixes = [kw[:5] for kw in kws if len(kw) >= 5]
            if prefixes:
                rows = _db_search(db, TravelListing, prefixes, limit)
                if rows:
                    logger.info(
                        "[TravelSearch] fuzzy hit (%s → %s): %d rows",
                        kws, prefixes, len(rows),
                    )

        if not rows:
            logger.info("[TravelSearch] DB miss for '%s'", query)
            return []

        logger.info("[TravelSearch] DB hit: %d results for '%s'", len(rows), query)
        return [_row_to_dict(r) for r in rows]

    except Exception as exc:
        logger.error("[TravelSearch] search_in_db error: %s", exc)
        return []
    finally:
        db.close()


def save_to_db(query: str, items: List[Dict[str, Any]]) -> None:
    if not items:
        return
    db = _get_db()
    if not db:
        return
    try:
        from app.models import TravelListing

        now = datetime.now(timezone.utc)

        # Build dedup set from ALL existing records (title+source fingerprints + URLs)
        existing = set()
        for (url, title, source) in db.query(
            TravelListing.booking_url,
            TravelListing.title,
            TravelListing.source,
        ).all():
            if url:
                existing.add(url.strip())
            if title and source:
                raw = f"{title.strip().lower()}|{source.strip().lower()}"
                existing.add(hashlib.md5(raw.encode()).hexdigest())

        new_rows = []
        for item in items:
            fp = _fingerprint(item)
            if fp in existing:
                continue
            existing.add(fp)

            price_amount = None
            try:
                raw = item.get("price_amount")
                if raw is not None:
                    price_amount = Decimal(str(raw))
            except (InvalidOperation, ValueError):
                pass

            url = (item.get("booking_url") or item.get("source_url") or "").strip()

            new_rows.append(TravelListing(
                query          = query.lower().strip(),
                source         = (item.get("source") or "")[:100],
                offer_type     = (item.get("offer_type") or "travel")[:50],
                title          = (item.get("title") or "")[:500],
                description    = (item.get("description") or ""),
                price          = (item.get("price") or "")[:200],
                price_amount   = price_amount,
                currency       = (item.get("currency") or "PKR")[:10],
                image_url      = (item.get("image_url") or ""),
                location       = (item.get("location") or "")[:300],
                city           = (item.get("city") or "")[:150],
                country        = (item.get("country") or "")[:150],
                origin         = (item.get("origin") or "")[:150],
                destination    = (item.get("destination") or "")[:150],
                airline        = (item.get("airline") or "")[:150],
                hotel_name     = (item.get("hotel_name") or "")[:255],
                nights         = str(item.get("nights") or "")[:50],
                booking_url    = url,
                check_in_date  = (item.get("check_in_date") or "")[:50],
                check_out_date = (item.get("check_out_date") or "")[:50],
                rating         = item.get("rating"),
                scraped_at     = now,
                expires_at     = None,
            ))

        if new_rows:
            db.bulk_save_objects(new_rows)
            db.commit()
        logger.info("[TravelSearch] Saved %d new items (skipped %d dupes) for '%s'",
                    len(new_rows), len(items) - len(new_rows), query)
    except Exception as exc:
        logger.error("[TravelSearch] save_to_db error: %s", exc)
        db.rollback()
    finally:
        db.close()


def _row_to_dict(row) -> Dict[str, Any]:
    return {
        "title":          row.title,
        "description":    row.description,
        "price":          row.price,
        "price_amount":   float(row.price_amount) if row.price_amount is not None else None,
        "currency":       row.currency,
        "image_url":      row.image_url,
        "location":       row.location,
        "city":           row.city,
        "country":        row.country,
        "offer_type":     row.offer_type,
        "origin":         row.origin,
        "destination":    row.destination,
        "airline":        row.airline,
        "hotel_name":     row.hotel_name,
        "nights":         row.nights,
        "booking_url":    row.booking_url,
        "check_in_date":  row.check_in_date,
        "check_out_date": row.check_out_date,
        "rating":         float(row.rating) if row.rating is not None else None,
        "source":         row.source,
        "source_label":   (row.source or "").replace("_", " ").title(),
    }


def search_travel(
    query: str,
    max_items: int = 10,
    force_scrape: bool = False,
) -> Dict[str, Any]:
    logger.info("[TravelSearch] Query='%s' force_scrape=%s", query, force_scrape)

    MIN_RESULTS = 5

    # Step 1: DB first (no limit — return everything we have)
    if not force_scrape:
        cached = search_in_db(query)
        if len(cached) >= MIN_RESULTS:
            return {
                "status":        "success",
                "source":        "database",
                "query":         query,
                "total_results": len(cached),
                "travel_items":  cached,
            }

    # Step 2: Live scrape
    raw = run_all_travel_scrapers(query=query, max_items_per_site=max_items)
    items = flatten_travel_results(raw)

    # Step 3: Save to DB (deduped)
    save_to_db(query, items)

    # Return from DB so caller always gets full picture
    all_items = search_in_db(query)
    return {
        "status":        "success",
        "source":        "live_scrape",
        "query":         query,
        "total_results": len(all_items),
        "travel_items":  all_items,
    }
