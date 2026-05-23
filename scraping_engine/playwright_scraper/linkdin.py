"""
linkdin.py — Full 2-step scraper (no login)
Step 1: List page  → title, company, location, logo, apply_link
Step 2: Detail page → full description, posted_at, salary (if public)

HONEST LIMITATIONS (bina login ke):
- Salary: LinkedIn almost never shows it publicly → "Not disclosed"
- Logo: available on list cards (img[data-delayed-url])
- Description: available on detail pane (partial) before sign-in modal appears
- We remove sign-in modals aggressively to get as much as possible
"""
import logging
import re
from typing import List, Dict, Any

from scraping_engine.engine.browser import BrowserManager
from scraping_engine.configs.linkdin_config import LINKEDIN_CONFIG

logger = logging.getLogger(__name__)

# ── Step 2: Detail pane JS extractor ─────────────────────────────────────────
_DETAIL_JS = """() => {
    // Remove sign-in modals first
    document.querySelectorAll(
        '.modal__overlay, .contextual-sign-in-modal, .sign-in-modal, ' +
        'section[class*="sign-in"], div[class*="signin"], div[class*="gate"]'
    ).forEach(el => el.remove());

    // Full description
    const descSelectors = [
        'div.show-more-less-html__markup',
        'div[class*="description__text"]',
        'div.job-details-module div[class*="description"]',
        'article.job-view-layout div[class*="description"]',
        'section[class*="description"] div',
        'div.jobs-description-content__text',
    ];
    let description = '';
    for (const sel of descSelectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText.trim().length > 30) {
            description = el.innerText.trim();
            break;
        }
    }

    // Salary (rarely public on LinkedIn without login)
    const salSelectors = [
        'div.compensation__salary-range',
        'span[class*="salary"]',
        'div[class*="compensation"] span',
        'li[class*="salary"]',
    ];
    let salary = '';
    for (const sel of salSelectors) {
        const el = document.querySelector(sel);
        if (el) { salary = el.innerText.trim(); break; }
    }

    // Posted date
    const dateSelectors = [
        'span.posted-time-ago__text',
        'span[class*="posted-time"]',
        'time',
        'span[class*="time-ago"]',
    ];
    let posted_at = '';
    for (const sel of dateSelectors) {
        const el = document.querySelector(sel);
        if (el) { posted_at = el.innerText.trim(); break; }
    }

    // Company logo (hi-res from detail page)
    const logoSelectors = [
        'img.artdeco-entity-image[data-delayed-url]',
        'img.artdeco-entity-image',
        'div[class*="company-logo"] img',
        'img[class*="company"]',
        'span[class*="company"] img',
    ];
    let logo = '';
    for (const sel of logoSelectors) {
        const el = document.querySelector(sel);
        if (el) {
            const src = el.getAttribute('data-delayed-url') || el.src || '';
            if (src && !src.includes('ghost') && !src.includes('placeholder')) {
                logo = src; break;
            }
        }
    }

    // Apply link — external link if available
    const applyEl = document.querySelector(
        'a[class*="apply"], button[class*="apply"], ' +
        'a[data-tracking-control-name*="apply"], div[class*="apply"] a'
    );
    let apply_link = applyEl ? (applyEl.href || window.location.href) : window.location.href;
    if (apply_link && apply_link.startsWith('/')) {
        apply_link = new URL(apply_link, window.location.href).href;
    }

    // Visual ad banner image (flyer / graphic)
    const bannerSelectors = [
        'img.jobs-box__banner-image',
        'img.company-hero-image',
        'div.jobs-company__hero img',
        'img.feed-shared-image__image',
        'img.update-components-image__image',
        'div.update-components-image img',
        'div.jobs-description-content__text img',
        'div.show-more-less-html__markup img',
        'article img'
    ];
    let banner = '';
    for (const sel of bannerSelectors) {
        const el = document.querySelector(sel);
        if (el) {
            const src = el.getAttribute('data-delayed-url') || el.src || '';
            if (src && !src.includes('ghost') && !src.includes('placeholder') && !src.includes('logo')) {
                banner = src;
                break;
            }
        }
    }

    return { description, salary, logo, posted_at, apply_link, banner };
}"""


def scrape_linkedin_jobs(query: str, max_jobs: int = 10) -> List[Dict[str, Any]]:
    import asyncio
    try:
        asyncio.get_running_loop()
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(_scrape_linkedin_jobs_sync, query, max_jobs)
            return future.result(timeout=120)
    except RuntimeError:
        return _scrape_linkedin_jobs_sync(query, max_jobs)


