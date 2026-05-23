"""
Google Jobs - Hybrid Scraper
Step 1: SERP API se job URLs + basic data discover karo
Step 2: Playwright se actual job page pe ja ke full data scrape karo
"""
import logging
import urllib.parse
from typing import List, Dict, Any, Optional
from serpapi import GoogleSearch

from scraping_engine.config import SERP_API_KEY
from scraping_engine.engine.browser import BrowserManager

logger = logging.getLogger(__name__)


def unwrap_google_url(url: str) -> str:
    if not url:
        return ""
    # If the URL is redirecting through google, unwrap it
    if "google.com/url?" in url or "google.co/url?" in url:
        parsed = urllib.parse.urlparse(url)
        qs = urllib.parse.parse_qs(parsed.query)
        if "q" in qs:
            return qs["q"][0]
        if "url" in qs:
            return qs["url"][0]
    return url


# ---------------------------------------------------------------------------
# Step 1 — SERP API: Job Discovery
# ---------------------------------------------------------------------------

def discover_jobs_via_serp(
    query: str,
    location: Optional[str] = None,
    gl: str = "pk",
    hl: str = "en",
) -> List[Dict[str, Any]]:
    """
    SERP API se basic job listings fetch karo.
    Yeh sirf discovery step hai — URLs aur basic metadata milta hai.
    """
    if not SERP_API_KEY:
        logger.error("SERP_API_KEY missing in .env")
        return []

    params = {
        "engine": "google_jobs",
        "q": query,
        "gl": gl,
        "hl": hl,
        "api_key": SERP_API_KEY,
    }
    if location:
        params["location"] = location

    try:
        results = GoogleSearch(params).get_dict()
    except Exception as e:
        logger.error(f"SerpApi request failed: {e}")
        return []

    if "error" in results:
        logger.error(f"SerpApi error: {results['error']}")
        return []

    discovered = []
    for job in results.get("jobs_results", []):
        # apply_options se best direct URL nikalo
        apply_options = job.get("apply_options", [])
        direct_url = ""
        for opt in apply_options:
            link = opt.get("link", "")
            # LinkedIn, Indeed, Rozee — prefer inhe
            if any(site in link for site in ["linkedin.com", "indeed.com", "rozee.pk"]):
                direct_url = link
                break
        # Fallback: pehla available link
        if not direct_url and apply_options:
            direct_url = apply_options[0].get("link", "")

        # Unwrap google redirect links to actual target
        direct_url = unwrap_google_url(direct_url)

        # Grab salary if available in search discovery metadata
        salary = job.get("salary") or ""
        if not salary:
            extensions = job.get("detected_extensions", {}) or {}
            salary = extensions.get("salary") or ""

        discovered.append({
            "title":       job.get("title", "N/A"),
            "company":     job.get("company_name", "N/A"),
            "location":    job.get("location", "N/A"),
            "description": job.get("description", ""),   # short snippet
            "logo":        job.get("thumbnail", ""),
            "thumbnail":   job.get("thumbnail", ""),
            "banner":      "",
            "salary":      salary,
            "job_id":      job.get("job_id", ""),
            "apply_options": apply_options,
            "apply_link":  direct_url,
            "direct_url":  direct_url,
            "source":      "google_jobs",
            "enriched":    False,   # ab tak full scrape nahi hua
        })

    logger.info(f"[SERP] Discovered {len(discovered)} jobs for '{query}'")
    return discovered


# ---------------------------------------------------------------------------
# Step 2 — Playwright: Full Data Enrichment
# ---------------------------------------------------------------------------

# Per-site selectors for enrichment
_ENRICHMENT_SELECTORS = {
    "linkedin.com": {
        "description": "div.show-more-less-html__markup",
        "posted_date": "span.posted-time-ago__text",
        "salary":      "div.compensation__salary-range, span.salary",
    },
    "indeed.com": {
        "description": "div#jobDescriptionText",
        "posted_date": "span.date, span[data-testid='myJobsStateDate']",
        "salary":      "div#salaryInfoAndJobType span",
    },
    "rozee.pk": {
        "description": "div.j-desc, div.job-detail-desc",
        "posted_date": "span.time, span.posted",
        "salary":      "span.salary, div.salary-detail",
    },
}


def _get_selectors_for_url(url: str) -> Optional[Dict[str, str]]:
    for domain, selectors in _ENRICHMENT_SELECTORS.items():
        if domain in url:
            return selectors
    return None


