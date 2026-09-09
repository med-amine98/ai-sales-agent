# backend/app/ai/gemini_analyzer.py
import logging
import json
import re
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

class GeminiAnalyzer:
    """
    Analyseur de conversations - Mode NLP local avancé
    Pas d'API externe, 100% local et instantané
    """
    
    def __init__(self):
        self.available = False
        logger.info("🔧 Mode NLP avancé activé (100% local - sans API)")
        logger.info("💡 Aucune limite de requêtes, analyse instantanée")

    async def analyze_conversation(self, text: str, context_type: str = "conversation") -> Dict[str, Any]:
        """Analyse une conversation commerciale avec NLP avancé"""
        return self._intelligent_fallback_analysis(text)

    def _intelligent_fallback_analysis(self, text: str) -> Dict[str, Any]:
        """Analyse sémantique intelligente"""
        text_lower = text.lower()
        
        needs = []
        objections = []
        topics = []
        next_steps = []
        
        # ===== DÉTECTION DES BESOINS =====
        need_patterns = {
            "gain de temps": "Réduction du temps passé au téléphone",
            "téléphone": "Réduction des appels entrants",
            "appels": "Réduction des appels entrants",
            "no-show": "Rappels automatiques pour réduire les no-shows",
            "rappel": "Rappels SMS automatiques",
            "sms": "Rappels SMS automatiques",
            "soir": "Réservation 24h/24 (soir)",
            "dimanche": "Réservation 24h/24 (weekend)",
            "24h": "Réservation 24h/24",
            "commission": "Réduction des frais de commission",
            "frais": "Réduction des frais",
            "organisation": "Meilleure organisation des rendez-vous",
            "agenda": "Gestion d'agenda optimisée",
            "client": "Amélioration de l'expérience client",
            "patient": "Amélioration de l'expérience patient"
        }
        
        for pattern, need in need_patterns.items():
            if pattern in text_lower:
                needs.append(need)
        
        if not needs:
            needs.append("Modernisation de la prise de rendez-vous")

        # ===== DÉTECTION DES OBJECTIONS =====
        objection_patterns = {
            "planity": "Utilise déjà Planity",
            "doctolib": "Utilise déjà Doctolib",
            "déjà équipé": "Utilise déjà une solution",
            "déjà un outil": "Utilise déjà un outil",
            "concurrent": "A déjà un concurrent",
            "cher": "Sensibilité au prix",
            "prix": "Question sur le prix",
            "coût": "Question sur le coût",
            "budget": "Contrainte budgétaire",
            "tarif": "Question sur le tarif",
            "pas le temps": "Manque de disponibilité",
            "occupé": "Manque de disponibilité",
            "débordé": "Manque de disponibilité",
            "plus tard": "Report de la décision",
            "pas intéressé": "Manque d'intérêt",
            "non merci": "Refus"
        }
        
        for pattern, objection in objection_patterns.items():
            if pattern in text_lower:
                objections.append(objection)
        
        if not objections:
            objections.append("Aucune objection bloquante détectée")

        # ===== DÉTECTION DES SUJETS =====
        topic_patterns = {
            "réservation": "Prise de rendez-vous",
            "rendez-vous": "Prise de rendez-vous",
            "commission": "Coûts et commissions",
            "frais": "Coûts et commissions",
            "sms": "Rappels automatiques",
            "rappel": "Rappels automatiques",
            "client": "Relation client",
            "patient": "Relation client",
            "agenda": "Gestion d'agenda",
            "planning": "Gestion d'agenda"
        }
        
        for pattern, topic in topic_patterns.items():
            if pattern in text_lower:
                topics.append(topic)
        
        if not topics:
            topics.append("Réservation en ligne")

        # ===== NIVEAU D'INTÉRÊT ET SENTIMENT =====
        interest_level = 0.60
        sentiment = "neutre"
        next_steps = ["Transmettre la documentation par email", "Relancer sous 48h"]
        
        # Mots-clés d'intérêt fort
        high_interest = ["intéressé", "d'accord", "rdv", "rendez-vous", "démo", 
                        "parfait", "merci", "oui", "super", "excellent", "volontiers",
                        "carrement", "avec plaisir"]
        
        # Mots-clés d'intérêt moyen
        mid_interest = ["peut-être", "pas sûr", "hésite", "réfléchis", "pourquoi pas",
                       "je verrai", "j'y pense"]
        
        # Mots-clés de refus
        negative = ["non", "refuse", "pas intéressé", "aucun besoin", "stop", "arrêtez",
                   "ne veux pas", "pas pour moi"]
        
        # Mots-clés de question (intérêt potentiel)
        question = ["combien", "comment", "pourquoi", "quand", "où", "quel", "qu'est-ce"]
        
        if any(w in text_lower for w in high_interest):
            interest_level = 0.85
            sentiment = "très positif"
            next_steps = [
                "Envoyer invitation pour démonstration vidéo",
                "Proposer un créneau de RDV",
                "Préparer devis personnalisé"
            ]
        elif any(w in text_lower for w in mid_interest):
            interest_level = 0.50
            sentiment = "hésitant"
            next_steps = [
                "Envoyer documentation complète par email",
                "Programmer un rappel dans 1 semaine"
            ]
        elif any(w in text_lower for w in negative):
            interest_level = 0.25
            sentiment = "réservé"
            next_steps = ["Programmer un rappel dans 3 mois"]
        elif any(w in text_lower for w in question):
            interest_level = 0.70
            sentiment = "curieux"
            next_steps = [
                "Répondre aux questions par email",
                "Proposer un appel de suivi"
            ]

        # ===== RÉSUMÉ =====
        if interest_level >= 0.80:
            summary = f"🟢 Prospect très intéressé ({int(interest_level * 100)}%). Objectifs : {', '.join(needs[:2])}. À contacter rapidement pour une démonstration."
        elif interest_level >= 0.50:
            summary = f"🟡 Prospect moyennement intéressé ({int(interest_level * 100)}%). Objections à lever : {', '.join(objections[:2])}. À suivre."
        else:
            summary = f"🔴 Prospect peu intéressé ({int(interest_level * 100)}%). Objections : {', '.join(objections[:2])}. À rappeler plus tard."

        return {
            "needs": needs[:5],
            "objections": objections[:5],
            "interest_level": round(interest_level, 2),
            "next_steps": next_steps[:3],
            "sentiment": sentiment,
            "topics": topics[:5],
            "summary": summary
        }

    async def generate_sales_arguments(self, prospect_data: Dict[str, Any], products: List[str]) -> Dict[str, str]:
        """Génère des arguments commerciaux personnalisés"""
        return self._intelligent_fallback_arguments(prospect_data)

    def _intelligent_fallback_arguments(self, prospect_data: Dict[str, Any]) -> Dict[str, str]:
        """Arguments commerciaux oraux et naturels"""
        company = prospect_data.get("company_name", "votre établissement")
        industry = prospect_data.get("industry", "").lower()
        booking_sys = (prospect_data.get("booking_system_detected") or "").lower()
        
        # Détection du secteur
        is_therapist = any(w in industry for w in ["psy", "thérap", "therap", "ostéo", "osteo", "sophro", "santé", "hypno"])
        
        if "planity" in booking_sys or "doctolib" in booking_sys:
            pitch = f"Bonjour ! C'est Thomas de Welliongo. Je vous appelle au sujet de {company}. On aide les professionnels à arrêter de payer des commissions sur chaque réservation. Est-ce que j'arrive au bon moment ?"
            value_prop = "Avec Welliongo, fini les commissions. Vous gardez 100% de vos revenus. Et vos clients peuvent réserver quand ils veulent, même à 22h."
            obj_handling = "Je comprends, vous êtes déjà équipé. La migration vers Welliongo prend 10 minutes, on importe tout automatiquement. Zéro interruption."
            closing = "Je vous propose qu'on regarde ça ensemble en 10 minutes — gratuitement. Jeudi ou vendredi, qu'est-ce qui vous irait ?"
        else:
            pitch = f"Bonjour ! Thomas de Welliongo à l'appareil. Je vous contacte par rapport à {company}. On a remarqué que vous n'aviez pas encore de réservation en ligne — plus d'un tiers des clients réservent le soir ou le weekend. Ça vous parle ?"
            value_prop = "Avec Welliongo, vos clients réservent 24h sur 24, vous récupérez en moyenne 3 heures par semaine, et les rappels SMS automatiques réduisent les no-shows."
            obj_handling = "C'est ultra-simple — pas besoin de créer un compte, juste cliquer et réserver. Et pour vous, tout s'affiche directement dans votre agenda."
            closing = "Qu'est-ce que vous diriez d'une démo rapide de 10 minutes pour voir si ça colle avec votre quotidien ? C'est gratuit, sans engagement."

        return {
            "pitch": pitch,
            "value_proposition": value_prop,
            "objections_handling": obj_handling,
            "closing": closing
        }

# Instance globale
gemini_analyzer = GeminiAnalyzer()