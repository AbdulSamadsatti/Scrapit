import hashlib
import logging
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, Iterable

from app.database import SessionLocal
from app import models

logger = logging.getLogger(__name__)

SOURCE_TO_WEBSITE = {
    "daraz": "Daraz",
    "olx": "OLX",
    "priceoye": "PriceOye",
    "amazon": "Amazon",
}


def _decimal_or_none(value: Any) -> Decimal | None:
    if value is None or value == "":
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        return None


def _normalize_title(title: str) -> str:
    return " ".join((title or "").lower().strip().split())


def _fingerprint(product: Dict[str, Any]) -> str:
    raw = "|".join(
        [
            product.get("source", ""),
            product.get("product_url", ""),
            product.get("title", ""),
            str(product.get("price_amount") or product.get("price") or ""),
        ]
    )
    return hashlib.sha256(raw.encode("utf-8", errors="ignore")).hexdigest()


def _get_or_create_ecommerce_domain(db):
    domain = db.query(models.Domain).filter(models.Domain.code == "ecommerce").first()
    if domain:
        return domain
    domain = models.Domain(
        code="ecommerce",
        name="E-commerce",
        description="Products, prices, categories, availability, and offers.",
    )
    db.add(domain)
    db.flush()
    return domain


def _get_or_create_website(db, source: str):
    name = SOURCE_TO_WEBSITE.get(source, source.title())
    domain = _get_or_create_ecommerce_domain(db)
    website = (
        db.query(models.Website)
        .filter(models.Website.domain_id == domain.id)
        .filter(models.Website.name == name)
        .first()
    )
    if website:
        return website

    base_urls = {
        "Daraz": "https://www.daraz.pk",
        "OLX": "https://www.olx.com.pk",
        "PriceOye": "https://priceoye.pk",
        "Amazon": "https://www.amazon.com",
    }
    website = models.Website(
        domain_id=domain.id,
        name=name,
        base_url=base_urls.get(name, ""),
        is_active=True,
    )
    db.add(website)
    db.flush()
    return website


def save_ecommerce_products(query: str, products: Iterable[Dict[str, Any]]) -> Dict[str, int]:
    db = SessionLocal()
    found = 0
    saved = 0
    failed = 0

    try:
        for product in products:
            found += 1
            try:
                title = (product.get("title") or "").strip()
                product_url = (product.get("product_url") or "").strip()
                source = (product.get("source") or "").strip().lower()

                if not title or not product_url or not source:
                    failed += 1
                    continue

                website = _get_or_create_website(db, source)
                raw_payload = dict(product)
                raw_payload["query"] = query

                db.add(
                    models.RawScrapedProduct(
                        website_id=website.id,
                        raw_title=title,
                        raw_price=product.get("price") or "",
                        raw_data=raw_payload,
                    )
                )

                db_product = (
                    db.query(models.Product)
                    .filter(models.Product.website_id == website.id)
                    .filter(models.Product.product_url == product_url)
                    .first()
                )

                product_data = {
                    "website_id": website.id,
                    "title": title[:500],
                    "normalized_name": _normalize_title(title)[:500],
                    "description": product.get("description") or "",
                    "price": _decimal_or_none(product.get("price_amount")),
                    "currency": product.get("currency") or "PKR",
                    "image_url": product.get("image_url") or "",
                    "product_url": product_url,
                    "category": product.get("category") or "",
                    "availability": product.get("availability") or "",
                    "metadata_json": {
                        "query": query,
                        "source": source,
                        "source_label": product.get("source_label") or "",
                        "rating": product.get("rating") or "",
                        "review_count": product.get("review_count") or "",
                        "seller_name": product.get("seller_name") or "",
                        "location": product.get("location") or "",
                        "brand": product.get("brand") or "",
                        "fingerprint": _fingerprint(product),
                        "raw": product.get("raw") or {},
                    },
                }

                if db_product:
                    for key, value in product_data.items():
                        if key != "website_id":
                            setattr(db_product, key, value)
                else:
                    db.add(models.Product(**product_data))

                saved += 1
            except Exception as exc:
                failed += 1
                logger.warning("[EcommerceStorage] Failed product save: %s", exc)

        db.commit()
        return {"found": found, "saved": saved, "failed": failed}
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()