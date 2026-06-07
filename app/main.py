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
from scraping_engine.core.travel_runner import (
    flatten_travel_results,
    run_all_travel_scrapers,
)


app = FastAPI(title="ScrapIt API")


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    seed_domains()


def seed_domains():
    domains = [
        ("ecommerce", "E-commerce", "Products, prices, categories, availability, and offers."),
        ("real_estate", "Real Estate", "Properties for sale or rent."),
        ("jobs", "Jobs", "Job posts, companies, salaries, and work locations."),
        ("flights_travel", "Flights & Travel", "Flights, hotels, packages, and travel offers."),
        ("automobiles", "Automobiles", "Cars, bikes, and vehicle listings."),
    ]

    db = SessionLocal()
    try:
        for code, name, description in domains:
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


@app.get("/api/travel")
async def fetch_travel(
    q: str = Query("Hunza tour", description="Travel search query, e.g., 'Hunza tour'"),
    max_items: int = Query(5, ge=1, le=20, description="Maximum items per travel source"),
):
    try:
        results = await run_in_threadpool(
            run_all_travel_scrapers,
            query=q,
            max_items_per_site=max_items,
        )
        travel_items = flatten_travel_results(results)
        return {
            "status": "success",
            "source": "live_travel_scrape",
            "query": q,
            "total_results": len(travel_items),
            "results_by_source": results,
            "travel_items": travel_items,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
