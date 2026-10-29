"""Tests for app.services.enem.scoring — ENEM scoring logic."""
import pytest
from app.services.enem.scoring import estimate_enem_score, build_score_breakdown


class TestEstimateEnemScore:
    def test_zero_percent_returns_floor_region(self):
        score = estimate_enem_score(0.0)
        assert 300 <= score <= 400

    def test_full_percent_returns_ceil_region(self):
        score = estimate_enem_score(1.0)
        assert 800 <= score <= 900

    def test_fifty_percent_returns_midpoint(self):
        score = estimate_enem_score(0.5)
        expected = round((320.0 + 880.0) / 2, 1)
        assert score == expected

    def test_clamps_negative_to_zero(self):
        score = estimate_enem_score(-0.5)
        assert score == estimate_enem_score(0.0)

    def test_clamps_above_one_to_one(self):
        score = estimate_enem_score(2.0)
        assert score == estimate_enem_score(1.0)

    def test_monotonic_increase(self):
        prev = estimate_enem_score(0.0)
        for pct in [0.2, 0.4, 0.6, 0.8, 1.0]:
            curr = estimate_enem_score(pct)
            assert curr >= prev
            prev = curr


class TestBuildScoreBreakdown:
    def test_single_area(self):
        stats = {"math": {"correct": 8, "total": 10}}
        result = build_score_breakdown(stats)
        assert result["overall"] is not None
        assert result["by_area"]["math"]["correct"] == 8
        assert result["by_area"]["math"]["total"] == 10
        assert result["by_area"]["math"]["pct"] == 80.0
        assert 300 <= result["by_area"]["math"]["score"] <= 900

    def test_multiple_areas_average(self):
        stats = {
            "math": {"correct": 10, "total": 10},
            "languages": {"correct": 0, "total": 10},
        }
        result = build_score_breakdown(stats)
        math_score = result["by_area"]["math"]["score"]
        lang_score = result["by_area"]["languages"]["score"]
        expected_overall = round((math_score + lang_score) / 2, 1)
        assert result["overall"] == expected_overall

    def test_empty_stats_returns_none_overall(self):
        result = build_score_breakdown({})
        assert result["overall"] is None
        assert result["by_area"] == {}

    def test_zero_total_area_excluded_from_overall(self):
        stats = {
            "math": {"correct": 5, "total": 10},
            "empty": {"correct": 0, "total": 0},
        }
        result = build_score_breakdown(stats)
        assert result["by_area"]["empty"]["pct"] == 0.0
        assert result["overall"] == result["by_area"]["math"]["score"]

    def test_all_zeros(self):
        stats = {"area": {"correct": 0, "total": 10}}
        result = build_score_breakdown(stats)
        assert result["by_area"]["area"]["pct"] == 0.0
        assert result["overall"] is not None