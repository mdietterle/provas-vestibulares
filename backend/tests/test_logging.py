"""Tests for app.core.logging — setup_logging configuration."""
import logging
from unittest.mock import patch, MagicMock
import pytest


class TestSetupLogging:
    @patch("app.core.logging.structlog")
    @patch("app.core.logging.settings")
    def test_configures_structlog_with_processors(self, mock_settings, mock_structlog):
        from app.core.logging import setup_logging

        mock_settings.LOG_LEVEL = "INFO"
        mock_bound_logger = MagicMock()
        mock_structlog.make_filtering_bound_logger.return_value = mock_bound_logger

        setup_logging()

        mock_structlog.configure.assert_called_once()
        call_kwargs = mock_structlog.configure.call_args[1]
        assert len(call_kwargs["processors"]) == 6
        assert call_kwargs["cache_logger_on_first_use"] is True

    @patch("app.core.logging.structlog")
    @patch("app.core.logging.settings")
    def test_sets_log_level_from_settings(self, mock_settings, mock_structlog):
        from app.core.logging import setup_logging

        mock_settings.LOG_LEVEL = "DEBUG"
        mock_bound_logger = MagicMock()
        mock_structlog.make_filtering_bound_logger.return_value = mock_bound_logger

        setup_logging()

        mock_structlog.make_filtering_bound_logger.assert_called_once_with(logging.DEBUG)

    @patch("app.core.logging.structlog")
    @patch("app.core.logging.settings")
    def test_suppresses_noisy_loggers(self, mock_settings, mock_structlog):
        from app.core.logging import setup_logging

        mock_settings.LOG_LEVEL = "WARNING"
        mock_bound_logger = MagicMock()
        mock_structlog.make_filtering_bound_logger.return_value = mock_bound_logger

        with patch("app.core.logging.logging.getLogger") as mock_get_logger:
            mock_logger = MagicMock()
            mock_get_logger.return_value = mock_logger
            setup_logging()
            assert mock_get_logger.call_count == 2
            mock_get_logger.assert_any_call("uvicorn.access")
            mock_get_logger.assert_any_call("sqlalchemy.engine")
            assert mock_logger.setLevel.call_count == 2
            mock_logger.setLevel.assert_called_with(logging.WARNING)

    @patch("app.core.logging.structlog")
    @patch("app.core.logging.settings")
    def test_falls_back_to_info_for_invalid_level(self, mock_settings, mock_structlog):
        from app.core.logging import setup_logging

        mock_settings.LOG_LEVEL = "INVALID_LEVEL"
        mock_bound_logger = MagicMock()
        mock_structlog.make_filtering_bound_logger.return_value = mock_bound_logger

        setup_logging()

        # getattr(logging, "INVALID_LEVEL", logging.INFO) returns logging.INFO
        mock_structlog.make_filtering_bound_logger.assert_called_once_with(logging.INFO)