"""
SQLAlchemy Database Models

ORM models for Replit PostgreSQL.
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON, Integer
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base


def generate_uuid() -> str:
    """Generate short UUID for primary keys."""
    return str(uuid.uuid4())[:8]


class User(Base):
    """User model - stores Replit user info."""
    __tablename__ = "users"

    id = Column(String, primary_key=True)  # Replit user_id
    username = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    companies = relationship("Company", back_populates="user", cascade="all, delete-orphan")
    roadmaps = relationship("Roadmap", back_populates="user", cascade="all, delete-orphan")
    interview_sessions = relationship("InterviewSession", back_populates="user", cascade="all, delete-orphan")
    user_profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Company(Base):
    """Company model - stores job matching targets."""
    __tablename__ = "companies"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    jd_text = Column(Text, nullable=True)
    jd_url = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending, analyzing, analyzed, high_match, error
    match_result = Column(JSON, nullable=True)  # Full match analysis result
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationship
    user = relationship("User", back_populates="companies")


class Roadmap(Base):
    """Roadmap model - stores learning roadmaps."""
    __tablename__ = "roadmaps"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    data = Column(JSON, nullable=True)  # Full roadmap data (weeks, todos, etc.)
    missing_skills = Column(JSON, nullable=True)  # List of skills to learn
    target_role = Column(String, nullable=True)
    total_weeks = Column(Integer, default=4)
    created_at = Column(DateTime, server_default=func.now())

    # Relationship
    user = relationship("User", back_populates="roadmaps")


class InterviewSession(Base):
    """Interview session model - stores mock interview sessions."""
    __tablename__ = "interview_sessions"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    target_role = Column(String, nullable=True)
    persona = Column(String, default="professional")  # professional, friendly, challenging
    max_questions = Column(Integer, default=5)
    question_count = Column(Integer, default=0)
    conversation = Column(JSON, nullable=True)  # Conversation history
    feedback = Column(JSON, nullable=True)  # Feedback after session
    started_at = Column(DateTime, server_default=func.now())
    ended_at = Column(DateTime, nullable=True)

    # Relationship
    user = relationship("User", back_populates="interview_sessions")


class UserProfile(Base):
    """User profile model - stores user's resume and analysis data."""
    __tablename__ = "user_profiles"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    profile_data = Column(JSON, nullable=True)        # ProfileStructured
    resume_file_result = Column(JSON, nullable=True)  # ResumeFileResponse
    github_analysis = Column(JSON, nullable=True)     # GitHubAnalysisResponse
    gap_analysis = Column(JSON, nullable=True)        # GapAnalysis
    jd_text = Column(Text, nullable=True)             # 채용공고 텍스트
    github_url = Column(String, nullable=True)        # GitHub URL
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationship
    user = relationship("User", back_populates="user_profile")
