# backend/app/models.py
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, JSON, ForeignKey
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

from app.database import Base

class Prospect(Base):
    __tablename__ = "prospects"
    
    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(255), index=True)
    
    # NOUVEAU : Profession du praticien (sophrologue, naturopathe, etc.)
    profession = Column(String(100), index=True, nullable=True)
    
    industry = Column(String(100), index=True, nullable=True)
    specialty = Column(String(100), nullable=True)  # Spécialité détaillée
    website = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    
    # Coordonnées & Localisation (Marché Français)
    city = Column(String(100), index=True, nullable=True)
    address = Column(String(255), nullable=True)
    postal_code = Column(String(20), nullable=True)
    
    # Informations détaillées du profil
    description = Column(Text, nullable=True)
    social_media = Column(JSON, nullable=True)  # {facebook, instagram, linkedin, etc.}
    services = Column(JSON, nullable=True)  # Liste des services proposés
    qualifications = Column(JSON, nullable=True)  # Diplômes, certifications
    experience = Column(Text, nullable=True)
    languages = Column(JSON, nullable=True)  # Langues parlées
    
    # Données enrichies & Diagnostic Réservation
    company_size = Column(Integer, nullable=True)
    revenue = Column(Float, nullable=True)
    growth_rate = Column(Float, nullable=True)
    new_projects = Column(Text, nullable=True)
    recent_hires = Column(Text, nullable=True)
    
    # Détection de solution de réservation existante
    has_online_booking = Column(Boolean, default=False)
    booking_system_detected = Column(String(100), default="Aucun")
    lead_priority = Column(String(20), default="cold")
    sales_pitch = Column(Text, nullable=True)
    
    # Source du prospect
    source = Column(String(50), default="wellengo")
    profile_url = Column(String(500), nullable=True)
    
    # CORRECTION ICI : scraped_at en STRING (VARCHAR) au lieu de DateTime
    scraped_at = Column(String(50), nullable=True)  # <-- CHANGEMENT CRITIQUE
    
    # Scoring
    score = Column(Float, default=0.0)
    probability = Column(Float, default=0.0)
    score_reasons = Column(JSON, nullable=True)
    
    # Métadonnées - ces champs restent en DateTime car ils sont gérés par SQLAlchemy
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_contacted = Column(DateTime, nullable=True)
    status = Column(String(50), default="new")
    
    # Relations
    calls = relationship("Call", back_populates="prospect", lazy="selectin", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="prospect", lazy="selectin", cascade="all, delete-orphan")
    ml_predictions = relationship("MLPrediction", back_populates="prospect", lazy="selectin", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Prospect {self.id}: {self.company_name} ({self.profession or self.industry})>"

class Call(Base):
    __tablename__ = "calls"
    
    id = Column(Integer, primary_key=True, index=True)
    prospect_id = Column(Integer, ForeignKey("prospects.id"), nullable=True)
    call_type = Column(String(50), nullable=True)
    duration = Column(Integer, nullable=True)
    transcript = Column(Text, nullable=True)
    analysis = Column(JSON, nullable=True)
    sentiment = Column(String(50), nullable=True)
    interest_level = Column(Float, nullable=True)
    objections = Column(JSON, nullable=True)
    appointment_booked = Column(Boolean, default=False)
    status = Column(String(50), default="initiated")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    prospect = relationship("Prospect", back_populates="calls", lazy="selectin")
    
    def __repr__(self):
        return f"<Call {self.id}: Prospect {self.prospect_id} - {self.status}>"

class InteractionHistory(Base):
    __tablename__ = "interaction_history"
    
    id = Column(Integer, primary_key=True, index=True)
    prospect_id = Column(Integer, ForeignKey("prospects.id"), nullable=True)
    interaction_type = Column(String(50), nullable=True)
    content = Column(Text, nullable=True)
    outcome = Column(String(50), nullable=True)
    feedback_score = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<InteractionHistory {self.id}: Prospect {self.prospect_id} - {self.interaction_type}>"

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(Integer, ForeignKey('calls.id'), nullable=True, index=True)
    prospect_id = Column(Integer, ForeignKey("prospects.id"), nullable=True)
    role = Column(String(20), nullable=True)
    content = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    prospect = relationship("Prospect", back_populates="conversations", lazy="selectin")
    
    def __repr__(self):
        return f"<Conversation {self.id}: Prospect {self.prospect_id} - {self.role[:10]}>"

class MLPrediction(Base):
    __tablename__ = "ml_predictions"

    id = Column(Integer, primary_key=True, index=True)
    prospect_id = Column(Integer, ForeignKey("prospects.id"), nullable=True)
    model_type = Column(String(50), nullable=True)
    prediction_score = Column(Float, nullable=True)
    prediction_probability = Column(Float, nullable=True)
    features_used = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    prospect = relationship("Prospect", back_populates="ml_predictions", lazy="selectin")
    
    def __repr__(self):
        return f"<MLPrediction {self.id}: Prospect {self.prospect_id} - {self.model_type}>"