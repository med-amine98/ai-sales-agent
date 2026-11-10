# backend/app/routes/calls.py
from fastapi import APIRouter, HTTPException, Depends, Query, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_, func
from typing import List, Optional, Dict, Any, AsyncGenerator
from pydantic import BaseModel
import logging
import random
import json
import os
from datetime import datetime

# ===== NOUVELLE IMPORTATION GOOGLE GENAI =====
from google import genai
from google.genai import types

from app.schemas import (
    CallCreate, 
    CallResponse, 
    VirtualCallRequest, 
    VirtualCallResponse,
    GeminiAnalysisResponse
)
from app.models import Call, Prospect, Conversation
from sse_starlette.sse import EventSourceResponse
from app.database import get_db

router = APIRouter()
logger = logging.getLogger(__name__)

# Import des agents
from app.ai.virtual_agent import VirtualSalesAgent
from app.ai.gemini_analyzer import GeminiAnalyzer

virtual_agent = VirtualSalesAgent()
gemini_analyzer = GeminiAnalyzer()

class VoiceInteractRequest(BaseModel):
    prospect_id: int
    client_message: str = ""
    history: List[Dict[str, str]] = []
    is_initial: bool = False
    call_stage: Optional[str] = "greeting"
    refusal_count: Optional[int] = 0
    attempted_refusals: Optional[List[str]] = []
    used_responses: Optional[List[str]] = []

class VoiceInteractResponse(BaseModel):
    bot_response: str
    sentiment: str = "neutre"
    interest_level: float = 0.5
    objections: List[str] = []
    appointment_booked: bool = False
    call_finished: bool = False
    next_stage: str = "discovery"
    refusal_count: int = 0
    attempted_refusals: List[str] = []
    used_responses: List[str] = []

# ================================================================
# CONFIGURATION GEMINI - NOUVELLE VERSION
# ================================================================

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
GEMINI_AVAILABLE = False
gemini_client = None

if GOOGLE_API_KEY:
    try:
        # Nouvelle API Google GenAI
        gemini_client = genai.Client(api_key=GOOGLE_API_KEY)
        GEMINI_AVAILABLE = True
        logger.info("✅ Gemini API (nouvelle version) configurée avec succès")
    except Exception as e:
        logger.error(f"❌ Erreur configuration Gemini: {e}")
        GEMINI_AVAILABLE = False
        gemini_client = None
else:
    logger.warning("⚠️ GOOGLE_API_KEY non configurée, mode fallback activé")
    gemini_client = None

# ================================================================
# PROMPT GEMINI - VERSION OPTIMISÉE
# ================================================================

SYSTEM_PROMPT = """Tu es Thomas, un agent commercial professionnel de Welliongo.

RÈGLES ABSOLUES :
1. Réponds en français, naturellement, poliment et de manière concise.
2. Sois humain, pas robotique.
3. Comprends exactement ce que dit le client.
4. Si le client dit "oui" à un créneau, CONFIRME immédiatement.
5. Ne répète JAMAIS la même question.

PARCOURS :
- Présenter Welliongo → Comprendre les besoins → Présenter la solution → Gérer les objections → Proposer un RDV → Confirmer le RDV

GESTION DES CRÉNEAUX :
- Client dit "oui" → Confirme le créneau proposé
- Client donne un jour → Demande l'heure
- Client donne une heure → Demande le jour
- Client donne jour + heure → Confirme le RDV

CONFIRMATION RDV : Utilise toujours SMS.

EXEMPLES :
Client: "oui" → Bot: "Super ! Je vous propose jeudi à 14h30 ou vendredi matin à 10h. Qu'est-ce qui vous irait le mieux ?"
Client: "jeudi" → Bot: "Parfait ! Pour jeudi, quelle heure vous conviendrait le mieux ? 10h, 14h ou 16h ?"
Client: "14h" → Bot: "Excellent ! Rendez-vous confirmé pour jeudi à 14h. Vous recevrez un SMS de confirmation. À très bientôt !"
"""

