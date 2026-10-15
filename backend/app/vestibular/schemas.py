"""Pydantic schemas for unified vestibular_questions API."""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, model_validator


class VestibularOptionOut(BaseModel):
    id: int
    letter: Optional[str] = None
    value: Optional[int] = None
    text: str
    is_correct: bool = False
    order: int = 0

    class Config:
        from_attributes = True


class VestibularImageOut(BaseModel):
    id: int
    image_base64: Optional[str] = None
    image_url: Optional[str] = None
    order: int = 0

    @model_validator(mode="after")
    def fallback_image_base64(self) -> "VestibularImageOut":
        if not self.image_base64 and self.image_url:
            self.image_base64 = self.image_url
        return self

    class Config:
        from_attributes = True


class VestibularQuestionOut(BaseModel):
    id: int
    exam_type: str
    exam_name: Optional[str] = None
    year: int
    number: int
    statement: str
    html_statement: Optional[str] = None
    image_base64: Optional[str] = None
    image_url: Optional[str] = None
    answer: Optional[str] = None
    is_annulled: bool = False
    correct_option: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict, validation_alias="metadata_", serialization_alias="metadata")
    created_at: Optional[datetime] = None
    options: List[VestibularOptionOut] = []
    images: List[VestibularImageOut] = []

    @model_validator(mode="after")
    def fallback_image_base64(self) -> "VestibularQuestionOut":
        if not self.image_base64 and self.image_url:
            self.image_base64 = self.image_url
        return self

    model_config = {"from_attributes": True, "populate_by_name": True}


class VestibularQuestionListOut(BaseModel):
    items: List[VestibularQuestionOut]
    total: int
    page: int
    size: int


class VestibularFilterParams(BaseModel):
    exam_type: str
    year: Optional[int] = None
    area: Optional[str] = None
    language: Optional[str] = None
    search: Optional[str] = None
    page: int = Field(1, ge=1)
    size: int = Field(20, ge=1, le=100)