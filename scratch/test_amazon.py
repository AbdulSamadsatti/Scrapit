import sys
import os
import json
import logging

logging.basicConfig(level=logging.INFO)

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from scraping_engine.playwright_scraper.amazon_oxylabs import scrape_amazon_products

def main():
    print("Scraping amazon for 'iphone'...")
    res = scrape_amazon_products("iphone", max_products=5)
    print("Scrape Result Keys:", res.keys())
    if "data" in res and res["data"]:
        print(f"Scraped {len(res['data'])} products.")
        for i, prod in enumerate(res["data"]):
            print(f"\nProduct {i+1}:")
            print("Title:", prod.get("title"))
            print("Price:", prod.get("price"))
            print("Image URL:", prod.get("image_url"))
            print("Raw keys:", prod.get("raw", {}).keys())
            # Print image-related keys from raw
            raw = prod.get("raw", {})
            img_keys = [k for k in raw.keys() if "image" in k or "thumb" in k or "pic" in k or "img" in k]
            print("Image-related keys in raw:", img_keys)
            for k in img_keys:
                print(f"  {k} = {raw[k]}")
    else:
        print("No products returned or error:", res.get("error"))

if __name__ == "__main__":
    main()
