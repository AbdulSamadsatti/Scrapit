import sys
import os

# Add project root to path BEFORE any local imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import urllib.parse
from scraping_engine.configs.ecommerce_config import DEFAULT_USER_AGENT, ECOMMERCE_SOURCES
from scraping_engine.engine.browser import BrowserManager

def main():
    url = "https://www.daraz.pk/catalog/?q=iphone"
    with BrowserManager(headless=True, user_agent=DEFAULT_USER_AGENT) as mgr:
        page = mgr.new_page()
        print("Loading page...")
        page.goto(url, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(3000)
        
        # Dump information about the first 5 product cards and their image elements
        cards_info = page.evaluate("""() => {
            const selectors = [
                '[data-qa-locator="product-item"]',
                'div[data-tracking="product-card"]',
                'div.gridItem--Yd0sa',
                'div[class*="Bm3ON"]',
                'div[class*="product"]'
            ];
            const cards = Array.from(document.querySelectorAll(selectors.join(',')));
            return cards.slice(0, 5).map(card => {
                const img = card.querySelector('img');
                const attrs = {};
                if (img) {
                    for (let i = 0; i < img.attributes.length; i++) {
                        attrs[img.attributes[i].name] = img.attributes[i].value;
                    }
                }
                const a = card.querySelector('a');
                return {
                    title: card.innerText.substring(0, 100),
                    imgAttrs: attrs,
                    aHref: a ? a.href : null
                };
            });
        }""")
        print("Cards found:")
        for idx, card in enumerate(cards_info):
            print(f"\nCard {idx+1}:")
            print("Title/Text:", repr(card["title"]))
            print("Link:", card["aHref"])
            print("Img attributes:", card["imgAttrs"])

if __name__ == "__main__":
    main()
