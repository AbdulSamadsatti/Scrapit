"""
indeed.py — Best of both architectures
- Mouse simulation + 12s wait (doosri AI) — better Cloudflare bypass
- BrowserManager (mera) — shared browser management
- 2 URL fallbacks
- headless=False — required for Indeed Cloudflare
"""
import logging
import urllib.parse
from typing import Dict, Any

from scraping_engine.engine.browser import BrowserManager

logger = logging.getLogger(__name__)

INDEED_URLS = [
    "https://pk.indeed.com/jobs?q={query}&l=Pakistan",
    "https://www.indeed.com/jobs?q={query}&l=Pakistan",
]

# Card selectors — multiple fallbacks
CARD_SELECTORS = (
    "div.job_seen_beacon, div.jobsearch-SerpJobCard, "
    "div[data-testid='slider_container'], li.css-5lfssm, "
    "ul.jobsearch-ResultsList > li"
)


def scrape_indeed(query: str, max_jobs: int = 10) -> Dict[str, Any]:
    """
    Scrape Indeed.com with Cloudflare bypass.
    Returns: {"data": [...], "source": "indeed", "count": N}
    """
    logger.info(f"[Indeed] Query: '{query}'")
    encoded = urllib.parse.quote(query)
    jobs = []

    # headless=False — Cloudflare ke liye zaruri
    with BrowserManager(headless=False) as mgr:
        page = mgr.new_page()

        for url_tpl in INDEED_URLS:
            url = url_tpl.format(query=encoded)
            try:
                logger.info(f"[Indeed] Trying: {url}")
                page.goto(url, wait_until="domcontentloaded", timeout=35000)
                page.wait_for_timeout(3000)

                content = page.content()

                # Cloudflare challenge detect
                if any(k in content for k in ["cf-browser-verification", "Just a moment", "cloudflare"]):
                    logger.warning("[Indeed] Cloudflare detected — human simulation...")
                    try:
                        # Mouse movement — helps Cloudflare think it's human
                        page.mouse.move(150, 150)
                        page.wait_for_timeout(800)
                        page.mouse.move(300, 250)
                        page.wait_for_timeout(800)
                        page.mouse.move(200, 400)
                    except Exception:
                        pass
                    page.wait_for_timeout(11000)   # Wait for CF to pass
                    content = page.content()

                # Still blocked?
                if any(k in content for k in ["cf-browser-verification", "Just a moment"]):
                    logger.warning("[Indeed] Still blocked — trying next URL")
                    continue

                # Find job cards
                cards = page.query_selector_all(CARD_SELECTORS)
                logger.info(f"[Indeed] {len(cards)} cards found")

                for card in cards[:max_jobs]:
                    try:
                        def _text(sel):
                            el = card.query_selector(sel)
                            return el.inner_text().strip() if el else ""

                        def _attr(sel, attr):
                            el = card.query_selector(sel)
                            return el.get_attribute(attr) or "" if el else ""

                        title    = _text("h2.jobTitle span, h2.jobTitle a, span[title]")
                        company  = _text("span.companyName, [data-testid='company-name']")
                        location = _text("div.companyLocation, [data-testid='text-location']") or "Pakistan"
                        salary   = _text("div.salary-snippet, [data-testid='attribute_snippet_testid']")
                        snippet  = _text("div.job-snippet, ul.job-snippet")

                        href = _attr("h2.jobTitle a, a.jcs-JobTitle", "href")
                        if href and href.startswith("/"):
                            href = "https://pk.indeed.com" + href

                        if title:
                            jobs.append({
                                "title":       title,
                                "company":     company,
                                "location":    location,
                                "description": snippet,
                                "salary":      salary,
                                "logo":        "",
                                "apply_link":  href,
                                "source":      "indeed",
                                "posted_at":   "",
                            })
                    except Exception as ce:
                        logger.warning(f"[Indeed] Card error: {ce}")

                if jobs:
                    break   # Got results — skip next URL

            except Exception as e:
                logger.error(f"[Indeed] Error on {url}: {e}")
                continue

    logger.info(f"[Indeed] ✅ Total: {len(jobs)} jobs")
    return {"data": jobs, "source": "indeed", "count": len(jobs)}