def get_gemini_response(prospect, user_msg, history, current_stage):
    """Utilise Gemini pour générer une réponse intelligente - Version nouvelle API"""
    if not GEMINI_AVAILABLE or not gemini_client:
        logger.warning("Gemini non disponible")
        return None
    
    try:
        company = prospect.company_name or "votre établissement"
        
        # Construire l'historique
        history_text = ""
        for msg in history[-8:]:
            role = "Client" if msg.get('sender') == 'client' else "Thomas"
            history_text += f"{role}: {msg.get('text', '')}\n"
        
        prompt = f"""
{SYSTEM_PROMPT}

**CONTEXTE :**
- Prospect: {company}
- Secteur: {prospect.industry or 'Non spécifié'}
- Système actuel: {prospect.booking_system_detected or 'Aucun'}
- Étape: {current_stage}

**HISTORIQUE :**
{history_text}

**DERNIER MESSAGE CLIENT :**
{user_msg}

**RÉPONSE (une seule phrase, naturelle, concise) :**
"""
        
        # Nouvelle API : utiliser generate_content
        response = gemini_client.models.generate_content(
            model='gemini-2.0-flash-exp',
            contents=prompt
        )
        
        return response.text.strip()
    except Exception as e:
        logger.error(f"Erreur Gemini: {e}")
        return None

# ================================================================
# FALLBACK - RÉPONSES STATIQUES
# ================================================================

class FallbackResponses:
    @staticmethod
    def get_pitch(is_therapist, company, booking_sys):
        if is_therapist:
            if "resalib" in booking_sys:
                return f"Bonjour ! C'est Thomas à l'appareil, je suis conseiller chez Welliongo. J'espère que je ne vous dérange pas... Je vous appelle au sujet de {company}. On accompagne des thérapeutes qui veulent arrêter de payer des frais Resalib chaque mois. Est-ce que vous avez deux petites minutes ?"
            return f"Bonjour ! C'est Thomas de Welliongo. Excusez-moi de vous déranger... Je vous contacte par rapport à {company}. On a une solution qui permet à vos patients de réserver 24h sur 24, même la nuit, même le dimanche, sans vous interrompre en pleine consultation. Est-ce que j'arrive au bon moment ?"
        else:
            if "planity" in booking_sys:
                return f"Bonjour ! C'est Thomas, je vous appelle de chez Welliongo. Je voulais vous parler de {company}. On travaille avec des professionnels qui veulent réduire leurs frais de réservation Planity. Est-ce que c'est un sujet qui peut vous intéresser ?"
            return f"Bonjour ! Thomas à l'appareil, de chez Welliongo. Je vous contacte par rapport à {company}. On aide les professionnels comme vous à ne plus rater un seul client — vos clients réservent quand ils veulent, même à 22h, avec des rappels SMS automatiques. Ça vous parle ?"
    
    @staticmethod
    def get_appointment_confirmation(day, hour):
        day = day or "jeudi"
        hour = hour or "14h"
        return f"Parfait ! Rendez-vous confirmé pour {day} à {hour}. Vous recevrez un SMS de confirmation dans la minute. À très bientôt !"
    
    @staticmethod
    def get_slot_question():
        return "Je vous propose jeudi à 14h30 ou vendredi matin à 10h. Qu'est-ce qui vous irait le mieux ?"
    
    @staticmethod
    def get_first_refusal():
        return "Je vous entends. C'est une réaction normale. Mais sachez que nos clients récupèrent en moyenne 3 heures par semaine. Sur un an, c'est 156 heures. C'est presque un mois de travail gagné, sans rien changer d'autre. Ça mérite réflexion, non ?"
    
    @staticmethod
    def get_second_refusal():
        return "Écoutez, je ne vais pas insister, promis. Mais avant de raccrocher... notre expert propose des démonstrations gratuites, 10 minutes chrono. Juste pour voir. Aucun engagement. C'est honnête, non ?"
    
    @staticmethod
    def get_closing_refusal():
        return "C'est parfaitement clair, et je vous respecte pour ça. Je ne vais pas insister. Sachez juste que notre expert reste disponible pour une démo gratuite quand vous voudrez. Sans engagement, sans pression. Excellente journée à vous !"

