"""
indeed.py — Full 2-step scraper
Step 1: List page  → title, company, location, salary, logo, apply_link
Step 2: Detail page → full description, exact salary, company logo

Cloudflare bypass: headless=False + mouse simulation + wait
"""
import logging
import urllib.parse
import re
from typing import Dict, Any, List

from scraping_engine.engine.browser import BrowserManager

logger = logging.getLogger(__name__)

INDEED_URLS = [
    "https://pk.indeed.com/jobs?q={query}&l=Pakistan",
    "https://www.indeed.com/jobs?q={query}&l=Pakistan",
]

CARD_SELECTORS = (
    "div.job_seen_beacon, div.jobsearch-SerpJobCard, "
    "div[data-testid='slider_container'], li.css-5lfssm, "
    "ul.jobsearch-ResultsList > li[class]"
)

# ── Step 2: Detail page JS extractor ─────────────────────────────────────────
_DETAIL_JS = """() => {
    // Full job description
    const descSelectors = [
        'div#jobDescriptionText',
        'div[class*="jobsearch-jobDescriptionText"]',
        'div.jobsearch-JobComponent-description',
        'div[data-testid="jobsearch-JobComponent-description"]',
        'section.jobsearch-JobComponent',
    ];
    let description = '';
    for (const sel of descSelectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText.trim().length > 30) {
            description = el.innerText.trim();
            break;
        }
    }

    // Salary from detail page
    const salSelectors = [
        'div#salaryInfoAndJobType span',
        'span[class*="salary"]',
        'div[data-testid="attribute_snippet_testid"]',
        'div.metadata.salary-snippet-container',
    ];
    let salary = '';
    for (const sel of salSelectors) {
        const el = document.querySelector(sel);
        if (el) { salary = el.innerText.trim(); break; }
    }

    // Company logo (hi-res on detail page)
    const logoSelectors = [
        'img[class*="companyAvatar"]',
        'img[data-testid="company-image"]',
        'div.jobsearch-CompanyInfoWithReview img',
        'img.companyAvatar',
        'div[class*="logo"] img',
    ];
    let logo = '';
    for (const sel of logoSelectors) {
        const el = document.querySelector(sel);
        if (el) {
            const src = el.getAttribute('data-src') || el.src || '';
            if (src && !/pixel|tracker|blank|placeholder|indeed\.com\\/images\\/home/.test(src)) {
                logo = src; break;
            }
        }
    }

    // Posted date
    const dateEl = document.querySelector(
        'span[data-testid="myJobsStateDate"], span.date, div[class*="date"] span'
    );
    const posted_at = dateEl ? dateEl.innerText.trim() : '';

    // Apply link — the actual external apply URL if available
    const applyBtn = document.querySelector(
        'a[class*="apply"], button[id*="apply"], a[data-jk], ' +
        'a[href*="apply"], div#applyButtonLinkContainer a'
    );
    let apply_link = applyBtn ? (applyBtn.href || window.location.href) : window.location.href;
    if (apply_link && apply_link.startsWith('/')) {
        apply_link = new URL(apply_link, window.location.href).href;
    }

    // Visual ad banner image (Indeed job details page flyer/graphic)
    const bannerSelectors = [
        'div#jobDescriptionText img',
        'div[class*="jobDescriptionText"] img',
        'img[class*="banner"]',
        'img[class*="hero"]',
        'img[class*="job-ad"]',
        'img[src*="banner"]',
        'img[src*="flyer"]',
        'img[src*="ad-"]',
        'img.job-image'
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

    return { description, salary, logo, posted_at, apply_link, banner };
}"""


def scrape_indeed(query: str, max_jobs: int = 10) -> Dict[str, Any]:
    import asyncio
    try:
        asyncio.get_running_loop()
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(_scrape_indeed_sync, query, max_jobs)
            return future.result(timeout=120)
    except RuntimeError:
        return _scrape_indeed_sync(query, max_jobs)


def _clean_salary(raw: str) -> str:
    if not raw: return ""
    blocked = {"google_jobs","google","linkedin","rozee","indeed","rozee.pk"}
    if raw.strip().lower() in blocked: return ""
    # Must contain digit to be a real salary
    if not re.search(r'\d', raw): return ""
    return raw.strip()


