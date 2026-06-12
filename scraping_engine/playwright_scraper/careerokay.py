"""
careerokay.py — Full 2-step scraper (linkdin.py jaisa, no login)

Step 1: List page  -> title, company, location, salary, posted_at, apply_link, snippet
Step 2: Detail page -> full description (+ logo)

KEY FIX vs purana version:
  CareerOkay ke asli jobs ka URL pattern: /Job/job-listings-<slug>--<ref>
  (capital "Job"). Purana scraper lowercase /jobs/ utha raha tha jo CATEGORY pages
  hain (customer-service-jobs, information-technology-jobs ...) -> isi liye
  "desc 0 chars" aur ghalat results. Ab sirf  a[href*="/Job/job-listings-"]
  anchors liye jaate hain, is liye category/city links khud filter ho jaate hain.

  List page SSR hai aur kaafi rich hai (salary + snippet bhi) — LinkedIn se behtar.
"""
import logging
import re
import urllib.parse
from typing import Any, Dict, List

from scraping_engine.engine.browser import BrowserManager

logger = logging.getLogger(__name__)

SOURCE = "careerokay"
SOURCE_LABEL = "CareerOkay"

# Keyword slug pehle, phir general fallback. Jo bhi /Job/job-listings- anchors de, wahi use hoga.
def _list_urls(query: str) -> List[str]:
    slug = re.sub(r"[^a-z0-9\s-]", "", query.lower()).strip()
    slug = re.sub(r"\s+", "-", slug).strip("-")
    urls = []
    if slug:
        urls.append(f"https://www.careerokay.com/jobs/{slug}-jobs")
    urls.append("https://www.careerokay.com/jobs/jobs-in-pakistan")
    return urls


# ── Step 1: List page extractor ──────────────────────────────────────────────
_LIST_JS = r"""() => {
    const jobs = [];
    const seen = new Set();

    // Sirf asli job postings: /Job/job-listings-...--<ref>
    const anchors = Array.from(document.querySelectorAll('a[href*="/Job/job-listings-"]'));

    for (const a of anchors) {
        try {
            const href = a.href || a.getAttribute('href') || '';
            const title = (a.innerText || '').trim();
            if (!href || !title || title.length < 3 || seen.has(href)) continue;
            seen.add(href);

            // Card container: upar climb karo jab tak Apply link mil jaye
            let card = a;
            for (let i = 0; i < 7 && card.parentElement; i++) {
                card = card.parentElement;
                if (card.querySelector('a[href*="/Job/apply/"]')) break;
            }

            // Location: city links (/jobs/jobs-in-<city>)
            const cityEls = Array.from(card.querySelectorAll('a[href*="/jobs/jobs-in-"]'));
            let location = cityEls
                .map(e => e.innerText.trim().replace(/[,]+$/, ''))
                .filter(t => t && t.toLowerCase() !== 'pakistan')
                .join(', ');
            if (!location) location = 'Pakistan';

            // Text lines for company / salary / date
            const lines = (card.innerText || '').split('\n').map(s => s.trim()).filter(Boolean);

            // Company: title ke just baad wali line ka pehla hissa (before " - ")
            let company = '';
            const ti = lines.findIndex(l => l === title);
            if (ti >= 0 && lines[ti + 1]) {
                company = lines[ti + 1].split(' - ')[0].split(',')[0].trim();
            }

            // Salary
            let salary = '';
            const sl = lines.find(l => /(pkr|rs\.?)/i.test(l) || /\bk to\b/i.test(l) || /per month/i.test(l));
            if (sl) {
                const m = sl.match(/[\d.,]+\s*k?\s*(?:to|-)\s*[\d.,]+\s*k?\s*\(?\s*(?:pkr|rs)\)?.*?(?:per month)?/i);
                salary = (m ? m[0] : sl).trim();
                if (/not disclosed/i.test(salary)) salary = '';
            }

            // Posted date e.g. "Jun 06,2026"
            let posted_at = '';
            const dm = (card.innerText || '').match(/[A-Za-z]{3}\s*\d{1,2}\s*,?\s*\d{4}/);
            if (dm) posted_at = dm[0].trim();

            // Short snippet: aakhri lambi line (description)
            let snippet = '';
            for (let k = lines.length - 1; k >= 0; k--) {
                if (lines[k].length > 30 && !/apply|view/i.test(lines[k])) { snippet = lines[k]; break; }
            }

            const imgs = Array.from(card.querySelectorAll('img'));
            let logo = '';
            for (const img of imgs) {
                const src = img.getAttribute('data-src') || img.src || '';
                if (src && !/pixel|tracker|blank|placeholder|careerokay/i.test(src)) {
                    logo = src;
                    break;
                }
            }

            jobs.push({
                title, company, location, salary, posted_at,
                apply_link: href, logo, banner: '', snippet
            });
        } catch (e) {}
    }

    return { jobs, debug: { jobAnchors: anchors.length, bodyLen: document.body ? document.body.innerText.length : 0 } };
}"""

