# backend/scheduler.py
import asyncio
import logging
from app.scheduler import scheduled_daily_scraping_job, start_scheduler, scheduler
import time

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

async def run_standalone_scheduler():
    logger.info("=" * 70)
    logger.info("🕐 AGENT COMMERCIAL IA - PLANIFICATEUR AUTOMATIQUE 08H00")
    logger.info("Scraping quotidien automatique de 60 prospects réels sur le web français")
    logger.info("=" * 70)
    
    start_scheduler()
    
    try:
        while True:
            await asyncio.sleep(3600)
    except (KeyboardInterrupt, SystemExit):
        logger.info("Arrêt du planificateur.")

if __name__ == "__main__":
    asyncio.run(run_standalone_scheduler())