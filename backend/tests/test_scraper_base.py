"""Tests for app.scraper.base — BaseScraper abstract class."""
import asyncio
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.scraper.base import BaseScraper


class ConcreteScraper(BaseScraper):
    """Concrete implementation for testing abstract base class."""

    async def scrape_exam_list(self):
        return [{"id": "exam1"}, {"id": "exam2"}]

    async def scrape_exam_questions(self, exam_id):
        if exam_id == "exam1":
            return [{"q": 1}, {"q": 2}]
        raise ValueError(f"Unknown exam: {exam_id}")


class TestBaseScraperInit:
    def test_default_rate_limit(self):
        scraper = ConcreteScraper()
        assert scraper.rate_limit_delay == 1.0
        assert scraper._last_request_time == 0

    def test_custom_rate_limit(self):
        scraper = ConcreteScraper(rate_limit_delay=2.5)
        assert scraper.rate_limit_delay == 2.5


class TestRateLimit:
    @pytest.mark.asyncio
    async def test_respects_rate_limit_delay(self):
        scraper = ConcreteScraper(rate_limit_delay=0.1)
        loop = asyncio.get_event_loop()
        scraper._last_request_time = loop.time()

        with patch("app.scraper.base.asyncio.sleep") as mock_sleep:
            await scraper._respect_rate_limit()
            mock_sleep.assert_called_once()
            sleep_arg = mock_sleep.call_args[0][0]
            assert 0 < sleep_arg <= 0.1

    @pytest.mark.asyncio
    async def test_no_sleep_when_enough_time_elapsed(self):
        scraper = ConcreteScraper(rate_limit_delay=0.01)
        scraper._last_request_time = 0  # epoch, so elapsed >> delay

        with patch("app.scraper.base.asyncio.sleep") as mock_sleep:
            await scraper._respect_rate_limit()
            mock_sleep.assert_not_called()


class TestFetchPage:
    @pytest.mark.asyncio
    async def test_fetch_page_returns_text(self):
        scraper = ConcreteScraper(rate_limit_delay=0)
        mock_response = MagicMock()
        mock_response.text = "<html>test</html>"
        mock_response.raise_for_status = MagicMock()

        with patch("app.scraper.base.httpx.AsyncClient") as MockClient:
            mock_client_instance = AsyncMock()
            mock_client_instance.get.return_value = mock_response
            mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
            mock_client_instance.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mock_client_instance

            result = await scraper.fetch_page("http://example.com")
            assert result == "<html>test</html>"
            mock_response.raise_for_status.assert_called_once()

    @pytest.mark.asyncio
    async def test_fetch_page_passes_headers(self):
        scraper = ConcreteScraper(rate_limit_delay=0)
        mock_response = MagicMock()
        mock_response.text = "ok"
        mock_response.raise_for_status = MagicMock()

        with patch("app.scraper.base.httpx.AsyncClient") as MockClient:
            mock_client_instance = AsyncMock()
            mock_client_instance.get.return_value = mock_response
            mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
            mock_client_instance.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = mock_client_instance

            headers = {"Authorization": "Bearer token"}
            await scraper.fetch_page("http://example.com", headers=headers)
            mock_client_instance.get.assert_called_once_with(
                "http://example.com", headers=headers
            )


class TestScrapeAll:
    @pytest.mark.asyncio
    async def test_scrape_all_collects_results(self):
        scraper = ConcreteScraper(rate_limit_delay=0)
        result = await scraper.scrape_all()

        assert result["total_exams"] == 2
        assert len(result["exams"]) == 2
        assert "scraped_at" in result
        # exam1 succeeds
        assert result["exams"][0]["questions"] == [{"q": 1}, {"q": 2}]
        # exam2 fails gracefully
        assert result["exams"][1]["questions"] == []
        assert "error" in result["exams"][1]
        assert "Unknown exam" in result["exams"][1]["error"]

    @pytest.mark.asyncio
    async def test_scrape_all_empty_list(self):
        class EmptyScraper(ConcreteScraper):
            async def scrape_exam_list(self):
                return []

        scraper = EmptyScraper(rate_limit_delay=0)
        result = await scraper.scrape_all()
        assert result["total_exams"] == 0
        assert result["exams"] == []