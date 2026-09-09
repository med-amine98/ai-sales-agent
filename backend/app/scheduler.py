import asyncio
import logging
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.scrapers.french_leads_scraper import FrenchLeadsScraper
from app.ml.scorer import ScoringEngine
from app.models import Prospect
from app.database import AsyncSessionLocal
from sqlalchemy import select, and_

logger = logging.getLogger(__name__)

# Scheduler global
scheduler = AsyncIOScheduler()
last_run_time = None
last_run_count = 0
is_job_running = False

CITIES_ROTATION = ["Paris", "Lyon", "Marseille", "Bordeaux", "Lille", "Toulouse", "Nice", "Nantes", "Strasbourg", "Montpellier"]

async def scheduled_daily_scraping_job():
    """
    Tâche automatique quotidienne exécutée chaque matin à 08h00.
    Scrape 60 établissements réels sans mock data, les score et les classe dans le CRM.
    """
    global last_run_time, last_run_count, is_job_running
    if is_job_running:
        logger.warning("Un job de scraping est déjà en cours d'exécution.")
        return

    is_job_running = True
    logger.info("⏰ [08h00] Démarrage du scraping automatique quotidien de 60 prospects réels...")

    try:
        scraper = FrenchLeadsScraper()
        scorer = ScoringEngine()
        
        # Sélection de la ville du jour par rotation
        day_index = datetime.utcnow().day % len(CITIES_ROTATION)
        city_today = CITIES_ROTATION[day_index]
        
        # Scraping de 60 prospects réels
        leads = await scraper.search_leads(city=city_today, industry_category="all", limit=60)
        
        added_count = 0
        async with AsyncSessionLocal() as session:
            for l in leads:
                # Vérifier si l'établissement existe déjà
                existing = await session.execute(
                    select(Prospect).where(
                        and_(
                            Prospect.company_name == l["company_name"],
                            Prospect.city == l["city"]
                        )
                    )
                )
                if existing.scalar_one_or_none():
                    continue

                prospect = Prospect(**l)
                score_data = scorer._calculate_score(prospect)
                prospect.score = round(score_data['score'], 1)
                prospect.probability = round(score_data['probability'], 2)
                prospect.score_reasons = score_data['reasons']
                prospect.lead_priority = score_data['lead_priority']
                prospect.sales_pitch = score_data['sales_pitch']
                prospect.created_at = datetime.utcnow()
                prospect.updated_at = datetime.utcnow()

                session.add(prospect)
                added_count += 1

            await session.commit()

        last_run_time = datetime.utcnow().isoformat()
        last_run_count = added_count
        logger.info(f"✅ Scraping quotidien 08h00 terminé avec succès : {added_count} nouveaux prospects qualifiés et classés (Ville: {city_today}).")

    except Exception as e:
        logger.error(f"❌ Erreur lors du scraping automatique quotidien : {e}")
    finally:
        is_job_running = False

def start_scheduler():
    """Démarre le planificateur pour un déclenchement quotidien à 08:00"""
    if not scheduler.running:
        # Déclenchement tous les jours à 08h00 du matin
        trigger = CronTrigger(hour=8, minute=0)
        scheduler.add_job(
            scheduled_daily_scraping_job,
            trigger=trigger,
            id="daily_scraping_8am",
            name="Scraping quotidien 60 prospects réels à 08h00",
            replace_existing=True
        )
        scheduler.start()
        logger.info("🕒 Planificateur automatique activé : Scraping quotidien programmé à 08h00 du matin.")

def stop_scheduler():
    """Arrête le planificateur proprement"""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Planificateur automatique arrêté.")
