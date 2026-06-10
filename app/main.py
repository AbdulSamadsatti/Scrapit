from fastapi import FastAPI, HTTPException, Query
from fastapi.concurrency import run_in_threadpool

from app.database import Base, SessionLocal, engine
from app import models
from app.routes import (
    chatbot,
    domains,
    favorites,
    items,
    products,
    raw_scraped_products,
    scraper,
    search_history,
    users,
    websites,
)

app = FastAPI(title="ScrapIt API")

# Module-level scheduler references so they can be shut down cleanly
_job_scheduler = None
_travel_scheduler = None
_auto_scheduler = None


@app.on_event("startup")
def startup():
    global _job_scheduler, _travel_scheduler, _auto_scheduler

    # Create all DB tables (includes new JobListing + TravelListing)
    Base.metadata.create_all(bind=engine)
    seed_domains()

    # Start background schedulers
    try:
        from scraping_engine.core.scheduler import start_scheduler
        _job_scheduler = start_scheduler(interval_minutes=10)
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("Job scheduler failed to start: %s", exc)

    try:
        from scraping_engine.core.travel_scheduler import start_travel_scheduler
        _travel_scheduler = start_travel_scheduler(interval_minutes=15)
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("Travel scheduler failed to start: %s", exc)

    try:
        from scraping_engine.core.auto_scheduler import start_auto_scheduler
        _auto_scheduler = start_auto_scheduler(interval_minutes=15)
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("Auto scheduler failed to start: %s", exc)

@app.on_event("shutdown")
def shutdown():
    if _job_scheduler:
        _job_scheduler.shutdown()
    if _travel_scheduler:
        _travel_scheduler.shutdown()
    if _auto_scheduler:
        _auto_scheduler.shutdown()


def seed_domains():
    domain_data = [
        ("ecommerce", "E-commerce", "Products, prices, categories, availability, and offers."),
        ("real_estate", "Real Estate", "Properties for sale or rent."),
        ("jobs", "Jobs", "Job posts, companies, salaries, and work locations."),
        ("flights_travel", "Flights & Travel", "Flights, hotels, packages, and travel offers."),
        ("automobiles", "Automobiles", "Cars, bikes, and vehicle listings."),
    ]

    db = SessionLocal()
    try:
        for code, name, description in domain_data:
            existing = db.query(models.Domain).filter(models.Domain.code == code).first()
            if existing:
                continue
            db.add(models.Domain(code=code, name=name, description=description))
        db.commit()
    finally:
        db.close()


@app.get("/")
def root():
    return {"message": "ScrapIt backend is running"}


# ---------------------------------------------------------------------------
# Jobs — DB-first: check DB, scrape live on miss, save results
# ---------------------------------------------------------------------------
@app.get("/api/jobs")
async def fetch_jobs(
    q: str = Query(..., description="Job search query, e.g., 'python developer'"),
    location: str = Query(None, description="Location filter, e.g., 'Islamabad'"),
    force: bool = Query(False, description="Force live scrape even if DB has results"),
    max_jobs: int = Query(10, ge=1, le=50),
):
    try:
        from scraping_engine.search_services import search_jobs
        result = await run_in_threadpool(
            search_jobs,
            q,
            max_jobs_per_site=max_jobs,
            force_scrape=force,
        )
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# Travel — DB-first: check DB, scrape live on miss, save results
# ---------------------------------------------------------------------------
@app.get("/api/travel")
async def fetch_travel(
    q: str = Query("Hunza tour", description="Travel search query, e.g., 'Hunza tour'"),
    max_items: int = Query(10, ge=1),
    force: bool = Query(False, description="Force live scrape even if DB has results"),
):
    try:
        from scraping_engine.core.travel_search_services import search_travel
        result = await run_in_threadpool(
            search_travel,
            q,
            max_items=max_items,
            force_scrape=force,
        )
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# Automobiles — DB-first: check DB, scrape live on miss, save results
# ---------------------------------------------------------------------------
@app.get("/api/automobiles")
async def fetch_automobiles(
    q: str = Query("used cars Pakistan", description="Auto search query"),
    max_items: int = Query(20, ge=1),
    force: bool = Query(False, description="Force live scrape"),
):
    try:
        from scraping_engine.core.auto_search_services import search_automobiles
        result = await run_in_threadpool(
            search_automobiles,
            q,
            max_items=max_items,
            force_scrape=force,
        )
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


app.include_router(users.router)
app.include_router(domains.router)
app.include_router(websites.router)
app.include_router(items.router)
app.include_router(products.router)
app.include_router(raw_scraped_products.router)
app.include_router(scraper.router)
app.include_router(favorites.router)
app.include_router(chatbot.router)
app.include_router(search_history.router)

