import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from scraping_engine.engine.browser import BrowserManager
import json

def debug_sites():
    print("Starting debug script...")
    with BrowserManager(headless=True, user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36") as mgr:
        page = mgr.new_page()

        # 2. Daraz
        try:
            print("Fetching Daraz...")
            page.goto("https://www.daraz.pk/catalog/?q=iphone", wait_until="domcontentloaded", timeout=30000)
            page.wait_for_timeout(5000)
            daraz_html = page.evaluate("""() => {
                const card = document.querySelector('[data-qa-locator="product-item"], div[data-tracking="product-card"]');
                if (!card) return 'No daraz card found';
                return card.innerHTML;
            }""")
            with open('daraz_card.html', 'w', encoding='utf-8') as f:
                f.write(daraz_html)
            print("Saved daraz_card.html")
        except Exception as e:
            print("Daraz error:", e)

        # 3. Graana
        try:
            print("Fetching Graana...")
            page.goto("https://www.graana.com/sale/residential-properties-sale-islamabad-1/", wait_until="domcontentloaded", timeout=30000)
            page.wait_for_timeout(8000)
            page.evaluate("window.scrollBy(0, 1000)")
            page.wait_for_timeout(2000)
            graana_html = page.evaluate("""() => {
                const anchors = Array.from(document.querySelectorAll('a[href*="/property/"]'));
                for(const a of anchors) {
                    let card = a;
                    for (let i = 0; i < 6 && card.parentElement; i++) {
                        if (card.tagName === 'BODY') break;
                        card = card.parentElement;
                        if (card.querySelector('img') || card.querySelector('picture')) {
                            return card.innerHTML;
                        }
                    }
                }
                return 'No graana card found';
            }""")
            with open('graana_card.html', 'w', encoding='utf-8') as f:
                f.write(graana_html)
            print("Saved graana_card.html")
        except Exception as e:
            print("Graana error:", e)

if __name__ == "__main__":
    debug_sites()
