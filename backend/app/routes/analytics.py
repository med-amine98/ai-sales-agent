from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, Integer, case, cast, desc
from datetime import datetime, timedelta
import logging

from app.schemas import AnalyticsResponse
from app.models import Prospect, Call
from app.database import get_db

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/dashboard", response_model=AnalyticsResponse)
async def get_dashboard_analytics(
    period: str = Query("30d", regex="^(7d|30d|90d|1y)$"),
    db: AsyncSession = Depends(get_db)
):
    """Récupère les statistiques globales pour le dashboard"""
    try:
        now = datetime.utcnow()
        days = int(period.replace('d', '')) if period.endswith('d') else 365
        start_date = now - timedelta(days=days)
        
        # Total des prospects
        total_result = await db.execute(select(func.count(Prospect.id)))
        total_prospects = total_result.scalar() or 0
        
        # Prospects scorés
        scored_result = await db.execute(
            select(func.count(Prospect.id)).where(Prospect.score > 0)
        )
        scored_prospects = scored_result.scalar() or 0
        
        # Score moyen
        avg_score_result = await db.execute(
            select(func.avg(Prospect.score)).where(Prospect.score > 0)
        )
        avg_score = avg_score_result.scalar() or 0.0
        
        # Appels sur la période
        calls_result = await db.execute(
            select(func.count(Call.id)).where(Call.created_at >= start_date)
        )
        calls_made = calls_result.scalar() or 0
        
        # Rendez-vous réservés sur la période
        appointments_result = await db.execute(
            select(func.count(Call.id)).where(
                and_(
                    Call.created_at >= start_date,
                    Call.appointment_booked == True
                )
            )
        )
        appointments_booked = appointments_result.scalar() or 0
        
        conversion_rate = (appointments_booked / calls_made * 100) if calls_made > 0 else 0.0
        
        return AnalyticsResponse(
            total_prospects=total_prospects,
            scored_prospects=scored_prospects,
            average_score=round(float(avg_score), 1),
            conversion_rate=round(float(conversion_rate), 1),
            calls_made=calls_made,
            appointments_booked=appointments_booked,
            period=period
        )
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des analytics: {e}")
        return AnalyticsResponse(
            total_prospects=0,
            scored_prospects=0,
            average_score=0.0,
            conversion_rate=0.0,
            calls_made=0,
            appointments_booked=0,
            period=period
        )

@router.get("/prospects-distribution")
async def get_prospects_distribution(
    db: AsyncSession = Depends(get_db)
):
    """Récupère la distribution réelle des prospects par tranche de score"""
    try:
        bins = [0, 20, 40, 60, 80, 100]
        labels = ['0-20', '21-40', '41-60', '61-80', '81-100']
        
        data = []
        for i in range(len(bins) - 1):
            low = bins[i]
            high = bins[i+1]
            if i == len(bins) - 2:
                # Inclure 100
                res = await db.execute(
                    select(func.count(Prospect.id)).where(
                        and_(Prospect.score >= low, Prospect.score <= high)
                    )
                )
            else:
                res = await db.execute(
                    select(func.count(Prospect.id)).where(
                        and_(Prospect.score >= low, Prospect.score < high)
                    )
                )
            count = res.scalar() or 0
            data.append({
                "range": labels[i],
                "count": count
            })
        
        return {"distribution": data}
    except Exception as e:
        logger.error(f"Erreur distribution des prospects: {e}")
        labels = ['0-20', '21-40', '41-60', '61-80', '81-100']
        return {"distribution": [{"range": l, "count": 0} for l in labels]}

@router.get("/calls-trend")
async def get_calls_trend(
    period: str = Query("30d", regex="^(7d|30d|90d|1y)$"),
    db: AsyncSession = Depends(get_db)
):
    """Récupère la tendance temporelle des appels et prises de rendez-vous"""
    try:
        days = int(period.replace('d', '')) if period.endswith('d') else 365
        start_date = datetime.utcnow() - timedelta(days=days)
        
        date_col = func.date(Call.created_at)
        appt_count = func.sum(case((Call.appointment_booked == True, 1), else_=0))
        
        query = select(
            date_col.label('call_date'),
            func.count(Call.id).label('total_calls'),
            appt_count.label('total_appts')
        ).where(Call.created_at >= start_date).group_by(date_col).order_by(date_col)
        
        result = await db.execute(query)
        rows = result.all()
        
        return {
            "period": period,
            "data": [
                {
                    "date": str(row.call_date),
                    "calls": int(row.total_calls or 0),
                    "appointments": int(row.total_appts or 0)
                }
                for row in rows
            ]
        }
    except Exception as e:
        logger.error(f"Erreur tendance des appels: {e}")
        return {
            "period": period,
            "data": []
        }