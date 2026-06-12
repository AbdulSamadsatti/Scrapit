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
            
            let firstBlockCount = 0;
            let firstBlockErrors = [];
            const seen = new Set();
            const firstBlockProducts = [];
            
            for (const card of cards) {
                try {
                    const linkEl = card.querySelector('a[href*="/products/"], a[href*="/p/"], a[href]');
                    const titleEl = card.querySelector('[title], div[class*="RfADt"] a, a[title], a');
                    const priceEl = card.querySelector('span[class*="ooOxS"], span[class*="price"], div[class*="price"]');
                    const imgEl = card.querySelector('img');

                    const href = linkEl ? (linkEl.href || linkEl.getAttribute('href') || '') : '';
                    const title = (titleEl ? (titleEl.getAttribute('title') || titleEl.innerText) : '').trim();
                    const price = priceEl ? priceEl.innerText.trim() : '';
                    const image = imgEl ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || '') : '';
                    
                    if (!title || !href || seen.has(href)) {
                        firstBlockErrors.push({
                            title, href, seen: seen.has(href), text: card.innerText.substring(0, 50)
                        });
                        continue;
                    }
                    seen.add(href);
                    firstBlockProducts.push({ title, price, href, image });
                    firstBlockCount++;
                } catch(e) {
                    firstBlockErrors.push({ error: e.message });
                }
            }
            
            return {
                cardsTotal: cards.length,
                firstBlockCount,
                firstBlockProducts: firstBlockProducts.slice(0, 3),
                firstBlockErrors: firstBlockErrors.slice(0, 5)
            };
        }""")
        print("Debug Info:")
        print(debug_info)

if __name__ == "__main__":
    main()
