"""
Property DB storage.

ecommerce_storage.py jaisa hi — fingerprint-based dedup, found/saved/failed stats,
RawScrapedProduct-style raw row + ek normalized PropertyListing row.

Yeh aap ke existing `app.database.SessionLocal` aur `app.models` use karta hai.
Ek naya model `PropertyListing` chahiye (JobListing jaisa) — uska SQLAlchemy
definition `property_models_snippet.py` mein diya hai, usay `app/models.py` mein
paste kar dein.
"""

import hashlib
import logging
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, Iterable

from app.database import SessionLocal
from app import models

logger = logging.getLogger(__name__)

SOURCE_TO_LABEL = {
    "zameen": "Zameen",
    "olx": "OLX",
    "graana": "Graana",
}


def _decimal_or_none(value: Any) -> Decimal | None:
    if value is None or value == "":
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        return None


def _fingerprint(listing: Dict[str, Any]) -> str:
    raw = "|".join(
        [
            listing.get("source", ""),
            listing.get("listing_url", ""),
            listing.get("title", ""),
            str(listing.get("price_amount") or listing.get("price") or ""),
        ]
    )
    return hashlib.sha256(raw.encode("utf-8", errors="ignore")).hexdigest()


def save_property_listings(query: str, listings: Iterable[Dict[str, Any]]) -> Dict[str, int]:
    db = SessionLocal()
    found = 0
    saved = 0
    failed = 0

    try:
        # Existing dedup set (is query ke liye pehle se DB mein konse URLs hain)
        existing_urls = set()
        try:
            rows = (
                db.query(models.PropertyListing.listing_url)
                .filter(models.PropertyListing.query.ilike(f"%{query.lower()}%"))
                .all()
            )
            existing_urls = {r[0] for r in rows if r[0]}
        except Exception as exc:
            logger.debug("[PropertyStorage] preload dedup skipped: %s", exc)

        for listing in listings:
            found += 1
            try:
                title = (listing.get("title") or "").strip()
                listing_url = (listing.get("listing_url") or "").strip()
                source = (listing.get("source") or "").strip().lower()

                if not title or not listing_url or not source:
                    failed += 1
                    continue

                fingerprint = _fingerprint(listing)

                data = {
                    "query": query.lower().strip(),
                    "source": source,
                    "source_label": SOURCE_TO_LABEL.get(source, listing.get("source_label") or source.title()),
                    "title": title[:500],
                    "price": (listing.get("price") or "")[:200],
                    "price_amount": _decimal_or_none(listing.get("price_amount")),
                    "currency": listing.get("currency") or "PKR",
                    "location": (listing.get("location") or "")[:300],
                    "beds": (listing.get("beds") or "")[:50],
                    "baths": (listing.get("baths") or "")[:50],
                    "area": (listing.get("area") or "")[:100],
                    "purpose": (listing.get("purpose") or "")[:20],
                    "property_type": (listing.get("property_type") or "")[:50],
                    "image_url": listing.get("image_url") or "",
                    "listing_url": listing_url,
                    "description": listing.get("description") or "",
                    "agent_name": (listing.get("agent_name") or "")[:200],
                    "posted_at": (listing.get("posted_at") or "")[:100],
                    "fingerprint": fingerprint,
                    "scraped_at": datetime.now(timezone.utc),
                }

                existing = (
                    db.query(models.PropertyListing)
                    .filter(models.PropertyListing.source == source)
                    .filter(models.PropertyListing.listing_url == listing_url)
                    .first()
                )

                if existing:
                    for key, value in data.items():
                        setattr(existing, key, value)
                elif listing_url in existing_urls:
                    # already queued this run
                    pass
                else:
                    db.add(models.PropertyListing(**data))
                    existing_urls.add(listing_url)

                saved += 1
            except Exception as exc:
                failed += 1
                logger.warning("[PropertyStorage] Failed listing save: %s", exc)

        db.commit()
        return {"found": found, "saved": saved, "failed": failed}
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()