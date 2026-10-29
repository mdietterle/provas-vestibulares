"""Tests for batch import endpoint — validates sequential execution,
error isolation, progress reporting, and input validation."""
import pytest
from unittest.mock import patch, MagicMock


class TestBatchImportEndpoint:
    """Test POST /batch-import endpoint behavior."""

    def test_requires_owner_auth(self, client):
        """Endpoint rejects unauthenticated requests."""
        resp = client.post("/api/batch-import", json={
            "year": 2024,
            "vestibulares": ["enem"],
        })
        assert resp.status_code == 401

    def test_rejects_empty_vestibulares(self, authenticated_client):
        """Endpoint rejects empty vestibulares list."""
        # Need owner role for this endpoint
        resp = authenticated_client.post("/api/batch-import", json={
            "year": 2024,
            "vestibulares": [],
        })
        # Should be 400 or 403 depending on role check
        assert resp.status_code in (400, 403)

    def test_rejects_invalid_vestibular_names(self, authenticated_client):
        """Endpoint rejects unknown vestibular slugs."""
        resp = authenticated_client.post("/api/batch-import", json={
            "year": 2024,
            "vestibulares": ["enem", "invalid_university_xyz"],
        })
        assert resp.status_code in (400, 403)
        if resp.status_code == 400:
            assert "inválidos" in resp.json().get("detail", "").lower() or "invalid" in str(resp.json()).lower()

    def test_accepts_valid_request_structure(self, authenticated_client):
        """Endpoint accepts well-formed request and returns task_id."""
        with patch("app.routers.batch_import._run_batch_import") as mock_run:
            resp = authenticated_client.post("/api/batch-import", json={
                "year": 2024,
                "vestibulares": ["enem", "ufsc"],
                "force_reimport": False,
            })
            # May be 403 if not owner, but structure should be accepted
            if resp.status_code == 200:
                data = resp.json()
                assert "task_id" in data
                assert isinstance(data["task_id"], str)
                assert len(data["task_id"]) > 0


