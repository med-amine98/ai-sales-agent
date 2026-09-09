# migrate_scraped_at.py
import sqlite3

def migrate():
    conn = sqlite3.connect('sales_agent.db')
    cursor = conn.cursor()
    
    # Vérifier si la colonne scraped_at existe
    cursor.execute("PRAGMA table_info(prospects)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'scraped_at' in columns:
        # Supprimer l'ancienne colonne
        print("🗑️ Suppression de l'ancienne colonne scraped_at...")
        cursor.execute("ALTER TABLE prospects RENAME TO prospects_old")
        
        # Recréer la table avec le bon type
        cursor.execute("""
            CREATE TABLE prospects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_name VARCHAR(255),
                profession VARCHAR(100),
                industry VARCHAR(100),
                specialty VARCHAR(100),
                website VARCHAR(255),
                email VARCHAR(255),
                phone VARCHAR(50),
                city VARCHAR(100),
                address VARCHAR(255),
                postal_code VARCHAR(20),
                description TEXT,
                social_media JSON,
                services JSON,
                qualifications JSON,
                experience TEXT,
                languages JSON,
                company_size INTEGER,
                revenue FLOAT,
                growth_rate FLOAT,
                new_projects TEXT,
                recent_hires TEXT,
                has_online_booking BOOLEAN DEFAULT 0,
                booking_system_detected VARCHAR(100),
                lead_priority VARCHAR(20),
                is_hot INTEGER DEFAULT 0,
                sales_pitch TEXT,
                source VARCHAR(50),
                profile_url VARCHAR(500),
                scraped_at VARCHAR(50),
                score FLOAT,
                probability FLOAT,
                score_reasons JSON,
                created_at DATETIME,
                updated_at DATETIME,
                last_contacted DATETIME,
                status VARCHAR(50)
            )
        """)
        
        # Copier les données
        print("📥 Copie des données...")
        cursor.execute("""
            INSERT INTO prospects (
                id, company_name, profession, industry, specialty, website, email, phone,
                city, address, postal_code, description, social_media, services,
                qualifications, experience, languages, company_size, revenue, growth_rate,
                new_projects, recent_hires, has_online_booking, booking_system_detected,
                lead_priority, sales_pitch, source, profile_url, scraped_at, score,
                probability, score_reasons, created_at, updated_at, last_contacted, status
            )
            SELECT 
                id, company_name, profession, industry, specialty, website, email, phone,
                city, address, postal_code, description, social_media, services,
                qualifications, experience, languages, company_size, revenue, growth_rate,
                new_projects, recent_hires, has_online_booking, booking_system_detected,
                lead_priority, sales_pitch, source, profile_url, 
                CAST(scraped_at AS TEXT), score, probability, score_reasons, 
                created_at, updated_at, last_contacted, status
            FROM prospects_old
        """)
        
        # Supprimer l'ancienne table
        cursor.execute("DROP TABLE prospects_old")
        
        print("✅ Migration terminée !")
    else:
        print("⏭️ Colonne scraped_at n'existe pas, ajout en cours...")
        cursor.execute("ALTER TABLE prospects ADD COLUMN scraped_at VARCHAR(50)")
        print("✅ Colonne scraped_at ajoutée")
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()