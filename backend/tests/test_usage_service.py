"""Tests for app.services.usage — quota checking and usage recording."""
import pytest
from datetime import datetime
from unittest.mock import MagicMock, patch, PropertyMock


class TestMonthStart:
    def test_returns_first_of_month(self):
        from app.services.usage import _month_start
        now = datetime(2024, 3, 15, 10, 30, 45)
        result = _month_start(now)
        assert result.day == 1
        assert result.hour == 0
        assert result.minute == 0
        assert result.second == 0
        assert result.microsecond == 0
        assert result.month == 3
        assert result.year == 2024

    def test_uses_utcnow_when_none(self):
        from app.services.usage import _month_start
        with patch("app.services.usage.datetime") as mock_dt:
            fixed = datetime(2024, 6, 20, 12, 0, 0)
            mock_dt.utcnow.return_value = fixed
            # Need real datetime for replace() to work
            mock_dt.side_effect = lambda *a, **kw: datetime(*a, **kw)
            result = _month_start(None)
            assert result.day == 1
            assert result.month == 6


class TestGetMonthUsage:
    @patch("app.services.usage._month_start")
    def test_returns_integer_total(self, mock_ms):
        from app.services.usage import get_month_usage
        mock_ms.return_value = datetime(2024, 1, 1)
        db = MagicMock()
        chain = MagicMock()
        db.query.return_value = chain
        chain.filter.return_value = chain
        chain.scalar.return_value = 5
        result = get_month_usage(db, user_id=1, event_type="ai_generation")
        assert result == 5
        chain.filter.assert_called_once()

    @patch("app.services.usage._month_start")
    def test_returns_zero_when_none(self, mock_ms):
        from app.services.usage import get_month_usage
        mock_ms.return_value = datetime(2024, 1, 1)
        db = MagicMock()
        chain = MagicMock()
        db.query.return_value = chain
        chain.filter.return_value = chain
        chain.scalar.return_value = None
        result = get_month_usage(db, user_id=1, event_type="ai_correction")
        assert result == 0


class TestAiLimitForUser:
    @patch("app.services.usage.get_plan_config")
    def test_returns_generation_limit(self, mock_plan):
        from app.services.usage import _ai_limit_for_user
        mock_plan.return_value = {"ai_generation_per_prof": 50, "ai_correction_per_prof": 100}
        db = MagicMock()
        user = MagicMock()
        user.institution_id = 1
        inst = MagicMock()
        inst.plan_type = "pro"
        db.get.return_value = inst
        result = _ai_limit_for_user(db, user, "ai_generation")
        assert result == 50

    @patch("app.services.usage.get_plan_config")
    def test_returns_correction_limit(self, mock_plan):
        from app.services.usage import _ai_limit_for_user
        mock_plan.return_value = {"ai_generation_per_prof": 50, "ai_correction_per_prof": 100}
        db = MagicMock()
        user = MagicMock()
        user.institution_id = 1
        inst = MagicMock()
        inst.plan_type = "pro"
        db.get.return_value = inst
        result = _ai_limit_for_user(db, user, "ai_correction")
        assert result == 100

    @patch("app.services.usage.get_plan_config")
    def test_returns_none_for_unknown_event(self, mock_plan):
        from app.services.usage import _ai_limit_for_user
        mock_plan.return_value = {"ai_generation_per_prof": 50, "ai_correction_per_prof": 100}
        db = MagicMock()
        user = MagicMock()
        user.institution_id = 1
        db.get.return_value = MagicMock(plan_type="free")
        result = _ai_limit_for_user(db, user, "unknown_event")
        assert result is None

    @patch("app.services.usage.get_plan_config")
    def test_handles_missing_institution(self, mock_plan):
        from app.services.usage import _ai_limit_for_user
        mock_plan.return_value = {"ai_generation_per_prof": 10, "ai_correction_per_prof": 20}
        db = MagicMock()
        user = MagicMock()
        user.institution_id = 999
        db.get.return_value = None
        result = _ai_limit_for_user(db, user, "ai_generation")
        mock_plan.assert_called_with(None)
        assert result == 10


