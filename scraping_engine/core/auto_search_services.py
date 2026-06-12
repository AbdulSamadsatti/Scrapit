"""
auto_search_services.py — DB-first automobile search + save.

Flow:
  1) force_scrape=False -> DB check first (search_in_db)
  2) DB miss / force_scrape -> live scrape (PakWheels + OLX + Google) + save to DB

Dedup: uses listing_url when available, falls back to (title + source) MD5 fingerprint.
Mirrors travel_search_services.py architecture exactly.
"""

import hashlib
import logging
import re
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List

from scraping_engine.core.auto_runner import flatten_auto_results, run_all_auto_scrapers

logger = logging.getLogger(__name__)


def _get_db():
    try:
        from app.database import SessionLocal
        return SessionLocal()
    except Exception as exc:
        logger.error("[AutoSearch] DB connection FAILED: %s", exc)
        return None


def _fingerprint(item: Dict[str, Any]) -> str:
    """Unique key — URL if available, else title+source hash."""
    url = (item.get("listing_url") or "").strip()
    if url:
        return url
    raw = f"{item.get('title', '').strip().lower()}|{item.get('source', '').strip().lower()}"
    return hashlib.md5(raw.encode()).hexdigest()


_STOP_WORDS = {
    "in", "at", "the", "a", "an", "for", "of", "near", "around",
    "car", "cars", "vehicle", "vehicles", "used", "new", "sale",
    "buy", "sell", "price", "pakistan", "available",
    "bike", "bikes", "motorcycle", "motorcycles", "bicycle", "bicycles",
    "cheap", "best", "top",
}


def _keywords(query: str) -> List[str]:
    """Extract meaningful search keywords from a free-text query."""
    words = re.split(r"[\s,/\-]+", query.lower().strip())
    return [w for w in words if len(w) >= 2 and w not in _STOP_WORDS]


def _db_search(db, model, keywords: List[str], limit: int = 0):
    """Search AutoListing across title / city / location / query / make / model."""
    from sqlalchemy import or_

    conditions = []
    for kw in keywords:
        conditions.append(or_(
            model.query.ilike(f"%{kw}%"),
            model.title.ilike(f"%{kw}%"),
            model.city.ilike(f"%{kw}%"),
            model.location.ilike(f"%{kw}%"),
            model.make.ilike(f"%{kw}%"),
            model.model.ilike(f"%{kw}%"),
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
        from app.models import AutoListing

        clean = query.lower().strip()
        generic = {"used cars pakistan", "cars", "car", "vehicles", "automobiles",
                   "bikes", "bike", "motorcycle", "motorcycles", "bicycle", "bicycles", ""}

        if clean in generic:
            q = db.query(AutoListing).filter(
                AutoListing.image_url.isnot(None),
                AutoListing.image_url != "",
            ).order_by(AutoListing.scraped_at.desc())
            if limit > 0:
                q = q.limit(limit)
            rows = q.all()
            logger.info("[AutoSearch] generic query → %d rows", len(rows))
            return [_row_to_dict(r) for r in rows]

        # Pass 1: keyword search
        kws = _keywords(clean)
        rows = _db_search(db, AutoListing, kws, limit) if kws else []

        # Pass 2: fuzzy prefix fallback
        if not rows and kws:
            prefixes = [kw[:5] for kw in kws if len(kw) >= 5]
            if prefixes:
                rows = _db_search(db, AutoListing, prefixes, limit)
                if rows:
                    logger.info(
                        "[AutoSearch] fuzzy hit (%s → %s): %d rows",
                        kws, prefixes, len(rows),
                    )

        if not rows:
            logger.info("[AutoSearch] DB miss for '%s'", query)
            return []

        # Only return rows with images
        rows = [r for r in rows if r.image_url and r.image_url.strip()]
        logger.info("[AutoSearch] DB hit: %d results for '%s' (with images)", len(rows), query)
        return [_row_to_dict(r) for r in rows]

    except Exception as exc:
        logger.error("[AutoSearch] search_in_db error: %s", exc)
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
        from app.models import AutoListing

        now = datetime.now(timezone.utc)

        existing = set()
        for (url, title, source) in db.query(
            AutoListing.listing_url,
            AutoListing.title,
            AutoListing.source,
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

            new_rows.append(AutoListing(
                query           = query.lower().strip(),
                source          = (item.get("source") or "")[:100],
                title           = (item.get("title") or "")[:500],
                description     = (item.get("description") or ""),
                price           = (item.get("price") or "")[:200],
                price_amount    = price_amount,
                currency        = (item.get("currency") or "PKR")[:10],
                image_url       = (item.get("image_url") or ""),
                location        = (item.get("location") or "")[:300],
                city            = (item.get("city") or "")[:150],
                make            = (item.get("make") or "")[:100],
                model           = (item.get("model") or "")[:100],
                year            = item.get("year"),
                mileage         = (item.get("mileage") or "")[:100],
                fuel_type       = (item.get("fuel_type") or "")[:50],
                transmission    = (item.get("transmission") or "")[:50],
                engine_capacity = (item.get("engine_capacity") or "")[:50],
                body_type       = (item.get("body_type") or "")[:50],
                color           = (item.get("color") or "")[:50],
                condition       = (item.get("condition") or "")[:50],
                listing_url     = (item.get("listing_url") or ""),
                scraped_at      = now,
                expires_at      = None,
            ))

        if new_rows:
            db.bulk_save_objects(new_rows)
            db.commit()
        logger.info(
            "[AutoSearch] Saved %d new items (skipped %d dupes) for '%s'",
            len(new_rows), len(items) - len(new_rows), query,
        )
    except Exception as exc:
        logger.error("[AutoSearch] save_to_db error: %s", exc)
        db.rollback()
    finally:
        db.close()


def _row_to_dict(row) -> Dict[str, Any]:
    return {
        "title":           row.title,
        "description":     row.description,
        "price":           row.price,
        "price_amount":    float(row.price_amount) if row.price_amount is not None else None,
        "currency":        row.currency,
        "image_url":       row.image_url,
        "location":        row.location,
        "city":            row.city,
        "make":            row.make,
        "model":           row.model,
        "year":            row.year,
        "mileage":         row.mileage,
        "fuel_type":       row.fuel_type,
        "transmission":    row.transmission,
        "engine_capacity": row.engine_capacity,
        "body_type":       row.body_type,
        "color":           row.color,
        "condition":       row.condition,
        "listing_url":     row.listing_url,
        "source":          row.source,
        "source_label":    (row.source or "").replace("_", " ").title(),
    }


def search_automobiles(
    query: str,
    max_items: int = 20,
    force_scrape: bool = False,
) -> Dict[str, Any]:
    logger.info("[AutoSearch] Query='%s' force_scrape=%s", query, force_scrape)

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
                "auto_items":    cached,
            }

    # Step 2: Live scrape
    raw = run_all_auto_scrapers(query=query, max_items_per_site=max_items)
    items = flatten_auto_results(raw)

    # Step 3: Save to DB (deduped)
    save_to_db(query, items)

    # Return from DB so caller always gets full picture
    all_items = search_in_db(query)
    return {
        "status":        "success",
        "source":        "live_scrape",
        "query":         query,
        "total_results": len(all_items),
        "auto_items":    all_items,
    }
