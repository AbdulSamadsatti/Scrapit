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
        
        for _ in range(5):
            page.evaluate("window.scrollBy(0, 900)")
            page.wait_for_timeout(700)
            
        debug_info = page.evaluate("""() => {
            const selectors = [
                '[data-qa-locator="product-item"]',
                'div[data-tracking="product-card"]',
                'div.gridItem--Yd0sa',
                'div[class*="Bm3ON"]',
                'div[class*="product"]'
            ];
            const cards = Array.from(document.querySelectorAll(selectors.join(',')));
            return cards.slice(0, 5).map((card, idx) => {
                const imgEl = card.querySelector('img');
                return {
                    idx: idx + 1,
                    hasImgEl: !!imgEl,
                    imgSrc: imgEl ? imgEl.src : null,
                    imgDataSrc: imgEl ? imgEl.getAttribute('data-src') : null,
                    imgAttrSrc: imgEl ? imgEl.getAttribute('src') : null,
                    cardText: card.innerText.substring(0, 100)
                };
            });
        }""")
        for item in debug_info:
            print(item)

if __name__ == "__main__":
    main()
