"""
CareerOkay scraper selectors.

CareerOkay replaces Rozee as a lighter Pakistan jobs source.
"""

CAREEROKAY_CONFIG = {
    "source": "careerokay",
    "source_label": "CareerOkay",
    "urls": [
        "https://www.careerokay.com/jobs/jobs-in-pakistan?search={query}",
        "https://www.careerokay.com/jobs/job-search?keyword={query}",
    ],
    "list": {
        "cards": (
            "article, div.job, div.job-listing, div[class*='job'], "
            "li[class*='job'], div[class*='career']"
        ),
        "links": "a[href*='/jobs/'], a[href*='/job/']",
    },
}