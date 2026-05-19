"""
LinkedIn Scraper Configuration File.
Contains CSS selectors used to extract job details from the LinkedIn Jobs Search page.
Centralizing these selectors makes the scraper much easier to maintain if LinkedIn updates their HTML.
"""

LINKEDIN_CONFIG = {
    # --- Main List Selectors ---
    "job_list": "ul.jobs-search__results-list > li",
    
    # --- Card Detail Selectors (Basic info visible on the list) ---
    "card": {
        "title": "h3.base-search-card__title",
        "company": "h4.base-search-card__subtitle",
        "location": "span.job-search-card__location",
        "link": "a.base-card__full-link",
        "image": "img",
        "time": "time"
    },
    
    # --- Expanded Pane Selectors (Full details visible when a card is clicked) ---
    "detail_pane": {
        "container": "div.two-pane-serp-page__detail-view",
        "description": "div.show-more-less-html__markup",
        "posted_time": "span.posted-time-ago__text",
    }
}
