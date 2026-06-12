import base64
import json
import logging
import os
import urllib.error
import urllib.request
from typing import Any, Dict, List

from scraping_engine.configs.ecommerce_config import ECOMMERCE_SOURCES
from scraping_engine.playwright_scraper.ecommerce_common import product_payload

logger = logging.getLogger(__name__)

SOURCE = "amazon"
CFG = ECOMMERCE_SOURCES[SOURCE]
OXYLABS_ENDPOINT = os.getenv("OXYLABS_ENDPOINT", "https://realtime.oxylabs.io/v1/queries")


def _credentials() -> tuple[str, str]:
    username = os.getenv("OXYLABS_USERNAME") or os.getenv("OXYLABS_USER") or ""
    password = os.getenv("OXYLABS_PASSWORD") or os.getenv("OXYLABS_PASS") or ""
    return username, password


def _post_oxylabs(payload: Dict[str, Any]) -> Dict[str, Any]:
    username, password = _credentials()
    if not username or not password:
        raise RuntimeError(
            "Oxylabs credentials missing. Set OXYLABS_USERNAME and OXYLABS_PASSWORD in .env."
        )

    body = json.dumps(payload).encode("utf-8")
    token = base64.b64encode(f"{username}:{password}".encode("utf-8")).decode("ascii")
    request = urllib.request.Request(
        OXYLABS_ENDPOINT,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Basic {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Oxylabs HTTP {exc.code}: {detail}") from exc


def _result_content(result: Dict[str, Any]) -> Any:
    results = result.get("results") or []
    if not results:
        return {}
    return results[0].get("content") or {}


def _coerce_search_items(content: Any) -> List[Dict[str, Any]]:
    if isinstance(content, dict):
        for key in ("results", "organic", "products", "search_results", "items"):
            value = content.get(key)
            if isinstance(value, list):
                return value
    if isinstance(content, list):
        return content
    return []


def _amazon_url(raw: Dict[str, Any]) -> str:
    url = raw.get("url") or raw.get("link") or raw.get("product_url") or ""
    if url.startswith("/"):
        return CFG["base_url"] + url
    return url


def scrape_amazon_products(query: str, max_products: int = 20, geo_location: str = "United States") -> Dict[str, Any]:
    payload = {
        "source": "amazon_search",
        "query": query,
        "geo_location": geo_location,
        "parse": True,
    }
    try:
        oxylabs_result = _post_oxylabs(payload)
        content = _result_content(oxylabs_result)
        items = _coerce_search_items(content)
    except Exception as exc:
        logger.error("[Amazon/Oxylabs] Search failed: %s", exc)
        return {"data": [], "source": SOURCE, "count": 0, "error": str(exc)}

    products: List[Dict[str, Any]] = []
    for raw in items[:max_products]:
        title = raw.get("title") or raw.get("name") or raw.get("asin") or ""
        price = raw.get("price") or raw.get("price_str") or raw.get("currency_price") or ""
        if isinstance(price, dict):
            price = price.get("raw") or price.get("value") or ""
        products.append(product_payload(
            source=SOURCE,
            source_label=CFG["label"],
            title=title,
            price=str(price),
            product_url=_amazon_url(raw),
            image_url=raw.get("image") or raw.get("image_url") or raw.get("thumbnail") or "",
            rating=str(raw.get("rating") or raw.get("stars") or ""),
            review_count=str(raw.get("reviews_count") or raw.get("review_count") or ""),
            seller_name=raw.get("seller") or raw.get("seller_name") or "",
            availability=raw.get("availability") or "",
            raw=raw,
        ))

    return {"data": products, "source": SOURCE, "count": len(products)}


def scrape_amazon_detail(url_or_asin: str, geo_location: str = "United States") -> Dict[str, Any]:
    query = url_or_asin
    payload = {
        "source": "amazon_product",
        "query": query,
        "geo_location": geo_location,
        "parse": True,
    }
    result = _post_oxylabs(payload)
    raw = _result_content(result)
    if isinstance(raw, dict) and "product" in raw and isinstance(raw["product"], dict):
        raw = raw["product"]

    price = raw.get("price") or raw.get("buybox_price") or raw.get("price_str") or ""
    if isinstance(price, dict):
        price = price.get("raw") or price.get("value") or ""

    images = raw.get("images") if isinstance(raw, dict) else []
    image_url = ""
    if isinstance(images, list) and images:
        image_url = images[0] if isinstance(images[0], str) else images[0].get("url", "")

    return product_payload(
        source=SOURCE,
        source_label=CFG["label"],
        title=raw.get("title") or raw.get("name") or "",
        price=str(price),
        product_url=raw.get("url") or url_or_asin,
        image_url=raw.get("image") or raw.get("image_url") or image_url,
        description=raw.get("description") or raw.get("feature_bullets") or "",
        rating=str(raw.get("rating") or ""),
        review_count=str(raw.get("reviews_count") or raw.get("review_count") or ""),
        seller_name=raw.get("seller") or raw.get("seller_name") or "",
        availability=raw.get("availability") or "",
        brand=raw.get("brand") or "",
        category=raw.get("category") or "",
        raw=raw if isinstance(raw, dict) else {"content": raw},
    )