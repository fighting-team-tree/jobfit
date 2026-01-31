from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    company_name = Column(String, index=True)
    job_title = Column(String)
    job_description_url = Column(String, nullable=True)
    status = Column(String, default="Planned") # Planned, Applied, Interviewing, Offer, Rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="applications")
    study_plans = relationship("StudyPlan", back_populates="application")
    interviews = relationship("Interview", back_populates="application")
