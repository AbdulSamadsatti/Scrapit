import time
import logging
from typing import List, Dict, Any
from scraping_engine.engine.browser import BrowserManager
from scraping_engine.configs.linkdin_config import LINKEDIN_CONFIG

logger = logging.getLogger(__name__)

def scrape_linkedin_jobs(query: str, max_jobs: int = 15) -> List[Dict[str, Any]]:
    """
    Scrapes LinkedIn for job listings, extracting full details including 
    the job description from the detail pane, company logo, and location.
    """
    logger.info(f"Starting LinkedIn scraper for query: '{query}'")
    
    url = f"https://www.linkedin.com/jobs/search/?keywords={query}"
    jobs = []
    
    # Utilizing our new clean BrowserManager
    with BrowserManager(headless=True) as browser_mgr:
        page = browser_mgr.new_page()
        
        try:
            logger.info(f"Navigating to {url}")
            page.goto(url, wait_until="domcontentloaded", timeout=30000)
            
            # Wait for the main list to appear
            page.wait_for_selector(LINKEDIN_CONFIG["job_list"], timeout=15000)
            
            # Scroll down dynamically to trigger lazy-loading of jobs
            logger.info("Scrolling to load jobs...")
            for _ in range(4):
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                page.wait_for_timeout(1000)
                
            # Use Playwright locators to find all job cards
            job_cards = page.locator(LINKEDIN_CONFIG["job_list"]).all()
            logger.info(f"Found {len(job_cards)} job cards on the page.")
            
            for index, card in enumerate(job_cards):
                if len(jobs) >= max_jobs:
                    break
                
                try:
                    # 1. Click the card to open the right-side detail pane (to get full description)
                    card.scroll_into_view_if_needed()
                    
                    # Remove LinkedIn sign-in modals that might block our clicks
                    page.evaluate("document.querySelectorAll('.modal__overlay, .contextual-sign-in-modal').forEach(el => el.remove())")
                    
                    # Use force=True to bypass Playwright's actionability overlay checks
                    card.click(force=True)
                    page.wait_for_timeout(1500) # Give the detail pane a moment to load
                    
                    # 2. Extract Basic Data from the list card
                    cfg_card = LINKEDIN_CONFIG["card"]
                    title = card.locator(cfg_card["title"]).inner_text().strip() if card.locator(cfg_card["title"]).count() > 0 else "Unknown Title"
                    company = card.locator(cfg_card["company"]).inner_text().strip() if card.locator(cfg_card["company"]).count() > 0 else "Unknown Company"
                    location = card.locator(cfg_card["location"]).inner_text().strip() if card.locator(cfg_card["location"]).count() > 0 else "Unknown Location"
                    
                    # Link
                    link = ""
                    if card.locator(cfg_card["link"]).count() > 0:
                        link = card.locator(cfg_card["link"]).get_attribute("href")
                        if link:
                            link = link.split("?")[0] # Remove tracking params from URL
                    
                    # Image/Logo (LinkedIn uses lazy loading, so check data-delayed-url first)
                    image = ""
                    if card.locator(cfg_card["image"]).count() > 0:
                        img_loc = card.locator(cfg_card["image"]).first
                        image = img_loc.get_attribute("data-delayed-url") or img_loc.get_attribute("src") or ""
                        
                    # 3. Extract Detailed Data from the right pane
                    description = ""
                    posted_date = ""
                    cfg_pane = LINKEDIN_CONFIG["detail_pane"]
                    
                    detail_pane = page.locator(cfg_pane["container"])
                    if detail_pane.count() > 0:
                        desc_locator = detail_pane.locator(cfg_pane["description"])
                        if desc_locator.count() > 0:
                            description = desc_locator.inner_text().strip()
                            
                        if detail_pane.locator(cfg_pane["posted_time"]).count() > 0:
                            posted_date = detail_pane.locator(cfg_pane["posted_time"]).inner_text().strip()
                            
                    # Fallback for posted_date if not found in pane
                    if not posted_date and card.locator(cfg_card["time"]).count() > 0:
                        posted_date = card.locator(cfg_card["time"]).inner_text().strip()

                    # Save the job data
                    jobs.append({
                        "title": title,
                        "company": company,
                        "location": location,
                        "image": image,
                        "link": link,
                        "description": description,
                        "posted_date": posted_date,
                        "source": "linkedin"
                    })
                    
                    logger.info(f"✅ Scraped: {title} at {company}")
                    
                except Exception as e:
                    logger.warning(f"⚠️ Error parsing job card {index+1}: {str(e)}")
                    continue
                    
        except Exception as e:
            logger.error(f"❌ Failed to load LinkedIn jobs page: {str(e)}")
            
    logger.info(f"Finished scraping {len(jobs)} LinkedIn jobs.")
    return jobs

# Example usage for testing:
# if __name__ == "__main__":
#     jobs = scrape_linkedin_jobs("React Native Developer")
#     for j in jobs:
#         print(j['title'], "-", j['company'])
