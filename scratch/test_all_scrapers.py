import sys
import os
import json
import logging

logging.basicConfig(level=logging.INFO)

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from scraping_engine.playwright_scraper.amazon_oxylabs import scrape_amazon_products
from scraping_engine.playwright_scraper.priceoye import scrape_priceoye_products
from scraping_engine.playwright_scraper.olx import scrape_olx_products
from scraping_engine.playwright_scraper.daraz import scrape_daraz_products

def test_source(name, func):
    print(f"\n=================== Testing {name} ===================")
    try:
        res = func("iphone", max_products=5)
        data = res.get("data", [])
        print(f"{name} returned {len(data)} products.")
        for i, prod in enumerate(data):
            print(f"Product {i+1}:")
            print("  Title:", prod.get("title")[:60] if prod.get("title") else "None")
            print("  Price:", prod.get("price"))
            print("  Image URL:", prod.get("image_url"))
    except Exception as exc:
        print(f"{name} failed with: {exc}")

def main():
    test_source("Amazon (Oxylabs)", scrape_amazon_products)
    test_source("PriceOye", scrape_priceoye_products)
    test_source("OLX", scrape_olx_products)
    test_source("Daraz", scrape_daraz_products)

if __name__ == "__main__":
    main()
