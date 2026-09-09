import sqlite3
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
import sys
import os

# Ajouter le chemin du projet
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.models import Base

# Utiliser une connexion synchrone (pas async)
engine = create_engine('sqlite:///sales_agent.db', echo=False)

print('📦 Création des tables...')
Base.metadata.create_all(engine)
print('✅ Base de données recréée avec succès !')

# Vérifier les tables créées
conn = sqlite3.connect('sales_agent.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
print(f'📋 Tables créées: {[t[0] for t in tables]}')
conn.close()