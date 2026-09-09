import asyncio
import logging
from typing import Dict, Any, Optional, AsyncGenerator
from datetime import datetime
import json

from app.models import Prospect, Call
from app.ai.gemini_analyzer import GeminiAnalyzer
from app.ai.local_llm import LocalLLM
from app.database import AsyncSessionLocal
from sqlalchemy import select

logger = logging.getLogger(__name__)

class VirtualSalesAgent:
    def __init__(self):
        self.gemini = GeminiAnalyzer()
        self.local_llm = LocalLLM()  # fallback LLM
    
    async def initiate_call(self, prospect_id: int, phone_number: str, objectives: Optional[str] = None) -> Dict[str, Any]:
        """Initie un appel commercial virtuel avec un prospect"""
        try:
            async with AsyncSessionLocal() as session:
                # Récupération du prospect
                result = await session.execute(
                    select(Prospect).where(Prospect.id == prospect_id)
                )
                prospect = result.scalar_one_or_none()
                
                if not prospect:
                    return {"error": "Prospect non trouvé"}
                
                # Simulation d'appel avec scénario réaliste
                call_result = await self._simulate_call(prospect, objectives)
                
                # Création de l'enregistrement d'appel
                call = Call(
                    prospect_id=prospect_id,
                    call_type='virtual',
                    duration=call_result['duration'],
                    transcript=call_result['transcript'],
                    analysis=call_result['analysis'],
                    sentiment=call_result['analysis'].get('sentiment', 'positif'),
                    interest_level=call_result['analysis'].get('interest_level', 0.7),
                    objections=call_result['analysis'].get('objections', []),
                    appointment_booked=call_result['appointment_booked'],
                    status='completed',
                    created_at=datetime.utcnow()
                )
                session.add(call)
                
                # Mise à jour du prospect
                prospect.last_contacted = datetime.utcnow()
                if call_result['appointment_booked']:
                    prospect.status = 'appointment_scheduled'
                else:
                    prospect.status = 'contacted'
                    
                await session.commit()
                await session.refresh(call)
                
                return {
                    "call_id": call.id,
                    "status": "completed",
                    "transcript": call_result['transcript'],
                    "appointment_booked": call_result['appointment_booked'],
                    "analysis": call_result['analysis']
                }
                
        except Exception as e:
            logger.error(f"Erreur lors de l'appel virtuel: {e}")
            return {"error": str(e)}
    
    async def _simulate_call_stream(self, prospect: Prospect, objectives: Optional[str]) -> AsyncGenerator[str, None]:
        """Yield each dialogue line of a simulated call.

        This is used by the SSE streaming endpoint. It attempts to use the Gemini analyzer
        for realistic arguments, but falls back to the lightweight LocalLLM if any error occurs.
        """
        # Prepare basic prospect data
        prospect_data = {
            "company_name": prospect.company_name,
            "industry": prospect.industry,
            "booking_system_detected": prospect.booking_system_detected,
            "city": prospect.city,
        }
        # Try to get sophisticated arguments from Gemini, fallback to LocalLLM on error
        try:
            arguments = await self.gemini.generate_sales_arguments(
                prospect_data,
                ["Module de réservation en ligne sans commission", "Rappels SMS automatiques"]
            )
        except Exception as e:
            logger.error(f"Gemini generate_sales_arguments failed: {e}. Falling back to LocalLLM.")
            # Simple fallback transcript line using LocalLLM
            fallback_line = self.local_llm.generate(
                f"Prospect {prospect.company_name} – fallback conversation line."
            )
            # The LocalLLM returns a generic transcript; we yield it and stop.
            yield fallback_line
            return

        # Determine existing system and score (same logic as _simulate_call)
        has_existing_system = prospect.has_online_booking and "aucun" not in (prospect.booking_system_detected or "").lower()
        score = prospect.score or 50.0

        # Build and yield dialogue lines one by one
        line = f"Agent IA: {arguments['pitch']}"
        yield line
        if has_existing_system:
            line = f"Prospect: Bonjour. Oui, nous utilisons déjà {prospect.booking_system_detected}, pourquoi changer ?"
            yield line
            line = f"Agent IA: {arguments['value_proposition']} En plus, {arguments['objections_handling']}"
            yield line
            if score >= 60:
                line = "Prospect: C'est vrai que les frais mensuels sont élevés. Combien de temps prend la mise en place ?"
                yield line
                line = f"Agent IA: {arguments['closing']}"
                yield line
                line = "Prospect: Parfait, convenons d'un créneau jeudi à 14h30 pour regarder ensemble."
                yield line
                line = "Agent IA: C'est noté avec plaisir pour jeudi 14h30 ! Vous allez recevoir une confirmation par email et SMS. Bonne journée !"
                yield line
            else:
                line = "Prospect: Je vais y réfléchir. Envoyez-moi plutôt une documentation par email."
                yield line
                line = "Agent IA: Très bien, je vous transmets cela immédiatement. Je me permettrai de vous recontacter la semaine prochaine. Excellente journée !"
                yield line
        else:
            line = "Prospect: Bonjour. Oui effectivement, nous gérons tout par téléphone et sur papier actuellement, c'est parfois prenant."
            yield line
            line = f"Agent IA: {arguments['value_proposition']} Nos clients constatent un gain moyen de 5 heures par semaine et zéro no-show grâce aux rappels SMS."
            yield line
            if score >= 45:
                line = "Prospect: Ça m'intéresse beaucoup car le téléphone sonne souvent pendant que je suis en consultation. Comment ça marche ?"
                yield line
                line = f"Agent IA: {arguments['closing']}"
                yield line
                line = "Prospect: D'accord, faisons comme ça, vendredi matin vers 10h me conviendrait bien."
                yield line
                line = "Agent IA: Rendez-vous confirmé pour vendredi à 10h00 ! Merci beaucoup et à très bientôt !"
                yield line
            else:
                line = "Prospect: Pourquoi pas, mais pas ce mois-ci, je suis en plein déménagement."
                yield line
                line = "Agent IA: Je comprends tout à fait ! Je vous envoie notre guide et nous ferons un point le mois prochain. Très bonne continuation !"
                yield line
        # End of generator – the full transcript and analysis will be handled by initiate_call separately.

        """Génère une simulation d'appel réaliste adaptée au profil du prospect"""
        prospect_data = {
            "company_name": prospect.company_name,
            "industry": prospect.industry,
            "booking_system_detected": prospect.booking_system_detected,
            "city": prospect.city
        }
        
        arguments = await self.gemini.generate_sales_arguments(
            prospect_data,
            ["Module de réservation en ligne sans commission", "Rappels SMS automatiques"]
        )
        
        has_existing_system = prospect.has_online_booking and "aucun" not in (prospect.booking_system_detected or "").lower()
        score = prospect.score or 50.0
        
        # Construction du dialogue
        lines = []
        lines.append(f"Agent IA: {arguments['pitch']}")
        
        if has_existing_system:
            lines.append(f"Prospect: Bonjour. Oui, nous utilisons déjà {prospect.booking_system_detected}, pourquoi changer ?")
            lines.append(f"Agent IA: {arguments['value_proposition']} En plus, {arguments['objections_handling']}")
            if score >= 60:
                lines.append("Prospect: C'est vrai que les frais mensuels sont élevés. Combien de temps prend la mise en place ?")
                lines.append(f"Agent IA: {arguments['closing']}")
                lines.append("Prospect: Parfait, convenons d'un créneau jeudi à 14h30 pour regarder ensemble.")
                lines.append("Agent IA: C'est noté avec plaisir pour jeudi 14h30 ! Vous allez recevoir une confirmation par email et SMS. Bonne journée !")
                appointment_booked = True
            else:
                lines.append("Prospect: Je vais y réfléchir. Envoyez-moi plutôt une documentation par email.")
                lines.append("Agent IA: Très bien, je vous transmets cela immédiatement. Je me permettrai de vous recontacter la semaine prochaine. Excellente journée !")
                appointment_booked = False
        else:
            lines.append("Prospect: Bonjour. Oui effectivement, nous gérons tout par téléphone et sur papier actuellement, c'est parfois prenant.")
            lines.append(f"Agent IA: {arguments['value_proposition']} Nos clients constatent un gain moyen de 5 heures par semaine et zéro no-show grâce aux rappels SMS.")
            if score >= 45:
                lines.append("Prospect: Ça m'intéresse beaucoup car le téléphone sonne souvent pendant que je suis en consultation. Comment ça marche ?")
                lines.append(f"Agent IA: {arguments['closing']}")
                lines.append("Prospect: D'accord, faisons comme ça, vendredi matin vers 10h me conviendrait bien.")
                lines.append("Agent IA: Rendez-vous confirmé pour vendredi à 10h00 ! Merci beaucoup et à très bientôt !")
                appointment_booked = True
            else:
                lines.append("Prospect: Pourquoi pas, mais pas ce mois-ci, je suis en plein déménagement.")
                lines.append("Agent IA: Je comprends tout à fait ! Je vous envoie notre guide et nous ferons un point le mois prochain. Très bonne continuation !")
                appointment_booked = False
                
        transcript_text = "\n".join(lines)
        analysis = await self.gemini.analyze_conversation(transcript_text, context_type="appel_commercial")
        
        duration = 90 + int(score * 1.2) if appointment_booked else 60 + int(score * 0.5)
        
        # End of async generator – the full call result is handled elsewhere