from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.database import engine, Base, get_db
from app.routes.prospects import router as prospects_router
from app.routes.calls import router as calls_router
from app.routes.analytics import router as analytics_router
from app.routes.scheduler import router as scheduler_router
from app.ml.scorer import ScoringEngine
from app.ai.gemini_analyzer import GeminiAnalyzer
from app.scheduler import start_scheduler, stop_scheduler

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Variables globales
scoring_engine = None
gemini_analyzer = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestion du cycle de vie de l'application avec démarrage du planificateur 08h00"""
    global scoring_engine, gemini_analyzer
    
    logger.info("Initialisation de l'API AI Sales Agent...")
    try:
        # 1. Création des tables
        async with engine.begin() as conn:
            logger.info("Création/synchronisation des tables SQLAlchemy...")
            await conn.run_sync(Base.metadata.create_all)
            
        scoring_engine = ScoringEngine()
        gemini_analyzer = GeminiAnalyzer()
        
        # 2. Démarrage du planificateur quotidien à 08h00
        start_scheduler()
        
        logger.info("Application démarrée avec succès (Scraping réel actif, Planificateur 08h00 activé)")
    except Exception as e:
        logger.error(f"Erreur lors de l'initialisation: {e}")
    
    yield
    
    # Arrêt propre
    logger.info("Arrêt de l'application et du planificateur...")
    try:
        stop_scheduler()
    except Exception as e:
        logger.warning(f"Erreur arrêt scheduler: {e}")

# Création de l'application FastAPI
app = FastAPI(
    title="AI Sales Agent API",
    description="API pour l'agent commercial intelligent avec prospection réelle et bot vocal téléphonique",
    version="2.0.0",
    lifespan=lifespan
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusion des routes
app.include_router(prospects_router, prefix="/api/prospects", tags=["Prospects"])
app.include_router(calls_router, prefix="/api/calls", tags=["Calls & Bot Vocal"])
app.include_router(analytics_router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(scheduler_router, prefix="/api/scheduler", tags=["Scheduler 08h00"])

@app.get("/")
async def root():
    return {
        "message": "AI Sales Agent API v2.0",
        "status": "running",
        "scraping_mode": "100% Real French Web Data (No Mock)",
        "daily_scheduler": "Active (Every day at 08:00 AM)",
        "voice_bot": "Active (Web Speech & Telephony TwiML)"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/api/scoring/score-prospects")
async def score_prospects(background_tasks: BackgroundTasks):
    """Déclenche le scoring des prospects en arrière-plan"""
    if scoring_engine:
        background_tasks.add_task(scoring_engine.score_all_prospects)
        return {"message": "Scoring initié avec succès"}
    return {"message": "Scoring engine non disponible"}

@app.get("/api/scoring/status")
async def get_scoring_status():
    """Récupère le statut du scoring"""
    return {"status": "idle"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)