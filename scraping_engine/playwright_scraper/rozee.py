"""
rozee.py — Full 2-step scraper
Step 1: List page  → title, company, location, salary, logo, apply_link
Step 2: Detail page → full description, actual salary, company logo (hi-res)

Rozee.pk is the best source for Pakistan — no login wall on most searches.
"""
import logging
import urllib.parse
import re
from typing import Dict, Any, List

from scraping_engine.engine.browser import BrowserManager

logger = logging.getLogger(__name__)

ROZEE_URLS = [
    "https://www.rozee.pk/job/jsearch/q/all/kw/{query}",
    "https://www.rozee.pk/job/jsearch/q/{query}",
]

# ── Step 1: List page JS extractor ───────────────────────────────────────────
_LIST_JS = """() => {
    const jobs = [];
    const seen = new Set();

    // Rozee job cards — try multiple selectors
    const cards = Array.from(document.querySelectorAll(
        'div.jp, div.job-post, li.job-listing, div.job-listing, div.job, div[class*="job-card"], div[class*="jobCard"]'
    ));

    for (const card of cards) {
        try {
            // Title + link
            const titleEl = card.querySelector('h2 a, h3 a, a.position, a[class*="title"], a[class*="job-title"]');
            if (!titleEl) continue;
            const title = titleEl.innerText.trim();
            const href  = titleEl.href || '';
            if (!title || title.length < 3) continue;
            if (seen.has(href)) continue;
            seen.add(href);

            // Company
            const compEl = card.querySelector(
                'span.company-name, a.company-name, div[class*="company"] a, ' +
                'p.company, span[class*="comp"]'
            );
            const company = compEl ? compEl.innerText.trim() : '';

            // Location
            const locEl = card.querySelector(
                'span.location, span[class*="loc"], div[class*="location"], ' +
                'li[class*="loc"], p.location'
            );
            const location = locEl ? locEl.innerText.trim() : 'Pakistan';

            // Salary
            const salEl = card.querySelector(
                'span.salary, div[class*="salary"], span[class*="sal"], ' +
                'li[class*="salary"], p.salary'
            );
            const salary = salEl ? salEl.innerText.trim() : '';

            // Logo
            const imgEl = card.querySelector('img.company-logo, img[class*="logo"], div[class*="logo"] img, img');
            let logo = '';
            if (imgEl) {
                logo = imgEl.getAttribute('data-src') || imgEl.getAttribute('data-lazy')
                    || imgEl.src || '';
                // Skip tracking pixels / placeholders
                if (logo.includes('pixel') || logo.includes('tracker') ||
                    logo.includes('blank') || logo.includes('placeholder')) logo = '';
            }

            // Posted date
            const dateEl = card.querySelector(
                'span.date, span[class*="date"], span[class*="time"], time, span.ago'
            );
            const posted_at = dateEl ? dateEl.innerText.trim() : '';

            jobs.push({ title, company, location, salary, logo, banner: '', apply_link: href, posted_at });
        } catch(e) {}
    }

    // Fallback: link-based DOM walker if card selector found nothing
    if (jobs.length === 0) {
        const links = Array.from(document.querySelectorAll(
            'a[href*="/job/"], a[href*="/jobs/"]'
        ));
        for (const link of links) {
            const href  = link.href || '';
            const title = link.innerText.trim();
            if (!title || title.length < 4 || seen.has(href)) continue;
            if (['jobs','view all','apply','login'].includes(title.toLowerCase())) continue;
            seen.add(href);

            let container = link.parentElement;
            for (let i = 0; i < 6; i++) {
                if (!container) break;
                if (container.offsetHeight > 60) break;
                container = container.parentElement;
            }

            const lines = container ? container.innerText.split('\\n').map(l=>l.trim()).filter(l=>l.length>1) : [];
            const ti = lines.findIndex(l => l.includes(title));
            const company  = (ti >= 0 && lines[ti+1]) ? lines[ti+1] : '';
            let   location = 'Pakistan';
            let   salary   = '';
            for (const l of lines) {
                const lo = l.toLowerCase();
                if (/rs\s|pkr|salary/i.test(lo)) salary = l;
                if (/islamabad|lahore|karachi|rawalpindi|peshawar|pakistan/i.test(lo) && l !== company)
                    location = l;
            }
            const imgEl = container ? container.querySelector('img') : null;
            let logo = '';
            if (imgEl) {
                logo = imgEl.getAttribute('data-src') || imgEl.src || '';
                if (/pixel|tracker|blank|placeholder/.test(logo)) logo = '';
            }
            jobs.push({ title, company, location, salary, logo, banner: '', apply_link: href, posted_at: '' });
        }
    }
    return jobs;
}"""

