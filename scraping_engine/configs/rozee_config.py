"""
Rozee.pk Scraper Configuration File.
"""

ROZEE_CONFIG = {
    # --- Main List Selectors ---
    "job_list": "div.job.job-srp, div.job-listing, div#jobs-list div.job",
    
    # --- Card Detail Selectors ---
    "card": {
        "title": "h3 a, h2 a",
        "company": "div.cname a, span.cname",
        "location": "span.loc a, span.loc",
        "link": "h3 a, h2 a",
        "image": "div.im img, div.logo img",
        "time": "span.time, span.posted, span.date"
    },
    
    # --- Expanded Pane Selectors ---
    # Rozee often opens a new page instead of a pane, 
    # but we extract the snippet description from the card.
    "detail_pane": {
        "container": "div.j-desc, div.job-detail",
        "description": "div.j-desc, p.description",
        "posted_time": "span.time"
    }
}
