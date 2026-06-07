import logging
from typing import Optional

from playwright.sync_api import Browser, Page, Playwright, sync_playwright


logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


class BrowserManager:
    """
    Small Playwright browser manager used by the scraper modules.
    It matches the style of the existing job scrapers.
    """

    def __init__(self, headless: bool = True, user_agent: str | None = None):
        self.headless = headless
        self.user_agent = user_agent
        self._playwright: Optional[Playwright] = None
        self._browser: Optional[Browser] = None

    def start(self):
        if self._playwright is None:
            self._playwright = sync_playwright().start()
            self._browser = self._playwright.chromium.launch(
                headless=self.headless,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--disable-infobars",
                ],
            )
            logger.info("Browser started successfully.")
        return self

    def new_page(self) -> Page:
        if self._browser is None:
            raise RuntimeError("Browser is not started. Use BrowserManager with a context manager.")

        context_kwargs = {
            "viewport": {"width": 1920, "height": 1080},
            "locale": "en-US",
        }
        if self.user_agent:
            context_kwargs["user_agent"] = self.user_agent
        context = self._browser.new_context(**context_kwargs)
        return context.new_page()

    def close(self):
        if self._browser:
            self._browser.close()
            self._browser = None
        if self._playwright:
            self._playwright.stop()
            self._playwright = None
        logger.info("Browser closed safely.")

    def __enter__(self):
        return self.start()

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