def _scrape_linkedin_jobs_sync(query: str, max_jobs: int = 10) -> List[Dict[str, Any]]:
    logger.info(f"[LinkedIn] Query: '{query}'")
    url = f"https://www.linkedin.com/jobs/search/?keywords={query}&location=Pakistan"
    jobs: List[Dict] = []

    with BrowserManager(headless=True) as mgr:
        page = mgr.new_page()

        # ── Step 1: List page ─────────────────────────────────────────────────
        try:
            logger.info(f"[LinkedIn] List page: {url}")
            page.goto(url, wait_until="domcontentloaded", timeout=30000)
            page.wait_for_selector(LINKEDIN_CONFIG["job_list"], timeout=15000)

            # Scroll to load lazy cards
            for _ in range(5):
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                page.wait_for_timeout(800)

            job_cards = page.locator(LINKEDIN_CONFIG["job_list"]).all()
            logger.info(f"[LinkedIn] Step 1: {len(job_cards)} cards")

            cfg = LINKEDIN_CONFIG["card"]

            for index, card in enumerate(job_cards[:max_jobs]):
                try:
                    # Remove modals before interacting
                    page.evaluate(
                        "document.querySelectorAll('.modal__overlay,.contextual-sign-in-modal,"
                        ".sign-in-modal,div[class*=gate]').forEach(e=>e.remove())"
                    )
                    try:
                        card.scroll_into_view_if_needed(timeout=2000)
                    except:
                        pass
                    try:
                        card.click(force=True, timeout=2000)
                    except:
                        pass
                    page.wait_for_timeout(1200)

                    def _loc_text(selector):
                        l = card.locator(selector)
                        return l.inner_text().strip() if l.count() > 0 else ""

                    def _loc_attr(selector, attr):
                        l = card.locator(selector)
                        return l.get_attribute(attr) or "" if l.count() > 0 else ""

                    title    = _loc_text(cfg["title"])    or "Unknown Title"
                    company  = _loc_text(cfg["company"])  or "Unknown Company"
                    location = _loc_text(cfg["location"]) or "Pakistan"

                    # Logo — LinkedIn uses data-delayed-url for lazy loading
                    logo = (_loc_attr(cfg["image"], "data-delayed-url")
                            or _loc_attr(cfg["image"], "src"))
                    # Skip ghost/placeholder logos
                    if logo and ("ghost" in logo or "placeholder" in logo):
                        logo = ""

                    # Job page URL
                    href = _loc_attr(cfg["link"], "href")
                    if href:
                        href = href.split("?")[0]  # strip tracking params

                    jobs.append({
                        "title":    title,
                        "company":  company,
                        "location": location,
                        "logo":     logo,
                        "banner":   "",
                        "apply_link": href,
                        "salary":   "",
                        "posted_at": "",
                    })
                    logger.info(f"[LinkedIn] List ✅ {title} @ {company}")

                except Exception as e:
                    logger.warning(f"[LinkedIn] Card {index+1} error: {e}")

        except Exception as e:
            logger.error(f"[LinkedIn] List page failed: {e}")

        if not jobs:
            logger.warning("[LinkedIn] No jobs from list page")
            return []

        # ── Step 2: Visit each detail page ───────────────────────────────────
        enriched = []
        for job in jobs:
            apply_url = job.get("apply_link", "")
            if not apply_url or not apply_url.startswith("http"):
                job.update({"description": "", "source": "linkedin", "source_label": "LinkedIn"})
                enriched.append(job)
                continue

            try:
                logger.info(f"[LinkedIn] Detail page: {apply_url}")
                page.goto(apply_url, wait_until="domcontentloaded", timeout=30000)
                page.wait_for_timeout(2000)

                # Aggressively remove gate/modal before extracting
                page.evaluate(
                    "document.querySelectorAll('.modal__overlay,.contextual-sign-in-modal,"
                    "section[class*=sign-in],div[class*=gate],div[class*=signin]')"
                    ".forEach(e=>e.remove())"
                )
                page.wait_for_timeout(500)

                detail = page.evaluate(_DETAIL_JS)

                enriched.append({
                    "title":        job.get("title", ""),
                    "company":      job.get("company", ""),
                    "location":     job.get("location", "Pakistan"),
                    "salary":       detail.get("salary", ""),  # usually empty without login
                    "logo":         detail.get("logo") or job.get("logo", ""),
                    "banner":       detail.get("banner", "") or job.get("banner", ""),
                    "apply_link":   detail.get("apply_link") or apply_url,
                    "description":  detail.get("description", ""),
                    "posted_at":    detail.get("posted_at") or job.get("posted_at", ""),
                    "source":       "linkedin",
                    "source_label": "LinkedIn",
                })
                logger.info(f"[LinkedIn] ✅ {job.get('title')} — desc {len(detail.get('description',''))} chars")

            except Exception as e:
                logger.warning(f"[LinkedIn] Detail error for {apply_url}: {e}")
                job.update({"description": "", "source": "linkedin", "source_label": "LinkedIn"})
                enriched.append(job)

    logger.info(f"[LinkedIn] ✅ Total enriched: {len(enriched)}")
    return enriched