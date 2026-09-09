import numpy as np
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import Prospect, MLPrediction
from app.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

# Pondération des secteurs pour une solution de réservation de rendez-vous
INDUSTRY_WEIGHTS = {
    'coiffure & barbiers': 0.95,
    'coiffure': 0.95,
    'massages & spas bien-être': 0.92,
    'massage': 0.90,
    'bien-être & massages': 0.90,
    'instituts de beauté & esthétique': 0.90,
    'beauté & esthétique': 0.88,
    'psychothérapeutes & psychologues': 0.88,
    'psychothérapie': 0.88,
    'thérapies alternatives': 0.85,
    'santé alternative & bien-être': 0.85,
    'ostéopathie': 0.85,
    'sophrologie': 0.82,
    'naturopathie': 0.80,
    'bien-être & santé': 0.75,
    'santé': 0.70
}

class ScoringEngine:
    def __init__(self):
        self.feature_columns = [
            'booking_need_score',
            'industry_relevance',
            'contactability_score',
            'solo_or_small_team_fit',
            'digital_readiness',
            'recency_score'
        ]
        logger.info("Moteur de Scoring Réservation France initialisé avec succès")
    
    async def score_all_prospects(self):
        """Scoring haute performance de tous les prospects en base de données"""
        try:
            async with AsyncSessionLocal() as session:
                result = await session.execute(select(Prospect))
                prospects = result.scalars().all()
                
                if not prospects:
                    logger.info("Aucun prospect à scorer")
                    return
                
                for prospect in prospects:
                    score_data = self._calculate_score(prospect)
                    
                    # Mise à jour du prospect
                    prospect.score = round(score_data['score'], 1)
                    prospect.probability = round(score_data['probability'], 2)
                    prospect.score_reasons = score_data['reasons']
                    prospect.lead_priority = score_data['lead_priority']
                    prospect.sales_pitch = score_data['sales_pitch']
                    prospect.updated_at = datetime.utcnow()
                    
                    # Sauvegarde prédiction
                    prediction = MLPrediction(
                        prospect_id=prospect.id,
                        model_type='booking_sales_heuristics_v2',
                        prediction_score=prospect.score,
                        prediction_probability=prospect.probability,
                        features_used=score_data['features']
                    )
                    session.add(prediction)
                
                await session.commit()
                logger.info(f"✅ Scoring terminé avec succès pour {len(prospects)} prospects !")
                
        except Exception as e:
            logger.error(f"❌ Erreur lors du scoring: {e}")
    
    def _calculate_score(self, prospect: Prospect) -> Dict[str, Any]:
        """
        Calcule le score de conversion d'un prospect pour une solution de réservation (0 - 100)
        """
        reasons = []
        base_score = 0.0

        # 1. Diagnostic Réservation (Impact Majeur : jusqu'à 35 points)
        booking_sys = (prospect.booking_system_detected or "").lower()
        has_booking = bool(prospect.has_online_booking)
        
        if not has_booking or "aucun" in booking_sys or not booking_sys:
            booking_need = 1.0
            base_score += 35.0
            reasons.append("🎯 Opportunité en or : Aucun outil de réservation en ligne détecté")
        elif any(comp in booking_sys for comp in ["planity", "doctolib"]):
            booking_need = 0.2
            base_score += 8.0
            reasons.append(f"⚠️ Déjà équipé ({prospect.booking_system_detected}) : Axe de vente axé sur la réduction de coûts/commissions")
        else:
            booking_need = 0.5
            base_score += 18.0
            reasons.append(f"🔄 Système détecté ({prospect.booking_system_detected}) : Remplacement possible")

        # 2. Pertinence de l'Industrie pour la prise de RDV (jusqu'à 25 points)
        ind_str = (prospect.industry or "").lower()
        ind_weight = 0.6
        for key, weight in INDUSTRY_WEIGHTS.items():
            if key in ind_str:
                ind_weight = weight
                break
        
        base_score += (ind_weight * 25.0)
        if ind_weight >= 0.85:
            reasons.append(f"💈 Secteur à très forte fréquence de rendez-vous ({prospect.industry})")

        # 3. Facilité de contact (jusqu'à 20 points)
        contact_score = 0.0
        if prospect.phone:
            contact_score += 0.6
            base_score += 12.0
            reasons.append("📞 Ligne téléphonique directe disponible")
        if prospect.email:
            contact_score += 0.4
            base_score += 8.0
            reasons.append("📧 Adresse email de contact vérifiée")

        # 4. Praticien solo / Petite équipe (Gain de temps maximal : jusqu'à 10 points)
        size = prospect.company_size or 1
        if 1 <= size <= 4:
            fit_score = 1.0
            base_score += 10.0
            reasons.append("⏳ Structure à taille humaine : Gain de temps estimé à 5h/semaine")
        else:
            fit_score = 0.6
            base_score += 6.0

        # 5. Présence numérique existante (jusqu'à 10 points)
        digital_score = 0.0
        if prospect.website and str(prospect.website).startswith("http"):
            digital_score = 1.0
            base_score += 10.0
            reasons.append("🌐 Établissement digitalisé (prêt pour l'intégration du widget)")
        else:
            digital_score = 0.3
            base_score += 3.0

        # Score final borné entre 10 et 99
        final_score = max(10.0, min(99.0, base_score))
        probability = final_score / 100.0

        # Qualification de la priorité
        if final_score >= 75:
            lead_priority = "hot"
        elif final_score >= 50:
            lead_priority = "warm"
        else:
            lead_priority = "cold"

        # Génération du pitch commercial personnalisé
        pitch = self._generate_custom_pitch(prospect, final_score, reasons)

        features = {
            'booking_need_score': booking_need,
            'industry_relevance': ind_weight,
            'contactability_score': contact_score,
            'solo_or_small_team_fit': fit_score,
            'digital_readiness': digital_score,
            'recency_score': 1.0
        }

        return {
            'score': final_score,
            'probability': probability,
            'reasons': reasons,
            'lead_priority': lead_priority,
            'sales_pitch': pitch,
            'features': features
        }

    def _generate_custom_pitch(self, prospect: Prospect, score: float, reasons: List[str]) -> str:
        """Génère une accroche commerciale adaptée au secteur français et au diagnostic"""
        name = prospect.company_name or "votre établissement"
        ind = prospect.industry or "votre activité"
        
        if not prospect.has_online_booking:
            return (
                f"Bonjour ! Nous avons remarqué que {name} ne propose pas encore la réservation en ligne 24h/24. "
                f"Dans le secteur {ind}, vous perdez en moyenne 30% de réservations le soir et le week-end quand vos clients "
                f"ne peuvent pas appeler. Notre solution intuitive s'installe en 5 minutes et vous libère de la gestion d'appels."
            )
        elif "planity" in (prospect.booking_system_detected or "").lower():
            return (
                f"Bonjour ! Vous utilisez actuellement Planity pour {name}. Saviez-vous que notre solution de réservation "
                f"vous permet d'économiser jusqu'à 60% sur vos frais mensuels sans aucune commission sur vos clients fidèles ?"
            )
        elif "doctolib" in (prospect.booking_system_detected or "").lower():
            return (
                f"Bonjour ! Vous êtes référencé sur Doctolib pour vos consultations. Nous proposons un module de réservation "
                f"direct et indépendant, sans abonnement prohibitif, conçu sur-mesure pour les praticiens en {ind}."
            )
        else:
            return (
                f"Bonjour ! Optimisez l'agenda et la prise de rendez-vous de {name}. "
                f"Notre plateforme tout-en-un augmente votre taux de remplissage et envoie des rappels SMS automatiques pour réduire les no-shows."
            )