# backend/app/schemas.py
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime

# ==================== PROSPECTS ====================

class ProspectBase(BaseModel):
    company_name: str
    profession: Optional[str] = Field(None, description="Métier du praticien (sophrologue, naturopathe, etc.)")
    industry: Optional[str] = Field(None, description="Secteur d'activité")
    specialty: Optional[str] = Field(None, description="Spécialité détaillée")
    website: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    postal_code: Optional[str] = None
    
    # Nouveaux champs pour le scraping Wellengo
    description: Optional[str] = Field(None, description="Description du praticien")
    social_media: Optional[Dict[str, str]] = Field(None, description="Réseaux sociaux")
    services: Optional[List[str]] = Field(None, description="Services proposés")
    qualifications: Optional[List[str]] = Field(None, description="Diplômes et certifications")
    experience: Optional[str] = Field(None, description="Expérience professionnelle")
    languages: Optional[List[str]] = Field(None, description="Langues parlées")
    
    # Données d'entreprise
    company_size: Optional[int] = Field(None, description="Taille de l'entreprise")
    revenue: Optional[float] = Field(None, description="Chiffre d'affaires estimé")
    growth_rate: Optional[float] = Field(None, description="Taux de croissance")
    new_projects: Optional[str] = Field(None, description="Nouveaux projets")
    recent_hires: Optional[str] = Field(None, description="Recrutements récents")
    
    # Diagnostic réservation
    has_online_booking: Optional[bool] = Field(False, description="A une solution de réservation en ligne")
    booking_system_detected: Optional[str] = Field("Aucun", description="Système de réservation détecté")
    lead_priority: Optional[str] = Field("cold", description="Priorité du lead: hot, warm, cold")
    sales_pitch: Optional[str] = Field(None, description="Argumentaire commercial")
    
    # Source
    source: Optional[str] = Field("wellengo", description="Source du prospect")
    profile_url: Optional[str] = Field(None, description="URL du profil")
    scraped_at: Optional[datetime] = Field(None, description="Date du scraping")

class ProspectCreate(ProspectBase):
    pass

class ProspectUpdate(BaseModel):
    company_name: Optional[str] = None
    profession: Optional[str] = None
    industry: Optional[str] = None
    specialty: Optional[str] = None
    website: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    postal_code: Optional[str] = None
    description: Optional[str] = None
    social_media: Optional[Dict[str, str]] = None
    services: Optional[List[str]] = None
    qualifications: Optional[List[str]] = None
    experience: Optional[str] = None
    languages: Optional[List[str]] = None
    company_size: Optional[int] = None
    revenue: Optional[float] = None
    growth_rate: Optional[float] = None
    new_projects: Optional[str] = None
    recent_hires: Optional[str] = None
    has_online_booking: Optional[bool] = None
    booking_system_detected: Optional[str] = None
    lead_priority: Optional[str] = None
    sales_pitch: Optional[str] = None
    status: Optional[str] = None
    source: Optional[str] = None
    profile_url: Optional[str] = None
    score: Optional[float] = None
    probability: Optional[float] = None
    
class ProspectResponse(ProspectBase):
    id: int
    company_size: Optional[int] = None
    revenue: Optional[float] = None
    growth_rate: Optional[float] = None
    new_projects: Optional[str] = None
    recent_hires: Optional[str] = None
    score: float = 0.0
    probability: float = 0.0
    # CHANGEMENT ICI : accepter soit une liste, soit une chaîne, soit None
    score_reasons: Optional[Union[List[str], Dict[str, Any], str]] = None
    created_at: datetime
    updated_at: datetime
    last_contacted: Optional[datetime] = None
    status: str = "new"
    
    class Config:
        from_attributes = True
        # Ajouter ceci pour gérer les types mixtes
        arbitrary_types_allowed = True

