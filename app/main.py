from fastapi import FastAPI

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
