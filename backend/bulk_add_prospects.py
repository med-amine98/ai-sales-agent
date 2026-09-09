# backend/bulk_add_prospects.py
import requests
import json
import time

API_BASE = "http://localhost:8000/api"

def add_prospects_bulk(prospects_file="prospects_data.json"):
    """Ajoute des prospects en masse via l'API"""
    
    # Charger les prospects depuis un fichier JSON
    try:
        with open(prospects_file, 'r', encoding='utf-8') as f:
            prospects = json.load(f)
    except:
        # Données d'exemple si le fichier n'existe pas
        prospects = [
            {
                "company_name": "Centre de Massage & Bien-être Zen",
                "industry": "Bien-être & Massages",
                "website": "https://www.zen-massage.fr",
                "email": "contact@zen-massage.fr",
                "phone": "+33123456701"
            },
            {
                "company_name": "Sophrologie & Relaxation Paris",
                "industry": "Thérapies alternatives",
                "website": "https://www.sophrologie-paris.fr",
                "email": "contact@sophrologie-paris.fr",
                "phone": "+33123456702"
            },
            {
                "company_name": "Naturopathie & Santé Holistique",
                "industry": "Thérapies alternatives",
                "website": "https://www.naturopathie-holistique.fr",
                "email": "contact@naturopathie-holistique.fr",
                "phone": "+33123456703"
            },
            {
                "company_name": "Centre de Réflexologie & Bien-être",
                "industry": "Thérapies alternatives",
                "website": "https://www.reflexologie-bienetre.fr",
                "email": "contact@reflexologie-bienetre.fr",
                "phone": "+33123456704"
            },
            {
                "company_name": "Hypnothérapie & Développement Personnel",
                "industry": "Thérapies alternatives",
                "website": "https://www.hypnotherapie-devperso.fr",
                "email": "contact@hypnotherapie-devperso.fr",
                "phone": "+33123456705"
            },
            {
                "company_name": "Yoga & Méditation Studio",
                "industry": "Bien-être & Sport",
                "website": "https://www.yoga-meditation-studio.fr",
                "email": "contact@yoga-meditation-studio.fr",
                "phone": "+33123456706"
            },
            {
                "company_name": "Coaching Sportif & Fitness à Domicile",
                "industry": "Sport & Fitness",
                "website": "https://www.coaching-sportif-domicile.fr",
                "email": "contact@coaching-sportif-domicile.fr",
                "phone": "+33123456707"
            },
            {
                "company_name": "Nutrition & Bien-être Alimentaire",
                "industry": "Nutrition & Santé",
                "website": "https://www.nutrition-bienetre-alimentaire.fr",
                "email": "contact@nutrition-bienetre-alimentaire.fr",
                "phone": "+33123456708"
            },
            {
                "company_name": "Soins Esthétiques & Beauté Naturelle",
                "industry": "Beauté & Esthétique",
                "website": "https://www.soins-esthetiques-naturels.fr",
                "email": "contact@soins-esthetiques-naturels.fr",
                "phone": "+33123456709"
            },
            {
                "company_name": "Centre de Bien-être & Relaxation",
                "industry": "Bien-être & Massages",
                "website": "https://www.bienetre-relaxation.fr",
                "email": "contact@bienetre-relaxation.fr",
                "phone": "+33123456710"
            }
        ]
    
    print(f"🚀 Ajout de {len(prospects)} prospects...")
    added = 0
    
    for prospect in prospects:
        try:
            response = requests.post(f"{API_BASE}/prospects", json=prospect)
            if response.status_code in [200, 201]:
                print(f"  ✅ {prospect.get('company_name', 'Inconnu')} ajouté")
                added += 1
            else:
                print(f"  ❌ Erreur: {response.status_code}")
        except Exception as e:
            print(f"  ❌ Erreur: {e}")
        time.sleep(0.2)
    
    print(f"\n✅ {added} prospects ajoutés avec succès !")
    
    # Lancer le scoring
    print("\n🔄 Lancement du scoring IA...")
    try:
        response = requests.post(f"{API_BASE}/calls/scoring")
        if response.status_code in [200, 202]:
            print("✅ Scoring déclenché avec succès !")
        else:
            print(f"⚠️ Erreur scoring: {response.status_code}")
    except Exception as e:
        print(f"⚠️ Erreur: {e}")

if __name__ == "__main__":
    add_prospects_bulk()