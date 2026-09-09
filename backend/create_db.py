import sqlite3
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from app.models import Base
from app.database import DATABASE_URL

# Utiliser une connexion synchrone
engine = create_engine(DATABASE_URL)
Base.metadata.drop_all(engine)
Base.metadata.create_all(engine)
print("✅ Base de données recréée avec succès !")