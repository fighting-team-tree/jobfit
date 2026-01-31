from sqlalchemy import Column, Integer, String, Text, JSON, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class StudyPlan(Base):
    __tablename__ = "study_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=True)
    contents = Column(JSON) # Weekly plan, links, etc.
    status = Column(String, default="In Progress")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="study_plans")
    application = relationship("Application", back_populates="study_plans")
