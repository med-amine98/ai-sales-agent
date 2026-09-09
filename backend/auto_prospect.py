# backend/auto_prospect.py
import asyncio
import logging
from app.scrapers.french_leads_scraper import FrenchLeadsScraper
from app.ml.scorer import ScoringEngine
from app.models import Prospect
from app.database import engine, Base, AsyncSessionLocal
from sqlalchemy import select, and_

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

import sys
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass

async def auto_prospect(city: str = "Paris", category: str = "all", limit: int = 25):
    """Prospection automatique réelle sur le marché français avec diagnostic réservation et scoring"""
    # Créer les tables si nécessaire
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print("=" * 70)
    print(f"[*] Prospection Marche Francais : {city} | Secteur : {category}")
    print("=" * 70)
    
    # 1. Scraping
    print("\n[1] Extraction des etablissements reels (OSM France)...")
    scraper = FrenchLeadsScraper()
    leads = await scraper.search_leads(city=city, industry_category=category, limit=limit)
    
    if not leads:
        print("[-] Aucun etablissement trouve.")
        return
    
    print(f"[+] {len(leads)} etablissements reels trouves avec diagnostic de reservation.")
    
    # 2. Sauvegarde & Scoring
    print("\n[2] Scoring IA et enregistrement dans la base...")
    scorer = ScoringEngine()
    
    async with AsyncSessionLocal() as session:
        added_count = 0
        for l in leads:
            # Vérifier l'unicité
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
            
            p = Prospect(**l)
            score_data = scorer._calculate_score(p)
            p.score = round(score_data['score'], 1)
            p.probability = round(score_data['probability'], 2)
            p.score_reasons = score_data['reasons']
            p.lead_priority = score_data['lead_priority']
            p.sales_pitch = score_data['sales_pitch']
            
            session.add(p)
            added_count += 1
            print(f"  * {p.company_name} ({p.city}) -> Score: {p.score}/100 [{p.booking_system_detected}]")
            
        await session.commit()
    
    print("\n" + "=" * 70)
    print(f"[+] Prospection terminee ! {added_count} nouveaux prospects qualifies et classes par score.")
    print("Accedez a votre tableau de bord : http://localhost:5173/prospects")
    print("=" * 70)

if __name__ == "__main__":
    import sys
    target_city = sys.argv[1] if len(sys.argv) > 1 else "Paris"
    target_cat = sys.argv[2] if len(sys.argv) > 2 else "all"
    asyncio.run(auto_prospect(target_city, target_cat, 25))