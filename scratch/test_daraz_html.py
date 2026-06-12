import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from scraping_engine.configs.ecommerce_config import DEFAULT_USER_AGENT, ECOMMERCE_SOURCES
from scraping_engine.engine.browser import BrowserManager

def main():
    url = "https://www.daraz.pk/catalog/?q=iphone"
    with BrowserManager(headless=True, user_agent=DEFAULT_USER_AGENT) as mgr:
        page = mgr.new_page()
        page.goto(url, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(3000)
        
        html = page.evaluate("""() => {
            const selectors = [
                '[data-qa-locator="product-item"]',
                'div[data-tracking="product-card"]',
                'div.gridItem--Yd0sa',
                'div[class*="Bm3ON"]',
                'div[class*="product"]'
            ];
            const card = document.querySelector(selectors.join(','));
            return card ? card.innerHTML : "No card found";
        }""")
        print("First Card HTML:")
        print(html)

if __name__ == "__main__":
    main()
