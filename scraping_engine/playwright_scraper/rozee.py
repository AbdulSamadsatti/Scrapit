"""
rozee.py — Best of both architectures
- JS DOM Walker (doosri AI ka) — CSS class change se nahi toota
- BrowserManager (mera) — shared browser, anti-bot headers
- 3 URL formats try karta hai
- Login wall detect karta hai
"""
import logging
import urllib.parse
from typing import Dict, Any

from scraping_engine.engine.browser import BrowserManager

logger = logging.getLogger(__name__)

ROZEE_URLS = [
    "https://www.rozee.pk/job/jsearch/q/all/kw/{query}",
    "https://www.rozee.pk/job/jsearch/q/{query}",
    "https://www.rozee.pk/jobs/search?q={query}",
]

# JS DOM Walker — finds job links by href pattern, not CSS class
# This means Rozee can change their entire CSS and this still works
_JS_EXTRACTOR = """() => {
    const jobs = [];
    const seen = new Set();
    const links = Array.from(document.querySelectorAll(
        'a[href*="/job/"], a[href*="/jobs/"], a[href*="-job-"], a[href*="jsearch"]'
    ));

    for (const link of links) {
        const href = link.href;
        if (!href || seen.has(href)) continue;

        const title = link.innerText.trim();
        if (title.length < 4 || ['jobs','view all','apply'].includes(title.toLowerCase())) continue;

        seen.add(href);

        // Walk up DOM to find card container
        let container = link.parentElement;
        for (let i = 0; i < 6; i++) {
            if (!container) break;
            if (container.offsetHeight > 50 && container.innerText.length > 20) break;
            container = container.parentElement;
        }
        if (!container) continue;

        const lines = container.innerText
            .split('\\n')
            .map(l => l.trim())
            .filter(l => l.length > 1);

        const titleIdx = lines.findIndex(l => l.includes(title) || title.includes(l));

        let company = 'Unknown Company';
        let location = 'Pakistan';
        let salary   = '';

        if (titleIdx >= 0 && titleIdx + 1 < lines.length) {
            company = lines[titleIdx + 1];
            if (company.length > 50) company = 'Rozee.pk Job';
        }

        for (const line of lines) {
            const lo = line.toLowerCase();
            if (lo.includes('rs') || lo.includes('salary') || lo.includes('pkr')) salary = line;
            if ((lo.includes('islamabad') || lo.includes('lahore') ||
                 lo.includes('karachi')   || lo.includes('pakistan') ||
                 lo.includes('rawalpindi')|| lo.includes('peshawar')) && line !== company) {
                location = line;
            }
        }

        let logo = '';
        const img = container.querySelector('img');
        if (img && img.src && !img.src.includes('tracker') && !img.src.includes('pixel')) {
            logo = img.src;
        }

        const descLines = lines.slice(titleIdx + 2, titleIdx + 5).join(' ');

        jobs.push({
            title:       title,
            company:     company,
            location:    location,
            description: descLines,
            salary:      salary,
            logo:        logo,
            apply_link:  href,
            source:      'rozee',
            posted_at:   ''
        });
    }
    return jobs;
}"""


def scrape_rozee(query: str, max_jobs: int = 10) -> Dict[str, Any]:
    """
    Scrape Rozee.pk jobs.
    Returns: {"data": [...], "source": "rozee", "count": N}
    """
    logger.info(f"[Rozee] Query: '{query}'")
    encoded = urllib.parse.quote(query)
    jobs = []

    with BrowserManager(headless=True) as mgr:
        page = mgr.new_page()

        for url_tpl in ROZEE_URLS:
            url = url_tpl.format(query=encoded)
            try:
                logger.info(f"[Rozee] Trying: {url}")
                page.goto(url, wait_until="domcontentloaded", timeout=40000)
                page.wait_for_timeout(3000)

                # Login wall check
                current = page.url.lower()
                if "login" in current or "signin" in current:
                    logger.warning("[Rozee] Login redirect — trying next URL")
                    continue

                content = page.content()
                if "please login" in content.lower() or "sign in to continue" in content.lower():
                    logger.warning("[Rozee] Login wall in content — trying next URL")
                    continue

                # Scroll to load lazy elements
                for _ in range(3):
                    page.evaluate("window.scrollBy(0, 600)")
                    page.wait_for_timeout(600)

                # JS DOM Walker — works regardless of CSS class names
                extracted = page.evaluate(_JS_EXTRACTOR)
                logger.info(f"[Rozee] JS extracted {len(extracted)} jobs from {url}")

                if extracted:
                    jobs = extracted[:max_jobs]
                    break

            except Exception as e:
                logger.error(f"[Rozee] Error on {url}: {e}")
                continue

    logger.info(f"[Rozee] ✅ Total: {len(jobs)} jobs")
    return {"data": jobs, "source": "rozee", "count": len(jobs)}