from decimal import Decimal, InvalidOperation
import re

from sqlalchemy.orm import Session

from app import models


def normalize_name(title: str | None) -> str | None:
    if not title:
        return None
    clean_title = title.lower().strip()
    clean_title = re.sub(r"\s+", " ", clean_title)
    clean_title = re.sub(r"[^a-z0-9\s+-]", "", clean_title)
    return clean_title


def parse_price(raw_price: str | None) -> Decimal | None:
    if not raw_price:
        return None

    cleaned = re.sub(r"[^0-9.]", "", raw_price)
    if not cleaned:
        return None

    try:
        return Decimal(cleaned)
    except InvalidOperation:
        return None


def detect_currency(raw_price: str | None) -> str | None:
    if not raw_price:
        return None
    if "$" in raw_price:
        return "USD"
    if "£" in raw_price:
        return "GBP"
    if "€" in raw_price:
        return "EUR"
    if "rs" in raw_price.lower() or "pkr" in raw_price.lower():
        return "PKR"
    return None


def product_values_from_raw(raw_product: models.RawScrapedProduct) -> dict:
    raw_data = raw_product.raw_data or {}
    title = raw_data.get("title") or raw_product.raw_title
    product_url = raw_data.get("product_url") or raw_data.get("url")

    return {
        "website_id": raw_product.website_id,
        "title": title,
        "normalized_name": normalize_name(title),
        "description": raw_data.get("description"),
        "price": parse_price(raw_data.get("price") or raw_product.raw_price),
        "currency": raw_data.get("currency") or detect_currency(raw_product.raw_price),
        "image_url": raw_data.get("image_url") or raw_data.get("image"),
        "product_url": product_url,
        "category": raw_data.get("category"),
        "availability": raw_data.get("availability"),
        "metadata_json": raw_data.get("metadata") or raw_data.get("specs") or raw_data,
    }


def upsert_product_from_raw(db: Session, raw_product: models.RawScrapedProduct) -> models.Product:
    values = product_values_from_raw(raw_product)

    if not values["title"]:
        raise ValueError("Raw product is missing title")
    if not values["product_url"]:
        raise ValueError("Raw product is missing product_url")

    product = (
        db.query(models.Product)
        .filter(
            models.Product.website_id == values["website_id"],
            models.Product.product_url == values["product_url"],
        )
        .first()
    )

    if product:
        for field, value in values.items():
            setattr(product, field, value)
    else:
        product = models.Product(**values)
        db.add(product)

    db.commit()
    db.refresh(product)
    return product
