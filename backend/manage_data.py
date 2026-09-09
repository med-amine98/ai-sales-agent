# backend/manage_data.py
import sqlite3
import json
from datetime import datetime
import os

DB_PATH = 'sales_agent.db'

def get_connection():
    """Établit la connexion à la base de données"""
    return sqlite3.connect(DB_PATH)

def create_tables():
    """Crée les tables si elles n'existent pas"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Créer la table prospects
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS prospects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_name VARCHAR(255),
            industry VARCHAR(100),
            website VARCHAR(255),
            email VARCHAR(255),
            phone VARCHAR(50),
            company_size INTEGER,
            revenue FLOAT,
            growth_rate FLOAT,
            new_projects TEXT,
            recent_hires TEXT,
            score FLOAT DEFAULT 0,
            probability FLOAT DEFAULT 0,
            score_reasons TEXT,
            created_at DATETIME,
            updated_at DATETIME,
            last_contacted DATETIME,
            status VARCHAR(50) DEFAULT 'new'
        )
    ''')
    
    # Créer la table calls
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS calls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prospect_id INTEGER,
            call_type VARCHAR(50),
            duration INTEGER,
            transcript TEXT,
            analysis TEXT,
            sentiment VARCHAR(50),
            interest_level FLOAT,
            objections TEXT,
            appointment_booked BOOLEAN DEFAULT 0,
            status VARCHAR(50) DEFAULT 'initiated',
            created_at DATETIME,
            FOREIGN KEY (prospect_id) REFERENCES prospects (id)
        )
    ''')
    
    conn.commit()
    conn.close()
    print("✅ Tables créées avec succès")

def add_test_data():
    """Ajoute des données de test"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Supprimer les données existantes
    cursor.execute("DELETE FROM prospects")
    cursor.execute("DELETE FROM calls")
    print("✅ Anciennes données supprimées")
    
    now = datetime.now().isoformat()
    
    # Données de test
    prospects = [
        ("TechCorp France", "Technology", "https://techcorp.fr", "contact@techcorp.fr", "+33123456789", 
         150, 5000000, 0.25, "Lancement d'une nouvelle plateforme IA", "Recrutement de 5 ingénieurs", 
         85.5, 0.85, json.dumps(["Croissance élevée", "Secteur technologique"]), "new"),
        
        ("GreenEnergy Solutions", "Energy", "https://greenenergy.fr", "info@greenenergy.fr", "+33198765432", 
         80, 2000000, 0.15, "Développement de panneaux solaires", "Recrutement de 3 experts", 
         72.0, 0.72, json.dumps(["Croissance stable", "Secteur énergétique"]), "contacted"),
        
        ("FinTech Innovations", "Finance", "https://fintech-innovations.fr", "contact@fintech.fr", "+33145678901", 
         200, 10000000, 0.35, "Solution de paiement blockchain", "Recrutement de 10 développeurs", 
         92.0, 0.92, json.dumps(["Croissance très élevée", "Secteur financier innovant"]), "appointment_scheduled"),
        
        ("HealthTech Medical", "Healthcare", "https://healthtech-medical.fr", "info@healthtech.fr", "+33123456700", 
         50, 1000000, 0.10, "Application de télémédecine", "Recrutement de 2 data scientists", 
         65.0, 0.65, json.dumps(["Secteur en croissance", "Projet innovant"]), "new"),
        
        ("Smart Logistics", "Logistics", "https://smart-logistics.fr", "contact@smartlogistics.fr", "+33187654321", 
         120, 3000000, 0.18, "Optimisation des routes avec IA", "Recrutement de 4 logisticiens", 
         78.0, 0.78, json.dumps(["Croissance solide", "Projet d'optimisation"]), "contacted"),
        
        ("AI Solutions", "Technology", "https://aisolutions.fr", "contact@aisolutions.fr", "+33123456999", 
         60, 1500000, 0.30, "Plateforme d'IA pour entreprises", "Recrutement de 8 développeurs IA", 
         88.0, 0.88, json.dumps(["Croissance très élevée", "Secteur porteur"]), "new"),
        
        ("EcoBuild", "Construction", "https://ecobuild.fr", "info@ecobuild.fr", "+33123456888", 
         200, 8000000, 0.12, "Matériaux écologiques innovants", "Recrutement de 6 ingénieurs", 
         70.0, 0.70, json.dumps(["Secteur en transition", "Projet écologique"]), "contacted"),
        
        ("DataFlow", "Technology", "https://dataflow.fr", "contact@dataflow.fr", "+33123456777", 
         40, 800000, 0.20, "Solutions de big data", "Recrutement de 3 data engineers", 
         68.0, 0.68, json.dumps(["Croissance régulière", "Secteur innovant"]), "new"),
        
        ("MediCare Plus", "Healthcare", "https://medicareplus.fr", "info@medicareplus.fr", "+33123456666", 
         90, 2500000, 0.08, "Réseau de cliniques connectées", "Recrutement de 4 médecins", 
         62.0, 0.62, json.dumps(["Secteur stable", "Projet de santé"]), "appointment_scheduled"),
        
        ("GreenTech", "Energy", "https://greentech.fr", "contact@greentech.fr", "+33123456555", 
         35, 500000, 0.22, "Solutions d'énergie renouvelable", "Recrutement de 2 experts", 
         75.0, 0.75, json.dumps(["Croissance prometteuse", "Secteur écologique"]), "new"),
    ]
    
    # Insertion des données
    for prospect in prospects:
        cursor.execute("""
            INSERT INTO prospects (
                company_name, industry, website, email, phone,
                company_size, revenue, growth_rate, new_projects, recent_hires,
                score, probability, score_reasons, status,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (*prospect, now, now))
    
    # Ajouter des appels de test
    calls = [
        (1, "virtual", 120, "Bonjour, je vous contacte pour vous présenter notre solution...", 
         '{"sentiment":"positif","interest_level":0.8}', "positif", 0.8, '["Prix trop élevé"]', 1, "completed", now),
        (2, "human", 180, "Discussion sur les besoins de l'entreprise...", 
         '{"sentiment":"neutre","interest_level":0.6}', "neutre", 0.6, '["Manque de temps"]', 0, "completed", now),
        (3, "virtual", 90, "Présentation de la plateforme AI Sales Agent...", 
         '{"sentiment":"très positif","interest_level":0.9}', "très positif", 0.9, '[]', 1, "completed", now),
        (4, "human", 60, "Premier contact avec le prospect...", 
         '{"sentiment":"neutre","interest_level":0.5}', "neutre", 0.5, '[]', 0, "initiated", now),
    ]
    
    for call in calls:
        cursor.execute("""
            INSERT INTO calls (
                prospect_id, call_type, duration, transcript, analysis,
                sentiment, interest_level, objections, appointment_booked, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, call)
    
    conn.commit()
    conn.close()
    
    print("✅ Données de test ajoutées avec succès !")

def show_data():
    """Affiche les données dans la base"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Afficher les prospects
    cursor.execute("SELECT id, company_name, industry, score, status FROM prospects")
    prospects = cursor.fetchall()
    
    print("\n📋 Liste des prospects:")
    print("-" * 70)
    print(f"{'ID':<5} {'Entreprise':<30} {'Secteur':<15} {'Score':<10} {'Statut':<15}")
    print("-" * 70)
    for p in prospects:
        print(f"{p[0]:<5} {p[1][:30]:<30} {p[2] if p[2] else 'N/A':<15} {p[3]:<10} {p[4] if p[4] else 'new':<15}")
    
    # Afficher les appels
    cursor.execute("SELECT id, prospect_id, call_type, duration, appointment_booked FROM calls")
    calls = cursor.fetchall()
    
    print("\n📞 Liste des appels:")
    print("-" * 70)
    print(f"{'ID':<5} {'Prospect ID':<12} {'Type':<10} {'Durée (s)':<12} {'Rendez-vous':<15}")
    print("-" * 70)
    for c in calls:
        print(f"{c[0]:<5} {c[1]:<12} {c[2] if c[2] else 'N/A':<10} {c[3] if c[3] else 0:<12} {'✅' if c[4] else '❌':<15}")
    
    conn.close()

def main():
    print("🔄 Gestion des données de la base de données...")
    print("=" * 50)
    
    # Créer les tables si elles n'existent pas
    create_tables()
    
    # Ajouter les données de test
    add_test_data()
    
    # Afficher les données
    show_data()
    
    print("\n" + "=" * 50)
    print("✅ Opération terminée avec succès !")
    print("📌 Les données sont prêtes à être utilisées par l'API.")

if __name__ == "__main__":
    main()