# ── Step 2: Detail page extractor ────────────────────────────────────────────
_DETAIL_JS = """() => {
    // Description — try multiple containers
    const descSelectors = [
        'div.job-description', 'div[class*="job-desc"]', 'div[class*="jd-"]',
        'div.description', 'section.description', 'div#job-description',
        'div.j-desc', 'div.detail-desc', 'article'
    ];
    let description = '';
    for (const sel of descSelectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText.trim().length > 50) {
            description = el.innerText.trim();
            break;
        }
    }

    // Salary from detail page (often more complete)
    const salSelectors = [
        'span.salary', 'div[class*="salary"]', 'li[class*="salary"]',
        'span[class*="sal"]', 'div.job-meta span'
    ];
    let salary = '';
    for (const sel of salSelectors) {
        const el = document.querySelector(sel);
        if (el) { salary = el.innerText.trim(); break; }
    }

    // Hi-res company logo
    const logoSelectors = [
        'img.company-logo', 'div.company-logo img', 'div[class*="employer-logo"] img',
        'img[class*="logo"]', 'div.logo img', 'figure img'
    ];
    let logo = '';
    for (const sel of logoSelectors) {
        const el = document.querySelector(sel);
        if (el) {
            const src = el.getAttribute('data-src') || el.src || '';
            if (src && !/pixel|tracker|blank|placeholder/.test(src)) {
                logo = src; break;
            }
        }
    }

    // Apply link — actual apply button href
    const applyEl = document.querySelector(
        'a[class*="apply"], button[class*="apply"], a#apply-btn, ' +
        'a[href*="apply"], a.btn-apply'
    );
    let apply_link = applyEl ? (applyEl.href || '') : window.location.href;
    if (apply_link && apply_link.startsWith('/')) {
        apply_link = new URL(apply_link, window.location.href).href;
    }

    // Posted date
    const dateEl = document.querySelector('span.date, span[class*="date"], time');
    const posted_at = dateEl ? dateEl.innerText.trim() : '';

    // Visual ad banner image
    const bannerSelectors = [
        'img.job-ad-image',
        'div.job-ad img',
        'img[src*="job-ad"]',
        'div.job-detail img',
        'img[src*="ad-"]',
        'img[src*="flyer"]',
        'img.job-image',
        'img.ad-image'
    ];
    let banner = '';
    for (const sel of bannerSelectors) {
        const el = document.querySelector(sel);
        if (el) {
            const src = el.getAttribute('data-src') || el.src || '';
            if (src && !/pixel|tracker|blank|placeholder/.test(src)) {
                banner = src; break;
            }
        }
    }

    return { description, salary, logo, apply_link, posted_at, banner };
}"""


def scrape_rozee(query: str, max_jobs: int = 10) -> Dict[str, Any]:
    import asyncio
    try:
        asyncio.get_running_loop()
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(_scrape_rozee_sync, query, max_jobs)
            return future.result(timeout=120)
    except RuntimeError:
        return _scrape_rozee_sync(query, max_jobs)


def _clean_salary(raw: str) -> str:
    if not raw: return ""
    blocked = {"google_jobs","google","linkedin","rozee","indeed","rozee.pk"}
    if raw.strip().lower() in blocked: return ""
    return raw.strip()