# ── Step 2: Detail page extractor (generic — class names unknown) ─────────────
# company_name is injected as a template variable at runtime
_DETAIL_JS_TEMPLATE = r"""(companyName) => {
    const text = (sel) => { const el = document.querySelector(sel); return el ? el.innerText.trim() : ''; };

    const sels = [
        '[itemprop="description"]', '#job-description', '.job-description', '[class*="job-description"]',
        '[class*="job-detail"]', '[class*="detail-content"]', '[class*="description"]', 'article', '.content', '.job-details'
    ];
    let description = '';
    for (const s of sels) {
        const t = text(s);
        if (t && t.length > 50) { description = t; break; }
    }
    if (!description) {
        // fallback: sab se lambi paragraph-jaisi block
        let best = '';
        document.querySelectorAll('div, section, p, li').forEach(el => {
            const t = (el.innerText || '').trim();
            if (t.length > best.length && t.length < 10000 && t.split(' ').length > 15) best = t;
        });
        description = best;
    }

    let logo = '';
    const imgEls = Array.from(document.querySelectorAll('img[alt*="logo" i], img[src*="logo" i], .company-logo img, [class*="logo"] img'));
    for (const img of imgEls) {
        const src = img.src || img.getAttribute('data-src') || '';
        if (src && !src.toLowerCase().includes('careerokay') && !src.toLowerCase().includes('placeholder')) {
            logo = src;
            break;
        }
    }

    return { description, logo };
}"""


def scrape_careerokay(query: str, max_jobs: int = 10) -> Dict[str, Any]:
    import asyncio
    try:
        asyncio.get_running_loop()
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            return pool.submit(_scrape_careerokay_sync, query, max_jobs).result(timeout=150)
    except RuntimeError:
        return _scrape_careerokay_sync(query, max_jobs)


def _clean_salary(raw: str) -> str:
    if not raw:
        return ""
    blocked = {"google_jobs", "google", "linkedin", "rozee", "indeed", "careerokay", "not disclosed"}
    if raw.strip().lower() in blocked:
        return ""
    return raw.strip()


