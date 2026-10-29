"""Tests for app.models — ORM models, enums, and custom types."""
import pytest
from app.models import (
    Institution,
    User,
    UserRole,
    UserRoleType,
    QuestionType,
)


class TestUserRoleEnum:
    def test_owner_value(self):
        assert UserRole.OWNER.value == "owner"

    def test_admin_value(self):
        assert UserRole.ADMIN.value == "admin"

    def test_professor_value(self):
        assert UserRole.PROFESSOR.value == "professor"

    def test_student_value(self):
        assert UserRole.STUDENT.value == "student"

    def test_from_string(self):
        assert UserRole("owner") == UserRole.OWNER

    def test_invalid_role_raises(self):
        with pytest.raises(ValueError):
            UserRole("invalid_role")


class TestQuestionTypeEnum:
    def test_multiple_choice(self):
        assert QuestionType.MULTIPLE_CHOICE.value == "multiple_choice"

    def test_true_false(self):
        assert QuestionType.TRUE_FALSE.value == "true_false"

    def test_essay(self):
        assert QuestionType.ESSAY.value == "essay"

    def test_summation(self):
        assert QuestionType.SUMMATION.value == "summation"


class TestUserRoleType:
    def setup_method(self):
        self.type_decorator = UserRoleType()

    def test_process_bind_param_enum(self):
        result = self.type_decorator.process_bind_param(UserRole.ADMIN, None)
        assert result == "admin"

    def test_process_bind_param_string_lowercase(self):
        result = self.type_decorator.process_bind_param("ADMIN", None)
        assert result == "admin"

    def test_process_bind_param_already_lower(self):
        result = self.type_decorator.process_bind_param("student", None)
        assert result == "student"

    def test_process_bind_param_none(self):
        result = self.type_decorator.process_bind_param(None, None)
        assert result is None

    def test_process_result_value_valid(self):
        result = self.type_decorator.process_result_value("owner", None)
        assert result == UserRole.OWNER

    def test_process_result_value_uppercase_legacy(self):
        result = self.type_decorator.process_result_value("PROFESSOR", None)
        assert result == UserRole.PROFESSOR

    def test_process_result_value_none(self):
        result = self.type_decorator.process_result_value(None, None)
        assert result is None

    def test_process_result_value_unknown_returns_string(self):
        result = self.type_decorator.process_result_value("unknown_role", None)
        assert result == "unknown_role"


class TestInstitutionModel:
    def test_create_institution(self, db_session, sample_institution):
        assert sample_institution.id is not None
        assert sample_institution.name == "Test School"

    def test_institution_defaults(self, db_session, sample_institution):
        assert sample_institution.is_active is True
        assert sample_institution.is_verified is True
        assert sample_institution.car_enabled is False
        assert sample_institution.credits_balance == 0

    def test_institution_nullable_fields(self, db_session):
        inst = Institution(name="Minimal School")
        db_session.add(inst)
        db_session.flush()
        assert inst.cnpj is None
        assert inst.logo is None
        assert inst.plan_type is None


class TestUserModel:
    def test_create_user(self, db_session, sample_user):
        assert sample_user.id is not None
        assert sample_user.email == "test@example.com"
        assert sample_user.role == UserRole.ADMIN

    def test_user_belongs_to_institution(self, db_session, sample_user, sample_institution):
        assert sample_user.institution_id == sample_institution.id