def _scrape_rozee_sync(query: str, max_jobs: int = 10) -> Dict[str, Any]:
    logger.info(f"[Rozee] Query: '{query}'")
    encoded = urllib.parse.quote(query)
    jobs: List[Dict] = []

    with BrowserManager(headless=True, user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36") as mgr:
        page = mgr.new_page()

        # ── Step 1: List page ─────────────────────────────────────────────────
        for url_tpl in ROZEE_URLS:
            url = url_tpl.format(query=encoded)
            try:
                page.goto(url)
                try:
                    page.wait_for_load_state("networkidle", timeout=30000)
                except Exception:
                    logger.warning("Network idle timeout, proceeding anyway")
                # Wait for possible job cards to appear
                try:
                    page.wait_for_selector('div.jp, div.job-post, li.job-listing', timeout=20000)
                except Exception:
                    logger.info("No immediate job cards found, proceeding with scroll and content check")
                # Attempt to close any login overlay
                try:
                    close_btn = page.query_selector('button.close, .close-button, .modal-close')
                    if close_btn:
                        close_btn.click()
                        logger.info("Closed possible login overlay.")
                except Exception:
                    pass
                # Verify login wall via URL or content
                cur = page.url.lower()
                if "login" in cur or "signin" in cur:
                    logger.warning("[Rozee] Login redirect detected, trying next URL")
                    continue
                content = page.content()
                if "please login" in content.lower() or "sign in to continue" in content.lower():
                    logger.warning("[Rozee] Login wall content detected, trying next URL")
                    continue
                # Wait for possible job cards selector before proceeding
                try:
                    page.wait_for_selector('div.jp, div.job-post, li.job-listing, div.job-card, div.job', timeout=15000)
                except Exception:
                    logger.info("Job cards not immediately present, proceeding with scroll")
                # Scroll to trigger lazy load (increase attempts)
                for _ in range(8):
                    page.evaluate("window.scrollBy(0, 800)")
                    page.wait_for_timeout(800)
                raw_list = page.evaluate(_LIST_JS)
                logger.info(f"[Rozee] Step 1 found {len(raw_list)} jobs")
                if raw_list:
                    jobs = raw_list[:max_jobs]
                    break
            except Exception as e:
                logger.error(f"[Rozee] List error on {url}: {e}")
                continue

        if not jobs:
            logger.warning("[Rozee] No jobs from list page")
            return {"data": [], "source": "rozee", "count": 0}

        # ── Step 2: Detail page for each job ─────────────────────────────────
        enriched = []
        for job in jobs:
            apply_url = job.get("apply_link", "")
            if not apply_url or not apply_url.startswith("http"):
                job.update({"description": "", "source": "rozee", "source_label": "Rozee.pk",
                            "salary": _clean_salary(job.get("salary","")),
                            "banner": job.get("banner", "")})
                enriched.append(job)
                continue

            try:
                logger.info(f"[Rozee] Detail page: {apply_url}")
                page.goto(apply_url)
                try:
                    page.wait_for_load_state("networkidle", timeout=30000)
                except Exception:
                    logger.warning("Detail page network idle timeout")

                if "login" in page.url.lower():
                    logger.warning(f"[Rozee] Detail login wall — using list data")
                    job.update({"description": "", "source": "rozee", "source_label": "Rozee.pk",
                                "salary": _clean_salary(job.get("salary","")),
                                "banner": job.get("banner", "")})
                    enriched.append(job)
                    continue

                detail = page.evaluate(_DETAIL_JS)

                # Merge: detail page wins over list page for richer fields
                enriched.append({
                    "title":        job.get("title", ""),
                    "company":      job.get("company", ""),
                    "location":     job.get("location", "Pakistan"),
                    "salary":       _clean_salary(detail.get("salary") or job.get("salary", "")),
                    "logo":         detail.get("logo") or job.get("logo", ""),
                    "banner":       detail.get("banner") or job.get("banner", ""),
                    "apply_link":   detail.get("apply_link") or apply_url,
                    "description":  detail.get("description", ""),
                    "posted_at":    detail.get("posted_at") or job.get("posted_at", ""),
                    "source":       "rozee",
                    "source_label": "Rozee.pk",
                })
                logger.info(f"[Rozee] ✅ {job.get('title')} — desc {len(detail.get('description',''))} chars")

            except Exception as e:
                logger.warning(f"[Rozee] Detail error for {apply_url}: {e}")
                job.update({"description": "", "source": "rozee", "source_label": "Rozee.pk",
                            "salary": _clean_salary(job.get("salary","")),
                            "banner": job.get("banner", "")})
                enriched.append(job)

    logger.info(f"[Rozee] ✅ Total enriched: {len(enriched)}")
    return {"data": enriched, "source": "rozee", "count": len(enriched)}