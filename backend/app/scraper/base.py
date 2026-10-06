from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
import httpx
import asyncio
from datetime import datetime


class BaseScraper(ABC):
    """Base class for vestibular exam scrapers."""

    def __init__(self, rate_limit_delay: float = 1.0):
        self.rate_limit_delay = rate_limit_delay
        self._last_request_time: float = 0

    async def _respect_rate_limit(self) -> None:
        """Enforce delay between requests to avoid being blocked."""
        now = asyncio.get_event_loop().time()
        elapsed = now - self._last_request_time
        if elapsed < self.rate_limit_delay:
            await asyncio.sleep(self.rate_limit_delay - elapsed)
        self._last_request_time = asyncio.get_event_loop().time()

    async def fetch_page(self, url: str, headers: Optional[Dict[str, str]] = None) -> str:
        """Fetch page content with rate limiting and error handling."""
        await self._respect_rate_limit()
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers or {})
            response.raise_for_status()
            return response.text

    @abstractmethod
    async def scrape_exam_list(self) -> List[Dict[str, Any]]:
        """Scrape list of available exams. Returns list of dicts with exam metadata."""
        pass

    @abstractmethod
    async def scrape_exam_questions(self, exam_id: str) -> List[Dict[str, Any]]:
        """Scrape questions for a specific exam. Returns list of question dicts."""
        pass

    async def scrape_all(self) -> Dict[str, Any]:
        """Full scrape pipeline: list exams then questions for each."""
        exams = await self.scrape_exam_list()
        results = []
        for exam in exams:
            try:
                questions = await self.scrape_exam_questions(exam["id"])
                results.append({**exam, "questions": questions})
            except Exception as e:
                results.append({**exam, "error": str(e), "questions": []})
        return {
            "scraped_at": datetime.utcnow().isoformat(),
            "total_exams": len(results),
            "exams": results,
        }