class ScrapeFrenchMarketRequest(BaseModel):
    city: str = Field(
        default="Paris", 
        description="Ville française ciblée (ex: Paris, Lyon, Marseille, Bordeaux, Lille)"
    )
    industry_category: str = Field(
        default="all", 
        description="Secteur: psychotherapie, medecine_douce, coaching, bienetre_corporel, esthetique, nutrition, all"
    )
    limit: int = Field(
        default=60, 
        ge=1, 
        le=150, 
        description="Nombre maximum d'établissements à scraper"
    )

# ==================== CALLS ====================

class CallBase(BaseModel):
    prospect_id: int
    call_type: str = "virtual"
    duration: Optional[int] = None
    transcript: Optional[str] = None

class CallCreate(CallBase):
    pass

class CallResponse(CallBase):
    id: int
    analysis: Optional[Dict[str, Any]] = None
    sentiment: Optional[str] = None
    interest_level: Optional[float] = None
    objections: Optional[Union[List[str], Dict[str, Any]]] = None
    appointment_booked: bool = False
    status: str = "initiated"
    created_at: datetime
    
    class Config:
        from_attributes = True

# ==================== VIRTUAL CALL ====================

class VirtualCallRequest(BaseModel):
    prospect_id: int
    phone_number: str
    objectives: Optional[str] = None

class VirtualCallResponse(BaseModel):
    call_id: int
    status: str
    transcript: Optional[str] = None
    appointment_booked: bool = False
    analysis: Optional[Dict[str, Any]] = None

# ==================== SCORING ====================

class ScoringRequest(BaseModel):
    prospect_ids: Optional[List[int]] = None

class ScoringResponse(BaseModel):
    message: str
    scored_count: int
    job_id: str
    status: str = "processing"

# ==================== ANALYTICS ====================

class AnalyticsResponse(BaseModel):
    total_prospects: int
    scored_prospects: int
    average_score: float
    conversion_rate: float
    calls_made: int
    appointments_booked: int
    period: str

class DistributionItem(BaseModel):
    range: str
    count: int

class DistributionResponse(BaseModel):
    distribution: List[DistributionItem]

class TrendItem(BaseModel):
    date: str
    calls: int
    appointments: int

class TrendResponse(BaseModel):
    period: str
    data: List[TrendItem]

# ==================== GEMINI ====================

class GeminiAnalysisRequest(BaseModel):
    text: str
    context_type: str = "conversation"

class GeminiAnalysisResponse(BaseModel):
    needs: List[str] = []
    objections: List[str] = []
    interest_level: float = 0.5
    next_steps: List[str] = []
    sentiment: str = "neutre"
    topics: List[str] = []
    summary: Optional[str] = None

# ==================== PROSPECT DETAIL ====================

class ProspectDetailResponse(ProspectResponse):
    calls: List[CallResponse] = []
    interaction_history: Optional[List[Dict[str, Any]]] = None

# ==================== BULK OPERATIONS ====================

class BulkProspectCreate(BaseModel):
    prospects: List[ProspectCreate]

class BulkProspectResponse(BaseModel):
    created: int
    failed: int
    errors: List[str] = []

# ==================== SEARCH & FILTER ====================

class ProspectFilter(BaseModel):
    search: Optional[str] = None
    profession: Optional[str] = Field(None, description="Filtrer par métier")
    industry: Optional[str] = None
    status: Optional[str] = None
    min_score: Optional[float] = None
    max_score: Optional[float] = None
    city: Optional[str] = None
    lead_priority: Optional[str] = None
    has_online_booking: Optional[bool] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None

# ==================== CALL STATS ====================

class CallStatsResponse(BaseModel):
    total_calls: int
    virtual_calls: int
    human_calls: int
    appointments_booked: int
    conversion_rate: float
    average_duration_seconds: float

# ==================== PROFESSION STATS ====================

class ProfessionStatsResponse(BaseModel):
    profession: str
    count: int
    average_score: float
    hot_leads: int
    warm_leads: int
    cold_leads: int

# ==================== ERROR RESPONSE ====================

class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)