class TestAiEnabled:
    @patch("app.services.usage.get_plan_config")
    def test_returns_true_when_enabled(self, mock_plan):
        from app.services.usage import ai_enabled
        mock_plan.return_value = {"ai_enabled": True}
        db = MagicMock()
        inst = MagicMock()
        inst.plan_type = "pro"
        db.get.return_value = inst
        assert ai_enabled(db, 1) is True

    @patch("app.services.usage.get_plan_config")
    def test_returns_false_when_disabled(self, mock_plan):
        from app.services.usage import ai_enabled
        mock_plan.return_value = {"ai_enabled": False}
        db = MagicMock()
        db.get.return_value = MagicMock(plan_type="free")
        assert ai_enabled(db, 1) is False


class TestCheckQuota:
    @patch("app.services.usage.get_month_usage")
    @patch("app.services.usage._ai_limit_for_user")
    def test_allowed_when_under_limit(self, mock_limit, mock_usage):
        from app.services.usage import check_quota
        mock_limit.return_value = 50
        mock_usage.return_value = 10
        db = MagicMock()
        user = MagicMock()
        user.id = 1
        result = check_quota(db, user, "ai_generation", quantity=5)
        assert result["allowed"] is True
        assert result["used"] == 10
        assert result["limit"] == 50
        assert result["remaining"] == 40
        assert result["overage_count"] == 0

    @patch("app.services.usage.get_month_usage")
    @patch("app.services.usage._ai_limit_for_user")
    def test_not_allowed_when_exceeds(self, mock_limit, mock_usage):
        from app.services.usage import check_quota
        mock_limit.return_value = 50
        mock_usage.return_value = 48
        db = MagicMock()
        user = MagicMock()
        user.id = 1
        result = check_quota(db, user, "ai_generation", quantity=5)
        assert result["allowed"] is False
        assert result["remaining"] == 2

    @patch("app.services.usage.get_month_usage")
    @patch("app.services.usage._ai_limit_for_user")
    def test_unlimited_when_no_limit(self, mock_limit, mock_usage):
        from app.services.usage import check_quota
        mock_limit.return_value = None
        mock_usage.return_value = 100
        db = MagicMock()
        user = MagicMock()
        user.id = 1
        result = check_quota(db, user, "ai_generation", quantity=10)
        assert result["allowed"] is True
        assert result["limit"] is None
        assert result["remaining"] is None

    @patch("app.services.usage.get_month_usage")
    @patch("app.services.usage._ai_limit_for_user")
    def test_overage_count_when_already_over(self, mock_limit, mock_usage):
        from app.services.usage import check_quota
        mock_limit.return_value = 50
        mock_usage.return_value = 60
        db = MagicMock()
        user = MagicMock()
        user.id = 1
        result = check_quota(db, user, "ai_generation", quantity=1)
        assert result["overage_count"] == 10
        assert result["allowed"] is False