def _enrich_single_job(page, job: Dict[str, Any]) -> Dict[str, Any]:
    """
    Ek job ko Playwright se enrich karo — full description, salary, posted date.
    """
    url = job.get("direct_url", "")
    if not url:
        return job

    selectors = _get_selectors_for_url(url)
    if not selectors:
        logger.debug(f"No enrichment selectors for URL: {url}")
        return job

    try:
        logger.info(f"[Enrich] Navigating to: {url[:80]}...")
        page.goto(url, wait_until="domcontentloaded", timeout=25000)
        page.wait_for_timeout(1500)

        # LinkedIn: modal hata do
        if "linkedin.com" in url:
            page.evaluate(
                "document.querySelectorAll('.modal__overlay, .contextual-sign-in-modal').forEach(e => e.remove())"
            )

        def safe_text(selector: str) -> str:
            loc = page.locator(selector)
            return loc.first.inner_text().strip() if loc.count() > 0 else ""

        full_description = safe_text(selectors["description"])
        posted_date      = safe_text(selectors["posted_date"])
        salary           = safe_text(selectors["salary"])

        # Visual banner extraction
        banner = ""
        banner_selectors = [
            "img.feed-shared-image__image",
            "img.update-components-image__image",
            "img.job-ad-image",
            "img.company-ad",
            "div.job-ad img",
            "img[src*='job-ad']",
            "img[class*='ad-image']"
        ]
        for sel in banner_selectors:
            loc = page.locator(sel)
            if loc.count() > 0:
                src = loc.first.get_attribute("src") or ""
                if src and not any(k in src.lower() for k in ["pixel", "tracker", "blank", "placeholder"]):
                    banner = src
                    break

        if full_description:
            job["description"] = full_description
        if posted_date:
            job["posted_date"] = posted_date
        if salary:
            job["salary"] = salary
        if banner:
            job["banner"] = banner

        job["enriched"] = True
        logger.info(f"[Enrich] ✅ Done: {job['title']} @ {job['company']}")

    except Exception as e:
        logger.warning(f"[Enrich] ⚠️ Failed for {url[:60]}: {e}")

    return job


def enrich_jobs_with_playwright(
    jobs: List[Dict[str, Any]],
    max_enrich: int = 10,
) -> List[Dict[str, Any]]:
    """
    SERP se mili jobs ko Playwright se enrich karo.
    Sirf wo jobs enrich hoti hain jinke paas direct_url ho.
    """
    enrichable = [j for j in jobs if j.get("direct_url")][:max_enrich]
    non_enrichable = [j for j in jobs if not j.get("direct_url")]

    if not enrichable:
        logger.info("[Enrich] No enrichable jobs found (no direct URLs).")
        return jobs

    logger.info(f"[Enrich] Enriching {len(enrichable)} jobs via Playwright...")

    with BrowserManager(headless=True) as browser_mgr:
        page = browser_mgr.new_page()
        for job in enrichable:
            job = _enrich_single_job(page, job)

    enriched_count = sum(1 for j in enrichable if j.get("enriched"))
    logger.info(f"[Enrich] Completed: {enriched_count}/{len(enrichable)} jobs enriched.")

    return enrichable + non_enrichable


# ---------------------------------------------------------------------------
# Public API — Hybrid Function
# ---------------------------------------------------------------------------

def scrape_google_jobs(
    query: str,
    max_jobs: int = 10,
    location: Optional[str] = "Pakistan",
    gl: str = "pk",
    hl: str = "en",
) -> Dict[str, Any]:
    """
    Hybrid pipeline:
      1. SERP API  → job discovery (fast, many results, basic data)
      2. Playwright → per-job enrichment (full description, salary, date)

    Args:
        query:       Search query, e.g. 'python developer'
        max_jobs:    Kitni jobs ko Playwright se enrich karna hai
        location:    Location string for SERP API
        gl:          Country code (default 'pk' for Pakistan)
        hl:          Language code

    Returns:
        Dict matching standard contract
    """
    # Step 1: Discover
    jobs = discover_jobs_via_serp(query, location=location, gl=gl, hl=hl)

    if not jobs:
        return {"data": [], "source": "google_jobs", "count": 0}

    # Step 2: Enrich
    jobs = enrich_jobs_with_playwright(jobs, max_enrich=max_jobs)

    return {"data": jobs, "source": "google_jobs", "count": len(jobs)}