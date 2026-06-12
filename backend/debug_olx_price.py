from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
    page.goto("https://www.olx.com.pk/items?q=iphone", wait_until="domcontentloaded")
    page.wait_for_timeout(3000)
    prices = page.evaluate("""() => {
        return Array.from(document.querySelectorAll('li[aria-label], article')).slice(0, 3).map(el => {
            const spans = Array.from(el.querySelectorAll('span'));
            const rsSpan = spans.find(s => s.innerText && s.innerText.includes('Rs'));
            return {
                rs_span: rsSpan ? rsSpan.innerText : null,
                text: el.innerText.slice(0, 50)
            }
        });
    }""")
    print(prices)
    b.close()
