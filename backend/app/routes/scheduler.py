from fastapi import APIRouter, BackgroundTasks, HTTPException
from datetime import datetime
from app.scheduler import scheduler, last_run_time, last_run_count, is_job_running, scheduled_daily_scraping_job

router = APIRouter()

@router.get("/status")
async def get_scheduler_status():
    """Récupère l'état du planificateur automatique de scraping à 08h00"""
    job = scheduler.get_job("daily_scraping_8am")
    next_run = str(job.next_run_time) if job and job.next_run_time else "Tous les jours à 08:00:00"
    
    return {
        "scheduler_active": scheduler.running,
        "schedule": "Tous les jours à 08h00 du matin",
        "target_per_day": "60 prospects réels",
        "next_run_time": next_run,
        "last_run_time": last_run_time or "En attente du premier déclenchement",
        "last_run_count": last_run_count,
        "is_job_running": is_job_running
    }

@router.post("/trigger-now")
async def trigger_scheduler_now(background_tasks: BackgroundTasks):
    """Déclenche immédiatement le scraping et scoring automatique des 60 prospects réels"""
    if is_job_running:
        return {"status": "already_running", "message": "Un scraping de 60 prospects est déjà en cours."}
    
    background_tasks.add_task(scheduled_daily_scraping_job)
    return {
        "status": "triggered",
        "message": "Scraping de 60 prospects réels lancé avec succès en arrière-plan !"
    }
