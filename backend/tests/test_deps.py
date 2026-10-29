"""Tests for app.deps — dependency injection helpers."""
import pytest
from unittest.mock import MagicMock
from fastapi import HTTPException

from app.core.security import create_access_token
from app.deps import get_current_user, require_admin, require_professor, require_owner
from app.models import User, UserRole


class TestGetCurrentUser:
    @pytest.fixture
    def mock_db(self):
        return MagicMock()

    def test_invalid_token_raises_401(self, mock_db):
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(token="invalid.token.here", db=mock_db)
        assert exc_info.value.status_code == 401

    def test_missing_sub_claim_raises_401(self, mock_db):
        token = create_access_token(data={"role": "admin"})  # no "sub"
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(token=token, db=mock_db)
        assert exc_info.value.status_code == 401

    def test_user_not_found_raises_401(self, mock_db):
        token = create_access_token(data={"sub": "99999"})
        mock_db.get.return_value = None
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(token=token, db=mock_db)
        assert exc_info.value.status_code == 401

    def test_inactive_user_raises_401(self, mock_db):
        token = create_access_token(data={"sub": "1"})
        fake_user = MagicMock(spec=User)
        fake_user.is_active = False
        mock_db.get.return_value = fake_user
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(token=token, db=mock_db)
        assert exc_info.value.status_code == 401

    def test_valid_token_returns_user(self, mock_db):
        token = create_access_token(data={"sub": "1"})
        fake_user = MagicMock(spec=User)
        fake_user.is_active = True
        fake_user.id = 1
        mock_db.get.return_value = fake_user
        result = get_current_user(token=token, db=mock_db)
        assert result == fake_user
        mock_db.get.assert_called_once()


class TestRequireAdmin:
    def test_admin_passes(self):
        user = MagicMock(spec=User)
        user.role = UserRole.ADMIN
        assert require_admin(user) == user

    def test_non_admin_raises_403(self):
        user = MagicMock(spec=User)
        user.role = UserRole.STUDENT
        with pytest.raises(HTTPException) as exc_info:
            require_admin(user)
        assert exc_info.value.status_code == 403


class TestRequireProfessor:
    def test_professor_passes(self):
        user = MagicMock(spec=User)
        user.role = UserRole.PROFESSOR
        assert require_professor(user) == user

    def test_admin_passes(self):
        user = MagicMock(spec=User)
        user.role = UserRole.ADMIN
        assert require_professor(user) == user

    def test_student_raises_403(self):
        user = MagicMock(spec=User)
        user.role = UserRole.STUDENT
        with pytest.raises(HTTPException) as exc_info:
            require_professor(user)
        assert exc_info.value.status_code == 403


class TestRequireOwner:
    def test_owner_passes(self):
        user = MagicMock(spec=User)
        user.role = UserRole.OWNER
        assert require_owner(user) == user

    def test_admin_raises_403(self):
        user = MagicMock(spec=User)
        user.role = UserRole.ADMIN
        with pytest.raises(HTTPException) as exc_info:
            require_owner(user)
        assert exc_info.value.status_code == 403