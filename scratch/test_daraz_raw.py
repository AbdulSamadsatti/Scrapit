import sys
import os

# Add project root to path BEFORE any local imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from scraping_engine.configs.ecommerce_config import DEFAULT_USER_AGENT, ECOMMERCE_SOURCES
from scraping_engine.engine.browser import BrowserManager
from scraping_engine.playwright_scraper.daraz import _LIST_JS

def main():
    url = "https://www.daraz.pk/catalog/?q=iphone"
    with BrowserManager(headless=True, user_agent=DEFAULT_USER_AGENT) as mgr:
        page = mgr.new_page()
        print("Loading page...")
        page.goto(url, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(3000)
        
        # Scroll down to ensure images are loaded
        for _ in range(5):
            page.evaluate("window.scrollBy(0, 900)")
            page.wait_for_timeout(700)
            
        raw_products = page.evaluate(_LIST_JS)
        print("Raw products returned by _LIST_JS:")
        for idx, prod in enumerate(raw_products[:5]):
            print(f"\nProduct {idx+1}:")
            print("  Title:", repr(prod.get("title")))
            print("  Price:", repr(prod.get("price")))
            print("  Product URL:", repr(prod.get("product_url")))
            print("  Image URL:", repr(prod.get("image_url")))

if __name__ == "__main__":
    main()
