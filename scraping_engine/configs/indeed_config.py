"""
Indeed Scraper Configuration File.
"""

INDEED_CONFIG = {
    # --- Main List Selectors ---
    "job_list": "ul.jobsearch-ResultsList > li",
    
    # --- Card Detail Selectors ---
    "card": {
        "title": "h2.jobTitle",
        "company": "span[data-testid='company-name']",
        "location": "div[data-testid='text-location']",
        "link": "h2.jobTitle a",
        "image": "img", # Fallback, Indeed rarely has logos on the list
        "time": "span.date, span[data-testid='myJobsStateDate']"
    },
    
    # --- Expanded Pane Selectors ---
    "detail_pane": {
        "container": "div.jobsearch-RightPane, div.jobsearch-ViewJobLayout-jobDisplay",
        "description": "div#jobDescriptionText",
        "posted_time": "span.date"
    }
}
