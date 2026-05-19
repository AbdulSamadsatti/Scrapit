from datetime import datetime
from decimal import Decimal, InvalidOperation
import re

from sqlalchemy.orm import Session

from app import models


def normalize_title(title: str | None) -> str | None:
    if not title:
        return None
    value = title.lower().strip()
    value = re.sub(r"\s+", " ", value)
    return re.sub(r"[^a-z0-9\s+-]", "", value)


def parse_price(raw_price: str | int | float | None) -> Decimal | None:
    if raw_price is None:
        return None
    cleaned = re.sub(r"[^0-9.]", "", str(raw_price))
    if not cleaned:
        return None
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        return None


def detect_currency(raw_price: str | None) -> str | None:
    if not raw_price:
        return None
    value = raw_price.lower()
    if "$" in raw_price:
        return "USD"
    if "rs" in value or "pkr" in value:
        return "PKR"
    if "aed" in value:
        return "AED"
    if "£" in raw_price:
        return "GBP"
    if "€" in raw_price:
        return "EUR"
    return None


def _pick(data: dict, *keys: str):
    for key in keys:
        if data.get(key) is not None:
            return data[key]
    return None


def common_item_values(raw_item: models.RawScrapedItem) -> dict:
    raw_data = raw_item.raw_data or {}
    title = _pick(raw_data, "title", "name") or raw_item.raw_title
    raw_price = _pick(raw_data, "price", "price_amount", "salary", "fare") or raw_item.raw_price
    item_url = _pick(raw_data, "item_url", "product_url", "listing_url", "job_url", "booking_url", "url")

    return {
        "domain_id": raw_item.domain_id,
        "website_id": raw_item.website_id,
        "raw_scraped_item_id": raw_item.id,
        "title": title,
        "normalized_title": normalize_title(title),
        "summary": _pick(raw_data, "summary", "description"),
        "item_url": item_url or raw_item.source_url,
        "image_url": _pick(raw_data, "image_url", "image", "thumbnail"),
        "location_text": _pick(raw_data, "location", "address") or raw_item.raw_location,
        "city": raw_data.get("city"),
        "country": raw_data.get("country"),
        "latitude": raw_data.get("latitude"),
        "longitude": raw_data.get("longitude"),
        "price_amount": parse_price(raw_price),
        "currency": raw_data.get("currency") or detect_currency(str(raw_price) if raw_price else None),
        "status": _pick(raw_data, "status", "availability"),
        "metadata_json": raw_data,
    }


def _upsert_detail(db: Session, model, item_id: int, values: dict):
    detail = db.get(model, item_id)
    if detail:
        for field, value in values.items():
            setattr(detail, field, value)
    else:
        detail = model(item_id=item_id, **values)
        db.add(detail)
    return detail


def _detail_values(domain_code: str, raw_data: dict, detail_data: dict) -> tuple[type, dict]:
    data = {**raw_data, **detail_data}

    if domain_code == "ecommerce":
        return models.EcommerceItem, {
            "brand": data.get("brand"),
            "category": data.get("category"),
            "subcategory": data.get("subcategory"),
            "sku": data.get("sku"),
            "item_condition": data.get("condition"),
            "availability": data.get("availability"),
            "rating": data.get("rating"),
            "review_count": data.get("review_count"),
            "seller_name": data.get("seller_name"),
            "shipping_info": data.get("shipping_info"),
            "specs": data.get("specs") or data.get("metadata") or {},
        }

    if domain_code == "real_estate":
        return models.RealEstateItem, {
            "listing_type": data.get("listing_type"),
            "property_type": data.get("property_type"),
            "bedrooms": data.get("bedrooms"),
            "bathrooms": data.get("bathrooms"),
            "area_value": data.get("area_value"),
            "area_unit": data.get("area_unit"),
            "address": data.get("address"),
            "agency_name": data.get("agency_name"),
            "agent_name": data.get("agent_name"),
            "contact_phone": data.get("contact_phone"),
            "furnished": data.get("furnished"),
            "amenities": data.get("amenities") or [],
        }

    if domain_code == "jobs":
        return models.JobItem, {
            "company_name": data.get("company_name"),
            "employment_type": data.get("employment_type"),
            "workplace_type": data.get("workplace_type"),
            "experience_level": data.get("experience_level"),
            "salary_min": data.get("salary_min"),
            "salary_max": data.get("salary_max"),
            "salary_period": data.get("salary_period"),
            "skills": data.get("skills") or [],
            "apply_url": data.get("apply_url"),
            "posted_at": data.get("posted_at"),
            "expires_at": data.get("expires_at"),
        }

    if domain_code == "flights_travel":
        return models.TravelItem, {
            "offer_type": data.get("offer_type"),
            "origin": data.get("origin"),
            "destination": data.get("destination"),
            "departure_at": data.get("departure_at"),
            "return_at": data.get("return_at"),
            "airline": data.get("airline"),
            "hotel_name": data.get("hotel_name"),
            "nights": data.get("nights"),
            "travelers": data.get("travelers"),
            "booking_url": data.get("booking_url"),
            "baggage_info": data.get("baggage_info"),
            "details": data.get("details") or data.get("metadata") or {},
        }

    if domain_code == "automobiles":
        return models.AutomobileItem, {
            "vehicle_type": data.get("vehicle_type"),
            "make": data.get("make"),
            "model": data.get("model"),
            "variant": data.get("variant"),
            "year": data.get("year"),
            "mileage_km": data.get("mileage_km"),
            "fuel_type": data.get("fuel_type"),
            "transmission": data.get("transmission"),
            "engine_capacity": data.get("engine_capacity"),
            "color": data.get("color"),
            "registration_city": data.get("registration_city"),
            "vehicle_condition": data.get("vehicle_condition"),
            "seller_type": data.get("seller_type"),
            "specs": data.get("specs") or data.get("metadata") or {},
        }

    raise ValueError(f"Unsupported domain code: {domain_code}")


def upsert_item_from_raw(
    db: Session,
    raw_item: models.RawScrapedItem,
    detail_data: dict | None = None,
) -> models.Item:
    values = common_item_values(raw_item)
    if not values["title"]:
        raise ValueError("Raw item is missing title")
    if not values["item_url"]:
        raise ValueError("Raw item is missing item_url/source_url")

    item = (
        db.query(models.Item)
        .filter(
            models.Item.website_id == values["website_id"],
            models.Item.item_url == values["item_url"],
        )
        .first()
    )

    if item:
        for field, value in values.items():
            setattr(item, field, value)
    else:
        item = models.Item(**values)
        db.add(item)
        db.flush()

    detail_model, detail_values = _detail_values(
        raw_item.domain.code,
        raw_item.raw_data or {},
        detail_data or {},
    )
    _upsert_detail(db, detail_model, item.id, detail_values)

    if values["price_amount"] is not None:
        db.add(
            models.ItemPriceHistory(
                item_id=item.id,
                price_amount=values["price_amount"],
                currency=values["currency"],
            )
        )

    raw_item.processing_status = "normalized"
    raw_item.processed_at = datetime.utcnow()
    raw_item.error_message = None

    db.commit()
    db.refresh(item)
    return item
