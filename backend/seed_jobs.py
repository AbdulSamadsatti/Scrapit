"""
seed_jobs.py — Ek baar chalao, DB populate ho jayegi.
Run: python seed_jobs.py
"""
import sys
import os
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

# Path fix — backend aur project root folder dono ko path mein add karo
backend_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(backend_dir)
sys.path.append(backend_dir)
sys.path.append(root_dir)

# ── DB table banao (agar nahi bani) ──────────────────────────────
from app.database import Base, engine
from app import models  # JobListing bhi yahan se load hogi

Base.metadata.create_all(bind=engine)
logging.info("[OK] Tables ready.")

# ── Search queries — jinke liye data chahiye ──────────────────────
QUERIES = [
    "python developer",
    "react developer",
    "software engineer",
]

MAX_JOBS_PER_SITE = 5   # Zyada chahiye toh 10 karo

# ── Run ──────────────────────────────────────────────────────────
from scraping_engine.search_services import search_jobs

for query in QUERIES:
    logging.info(f"\n{'='*50}")
    logging.info(f"[SCRAPING] Scraping: '{query}'")
    logging.info(f"{'='*50}")

    result = search_jobs(
        query=query,
        max_jobs_per_site=MAX_JOBS_PER_SITE,
        force_scrape=True,   # DB ignore karo, seedha scrape karo
    )

    logging.info(f"[DONE] {result['total_results']} jobs — source: {result['source']}")
    
    # ── Final DB count ────────────────────────────────────────────────
    from app.database import SessionLocal
    from app.models import JobListing
    from sqlalchemy import func
    
    db = SessionLocal()
    try:
        rows = (
            db.query(JobListing.source, func.count(JobListing.id))
            .group_by(JobListing.source)
            .all()
        )
        total = db.query(func.count(JobListing.id)).scalar()

        print("\n" + "="*40)
        print("DB store jobs:")
        print("="*40)
        for source, count in rows:
            print(f"  {source:<15} -> {count} jobs")
        print(f"  TOTAL{'':<10} -> {total} jobs")
        print("="*40)
    finally:
        db.close()