def _scrape_careerokay_sync(query: str, max_jobs: int = 10) -> Dict[str, Any]:
    logger.info("[CareerOkay] Query: '%s'", query)
    jobs: List[Dict[str, Any]] = []

    ua = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
          "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")

    with BrowserManager(headless=True, user_agent=ua) as mgr:
        page = mgr.new_page()

        # ── Step 1: Scrape ALL list pages and merge (dedupe by href) ──────────
        all_raw_jobs: List[Dict[str, Any]] = []
        seen_hrefs: set = set()

        # Build all URLs to try: slug page + page2, then jobs-in-pakistan + page2
        slug = re.sub(r"[^a-z0-9\s-]", "", query.lower()).strip()
        slug = re.sub(r"\s+", "-", slug).strip("-")
        urls_to_scrape = []
        if slug:
            urls_to_scrape.append(f"https://www.careerokay.com/jobs/{slug}-jobs")
            urls_to_scrape.append(f"https://www.careerokay.com/jobs/{slug}-jobs?page=2")
        urls_to_scrape.append("https://www.careerokay.com/jobs/jobs-in-pakistan")
        urls_to_scrape.append("https://www.careerokay.com/jobs/jobs-in-pakistan?page=2")

        for url in urls_to_scrape:
            if len(all_raw_jobs) >= max_jobs:
                break
            try:
                logger.info("[CareerOkay] List page: %s", url)
                page.goto(url, wait_until="domcontentloaded", timeout=40000)
                try:
                    page.wait_for_load_state("networkidle", timeout=12000)
                except Exception:
                    pass
                try:
                    page.wait_for_selector('a[href*="/Job/job-listings-"]', timeout=10000)
                except Exception:
                    pass
                for _ in range(4):
                    page.evaluate("window.scrollBy(0, 1000)")
                    page.wait_for_timeout(500)

                result = page.evaluate(_LIST_JS)
                raw_jobs = result.get("jobs", []) if isinstance(result, dict) else (result or [])
                logger.info(
                    "[CareerOkay] %s: %s jobs (debug=%s)",
                    url, len(raw_jobs), result.get("debug") if isinstance(result, dict) else {},
                )
                for job in raw_jobs:
                    href = job.get("apply_link", "")
                    if href and href not in seen_hrefs:
                        seen_hrefs.add(href)
                        all_raw_jobs.append(job)
            except Exception as e:
                logger.error("[CareerOkay] List error on %s: %s", url, e)
                continue

        jobs = all_raw_jobs[:max_jobs]
        logger.info("[CareerOkay] Total unique jobs after merge: %s", len(jobs))

        if not jobs:
            logger.warning("[CareerOkay] No jobs from list page")
            return {"data": [], "source": SOURCE, "count": 0}

        # ── Step 2: Detail page for each job ─────────────────────────────────
        enriched: List[Dict[str, Any]] = []
        for job in jobs:
            apply_url = job.get("apply_link", "")
            list_snippet = job.get("snippet", "")
            base = {
                "title": job.get("title", ""),
                "company": job.get("company", ""),
                "location": job.get("location", "Pakistan"),
                "salary": _clean_salary(job.get("salary", "")),
                "logo": job.get("logo", ""),
                "banner": job.get("banner", ""),
                "apply_link": apply_url,
                "snippet": list_snippet,
                "posted_at": job.get("posted_at", ""),
                "source": SOURCE,
                "source_label": SOURCE_LABEL,
                "description": list_snippet,  # fallback: list snippet
            }

            if not apply_url or not apply_url.startswith("http"):
                enriched.append(base)
                continue

            try:
                logger.info("[CareerOkay] Detail page: %s", apply_url)
                page.goto(apply_url, wait_until="domcontentloaded", timeout=40000)
                try:
                    page.wait_for_load_state("networkidle", timeout=12000)
                except Exception:
                    pass
                # Pass company name so the JS can match logo by img.alt text
                company_name = base.get("company", "")
                detail = page.evaluate(_DETAIL_JS_TEMPLATE, company_name)
                desc = (detail.get("description") or "").strip()
                if len(desc) > len(list_snippet):
                    base["description"] = desc
                if detail.get("logo"):
                    base["logo"] = detail["logo"]
                enriched.append(base)
                logger.info("[CareerOkay] OK %s @ %s — desc %s chars",
                            base["title"], base["company"], len(base["description"]))
            except Exception as e:
                logger.warning("[CareerOkay] Detail error for %s: %s", apply_url, e)
                enriched.append(base)

    logger.info("[CareerOkay] Total enriched: %s", len(enriched))
    return {"data": enriched, "source": SOURCE, "count": len(enriched)}