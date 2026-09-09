# backend/app/routes/prospects.py - CORRECTION FINALE AVEC HYPNOSE

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_, or_, delete
from typing import List, Optional
import logging
import json
from datetime import datetime

from app.schemas import ProspectCreate, ProspectUpdate, ProspectResponse, ScrapeFrenchMarketRequest
from app.models import Prospect, Call, MLPrediction, InteractionHistory
from app.database import get_db, AsyncSessionLocal

from app.scrapers.wellengo_scraper import WellengoScraper
from app.ml.scorer import ScoringEngine

router = APIRouter()
logger = logging.getLogger(__name__)
scraper = WellengoScraper()
scorer = ScoringEngine()

def map_industry(profession: str) -> str:
    mapping = {
        'sophrologue': 'Bien-être & Thérapies alternatives',
        'naturopathe': 'Bien-être & Thérapies alternatives',
        'reflexologue': 'Bien-être & Thérapies alternatives',
        'hypnothérapeute': 'Bien-être & Thérapies alternatives',
        'hypnose': 'Bien-être & Thérapies alternatives',  # <-- AJOUT
        'therapeute': 'Bien-être & Thérapies alternatives',
        'psychologue': 'Santé mentale & Psychologie',
        'psychotherapeute': 'Santé mentale & Psychologie',
        'osteopathe': 'Santé & Ostéopathie',
        'kinésithérapeute': 'Santé & Kinésithérapie',
        'masseur-kinésithérapeute': 'Santé & Kinésithérapie',
        'nutritionniste': 'Nutrition & Santé',
        'dieteticien': 'Nutrition & Santé',
        'coach': 'Coaching & Développement personnel',
        'coach sportif': 'Sport & Fitness',
        'coach bien-etre': 'Coaching & Bien-être',
        'esthéticienne': 'Beauté & Esthétique',
        'estheticienne': 'Beauté & Esthétique'
    }
    return mapping.get(profession, 'Bien-être & Santé')

