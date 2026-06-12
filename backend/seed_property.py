"""
seed_property.py — Property listings ko scrape karke DB mein seed karta hai.

Run (backend folder se):
    python seed_property.py

Yeh:
  1. DB tables create karta hai (Base.metadata.create_all)
  2. property_runner se teeno sources (zameen/olx/graana) scrape karta hai
  3. property_storage se DB mein save karta hai
  4. Per-source DB counts print karta hai
"""
import sys
import os
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Setup paths
backend_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(backend_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from dotenv import load_dotenv
load_dotenv()

from app.database import Base, SessionLocal, engine
from app import models
from scraping_engine.core.property_runner import run_all_property_scrapers, flatten_property_results
from scraping_engine.core.property_storage import save_property_listings

QUERIES = [
    "houses for sale in islamabad",
    "houses for sale in rawalpindi",
]
MAX_PER_SITE = 10


def main():
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    logger.info("Tables created/verified.")

    for query in QUERIES:
        logger.info("=" * 60)
        logger.info("Scraping query: %r", query)
        logger.info("=" * 60)

        results = run_all_property_scrapers(query, max_listings_per_site=MAX_PER_SITE)

        # Per-source counts
        for src, data in results.items():
            count = data.get("count", 0) if isinstance(data, dict) else 0
            error = data.get("error", "") if isinstance(data, dict) else ""
            status = f"ERROR: {error}" if error else f"{count} listings"
            logger.info("  [%s] %s", src, status)

        # Flatten and save
        listings = flatten_property_results(results)
        if listings:
            stats = save_property_listings(query, listings)
            logger.info(
                "  DB save: found=%s saved=%s failed=%s",
                stats["found"], stats["saved"], stats["failed"],
            )
        else:
            logger.warning("  No listings to save for %r", query)

    # Final DB counts
    db = SessionLocal()
    try:
        total = db.query(models.PropertyListing).count()
        zameen_count = db.query(models.PropertyListing).filter(
            models.PropertyListing.source == "zameen"
        ).count()
        olx_count = db.query(models.PropertyListing).filter(
            models.PropertyListing.source == "olx"
        ).count()
        graana_count = db.query(models.PropertyListing).filter(
            models.PropertyListing.source == "graana"
        ).count()

        logger.info("")
        logger.info("=" * 60)
        logger.info("FINAL DB COUNTS:")
        logger.info("  zameen  = %s", zameen_count)
        logger.info("  olx     = %s", olx_count)
        logger.info("  graana  = %s", graana_count)
        logger.info("  TOTAL   = %s", total)
        logger.info("=" * 60)
    finally:
        db.close()


if __name__ == "__main__":
    main()
