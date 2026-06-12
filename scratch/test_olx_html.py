import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from scraping_engine.configs.ecommerce_config import DEFAULT_USER_AGENT, ECOMMERCE_SOURCES
from scraping_engine.engine.browser import BrowserManager

def main():
    # Construct OLX search url
    url = "https://www.olx.com.pk/items/q-iphone"
    with BrowserManager(headless=True, user_agent=DEFAULT_USER_AGENT) as mgr:
        page = mgr.new_page()
        page.goto(url, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(3000)
        
        # Dump HTML of the first card
        info = page.evaluate("""() => {
            const selectors = [
                'li[aria-label]',
                'article',
                'div[data-aut-id="itemBox"]',
                'a[href*="/item/"]'
            ];
            const card = document.querySelector(selectors.join(','));
            if (!card) return "No card found";
            
            return {
                html: card.innerHTML,
                innerText: card.innerText
            };
        }""")
        print("First OLX Card InnerText:")
        print(info.get("innerText"))
        print("\nFirst OLX Card HTML:")
        print(info.get("html"))

if __name__ == "__main__":
    main()