@router.get("", response_model=List[ProspectResponse], include_in_schema=False)
@router.get("/", response_model=List[ProspectResponse])
async def get_prospects(
    skip: int = 0,
    limit: int = None,
    min_score: Optional[float] = None,
    status: Optional[str] = None,
    industry: Optional[str] = None,
    city: Optional[str] = None,
    lead_priority: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    try:
        query = select(Prospect)
        filters = []
        if min_score is not None:
            filters.append(Prospect.score >= min_score)
        if status and status != 'all':
            filters.append(Prospect.status == status)
        if industry and industry != 'all':
            filters.append(Prospect.industry.ilike(f"%{industry}%"))
        if city and city != 'all':
            filters.append(Prospect.city.ilike(f"%{city}%"))
        if lead_priority and lead_priority != 'all':
            filters.append(Prospect.lead_priority == lead_priority)
        if search:
            search_term = f"%{search.strip()}%"
            filters.append(
                or_(
                    Prospect.company_name.ilike(search_term),
                    Prospect.industry.ilike(search_term),
                    Prospect.city.ilike(search_term),
                    Prospect.booking_system_detected.ilike(search_term),
                    Prospect.profession.ilike(search_term)
                )
            )
        if filters:
            query = query.where(and_(*filters))
        query = query.order_by(desc(Prospect.score), desc(Prospect.id)).offset(skip).limit(limit)
        result = await db.execute(query)
        prospects = result.scalars().all()
        return prospects
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des prospects: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")

@router.get("/priority")
async def get_priority_prospects(
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    try:
        query = select(Prospect).where(
            and_(
                Prospect.score >= 70,
                Prospect.status.in_(['new', 'contacted'])
            )
        ).order_by(desc(Prospect.score)).limit(limit)
        result = await db.execute(query)
        prospects = result.scalars().all()
        return {
            "prospects": prospects,
            "count": len(prospects),
            "message": "Meilleures opportunités pour votre solution de réservation"
        }
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des prospects prioritaires: {e}")
        return {"prospects": [], "count": 0, "message": "Aucun prospect prioritaire"}

@router.post("/scrape-french-market")
async def scrape_french_market(
    payload: ScrapeFrenchMarketRequest,
    db: AsyncSession = Depends(get_db)
):
    try:
        city = payload.city.strip()
        industry_cat = payload.industry_category
        limit = payload.limit
        
        logger.info(f"Prospection en direct: Ville={city}, Catégorie={industry_cat}, Limite={limit}")
        
        # Mapping des catégories vers les professions (avec hypnose)
        category_to_profession = {
            "all": "all",
            "psychotherapie": "psychologue",
            "medecine_douce": "naturopathe",
            "coaching": "coach",
            "bienetre_corporel": "therapeute",
            "esthetique": "esthéticienne",
            "nutrition": "nutritionniste",
            "hypnose": "hypnothérapeute"  # <-- AJOUT
        }
        
        profession = category_to_profession.get(industry_cat, "all")
        raw_leads = await scraper.search_leads(
            city=city,
            profession=profession,
            limit=limit
        )
        
        if not raw_leads:
            return {
                "success": False,
                "message": f"Aucun professionnel trouvé pour la ville '{city}'. Essayez une autre ville.",
                "added_count": 0,
                "prospects": []
            }
        
        added_prospects = []
        now = datetime.utcnow()
        now_str = now.isoformat()
        
        for lead_dict in raw_leads:
            existing = await db.execute(
                select(Prospect).where(
                    and_(
                        Prospect.company_name == lead_dict["company_name"],
                        Prospect.city == lead_dict["city"]
                    )
                ).limit(1)
            )
            if existing.scalars().first():
                continue
            
            prospect = Prospect(
                company_name=str(lead_dict.get("company_name", "")),
                profession=str(lead_dict.get("profession", profession)),
                industry=str(lead_dict.get("industry", map_industry(profession))),
                specialty=str(lead_dict.get("specialty", profession.capitalize())),
                website=str(lead_dict.get("website", "")),
                email=str(lead_dict.get("email", "")),
                phone=str(lead_dict.get("phone", "")),
                city=str(lead_dict.get("city", city)),
                address=str(lead_dict.get("address", city)),
                postal_code=str(lead_dict.get("postal_code", "")),
                description=str(lead_dict.get("description", "")),
                experience=str(lead_dict.get("experience", "")),
                company_size=int(lead_dict.get("company_size", 1)),
                revenue=float(lead_dict.get("revenue", 50000)),
                growth_rate=float(lead_dict.get("growth_rate", 0.15)),
                new_projects=str(lead_dict.get("new_projects", f"Développement de {profession}")),
                recent_hires=str(lead_dict.get("recent_hires", f"Recrutement d'un(e) {profession}")),
                has_online_booking=bool(lead_dict.get("has_online_booking", False)),
                booking_system_detected=str(lead_dict.get("booking_system_detected", "Aucun")),
                lead_priority=str(lead_dict.get("lead_priority", "hot")),
                sales_pitch=str(lead_dict.get("sales_pitch", "")),
                source=str(lead_dict.get("source", "wellengo")),
                profile_url=str(lead_dict.get("profile_url", "")),
                scraped_at=now_str,
                status="new"
            )
            
            # Calcul du score
            score_data = scorer._calculate_score(prospect)
            prospect.score = round(score_data['score'], 1)
            prospect.probability = round(score_data['probability'], 2)
            prospect.score_reasons = json.dumps(score_data.get('reasons', []))
            prospect.lead_priority = score_data.get('lead_priority', 'hot')
            prospect.sales_pitch = score_data.get('sales_pitch', '')
            
            db.add(prospect)
            added_prospects.append(prospect)
        
        await db.commit()
        
        for p in added_prospects:
            await db.refresh(p)
            
        logger.info(f"✅ {len(added_prospects)} nouveaux prospects réels ajoutés et scorés !")
        
        professions_found = list(set([p.profession for p in added_prospects if p.profession]))
        profession_text = ", ".join(professions_found[:5]) if professions_found else "professionnels du bien-être"
        
        return {
            "success": True,
            "message": f"✅ {len(added_prospects)} nouveaux prospects réels ajoutés depuis {city} ({profession_text}) et classés par score !",
            "added_count": len(added_prospects),
            "prospects": added_prospects
        }
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Erreur lors de la prospection: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur de prospection: {str(e)}")

@router.post("/rescore-all")
async def rescore_all_prospects():
    try:
        await scorer.score_all_prospects()
        return {"success": True, "message": "Tous les prospects ont été réévalués et reclassés avec succès !"}
    except Exception as e:
        logger.error(f"Erreur lors du recalcul des scores: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/clear-all")
async def clear_all_prospects(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(delete(Call))
        await db.execute(delete(MLPrediction))
        await db.execute(delete(InteractionHistory))
        await db.execute(delete(Prospect))
        await db.commit()
        return {"success": True, "message": "Base de données entièrement nettoyée."}
    except Exception as e:
        await db.rollback()
        logger.error(f"Erreur lors du nettoyage de la base: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=ProspectResponse, status_code=201)
async def create_prospect(
    prospect_data: ProspectCreate,
    db: AsyncSession = Depends(get_db)
):
    try:
        data = prospect_data.dict()
        prospect = Prospect(**data)
        score_data = scorer._calculate_score(prospect)
        prospect.score = round(score_data['score'], 1)
        prospect.probability = round(score_data['probability'], 2)
        prospect.score_reasons = json.dumps(score_data.get('reasons', []))
        prospect.lead_priority = score_data.get('lead_priority', 'hot')
        prospect.sales_pitch = score_data.get('sales_pitch', '')
        db.add(prospect)
        await db.commit()
        await db.refresh(prospect)
        return prospect
    except Exception as e:
        await db.rollback()
        logger.error(f"Erreur lors de la création du prospect: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")

@router.get("/{prospect_id}", response_model=ProspectResponse)
async def get_prospect(
    prospect_id: int,
    db: AsyncSession = Depends(get_db)
):
    try:
        result = await db.execute(
            select(Prospect).where(Prospect.id == prospect_id)
        )
        prospect = result.scalar_one_or_none()
        if not prospect:
            raise HTTPException(status_code=404, detail="Prospect non trouvé")
        return prospect
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la récupération du prospect: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")

@router.put("/{prospect_id}", response_model=ProspectResponse)
async def update_prospect(
    prospect_id: int,
    prospect_data: ProspectUpdate,
    db: AsyncSession = Depends(get_db)
):
    try:
        result = await db.execute(
            select(Prospect).where(Prospect.id == prospect_id)
        )
        prospect = result.scalar_one_or_none()
        if not prospect:
            raise HTTPException(status_code=404, detail="Prospect non trouvé")
        update_data = prospect_data.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(prospect, key, value)
        score_data = scorer._calculate_score(prospect)
        prospect.score = round(score_data['score'], 1)
        prospect.probability = round(score_data['probability'], 2)
        prospect.score_reasons = json.dumps(score_data.get('reasons', []))
        prospect.lead_priority = score_data.get('lead_priority', 'hot')
        prospect.sales_pitch = score_data.get('sales_pitch', '')
        prospect.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(prospect)
        return prospect
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Erreur lors de la mise à jour du prospect: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")

@router.delete("/{prospect_id}")
async def delete_prospect(
    prospect_id: int,
    db: AsyncSession = Depends(get_db)
):
    try:
        result = await db.execute(
            select(Prospect).where(Prospect.id == prospect_id)
        )
        prospect = result.scalar_one_or_none()
        if not prospect:
            raise HTTPException(status_code=404, detail="Prospect non trouvé")
        await db.delete(prospect)
        await db.commit()
        return {"message": "Prospect supprimé avec succès"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Erreur lors de la suppression du prospect: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")