def _scrape_indeed_sync(query: str, max_jobs: int = 10) -> Dict[str, Any]:
    logger.info(f"[Indeed] Query: '{query}'")
    encoded = urllib.parse.quote(query)
    jobs: List[Dict] = []

    # headless=False — required for Cloudflare
    with BrowserManager(headless=False) as mgr:
        page = mgr.new_page()

        # ── Step 1: List page ─────────────────────────────────────────────────
        for url_tpl in INDEED_URLS:
            url = url_tpl.format(query=encoded)
            try:
                logger.info(f"[Indeed] List page: {url}")
                page.goto(url, wait_until="domcontentloaded", timeout=35000)
                page.wait_for_timeout(3000)

                content = page.content()
                if any(k in content for k in ["cf-browser-verification", "Just a moment", "cloudflare"]):
                    logger.warning("[Indeed] Cloudflare — mouse simulation...")
                    try:
                        page.mouse.move(150, 150); page.wait_for_timeout(700)
                        page.mouse.move(320, 260); page.wait_for_timeout(700)
                        page.mouse.move(210, 410); page.wait_for_timeout(500)
                    except Exception:
                        pass
                    page.wait_for_timeout(11000)
                    content = page.content()

                if any(k in content for k in ["cf-browser-verification", "Just a moment"]):
                    logger.warning("[Indeed] Still blocked — trying next URL")
                    continue

                cards = page.query_selector_all(CARD_SELECTORS)
                logger.info(f"[Indeed] Step 1: {len(cards)} cards")

                for card in cards[:max_jobs]:
                    try:
                        def _t(sel):
                            el = card.query_selector(sel)
                            return el.inner_text().strip() if el else ""

                        def _a(sel, attr):
                            el = card.query_selector(sel)
                            return (el.get_attribute(attr) or "") if el else ""

                        title    = _t("h2.jobTitle span, h2.jobTitle a, span[title]")
                        company  = _t("span.companyName, [data-testid='company-name']")
                        location = _t("div.companyLocation, [data-testid='text-location']") or "Pakistan"
                        salary   = _clean_salary(_t(
                            "div.salary-snippet, [data-testid='attribute_snippet_testid'], "
                            "div.metadata.salary-snippet-container span"
                        ))

                        # Logo from list card
                        logo = _a(
                            "img.companyAvatar, img[data-testid='company-image'], "
                            "div.jobCardHeader img", "src"
                        )
                        if not logo:
                            logo = _a("img.companyAvatar, img[data-testid='company-image']", "data-src")

                        # Job detail URL
                        href = _a("h2.jobTitle a, a.jcs-JobTitle", "href")
                        if href and href.startswith("/"):
                            base = "https://pk.indeed.com" if "pk.indeed" in url else "https://www.indeed.com"
                            href = base + href

                        if title:
                            jobs.append({
                                "title":    title,
                                "company":  company,
                                "location": location,
                                "salary":   salary,
                                "logo":     logo,
                                "banner":   "",
                                "apply_link": href,
                                "posted_at":  "",
                            })
                    except Exception as ce:
                        logger.warning(f"[Indeed] Card parse error: {ce}")

                if jobs:
                    break

            except Exception as e:
                logger.error(f"[Indeed] List error on {url}: {e}")
                continue

        if not jobs:
            logger.warning("[Indeed] No jobs from list page")
            return {"data": [], "source": "indeed", "count": 0}

        # ── Step 2: Visit each job detail page ───────────────────────────────
        enriched = []
        for job in jobs:
            apply_url = job.get("apply_link", "")
            if not apply_url or not apply_url.startswith("http"):
                job.update({"description": "", "source": "indeed", "source_label": "Indeed", "banner": ""})
                enriched.append(job)
                continue

            try:
                logger.info(f"[Indeed] Detail page: {apply_url}")
                page.goto(apply_url, wait_until="domcontentloaded", timeout=30000)
                page.wait_for_timeout(2000)

                # Cloudflare on detail page
                if any(k in page.content() for k in ["cf-browser-verification", "Just a moment"]):
                    page.wait_for_timeout(8000)

                detail = page.evaluate(_DETAIL_JS)

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
                    "source":       "indeed",
                    "source_label": "Indeed",
                })
                logger.info(f"[Indeed] ✅ {job.get('title')} — desc {len(detail.get('description',''))} chars")

            except Exception as e:
                logger.warning(f"[Indeed] Detail error for {apply_url}: {e}")
                job.update({"description": "", "source": "indeed", "source_label": "Indeed", "banner": ""})
                enriched.append(job)

    logger.info(f"[Indeed] ✅ Total enriched: {len(enriched)}")
    return {"data": enriched, "source": "indeed", "count": len(enriched)}