# ================================================================
# ROUTE PRINCIPALE
# ================================================================

@router.post("/voice-interact", response_model=VoiceInteractResponse)
async def voice_interact(
    req: VoiceInteractRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Agent Commercial Vocal Welliongo.
    Utilise Gemini pour une intelligence conversationnelle avancée.
    """
    try:
        result = await db.execute(
            select(Prospect).where(Prospect.id == req.prospect_id)
        )
        prospect = result.scalar_one_or_none()
        
        if not prospect:
            raise HTTPException(status_code=404, detail="Prospect non trouvé")

        company = prospect.company_name or "votre établissement"
        industry = (prospect.industry or "votre secteur").lower()
        booking_sys = (prospect.booking_system_detected or "").lower()
        is_therapist = any(w in industry for w in ["psy", "thérap", "therap", "ostéo", "osteo", "sophro", "santé", "hypno"])
        
        user_msg = req.client_message.strip()
        history = req.history or []
        current_stage = req.call_stage or "greeting"
        
        logger.info(f"--- NOUVEAU MESSAGE ---")
        logger.info(f"Message: '{user_msg}'")
        logger.info(f"Stage: {current_stage}")
        logger.info(f"Gemini disponible: {GEMINI_AVAILABLE}")

        # ================================================================
        # ACCROCHE INITIALE
        # ================================================================
        if req.is_initial or not user_msg:
            pitch = FallbackResponses.get_pitch(is_therapist, company, booking_sys)
            return VoiceInteractResponse(
                bot_response=pitch,
                sentiment="neutre",
                interest_level=0.5,
                objections=[],
                appointment_booked=False,
                call_finished=False,
                next_stage="discovery",
                refusal_count=0,
                attempted_refusals=[],
                used_responses=[]
            )

        # ================================================================
        # DÉTECTION DES MOTS-CLÉS
        # ================================================================
        
        lower_msg = user_msg.lower()
        
        # Détection des refus
        refusal_keywords = ["non", "pas intéressé", "pas le temps", "pas pour moi", "ne veux pas", "plus tard"]
        is_refusal = any(kw in lower_msg for kw in refusal_keywords)
        
        # Détection de l'intérêt
        interest_keywords = ["oui", "d'accord", "ok", "super", "pourquoi pas", "intéressé", "volontiers"]
        is_interest = any(kw in lower_msg for kw in interest_keywords)
        
        # Détection des jours
        days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
        detected_day = None
        for day in days:
            if day in lower_msg:
                detected_day = day
                break
        
        # Détection des heures
        detected_hour = None
        import re
        time_match = re.search(r'(\d{1,2})h', lower_msg)
        if time_match:
            detected_hour = time_match.group(0)
        elif "matin" in lower_msg:
            detected_hour = "10h"
        elif "après-midi" in lower_msg:
            detected_hour = "14h"
        elif "soir" in lower_msg:
            detected_hour = "17h"
        
        is_goodbye = any(kw in lower_msg for kw in ["au revoir", "bye", "bonne journée", "merci"])
        
        refusal_count = req.refusal_count or 0
        if is_refusal:
            refusal_count += 1
        
        logger.info(f"Detected: day={detected_day}, hour={detected_hour}, refusal={is_refusal}, interest={is_interest}")

        # ================================================================
        # GESTION DU "AU REVOIR"
        # ================================================================
        if is_goodbye:
            bot_response = "Merci pour votre temps ! Je vous souhaite une excellente journée. N'hésitez pas à me rappeler si vous avez des questions."
            
            if user_msg:
                user_conv = Conversation(
                    prospect_id=prospect.id,
                    role="user",
                    content=user_msg,
                    timestamp=datetime.utcnow()
                )
                db.add(user_conv)
            bot_conv = Conversation(
                prospect_id=prospect.id,
                role="bot",
                content=bot_response,
                timestamp=datetime.utcnow()
            )
            db.add(bot_conv)
            await db.commit()
            
            return VoiceInteractResponse(
                bot_response=bot_response,
                sentiment="neutre",
                interest_level=0.1,
                objections=["Appel terminé"],
                appointment_booked=False,
                call_finished=True,
                next_stage="closing",
                refusal_count=refusal_count,
                attempted_refusals=req.attempted_refusals or [],
                used_responses=req.used_responses or []
            )

        # ================================================================
        # 1. ESSAYER GEMINI (si disponible)
        # ================================================================
        
        if GEMINI_AVAILABLE:
            gemini_response = get_gemini_response(prospect, user_msg, history, current_stage)
            
            if gemini_response:
                logger.info(f"🤖 RÉPONSE GEMINI: {gemini_response}")
                
                # Sauvegarder
                if user_msg:
                    user_conv = Conversation(
                        prospect_id=prospect.id,
                        role="user",
                        content=user_msg,
                        timestamp=datetime.utcnow()
                    )
                    db.add(user_conv)
                bot_conv = Conversation(
                    prospect_id=prospect.id,
                    role="bot",
                    content=gemini_response,
                    timestamp=datetime.utcnow()
                )
                db.add(bot_conv)
                await db.commit()
                
                # Détecter si c'est une confirmation de RDV
                appointment_keywords = ["confirmé", "rendez-vous", "sms", "à très bientôt"]
                is_appointment = any(kw in gemini_response.lower() for kw in appointment_keywords)
                
                if is_appointment and (detected_day or detected_hour):
                    prospect.status = "appointment_scheduled"
                    prospect.last_contacted = datetime.utcnow()
                    call = Call(
                        prospect_id=prospect.id,
                        call_type="virtual",
                        duration=95,
                        transcript=f"Client: {user_msg}\nBot: {gemini_response}",
                        sentiment="très positif",
                        interest_level=0.95,
                        appointment_booked=True,
                        status="completed"
                    )
                    db.add(call)
                    await db.commit()
                    
                    return VoiceInteractResponse(
                        bot_response=gemini_response,
                        sentiment="très positif",
                        interest_level=0.95,
                        objections=[],
                        appointment_booked=True,
                        call_finished=True,
                        next_stage="closing",
                        refusal_count=0,
                        attempted_refusals=[],
                        used_responses=[]
                    )
                
                return VoiceInteractResponse(
                    bot_response=gemini_response,
                    sentiment="positif",
                    interest_level=0.75,
                    objections=[],
                    appointment_booked=False,
                    call_finished=False,
                    next_stage="slot_selection",
                    refusal_count=0,
                    attempted_refusals=[],
                    used_responses=[]
                )

        # ================================================================
        # 2. FALLBACK - SI GEMINI N'EST PAS DISPONIBLE
        # ================================================================
        
        logger.warning("⚠️ Gemini non disponible, utilisation du fallback")
        
        # ===== GESTION DES REFUS =====
        if is_refusal:
            logger.info(f"REFUS #{refusal_count} détecté")
            
            bot_response = ""
            call_finished = False
            next_stage = "objection_handling"
            objections = []
            
            if refusal_count == 1:
                bot_response = FallbackResponses.get_first_refusal()
                objections = ["Premier refus"]
                call_finished = False
                logger.info(f"1er REFUS -> Speech convaincant")
            
            elif refusal_count == 2:
                bot_response = FallbackResponses.get_second_refusal()
                objections = ["Deuxième refus - Mention gratuité"]
                call_finished = False
                logger.info(f"2ème REFUS -> Mention de la GRATUITÉ")
            
            else:
                bot_response = FallbackResponses.get_closing_refusal()
                objections = ["Refus définitif"]
                call_finished = True
                logger.info(f"3ème REFUS -> CLÔTURE RESPECTUEUSE")
                
                call = Call(
                    prospect_id=prospect.id,
                    call_type="virtual",
                    duration=len(history) * 5 + 45,
                    transcript=f"Client: {user_msg}\nBot: {bot_response}",
                    sentiment="neutre",
                    interest_level=0.10,
                    appointment_booked=False,
                    status="completed"
                )
                db.add(call)
                await db.commit()
            
            if user_msg:
                user_conv = Conversation(
                    prospect_id=prospect.id,
                    role="user",
                    content=user_msg,
                    timestamp=datetime.utcnow()
                )
                db.add(user_conv)
            bot_conv = Conversation(
                prospect_id=prospect.id,
                role="bot",
                content=bot_response,
                timestamp=datetime.utcnow()
            )
            db.add(bot_conv)
            await db.commit()
            
            return VoiceInteractResponse(
                bot_response=bot_response,
                sentiment="neutre",
                interest_level=0.40 if refusal_count == 1 else 0.20,
                objections=objections,
                appointment_booked=False,
                call_finished=call_finished,
                next_stage=next_stage,
                refusal_count=refusal_count,
                attempted_refusals=req.attempted_refusals or [],
                used_responses=req.used_responses or []
            )
        
        # ===== GESTION DES CRÉNEAUX =====
        
        # Si jour + heure -> CONFIRMER LE RDV
        if detected_day and detected_hour:
            bot_response = FallbackResponses.get_appointment_confirmation(detected_day, detected_hour)
            appointment_booked = True
            call_finished = True
            next_stage = "closing"
            
            prospect.status = "appointment_scheduled"
            prospect.last_contacted = datetime.utcnow()
            call = Call(
                prospect_id=prospect.id,
                call_type="virtual",
                duration=95,
                transcript=f"Client: {user_msg}\nBot: {bot_response}",
                sentiment="très positif",
                interest_level=0.95,
                appointment_booked=True,
                status="completed"
            )
            db.add(call)
            await db.commit()
            
            if user_msg:
                user_conv = Conversation(
                    prospect_id=prospect.id,
                    role="user",
                    content=user_msg,
                    timestamp=datetime.utcnow()
                )
                db.add(user_conv)
            bot_conv = Conversation(
                prospect_id=prospect.id,
                role="bot",
                content=bot_response,
                timestamp=datetime.utcnow()
            )
            db.add(bot_conv)
            await db.commit()
            
            return VoiceInteractResponse(
                bot_response=bot_response,
                sentiment="très positif",
                interest_level=0.95,
                objections=[],
                appointment_booked=True,
                call_finished=True,
                next_stage="closing",
                refusal_count=0,
                attempted_refusals=[],
                used_responses=[]
            )
        
        # Si jour sans heure -> DEMANDER L'HEURE
        if detected_day:
            bot_response = f"Parfait pour {detected_day}! Quelle heure vous conviendrait le mieux ? Je vous propose 10h, 14h ou 16h."
            next_stage = "slot_selection"
            
            if user_msg:
                user_conv = Conversation(
                    prospect_id=prospect.id,
                    role="user",
                    content=user_msg,
                    timestamp=datetime.utcnow()
                )
                db.add(user_conv)
            bot_conv = Conversation(
                prospect_id=prospect.id,
                role="bot",
                content=bot_response,
                timestamp=datetime.utcnow()
            )
            db.add(bot_conv)
            await db.commit()
            
            return VoiceInteractResponse(
                bot_response=bot_response,
                sentiment="positif",
                interest_level=0.75,
                objections=[],
                appointment_booked=False,
                call_finished=False,
                next_stage=next_stage,
                refusal_count=0,
                attempted_refusals=[],
                used_responses=[]
            )
        
        # Si heure sans jour -> DEMANDER LE JOUR
        if detected_hour:
            bot_response = f"Très bien {detected_hour}. Quel jour vous conviendrait le mieux ? Jeudi ou vendredi ?"
            next_stage = "slot_selection"
            
            if user_msg:
                user_conv = Conversation(
                    prospect_id=prospect.id,
                    role="user",
                    content=user_msg,
                    timestamp=datetime.utcnow()
                )
                db.add(user_conv)
            bot_conv = Conversation(
                prospect_id=prospect.id,
                role="bot",
                content=bot_response,
                timestamp=datetime.utcnow()
            )
            db.add(bot_conv)
            await db.commit()
            
            return VoiceInteractResponse(
                bot_response=bot_response,
                sentiment="positif",
                interest_level=0.70,
                objections=[],
                appointment_booked=False,
                call_finished=False,
                next_stage=next_stage,
                refusal_count=0,
                attempted_refusals=[],
                used_responses=[]
            )
        
        # ===== SI INTÉRÊT =====
        if is_interest:
            bot_response = FallbackResponses.get_slot_question()
            next_stage = "slot_selection"
            
            if user_msg:
                user_conv = Conversation(
                    prospect_id=prospect.id,
                    role="user",
                    content=user_msg,
                    timestamp=datetime.utcnow()
                )
                db.add(user_conv)
            bot_conv = Conversation(
                prospect_id=prospect.id,
                role="bot",
                content=bot_response,
                timestamp=datetime.utcnow()
            )
            db.add(bot_conv)
            await db.commit()
            
            return VoiceInteractResponse(
                bot_response=bot_response,
                sentiment="positif",
                interest_level=0.75,
                objections=[],
                appointment_booked=False,
                call_finished=False,
                next_stage=next_stage,
                refusal_count=0,
                attempted_refusals=[],
                used_responses=[]
            )
        
        # ===== RÉPONSE PAR DÉFAUT =====
        default_responses = [
            "Je comprends. Welliongo peut vraiment vous simplifier la vie. Une démonstration gratuite de 10 minutes vous intéresserait ?",
            "Vous savez ce qui revient souvent chez nos clients ? Ils me disent : 'Je n'aurais jamais cru que c'était aussi simple'. Je peux vous montrer concrètement. On se trouve un petit créneau ?",
            "Pour être direct avec vous : le vrai problème, c'est le client qui vous appelle, tombe sur le répondeur, et va finalement chez le voisin. Welliongo, ça supprime ce risque complètement. Un créneau pour en discuter ?"
        ]
        
        bot_response = random.choice(default_responses)
        
        if user_msg:
            user_conv = Conversation(
                prospect_id=prospect.id,
                role="user",
                content=user_msg,
                timestamp=datetime.utcnow()
            )
            db.add(user_conv)
        bot_conv = Conversation(
            prospect_id=prospect.id,
            role="bot",
            content=bot_response,
            timestamp=datetime.utcnow()
        )
        db.add(bot_conv)
        await db.commit()
        
        return VoiceInteractResponse(
            bot_response=bot_response,
            sentiment="neutre",
            interest_level=0.55,
            objections=[],
            appointment_booked=False,
            call_finished=False,
            next_stage="slot_selection",
            refusal_count=refusal_count,
            attempted_refusals=req.attempted_refusals or [],
            used_responses=req.used_responses or []
        )

    except Exception as e:
        logger.error(f"Erreur interaction vocale: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ================================================================
# AUTRES ROUTES (inchangées)
# ================================================================

@router.get("/virtual/stream", response_model=None)
async def stream_virtual_call(
    prospect_id: int,
    phone_number: Optional[str] = None,
    objectives: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Prospect).where(Prospect.id == prospect_id))
    prospect = result.scalar_one_or_none()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect non trouvé")

    phone = phone_number or prospect.phone or "+33 1 40 00 00 00"

    async def event_generator() -> AsyncGenerator[str, None]:
        async for line in virtual_agent._simulate_call_stream(prospect, objectives):
            conv = Conversation(
                prospect_id=prospect.id,
                role="assistant",
                content=line,
                timestamp=datetime.utcnow()
            )
            db.add(conv)
            await db.commit()
            yield f"data: {line}\n\n"
        yield "data: [DONE]\n\n"
        call_result = await virtual_agent.initiate_call(
            prospect_id=prospect.id,
            phone_number=phone,
            objectives=objectives,
        )
        if "error" in call_result:
            raise HTTPException(status_code=500, detail=call_result["error"])
        await db.execute(
            """UPDATE conversations SET call_id = :cid WHERE prospect_id = :pid AND call_id IS NULL""",
            {"cid": call_result["call_id"], "pid": prospect.id}
        )
        await db.commit()

    return EventSourceResponse(event_generator())

@router.get("", response_model=List[CallResponse], include_in_schema=False)
@router.get("/", response_model=List[CallResponse])
async def get_calls(
    prospect_id: Optional[int] = None,
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    try:
        query = select(Call).order_by(desc(Call.created_at))
        if prospect_id:
            query = query.where(Call.prospect_id == prospect_id)
        query = query.offset(offset).limit(limit)
        result = await db.execute(query)
        calls = result.scalars().all()
        return calls
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des appels: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")

@router.get("/stats/overview")
async def get_call_statistics(
    db: AsyncSession = Depends(get_db)
):
    try:
        total_result = await db.execute(select(func.count(Call.id)))
        total_calls = total_result.scalar() or 0
        
        appointment_result = await db.execute(
            select(func.count(Call.id)).where(Call.appointment_booked == True)
        )
        appointments = appointment_result.scalar() or 0
        
        virtual_result = await db.execute(
            select(func.count(Call.id)).where(Call.call_type == "virtual")
        )
        virtual_calls = virtual_result.scalar() or 0
        human_calls = total_calls - virtual_calls
        
        duration_result = await db.execute(
            select(func.avg(Call.duration)).where(Call.duration.isnot(None))
        )
        avg_duration = duration_result.scalar() or 0.0
        
        return {
            "total_calls": total_calls,
            "virtual_calls": virtual_calls,
            "human_calls": human_calls,
            "appointments_booked": appointments,
            "conversion_rate": round((appointments / total_calls * 100), 1) if total_calls > 0 else 0.0,
            "average_duration_seconds": round(float(avg_duration), 1)
        }
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des statistiques: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")

@router.post("/twiml-voice")
async def twiml_voice_webhook(request: Request):
    xml_content = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say language="fr-FR" voice="Polly.Mathieu">
        Bonjour ! Je suis Thomas de Welliongo. Je vous contacte pour vous présenter notre solution de réservation sans commission.
    </Say>
    <Gather input="speech" language="fr-FR" timeout="5" action="/api/calls/twiml-gather">
        <Say language="fr-FR" voice="Polly.Mathieu">Dites-moi si vous êtes disponible pour une démonstration rapide de dix minutes.</Say>
    </Gather>
</Response>"""
    return Response(content=xml_content, media_type="application/xml")

@router.post("/twiml-gather")
async def twiml_gather_webhook(request: Request):
    xml_content = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say language="fr-FR" voice="Polly.Mathieu">
        Merci pour votre réponse. Je vous transmets l'invitation pour la démo Welliongo par SMS. Excellente journée !
    </Say>
    <Hangup/>
</Response>"""
    return Response(content=xml_content, media_type="application/xml")

@router.post("/", response_model=CallResponse, status_code=201)
async def create_call(
    call_data: CallCreate,
    db: AsyncSession = Depends(get_db)
):
    try:
        result = await db.execute(
            select(Prospect).where(Prospect.id == call_data.prospect_id)
        )
        prospect = result.scalar_one_or_none()
        if not prospect:
            raise HTTPException(status_code=404, detail="Prospect non trouvé")
        
        call = Call(
            prospect_id=call_data.prospect_id,
            call_type=call_data.call_type,
            duration=call_data.duration,
            transcript=call_data.transcript,
            status="completed",
            created_at=datetime.utcnow()
        )
        db.add(call)
        await db.commit()
        await db.refresh(call)
        return call
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Erreur lors de la création de l'appel: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")

@router.post("/virtual", response_model=VirtualCallResponse)
async def initiate_virtual_call(
    request: VirtualCallRequest,
    db: AsyncSession = Depends(get_db)
):
    try:
        result = await db.execute(
            select(Prospect).where(Prospect.id == request.prospect_id)
        )
        prospect = result.scalar_one_or_none()
        if not prospect:
            raise HTTPException(status_code=404, detail="Prospect non trouvé")
        
        phone_number = request.phone_number or prospect.phone or "+33 1 40 00 00 00"
        call_result = await virtual_agent.initiate_call(
            prospect_id=request.prospect_id,
            phone_number=phone_number,
            objectives=request.objectives
        )
        if "error" in call_result:
            raise HTTPException(status_code=500, detail=call_result["error"])
        return VirtualCallResponse(call_result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de l'appel virtuel: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")

@router.get("/{call_id}", response_model=CallResponse)
async def get_call(
    call_id: int,
    db: AsyncSession = Depends(get_db)
):
    try:
        result = await db.execute(select(Call).where(Call.id == call_id))
        call = result.scalar_one_or_none()
        if not call:
            raise HTTPException(status_code=404, detail="Appel non trouvé")
        return call
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la récupération de l'appel: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")

@router.delete("/{call_id}")
async def delete_call(
    call_id: int,
    db: AsyncSession = Depends(get_db)
):
    try:
        result = await db.execute(select(Call).where(Call.id == call_id))
        call = result.scalar_one_or_none()
        if not call:
            raise HTTPException(status_code=404, detail="Appel non trouvé")
        await db.delete(call)
        await db.commit()
        return {"message": "Appel supprimé avec succès", "call_id": call_id}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Erreur lors de la suppression de l'appel: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")

@router.post("/api/calls/start", response_model=CallResponse)
async def start_real_call(request: Request, db: AsyncSession = Depends(get_db)):
    """Start an outbound call via SignalWire.
    Expects JSON body: {"to": "client_number", "from": "agent_number"}
    """
    data = await request.json()
    to_number = data.get("to")
    from_number = data.get("from")
    if not to_number or not from_number:
        raise HTTPException(status_code=400, detail="Both 'to' and 'from' numbers are required")
    # Load SignalWire credentials from env (assumed already set)
    project_id = os.getenv("SIGNALWIRE_PROJECT_ID")
    api_token = os.getenv("SIGNALWIRE_API_TOKEN")
    space = os.getenv("SIGNALWIRE_SPACE")
    if not (project_id and api_token and space):
        raise HTTPException(status_code=500, detail="SignalWire credentials not configured")
    from signalwire.rest import Client as SignalWireClient
    client = SignalWireClient(project_id, api_token, signalwire_space_url=space)
    try:
        call = client.calls.create(
            url="https://example.com/twiml-voice",  # TwiML endpoint for the call flow
            to=to_number,
            from_=from_number,
        )
        # Record call in DB
        new_call = Call(
            prospect_id=None,
            call_type="real",
            duration=0,
            transcript="",
            sentiment="",
            interest_level=0.0,
            appointment_booked=False,
            status="initiated",
        )
        db.add(new_call)
        await db.commit()
        return CallResponse(
            id=new_call.id,
            call_type=new_call.call_type,
            status=new_call.status,
            created_at=new_call.created_at,
            duration=new_call.duration,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))