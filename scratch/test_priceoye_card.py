import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from scraping_engine.configs.ecommerce_config import DEFAULT_USER_AGENT, ECOMMERCE_SOURCES
from scraping_engine.engine.browser import BrowserManager

def main():
    url = "https://priceoye.pk/search?q=iphone"
    with BrowserManager(headless=True, user_agent=DEFAULT_USER_AGENT) as mgr:
        page = mgr.new_page()
        page.goto(url, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(3000)
        
        # Dump innerHTML of the first product-card
        card_html = page.evaluate("""() => {
            const card = document.querySelector('.productBox .product-card, .product-card');
            if (!card) return "No card found";
            
            const img = card.querySelector('img');
            const imgAttrs = {};
            if (img) {
                for (let i = 0; i < img.attributes.length; i++) {
                    imgAttrs[img.attributes[i].name] = img.attributes[i].value;
                }
            }
            return {
                html: card.innerHTML,
                imgAttrs
            };
        }""")
        print("Card HTML:")
        print(card_html)

if __name__ == "__main__":
    main()
