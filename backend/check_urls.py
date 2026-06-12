import asyncio
from playwright.sync_api import sync_playwright

urls = [
    "https://www.zameen.com/Homes/Islamabad-3-1.html",
    "https://www.zameen.com/Homes/Lahore-1-1.html",
    "https://www.olx.com.pk/property-for-sale_c2748",
    "https://www.olx.com.pk/houses_c1724",
    "https://www.olx.com.pk/items/q-house",
]

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
        
        for url in urls:
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=20000)
                page.wait_for_timeout(2000)
                print(f"URL: {url} -> Title: {page.title()} | Final: {page.url} | Body: {len(page.inner_text('body'))}")
                try:
                    if 'zameen' in url:
                        print("Zameen Items:", page.evaluate("document.querySelectorAll('li[role=\"article\"], article[aria-label=\"Listing\"]').length"))
                    elif 'olx' in url:
                        print("OLX Items:", page.evaluate("document.querySelectorAll('li[aria-label], div[data-aut-id=\"itemBox\"]').length"))
                except Exception as e:
                    print("EVAL ERROR:", e)
            except Exception as e:
                print(f"URL: {url} -> ERROR {e}")
        browser.close()

if __name__ == "__main__":
    run()