class TestRecordUsage:
    @patch("app.services.usage.get_month_usage")
    @patch("app.services.usage._ai_limit_for_user")
    @patch("app.services.usage.UsageEvent")
    def test_records_non_overage(self, MockEvent, mock_limit, mock_usage):
        from app.services.usage import record_usage
        mock_limit.return_value = 50
        mock_usage.return_value = 10
        db = MagicMock()
        user = MagicMock()
        user.id = 1
        user.institution_id = 1
        result = record_usage(db, user, "ai_generation", quantity=5)
        assert result["used_before"] == 10
        assert result["used_after"] == 15
        assert result["is_overage"] is False
        MockEvent.assert_called_once()
        db.add.assert_called_once()
        db.commit.assert_called_once()

    @patch("app.services.usage.get_month_usage")
    @patch("app.services.usage._ai_limit_for_user")
    @patch("app.services.usage.UsageEvent")
    def test_records_overage_and_deducts_credits(self, MockEvent, mock_limit, mock_usage):
        from app.services.usage import record_usage
        mock_limit.return_value = 50
        mock_usage.return_value = 48
        db = MagicMock()
        user = MagicMock()
        user.id = 1
        user.institution_id = 1
        inst = MagicMock()
        inst.credits_balance = 100
        db.get.return_value = inst
        result = record_usage(db, user, "ai_generation", quantity=5)
        assert result["is_overage"] is True
        assert inst.credits_balance == 95

    @patch("app.services.usage.get_month_usage")
    @patch("app.services.usage._ai_limit_for_user")
    @patch("app.services.usage.UsageEvent")
    def test_overage_with_no_credits_does_not_go_negative(self, MockEvent, mock_limit, mock_usage):
        from app.services.usage import record_usage
        mock_limit.return_value = 50
        mock_usage.return_value = 48
        db = MagicMock()
        user = MagicMock()
        user.id = 1
        user.institution_id = 1
        inst = MagicMock()
        inst.credits_balance = 2
        db.get.return_value = inst
        record_usage(db, user, "ai_generation", quantity=5)
        assert inst.credits_balance == 0

    @patch("app.services.usage.get_month_usage")
    @patch("app.services.usage._ai_limit_for_user")
    @patch("app.services.usage.UsageEvent")
    def test_unlimited_plan_never_overage(self, MockEvent, mock_limit, mock_usage):
        from app.services.usage import record_usage
        mock_limit.return_value = None
        mock_usage.return_value = 999
        db = MagicMock()
        user = MagicMock()
        user.id = 1
        user.institution_id = 1
        result = record_usage(db, user, "ai_generation", quantity=10)
        assert result["is_overage"] is False


class TestActiveCounts:
    def test_active_professor_count_returns_int(self):
        from app.services.usage import active_professor_count
        db = MagicMock()
        chain = MagicMock()
        db.query.return_value = chain
        chain.filter.return_value = chain
        chain.scalar.return_value = 7
        assert active_professor_count(db, 1) == 7

    def test_active_professor_count_returns_zero_when_none(self):
        from app.services.usage import active_professor_count
        db = MagicMock()
        chain = MagicMock()
        db.query.return_value = chain
        chain.filter.return_value = chain
        chain.scalar.return_value = None
        assert active_professor_count(db, 1) == 0

    def test_active_student_count_returns_int(self):
        from app.services.usage import active_student_count
        db = MagicMock()
        chain = MagicMock()
        db.query.return_value = chain
        chain.filter.return_value = chain
        chain.scalar.return_value = 30
        assert active_student_count(db, 1) == 30


class TestCanAddProfessor:
    @patch("app.services.usage.active_professor_count")
    @patch("app.services.usage.get_plan_config")
    def test_true_when_under_limit(self, mock_plan, mock_count):
        from app.services.usage import can_add_professor
        mock_plan.return_value = {"max_professors": 10}
        mock_count.return_value = 5
        db = MagicMock()
        db.get.return_value = MagicMock(plan_type="pro")
        assert can_add_professor(db, 1) is True

    @patch("app.services.usage.active_professor_count")
    @patch("app.services.usage.get_plan_config")
    def test_false_when_at_limit(self, mock_plan, mock_count):
        from app.services.usage import can_add_professor
        mock_plan.return_value = {"max_professors": 10}
        mock_count.return_value = 10
        db = MagicMock()
        db.get.return_value = MagicMock(plan_type="pro")
        assert can_add_professor(db, 1) is False

    @patch("app.services.usage.active_professor_count")
    @patch("app.services.usage.get_plan_config")
    def test_true_when_unlimited(self, mock_plan, mock_count):
        from app.services.usage import can_add_professor
        mock_plan.return_value = {"max_professors": None}
        mock_count.return_value = 999
        db = MagicMock()
        db.get.return_value = MagicMock(plan_type="enterprise")
        assert can_add_professor(db, 1) is True