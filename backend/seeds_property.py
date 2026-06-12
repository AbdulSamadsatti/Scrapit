"""
seed_property.py — Ek baar chalao, property DB populate ho jayegi.
Run: python seed_property.py

seed_jobs.py jaisa hi. Yeh force_scrape karke zameen/olx/graana se data laata
hai aur PropertyListing table mein save kar deta hai.
"""
import sys
import os
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)

backend_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(backend_dir)
sys.path.append(backend_dir)
sys.path.append(root_dir)

# ── DB tables banao (agar nahi bani) ─────────────────────────────
from app.database import Base, engine
from app import models  # PropertyListing bhi yahan se load hogi

Base.metadata.create_all(bind=engine)
logging.info("[OK] Tables ready.")

# ── Queries jinke liye data chahiye ──────────────────────────────
QUERIES = [
    "houses for sale in islamabad",
    "flats for rent in lahore",
    "plots for sale in dha lahore",
]

MAX_LISTINGS_PER_SITE = 5   # Zyada chahiye to barha do

from scraping_engine.property_search_services import search_property

for query in QUERIES:
    logging.info(f"\n{'='*50}")
    logging.info(f"[SCRAPING] '{query}'")
    logging.info(f"{'='*50}")

    result = search_property(
        query=query,
        max_listings_per_site=MAX_LISTINGS_PER_SITE,
        force_scrape=True,   # DB ignore, seedha scrape
    )
    logging.info(f"[DONE] {result['total_results']} listings — source: {result['source']}")

# ── Final DB count by source ─────────────────────────────────────
from app.database import SessionLocal
from app.models import PropertyListing
from sqlalchemy import func

db = SessionLocal()
try:
    rows = (
        db.query(PropertyListing.source, func.count(PropertyListing.id))
        .group_by(PropertyListing.source)
        .all()
    )
    total = db.query(func.count(PropertyListing.id)).scalar()

    print("\n" + "=" * 40)
    print("DB stored property listings:")
    print("=" * 40)
    for source, count in rows:
        print(f"  {source:<15} -> {count} listings")
    print(f"  TOTAL{'':<10} -> {total} listings")
    print("=" * 40)
finally:
    db.close()