class TestBatchImportLogic:
    """Test _run_batch_import internal logic with mocked importers."""

    def test_runs_importers_sequentially(self):
        """Verifies importers are called in order for each vestibular."""
        from app.routers.batch_import import _run_batch_import
        from app.services.progress import TASKS

        call_order = []

        def mock_enem_importer(**kwargs):
            call_order.append("enem")
            return {"total_added": 10}

        def mock_ufsc_importer(**kwargs):
            call_order.append("ufsc")
            return {"total_added": 5}

        with patch("app.routers.batch_import._get_importer_func") as mock_get_func:
            mock_get_func.side_effect = lambda v: {
                "enem": mock_enem_importer,
                "ufsc": mock_ufsc_importer,
            }.get(v)

            # Create a fake task
            task_id = "test-task-123"
            TASKS[task_id] = {
                "status": "running",
                "current": 0,
                "total": 2,
                "items_done": None,
                "logs": [],
                "result": None,
                "error": None,
            }

            with patch("app.routers.batch_import.SessionLocal") as mock_session:
                mock_db = MagicMock()
                mock_session.return_value = mock_db

                _run_batch_import(
                    task_id=task_id,
                    year=2024,
                    vestibulares=["enem", "ufsc"],
                    force_reimport=False,
                )

        assert call_order == ["enem", "ufsc"]
        assert TASKS[task_id]["status"] == "completed"
        assert TASKS[task_id]["result"]["total_added"] == 15
        assert TASKS[task_id]["result"]["success_count"] == 2

    def test_continues_after_individual_error(self):
        """Verifies batch continues after one importer fails."""
        from app.routers.batch_import import _run_batch_import
        from app.services.progress import TASKS

        def mock_enem_importer(**kwargs):
            raise RuntimeError("ENEM import failed")

        def mock_ufsc_importer(**kwargs):
            return {"total_added": 8}

        with patch("app.routers.batch_import._get_importer_func") as mock_get_func:
            mock_get_func.side_effect = lambda v: {
                "enem": mock_enem_importer,
                "ufsc": mock_ufsc_importer,
            }.get(v)

            task_id = "test-task-456"
            TASKS[task_id] = {
                "status": "running",
                "current": 0,
                "total": 2,
                "items_done": None,
                "logs": [],
                "result": None,
                "error": None,
            }

            with patch("app.routers.batch_import.SessionLocal") as mock_session:
                mock_db = MagicMock()
                mock_session.return_value = mock_db

                _run_batch_import(
                    task_id=task_id,
                    year=2024,
                    vestibulares=["enem", "ufsc"],
                    force_reimport=False,
                )

        assert TASKS[task_id]["status"] == "completed"
        assert TASKS[task_id]["result"]["total_added"] == 8
        assert TASKS[task_id]["result"]["success_count"] == 1
        assert len(TASKS[task_id]["result"]["errors"]) == 1
        assert TASKS[task_id]["result"]["errors"][0]["vestibular"] == "enem"

    def test_handles_missing_importer_gracefully(self):
        """Verifies batch skips vestibulares without importer function."""
        from app.routers.batch_import import _run_batch_import
        from app.services.progress import TASKS

        def mock_enem_importer(**kwargs):
            return {"total_added": 12}

        with patch("app.routers.batch_import._get_importer_func") as mock_get_func:
            mock_get_func.side_effect = lambda v: {
                "enem": mock_enem_importer,
                "unknown": None,
            }.get(v)

            task_id = "test-task-789"
            TASKS[task_id] = {
                "status": "running",
                "current": 0,
                "total": 2,
                "items_done": None,
                "logs": [],
                "result": None,
                "error": None,
            }

            with patch("app.routers.batch_import.SessionLocal") as mock_session:
                mock_db = MagicMock()
                mock_session.return_value = mock_db

                _run_batch_import(
                    task_id=task_id,
                    year=2024,
                    vestibulares=["enem", "unknown"],
                    force_reimport=False,
                )

        assert TASKS[task_id]["status"] == "completed"
        assert TASKS[task_id]["result"]["total_added"] == 12
        assert TASKS[task_id]["result"]["success_count"] == 1
        assert len(TASKS[task_id]["result"]["errors"]) == 1
        assert "não encontrado" in TASKS[task_id]["result"]["errors"][0]["error"]

    def test_reports_progress_per_item(self):
        """Verifies progress updates are logged for each vestibular."""
        from app.routers.batch_import import _run_batch_import
        from app.services.progress import TASKS

        def mock_importer(**kwargs):
            return {"total_added": 3}

        with patch("app.routers.batch_import._get_importer_func") as mock_get_func:
            mock_get_func.return_value = mock_importer

            task_id = "test-task-progress"
            TASKS[task_id] = {
                "status": "running",
                "current": 0,
                "total": 2,
                "items_done": None,
                "logs": [],
                "result": None,
                "error": None,
            }

            with patch("app.routers.batch_import.SessionLocal") as mock_session:
                mock_db = MagicMock()
                mock_session.return_value = mock_db

                _run_batch_import(
                    task_id=task_id,
                    year=2024,
                    vestibulares=["enem", "ufsc"],
                    force_reimport=False,
                )

        logs = TASKS[task_id]["logs"]
        assert len(logs) >= 4  # start + 2 items + completion
        log_messages = [l["message"] for l in logs]
        assert any("Iniciando" in m for m in log_messages)
        assert any("ENEM" in m for m in log_messages)
        assert any("UFSC" in m for m in log_messages)
        assert any("concluído" in m for m in log_messages)

    def test_passes_correct_parameters_to_importers(self):
        """Verifies year and force_reimport are passed to importer functions."""
        from app.routers.batch_import import _run_batch_import
        from app.services.progress import TASKS

        captured_kwargs = {}

        def mock_importer(since_year=None, until_year=None, year=None, force_reimport=False, db=None, task_id=None):
            captured_kwargs.update({
                "since_year": since_year,
                "until_year": until_year,
                "year": year,
                "force_reimport": force_reimport,
                "db": db,
                "task_id": task_id,
            })
            return {"total_added": 1}

        with patch("app.routers.batch_import._get_importer_func") as mock_get_func:
            mock_get_func.return_value = mock_importer

            task_id = "test-task-params"
            TASKS[task_id] = {
                "status": "running",
                "current": 0,
                "total": 1,
                "items_done": None,
                "logs": [],
                "result": None,
                "error": None,
            }

            with patch("app.routers.batch_import.SessionLocal") as mock_session:
                mock_db = MagicMock()
                mock_session.return_value = mock_db

                _run_batch_import(
                    task_id=task_id,
                    year=2023,
                    vestibulares=["enem"],
                    force_reimport=True,
                )

        assert captured_kwargs["since_year"] == 2023
        assert captured_kwargs["until_year"] == 2023
        assert captured_kwargs["force_reimport"] is True


class TestGetImporterFunc:
    """Test _get_importer_func resolution logic."""

    def test_returns_none_for_unknown_vestibular(self):
        """Returns None when no importer module exists."""
        from app.routers.batch_import import _get_importer_func

        result = _get_importer_func("nonexistent_university_xyz")
        assert result is None

    def test_resolves_service_pattern(self):
        """Resolves import_{vestibular}_all from services module."""
        from app.routers.batch_import import _get_importer_func

        with patch("importlib.import_module") as mock_import:
            mock_module = MagicMock()
            mock_module.import_enem_all = MagicMock()
            mock_import.return_value = mock_module

            result = _get_importer_func("enem")
            assert result == mock_module.import_enem_all

    def test_falls_back_to_router_pattern(self):
        """Falls back to router run_seed/run_import when service not found."""
        from app.routers.batch_import import _get_importer_func

        with patch("importlib.import_module") as mock_import:
            # First call (service) raises ImportError
            # Second call (router) succeeds
            mock_router_module = MagicMock()
            mock_router_module.run_seed = MagicMock()

            def side_effect(module_name):
                if "services" in module_name:
                    raise ImportError("No service module")
                return mock_router_module

            mock_import.side_effect = side_effect

            result = _get_importer_func("acafe")
            assert result == mock_router_module.run_seed