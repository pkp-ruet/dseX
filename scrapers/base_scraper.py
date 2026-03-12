import time
import random
import logging
import requests
from bs4 import BeautifulSoup
from config import USER_AGENTS, REQUEST_DELAY, REQUEST_TIMEOUT, MAX_RETRIES

logger = logging.getLogger(__name__)


class BaseScraper:
    def __init__(self):
        self.session = requests.Session()
        self._rotate_user_agent()

    def _rotate_user_agent(self):
        ua = random.choice(USER_AGENTS)
        self.session.headers.update({"User-Agent": ua})

    def fetch(self, url, params=None):
        """Fetch a URL with retry logic and rate limiting."""
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                self._rotate_user_agent()
                resp = self.session.get(url, params=params, timeout=REQUEST_TIMEOUT)
                resp.raise_for_status()
                time.sleep(REQUEST_DELAY)
                return resp
            except requests.RequestException as e:
                wait = 2 ** attempt
                logger.warning(
                    "Attempt %d/%d failed for %s: %s  — retrying in %ds",
                    attempt, MAX_RETRIES, url, e, wait,
                )
                if attempt < MAX_RETRIES:
                    time.sleep(wait)
        logger.error("All %d attempts failed for %s", MAX_RETRIES, url)
        return None

    def fetch_soup(self, url, params=None):
        """Fetch a URL and return a BeautifulSoup object."""
        resp = self.fetch(url, params)
        if resp is None:
            return None
        return BeautifulSoup(resp.content, "lxml")
