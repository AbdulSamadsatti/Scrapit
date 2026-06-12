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
        
        # Scroll down
        for _ in range(4):
            page.evaluate("window.scrollBy(0, 800)")
            page.wait_for_timeout(500)

        # Get some page info: find classes of elements containing product links or cards
        info = page.evaluate("""() => {
            // Find all links containing product details
            const links = Array.from(document.querySelectorAll('a')).map(a => ({
                href: a.href,
                text: a.innerText.trim(),
                className: a.className,
                parentClass: a.parentElement ? a.parentElement.className : ''
            }));
            
            // Filter links that look like actual products (e.g. contain /mobiles/apple-iphone)
            const productLinks = links.filter(l => l.href.includes('/mobiles/') && l.text.toLowerCase().includes('iphone'));
            
            // Also find all divs/sections that look like product lists
            const divs = Array.from(document.querySelectorAll('div')).map(d => d.className).filter(c => c && (c.includes('product') || c.includes('list') || c.includes('grid')));
            
            return {
                productLinks: productLinks.slice(0, 10),
                divClassesSample: Array.from(new Set(divs)).slice(0, 20)
            };
        }""")
        print("Product Links Info:")
        for pl in info["productLinks"]:
            print(pl)
        print("\nDiv classes sample:")
        print(info["divClassesSample"])

if __name__ == "__main__":
    main()
