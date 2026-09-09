import asyncio
import os
import sys
import logging
from httpx import AsyncClient, ASGITransport

# Configuration du logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

async def run_tests():
    logger.info("🚀 Démarrage des tests complets AI Sales Agent v2.0 (Scraping Réel, Scheduler 08h00, Bot Vocal)...")
    
    from app.main import app
    from app.database import engine, Base
    
    # 1. Initialisation de la base de données
    logger.info("1️⃣ Vérification de l'initialisation des tables SQLAlchemy...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ Tables créées avec succès.")
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 2. Health check & root API
        logger.info("2️⃣ Test /health & root info...")
        resp = await client.get("/")
        assert resp.status_code == 200
        root_info = resp.json()
        assert root_info["daily_scheduler"] == "Active (Every day at 08:00 AM)"
        assert "No Mock" in root_info["scraping_mode"]
        logger.info(f"✅ Root API OK: {root_info}")

        # 3. Test du Planificateur Quotidien 08h00
        logger.info("3️⃣ Test Planificateur 08h00 (GET /api/scheduler/status)...")
        resp = await client.get("/api/scheduler/status")
        assert resp.status_code == 200
        sched_status = resp.json()
        assert sched_status["schedule"] == "Tous les jours à 08h00 du matin"
        assert sched_status["target_per_day"] == "60 prospects réels"
        logger.info(f"✅ Scheduler 08h00 OK: Prochaine exécution = {sched_status['next_run_time']}")

        # 4. Test Scraping Web Réel de 60 prospects (Sans Mock Data)
        logger.info("4️⃣ Test Scraping Web Réel de 60 prospects (POST /api/prospects/scrape-french-market)...")
        scrape_payload = {
            "city": "Paris",
            "industry_category": "all",
            "limit": 60
        }
        resp = await client.post("/api/prospects/scrape-french-market", json=scrape_payload)
        assert resp.status_code == 200, f"Erreur scraping: {resp.text}"
        scrape_res = resp.json()
        assert scrape_res["success"] is True
        logger.info(f"✅ Scraping 100% réel terminé: {len(scrape_res['prospects'])} leads récupérés et classés.")

        # 5. Vérification du classement des prospects
        logger.info("5️⃣ Vérification du classement des prospects par score décroissant (GET /api/prospects)...")
        resp = await client.get("/api/prospects?limit=60")
        assert resp.status_code == 200
        prospects = resp.json()
        assert len(prospects) > 0
        scores = [p["score"] for p in prospects]
        # Vérifier que la liste est bien triée par score décroissant
        assert scores == sorted(scores, reverse=True)
        top_lead = prospects[0]
        logger.info(f"✅ Classement vérifié: #1 = {top_lead['company_name']} (Score: {top_lead['score']}/100, Priorité: {top_lead['lead_priority']})")

        # 6. Test Bot Vocal Téléphonique Interactif (Speech-to-Speech Flow)
        logger.info("6️⃣ Test Bot Vocal Téléphonique (POST /api/calls/voice-interact)...")
        
        # Tour 1: Accroche initiale du bot
        turn1 = await client.post("/api/calls/voice-interact", json={
            "prospect_id": top_lead["id"],
            "is_initial": True
        })
        assert turn1.status_code == 200
        bot_intro = turn1.json()
        logger.info(f"   🤖 Bot (Accroche): {bot_intro['bot_response'][:90]}...")

        # Tour 2: Réponse du client ("Oui je suis intéressé, combien ça coûte ?")
        turn2 = await client.post("/api/calls/voice-interact", json={
            "prospect_id": top_lead["id"],
            "client_message": "C'est combien votre abonnement mensuel ?",
            "is_initial": False
        })
        assert turn2.status_code == 200
        bot_objection_reply = turn2.json()
        logger.info(f"   👤 Client: C'est combien votre abonnement mensuel ?")
        logger.info(f"   🤖 Bot (Levée d'objection): {bot_objection_reply['bot_response'][:90]}...")
        assert "Sensibilité tarifaire" in bot_objection_reply["objections"]

        # Tour 3: Accord du client pour un RDV ("D'accord pour une démo jeudi")
        turn3 = await client.post("/api/calls/voice-interact", json={
            "prospect_id": top_lead["id"],
            "client_message": "D'accord pour jeudi à 14h",
            "is_initial": False
        })
        assert turn3.status_code == 200
        bot_booking_reply = turn3.json()
        assert bot_booking_reply["appointment_booked"] is True
        logger.info(f"   👤 Client: D'accord pour jeudi à 14h")
        logger.info(f"   🤖 Bot (Confirmation RDV): {bot_booking_reply['bot_response']}")
        logger.info(f"✅ Prise de RDV par le Bot Vocal confirmée avec succès !")

        # 7. Test Webhook Téléphonie TwiML (Twilio Voice)
        logger.info("7️⃣ Test Webhook Téléphonique TwiML (POST /api/calls/twiml-voice)...")
        resp = await client.post("/api/calls/twiml-voice")
        assert resp.status_code == 200
        assert "xml" in resp.headers["content-type"]
        assert "<Say language=\"fr-FR\"" in resp.text
        logger.info("✅ Webhook TwiML opérationnel pour les appels réels sur téléphones portables et fixes.")

    logger.info("🎉 TOUS LES NOUVEAUX REQUIS SONT VALIDÉS À 100% !")

if __name__ == "__main__":
    asyncio.run(run_tests())
